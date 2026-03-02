# RP Export

Export your workout history from the [RP Hypertrophy app](https://training.rpstrength.com) — because the app doesn't have a native export feature.

Two methods are provided:

| Method | What it does |
|--------|-------------|
| **[RP Export bookmarklet](#option-1-rp-export-bookmarklet)** | Downloads CSV + JSON files to your computer |
| **[Python CLI](#option-2-python-cli)** | Command-line export for automation or scripting |

> **Want an analytics dashboard?** See [rp-lift-stats](https://github.com/ehog/rp-lift-stats) — it includes a one-click Dashboard bookmarklet that fetches your data and opens a full stats dashboard in a new tab.

---

## Option 1: RP Export Bookmarklet

Downloads your workout history as CSV and JSON files directly to your computer.

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

> **Note:** Tokens expire each session. If you get a "Token expired" error, refresh the RP Strength page and try again.

---

## Option 2: Python CLI

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

## Development

### Project Structure

```
bookmarklet/
  rp-export.src.js   ← Readable bookmarklet source (edit this)
  rp-export.js       ← Minified bookmarklet URL (generated)
cli/
  export.py          ← Python CLI
  requirements.txt
```

### Updating the Export Bookmarklet

Edit `bookmarklet/rp-export.src.js`, then regenerate the minified version:

```python
import re

with open('bookmarklet/rp-export.src.js') as f:
    src = f.read()

# Strip pure comment lines only (preserves // inside strings like https://)
src = re.sub(r'(?m)^[ \t]*//[^\n]*\n?', '', src)
src = re.sub(r'\s+', ' ', src).strip().rstrip(';')

with open('bookmarklet/rp-export.js', 'w') as f:
    f.write('javascript:void(' + src + ')')
```

### Auth Token

RP Strength embeds a short-lived JWT in the manifest link on every page:

```html
<link rel="manifest" href="/manifest.json?token=eyJ...">
```

The bookmarklet extracts it automatically — no DevTools needed.

---

## License

[MIT](LICENSE)
