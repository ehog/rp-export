#!/usr/bin/env python3
"""
RP Hypertrophy App — Workout History Export

Exports your complete workout history from training.rpstrength.com
as CSV and/or JSON files.
"""

import argparse
import csv
import io
import json
import os
import sys
import time
from datetime import date

import requests

BASE_URL = "https://training.rpstrength.com/api"

MUSCLE_GROUPS = {
    1: "Chest", 2: "Back", 3: "Triceps", 4: "Biceps",
    5: "Shoulders", 6: "Quads", 7: "Glutes", 8: "Hamstrings",
    9: "Calves", 10: "Traps", 11: "Forearms", 12: "Abs",
}


def api_get(session, path):
    resp = session.get(BASE_URL + path)
    if resp.status_code == 401:
        print("Error: Token expired or invalid. Grab a fresh token and try again.", file=sys.stderr)
        sys.exit(1)
    resp.raise_for_status()
    return resp.json()


def export_data(token):
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"

    print("Fetching exercise data...")
    bootstrap = api_get(session, "/training/bootstrap")
    exercises = bootstrap.get("exercises", [])
    mesocycles = bootstrap.get("mesocycles", [])

    exercise_map = {}
    for ex in exercises:
        exercise_map[ex["id"]] = {
            "name": ex["name"],
            "exerciseType": ex.get("exerciseType", "unknown"),
        }

    print(f"Found {len(mesocycles)} mesocycle(s) and {len(exercises)} exercises.\n")

    csv_rows = []
    json_data = []

    for i, meso in enumerate(mesocycles):
        print(f"Fetching mesocycle {i + 1}/{len(mesocycles)}: \"{meso['name']}\"...")

        if i > 0:
            time.sleep(0.2)

        full_meso = api_get(session, f"/training/mesocycles/{meso['key']}")

        meso_json = {
            "name": meso["name"],
            "key": meso["key"],
            "createdAt": meso.get("createdAt"),
            "finishedAt": meso.get("finishedAt"),
            "unit": meso.get("unit"),
            "weeksCount": meso.get("weeks"),
            "daysPerWeek": meso.get("days"),
            "workouts": [],
        }

        for week in full_meso.get("weeks", []):
            for day in week.get("days", []):
                raw_week = day.get("week", week.get("week", 0))
                week_num = raw_week + 1
                day_num = day["position"] + 1
                day_label = day.get("label") or None
                workout_date = day.get("finishedAt")
                workout_status = day.get("status")

                workout_json = {
                    "weekNumber": week_num,
                    "dayNumber": day_num,
                    "label": day_label,
                    "date": workout_date,
                    "status": workout_status,
                    "bodyweight": day.get("bodyweight"),
                    "unit": day.get("unit") or meso.get("unit") or "lb",
                    "exercises": [],
                }

                for ex in day.get("exercises", []):
                    ex_info = exercise_map.get(ex["exerciseId"], {"name": "Unknown Exercise", "exerciseType": "unknown"})
                    ex_name = ex_info["name"]
                    muscle_group_id = ex.get("muscleGroupId", 0)
                    muscle_group_name = MUSCLE_GROUPS.get(muscle_group_id, "Unknown")

                    ex_json = {
                        "name": ex_name,
                        "type": ex_info["exerciseType"],
                        "muscleGroup": muscle_group_id,
                        "sets": [],
                        "muscleGroupName": muscle_group_name,
                    }

                    for s in ex.get("sets", []):
                        # Filter: include if status is 'complete' or finishedAt is non-null
                        if s.get("status") != "complete" and not s.get("finishedAt"):
                            continue

                        set_num = s["position"] + 1
                        weight = s.get("weight")
                        unit = s.get("unit") or "lb"
                        reps = s.get("reps")
                        set_type = s.get("setType") or ""
                        completed_at = s.get("finishedAt") or ""
                        set_status = s.get("status") or ""

                        csv_rows.append({
                            "Mesocycle": meso["name"],
                            "Week": week_num,
                            "Day": day_num,
                            "Day Label": day_label or "",
                            "Workout Date": workout_date or "",
                            "Workout Status": workout_status or "",
                            "Exercise": ex_name,
                            "Muscle Group": muscle_group_name,
                            "Set Number": set_num,
                            "Weight": weight if weight is not None else "",
                            "Unit": unit,
                            "Reps": reps if reps is not None else "",
                            "Set Type": set_type,
                            "Set Completed At": completed_at,
                            "Set Status": set_status,
                        })

                        ex_json["sets"].append({
                            "setNumber": set_num,
                            "weight": weight,
                            "reps": reps,
                            "unit": unit,
                            "setType": set_type,
                            "completedAt": s.get("finishedAt"),
                            "status": set_status,
                        })

                    if ex_json["sets"]:
                        workout_json["exercises"].append(ex_json)

                if workout_json["exercises"]:
                    meso_json["workouts"].append(workout_json)

        json_data.append(meso_json)

    return csv_rows, json_data


def write_csv(rows, filepath):
    fieldnames = [
        "Mesocycle", "Week", "Day", "Day Label", "Workout Date",
        "Workout Status", "Exercise", "Muscle Group", "Set Number",
        "Weight", "Unit", "Reps", "Set Type", "Set Completed At", "Set Status",
    ]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_json(data, filepath):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(
        description="Export workout history from the RP Hypertrophy app.",
        epilog=(
            "How to get your token:\n"
            "  1. Log into training.rpstrength.com in your browser\n"
            "  2. Open DevTools (F12) → Elements tab\n"
            "  3. Find the <link rel=\"manifest\"> tag in the <head>\n"
            "  4. Copy the 'token' value from its href query string\n"
            "\n"
            "Note: Tokens expire after a while. Grab a fresh one each session."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--token", required=True,
        help="JWT auth token from the RP app (see instructions above)",
    )
    parser.add_argument(
        "--output-dir", default=".",
        help="Directory to save output files (default: current directory)",
    )
    parser.add_argument(
        "--format", choices=["csv", "json", "both"], default="both",
        dest="fmt",
        help="Output format: csv, json, or both (default: both)",
    )

    args = parser.parse_args()

    output_dir = os.path.abspath(args.output_dir)
    os.makedirs(output_dir, exist_ok=True)

    csv_rows, json_data = export_data(args.token)

    today = date.today().isoformat()
    total_sets = len(csv_rows)
    total_mesos = len(json_data)

    if args.fmt in ("csv", "both"):
        csv_path = os.path.join(output_dir, f"rp_workout_history_{today}.csv")
        write_csv(csv_rows, csv_path)
        print(f"\nSaved CSV: {csv_path}")

    if args.fmt in ("json", "both"):
        json_path = os.path.join(output_dir, f"rp_workout_history_{today}.json")
        write_json(json_data, json_path)
        print(f"Saved JSON: {json_path}")

    print(f"\nExported {total_mesos} mesocycle(s), {total_sets} total sets.")


if __name__ == "__main__":
    main()
