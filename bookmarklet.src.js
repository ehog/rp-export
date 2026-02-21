// RP Hypertrophy App — Workout History Export Bookmarklet
// Exports all workout data as CSV and JSON files.
// Usage: Create a browser bookmark with bookmarklet.js as the URL,
//        then click it while logged into training.rpstrength.com.

(async () => {
  const BASE = 'https://training.rpstrength.com/api';

  const MUSCLE_GROUPS = {
    1: 'Chest', 2: 'Back', 3: 'Triceps', 4: 'Biceps',
    5: 'Shoulders', 6: 'Quads', 7: 'Glutes', 8: 'Hamstrings',
    9: 'Calves', 10: 'Traps', 11: 'Forearms', 12: 'Abs'
  };

  // --- Progress overlay ---
  const overlay = document.createElement('div');
  overlay.id = 'rp-export-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', top: '16px', right: '16px', zIndex: '999999',
    background: '#1a1a2e', color: '#fff', padding: '16px 20px',
    borderRadius: '10px', fontFamily: 'system-ui, sans-serif',
    fontSize: '14px', lineHeight: '1.5', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    minWidth: '240px', maxWidth: '320px'
  });
  overlay.innerHTML = '<strong>RP Export</strong><br><span id="rp-export-status">Starting...</span>';
  document.body.appendChild(overlay);

  const status = (msg) => {
    document.getElementById('rp-export-status').textContent = msg;
  };

  const cleanup = () => {
    const el = document.getElementById('rp-export-overlay');
    if (el) el.remove();
  };

  try {
    // --- Extract JWT ---
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) throw new Error('Could not find manifest link. Are you logged into training.rpstrength.com?');
    const manifestUrl = new URL(manifestLink.href);
    const token = manifestUrl.searchParams.get('token');
    if (!token) throw new Error('No token found in manifest URL. Try refreshing the page.');

    const headers = { 'Authorization': 'Bearer ' + token };

    const apiFetch = async (path) => {
      const res = await fetch(BASE + path, { headers });
      if (!res.ok) {
        if (res.status === 401) throw new Error('Token expired. Refresh the page and try again.');
        throw new Error('API error ' + res.status + ' on ' + path);
      }
      return res.json();
    };

    // --- Bootstrap ---
    status('Fetching exercise data...');
    const bootstrap = await apiFetch('/training/bootstrap');
    const exercises = bootstrap.exercises || [];
    const mesocycles = bootstrap.mesocycles || [];

    // Build exercise lookup: id -> { name, exerciseType }
    const exerciseMap = {};
    for (const ex of exercises) {
      exerciseMap[ex.id] = { name: ex.name, exerciseType: ex.exerciseType };
    }

    // --- Fetch each mesocycle ---
    const csvRows = [];
    csvRows.push('Mesocycle,Week,Day,Day Label,Workout Date,Workout Status,Exercise,Muscle Group,Set Number,Weight,Unit,Reps,Set Type,Set Completed At,Set Status');

    const jsonData = [];

    const csvEscape = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    for (let i = 0; i < mesocycles.length; i++) {
      const meso = mesocycles[i];
      status('Fetching mesocycle ' + (i + 1) + '/' + mesocycles.length + ': ' + meso.name + '...');

      if (i > 0) await new Promise(r => setTimeout(r, 200));

      const fullMeso = await apiFetch('/training/mesocycles/' + meso.key);

      const mesoJson = {
        name: meso.name,
        key: meso.key,
        createdAt: meso.createdAt,
        finishedAt: meso.finishedAt || null,
        unit: meso.unit,
        weeksCount: meso.weeks,
        daysPerWeek: meso.days,
        workouts: []
      };

      const weeks = fullMeso.weeks || [];
      for (const week of weeks) {
        const days = week.days || [];
        for (const day of days) {
          const weekNum = (day.week != null ? day.week : week.week) + 1;
          const dayNum = day.position + 1;
          const dayLabel = day.label || '';
          const workoutDate = day.finishedAt || '';
          const workoutStatus = day.status || '';

          const workoutJson = {
            weekNumber: weekNum,
            dayNumber: dayNum,
            label: day.label || null,
            date: day.finishedAt || null,
            status: day.status || null,
            bodyweight: day.bodyweight || null,
            unit: day.unit || meso.unit || 'lb',
            exercises: []
          };

          const dayExercises = day.exercises || [];
          for (const ex of dayExercises) {
            const exInfo = exerciseMap[ex.exerciseId] || { name: 'Unknown Exercise', exerciseType: 'unknown' };
            const exName = exInfo.name;
            const muscleGroupName = MUSCLE_GROUPS[ex.muscleGroupId] || 'Unknown';

            const exJson = {
              name: exName,
              type: exInfo.exerciseType,
              muscleGroup: ex.muscleGroupId,
              sets: [],
              muscleGroupName: muscleGroupName
            };

            const sets = ex.sets || [];
            for (const set of sets) {
              // Filter: include if status is 'complete' or finishedAt is non-null
              if (set.status !== 'complete' && !set.finishedAt) continue;

              const setNum = set.position + 1;
              const weight = set.weight != null ? set.weight : '';
              const unit = set.unit || 'lb';
              const reps = set.reps != null ? set.reps : '';
              const setType = set.setType || '';
              const completedAt = set.finishedAt || '';
              const setStatus = set.status || '';

              csvRows.push([
                csvEscape(meso.name),
                weekNum,
                dayNum,
                csvEscape(dayLabel),
                workoutDate,
                workoutStatus,
                csvEscape(exName),
                csvEscape(muscleGroupName),
                setNum,
                weight,
                unit,
                reps,
                setType,
                completedAt,
                setStatus
              ].join(','));

              exJson.sets.push({
                setNumber: setNum,
                weight: set.weight != null ? set.weight : null,
                reps: set.reps != null ? set.reps : null,
                unit: unit,
                setType: setType,
                completedAt: set.finishedAt || null,
                status: setStatus
              });
            }

            if (exJson.sets.length > 0) {
              workoutJson.exercises.push(exJson);
            }
          }

          if (workoutJson.exercises.length > 0) {
            mesoJson.workouts.push(workoutJson);
          }
        }
      }

      jsonData.push(mesoJson);
    }

    // --- Download files ---
    const today = new Date().toISOString().slice(0, 10);

    const downloadFile = (content, filename, type) => {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    status('Downloading files...');
    downloadFile(csvRows.join('\n'), 'rp_workout_history_' + today + '.csv', 'text/csv');
    downloadFile(JSON.stringify(jsonData, null, 2), 'rp_workout_history_' + today + '.json', 'application/json');

    status('Done! Exported ' + mesocycles.length + ' mesocycle(s).');
    setTimeout(cleanup, 3000);

  } catch (err) {
    status('Error: ' + err.message);
    console.error('RP Export error:', err);
    setTimeout(cleanup, 8000);
  }
})();
