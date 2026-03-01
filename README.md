# RP Export

Export your workout history from the [RP Hypertrophy app](https://training.rpstrength.com) — because the app doesn't have a native export feature.

Three methods are provided:

| Method | What it does |
|--------|-------------|
| **[RP Dashboard](#option-1-rp-dashboard-bookmarklet-recommended)** | One click → full analytics dashboard opens in a new tab |
| **[RP Export bookmarklet](#option-2-rp-export-bookmarklet)** | Downloads CSV + JSON files to your computer |
| **[Python CLI](#option-3-python-cli)** | Command-line export for automation or scripting |

---

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
4. A complete dashboard opens in a new tab

The dashboard includes: estimated 1RMs, personal records, DOTS scores, volume trends, rep max estimates, bodyweight overlay, and more — spanning your entire training history across all mesocycles.

The resulting page is fully self-contained. Save it any time via **File → Save Page As** to keep a local snapshot.

---

## Option 2: RP Export Bookmarklet

Downloads your workout history as CSV and JSON files.

### Getting Your Auth Token

The bookmarklet extracts the token automatically from the page — no DevTools needed.

> **Note:** Tokens expire each session. If you get a "Token expired" error, refresh the RP Strength page and try again.

### Setup

1. Open [`bookmarklet/rp-export.js`](bookmarklet/rp-export.js) and copy its entire contents
2. Create a new browser bookmark
3. Set the **Name** to `RP Export`
4. Paste the copied code as the **URL**
5. Save

### Usage

1. Go to [training.rpstrength.com](https://training.rpstrength.com) and log in
2. Click the `RP Export` bookmark
3. A progress overlay appears while your data loads
4. Two files download automatically:
   - `rp_workout_history_YYYY-MM-DD.csv`
   - `rp_workout_history_YYYY-MM-DD.json`

---

## Option 3: Python CLI

For automation, scripting, or headless environments.

### Getting Your Auth Token

1. Open [training.rpstrength.com](https://training.rpstrength.com) and log in
2. Open DevTools (`F12` or `Cmd+Option+I`) → **Elements** tab
3. Find `<link rel="manifest" href="...">` in the `<head>`
4. Copy the value of the `token=` query parameter from the `href`

> **Note:** Tokens expire. Grab a fresh one each session.

### Install

```bash
pip install -r cli/requirements.txt
```

### Usage

```bash
# Export both CSV and JSON (default)
python cli/export.py --token YOUR_TOKEN_HERE

# Export only JSON
python cli/export.py --token YOUR_TOKEN_HERE --format json

# Save to a specific directory
python cli/export.py --token YOUR_TOKEN_HERE --output-dir ~/Downloads
```

Run `python cli/export.py --help` for full usage.

---

## Output Format

### JSON

Hierarchical structure preserving the full program layout. Compatible with [rp-lift-stats](https://github.com/ehog/rp-lift-stats).

```json
[
  {
    "name": "Mesocycle Name",
    "key": "...",
    "weeksCount": 8,
    "daysPerWeek": 5,
    "unit": "lb",
    "workouts": [
      {
        "weekNumber": 1,
        "dayNumber": 1,
        "date": "2026-02-27T...",
        "bodyweight": 225.0,
        "unit": "lb",
        "exercises": [
          {
            "name": "Barbell Squat (High Bar)",
            "muscleGroupName": "Quads",
            "sets": [
              {
                "weight": 255,
                "reps": 5,
                "unit": "lb",
                "setType": "regular",
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

### CSV

Flat format with one row per set:

| Column | Description |
|--------|-------------|
| Mesocycle | Name of the training block |
| Week | Week number (1-indexed) |
| Day | Day number within the week (1-indexed) |
| Day Label | Custom label, if any |
| Workout Date | ISO 8601 timestamp |
| Workout Status | `complete`, `partial`, or `skipped` |
| Exercise | Exercise name |
| Muscle Group | Target muscle group |
| Set Number | Set number within the exercise (1-indexed) |
| Weight | Load used |
| Unit | `lb` or `kg` |
| Reps | Reps completed |
| Set Type | `regular`, `myorep`, `myorep-match` |
| Set Completed At | ISO 8601 timestamp |
| Set Status | `complete` or `skipped` |

---

## License

[MIT](LICENSE)
