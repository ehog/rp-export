// RP Dashboard — Live Dashboard Launcher
// Fetches your complete workout history from training.rpstrength.com and
// opens a self-contained RP Lift Stats dashboard in a new tab.
// No file downloads or manual steps required.
//
// Usage: Create a browser bookmark with rp-dashboard.js as the URL,
//        then click it while logged into training.rpstrength.com.

(async () => {
  const BASE = 'https://training.rpstrength.com/api';
  const TEMPLATE_URL = 'https://raw.githubusercontent.com/ehog/rp-lift-stats/main/index-template.html';

  const MUSCLE_GROUPS = {
    1: 'Chest', 2: 'Back', 3: 'Triceps', 4: 'Biceps',
    5: 'Shoulders', 6: 'Quads', 7: 'Glutes', 8: 'Hamstrings',
    9: 'Calves', 10: 'Traps', 11: 'Forearms', 12: 'Abs'
  };

  // --- Progress overlay ---
  const overlay = document.createElement('div');
  overlay.id = 'rp-dash-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', top: '16px', right: '16px', zIndex: '999999',
    background: '#1a1a2e', color: '#fff', padding: '16px 20px',
    borderRadius: '10px', fontFamily: 'system-ui, sans-serif',
    fontSize: '14px', lineHeight: '1.5', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    minWidth: '260px', maxWidth: '340px'
  });
  overlay.innerHTML = '<strong>RP Dashboard</strong><br><span id="rp-dash-status">Starting…</span>';
  document.body.appendChild(overlay);

  const status = msg => {
    const el = document.getElementById('rp-dash-status');
    if (el) el.textContent = msg;
  };
  const cleanup = () => {
    const el = document.getElementById('rp-dash-overlay');
    if (el) el.remove();
  };

  // Open the target window NOW (synchronously, while still in the click handler)
  // so popup blockers don't interfere. We'll write content into it once data is ready.
  const win = window.open('', '_blank');
  if (!win) {
    status('Error: popup blocked — allow popups for this site and try again.');
    setTimeout(cleanup, 8000);
    return;
  }
  win.document.write('<html><body style="background:#09090f;color:#edeaff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-size:1.1rem">Loading your dashboard…</body></html>');

  try {
    // --- Extract JWT ---
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) throw new Error('Could not find manifest link. Are you logged into training.rpstrength.com?');
    const token = new URL(manifestLink.href).searchParams.get('token');
    if (!token) throw new Error('No token found in manifest URL. Try refreshing the page.');

    const headers = { 'Authorization': 'Bearer ' + token };

    const apiFetch = async path => {
      const res = await fetch(BASE + path, { headers });
      if (!res.ok) {
        if (res.status === 401) throw new Error('Token expired. Refresh the page and try again.');
        throw new Error('API error ' + res.status + ' on ' + path);
      }
      return res.json();
    };

    // --- Fetch template and bootstrap in parallel ---
    status('Fetching dashboard + exercise data…');
    const [templateRes, bootstrap] = await Promise.all([
      fetch(TEMPLATE_URL),
      apiFetch('/training/bootstrap'),
    ]);

    if (!templateRes.ok) throw new Error('Could not fetch dashboard template from GitHub.');
    const template = await templateRes.text();

    const exercises  = bootstrap.exercises  || [];
    const mesocycles = bootstrap.mesocycles || [];

    const exerciseMap = {};
    for (const ex of exercises) {
      exerciseMap[ex.id] = { name: ex.name, exerciseType: ex.exerciseType };
    }

    // --- Fetch each mesocycle ---
    const jsonData = [];

    for (let i = 0; i < mesocycles.length; i++) {
      const meso = mesocycles[i];
      status(`Fetching mesocycle ${i + 1}/${mesocycles.length}: ${meso.name}…`);

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
        workouts: [],
      };

      for (const week of (fullMeso.weeks || [])) {
        for (const day of (week.days || [])) {
          const weekNum = (day.week != null ? day.week : week.week) + 1;

          const workoutJson = {
            weekNumber: weekNum,
            dayNumber: day.position + 1,
            label: day.label || null,
            date: day.finishedAt || null,
            status: day.status || null,
            bodyweight: day.bodyweight || null,
            unit: day.unit || meso.unit || 'lb',
            exercises: [],
          };

          for (const ex of (day.exercises || [])) {
            const exInfo = exerciseMap[ex.exerciseId] || { name: 'Unknown Exercise', exerciseType: 'unknown' };

            const exJson = {
              name: exInfo.name,
              type: exInfo.exerciseType,
              muscleGroup: ex.muscleGroupId,
              muscleGroupName: MUSCLE_GROUPS[ex.muscleGroupId] || 'Unknown',
              sets: [],
            };

            for (const set of (ex.sets || [])) {
              if (set.status !== 'complete' && !set.finishedAt) continue;

              exJson.sets.push({
                setNumber: set.position + 1,
                weight: set.weight != null ? set.weight : null,
                reps: set.reps   != null ? set.reps   : null,
                unit: set.unit || 'lb',
                setType: set.setType || '',
                completedAt: set.finishedAt || null,
                status: set.status || '',
              });
            }

            if (exJson.sets.length) workoutJson.exercises.push(exJson);
          }

          if (workoutJson.exercises.length) mesoJson.workouts.push(workoutJson);
        }
      }

      jsonData.push(mesoJson);
    }

    // --- Inject data into the pre-opened window ---
    status('Opening dashboard…');
    const html = template.replace('__WORKOUT_DATA__', JSON.stringify(jsonData));
    win.document.open();
    win.document.write(html);
    win.document.close();

    const totalWorkouts = jsonData.reduce((s, m) => s + m.workouts.length, 0);
    status(`Done! ${mesocycles.length} mesocycles · ${totalWorkouts} workouts.`);
    setTimeout(cleanup, 4000);

  } catch (err) {
    status('Error: ' + err.message);
    console.error('RP Dashboard error:', err);
    setTimeout(cleanup, 8000);
  }
})();
