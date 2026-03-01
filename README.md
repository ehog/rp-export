# RP Export

Export your workout history from the [RP Hypertrophy app](https://training.rpstrength.com) — because the app doesn't have a native export feature.

Three methods are provided:

| Method | What it does |
|--------|-------------|
| **[RP Dashboard bookmarklet](#option-1-rp-dashboard-bookmarklet-recommended)** | Fetches your data and opens a full analytics dashboard in a new tab — no files, no setup |
| **[RP Export bookmarklet](#option-2-rp-export-bookmarklet)** | Downloads CSV + JSON files to your computer |
| **[Python CLI](#option-3-python-cli)** | Command-line export for automation or scripting |

## Option 1: RP Dashboard Bookmarklet (Recommended)

Fetches your complete training history directly from RP Strength and opens a self-contained analytics dashboard in a new browser tab. Powered by [rp-lift-stats](https://github.com/ehog/rp-lift-stats).

**No files to download. No Python. No manual steps.**

### Setup

1. Open [`bookmarklet/rp-dashboard.js`](bookmarklet/rp-dashboard.js) and copy its entire contents
2. Create a new browser bookmark
3. Set the **Name** to `RP Dashboard`
4. Paste the copied code as the **URL**
5. Save

### Usage

1. Go to [training.rpstrength.com](https://training.rpstrength.com) and log in
2. Click the `RP Dashboard` bookmark
3. A progress overlay appears while your data loads (~30s for a full history)
4. A complete dashboard opens in a new tab — save it locally any time via File → Save

The dashboard shows estimated 1RMs, personal records, DOTS scores, volume trends, rep max estimates, and more across your entire training history.

---

## Option 2: RP Export Bookmarklet

Downloads CSV + JSON files of your workout history.

## Getting Your Auth Token

Both methods require a JWT token from your logged-in RP session.

1. Open [training.rpstrength.com](https://training.rpstrength.com) and log in
2. Open your browser's DevTools (`F12` or `Cmd+Option+I`)
3. Go to the **Elements** tab
4. In the `<head>` section, find the `<link rel="manifest" href="...">` tag
5. Look at the `href` attribute — it contains a `?token=` query parameter
6. Copy the token value (everything after `token=`)

> **Note:** Tokens expire after a while. You'll need to grab a fresh one each session.

### Setup

### Setup

1. Open [`bookmarklet/rp-export.js`](bookmarklet/rp-export.js) and copy its entire contents
2. In your browser, create a new bookmark (or edit an existing one)
3. Set the **Name** to something like `RP Export`
4. Paste the copied code as the **URL**
5. Save the bookmark

### Usage

1. Go to [training.rpstrength.com](https://training.rpstrength.com) and make sure you're logged in
2. Click the `RP Export` bookmark
3. A small overlay will appear showing progress
4. Two files will download automatically:
   - `rp_workout_history_YYYY-MM-DD.csv`
   - `rp_workout_history_YYYY-MM-DD.json`

---

## Option 3: Python CLI

For CLI usage, automation, or if you prefer not to use a bookmarklet.

### Install

```bash
pip install -r cli/requirements.txt
```

### Usage

```bash
# Export both CSV and JSON (default)
python cli/export.py --token YOUR_TOKEN_HERE

# Export only CSV
python cli/export.py --token YOUR_TOKEN_HERE --format csv

# Export only JSON
python cli/export.py --token YOUR_TOKEN_HERE --format json

# Save to a specific directory
python cli/export.py --token YOUR_TOKEN_HERE --output-dir ~/Downloads
```

Run `python cli/export.py --help` for full usage info.

## Output Format

### CSV

Flat format with one row per set:

| Column | Description |
|--------|-------------|
| Mesocycle | Name of the mesocycle |
| Week | Week number (1-indexed) |
| Day | Day number within the week (1-indexed) |
| Day Label | Custom label for the day, if any |
| Workout Date | When the workout was completed (ISO 8601) |
| Workout Status | `complete`, `partial`, or `skipped` |
| Exercise | Exercise name |
| Muscle Group | Target muscle group |
| Set Number | Set number within the exercise (1-indexed) |
| Weight | Weight used |
| Unit | `lb` or `kg` |
| Reps | Reps completed (`-1` for skipped sets) |
| Set Type | `regular`, `myorep`, etc. |
| Set Completed At | When the set was completed (ISO 8601) |
| Set Status | `complete` or `skipped` |

### JSON

Hierarchical format preserving the full structure:

```
[
  {
    "name": "Mesocycle Name",
    "key": "...",
    "createdAt": "...",
    "finishedAt": "...",
    "unit": "lb",
    "weeksCount": 8,
    "daysPerWeek": 5,
    "workouts": [
      {
        "weekNumber": 1,
        "dayNumber": 1,
        "label": null,
        "date": "...",
        "status": "complete",
        "bodyweight": 225.0,
        "unit": "lb",
        "exercises": [
          {
            "name": "Barbell Squat (High Bar)",
            "type": "barbell",
            "muscleGroup": 6,
            "muscleGroupName": "Quads",
            "sets": [
              {
                "setNumber": 1,
                "weight": 255,
                "reps": 5,
                "unit": "lb",
                "setType": "regular",
                "completedAt": "...",
                "status": "complete"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

## License

[MIT](LICENSE)
