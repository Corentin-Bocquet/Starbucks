/* ============================================================
   EVER — Sante

   Point d'honnetete, ecrit une fois pour toutes : HealthKit est
   une API native iOS. Aucune page web, aucune PWA, aucun
   connecteur ne peut lire Apple Santé en direct. Ce n'est pas une
   limite de cette application, c'est une limite d'iOS.

   Le seul chemin qui existe reellement :
     Sante > photo de profil > Exporter toutes les données
     -> export.zip -> on le depose ici.

   Ce module lit ce fichier, agrege tout par jour, et garde ensuite
   les données en local. On peut reimporter un nouvel export quand
   on veut : seules les journées plus recentes sont ajoutées.

   Une saisie manuelle rapide couvre les jours entre deux exports.
   ============================================================ */
(function (global) {
  'use strict';

  const FFLATE = 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js';

  /* Types HealthKit retenus. Le reste est ignore volontairement :
     un export contient des centaines de types dont la plupart
     n'apportent rien a une lecture quotidienne. */
  const TYPES = {
    HKQuantityTypeIdentifierStepCount:              { k: 'steps',    agg: 'sum',  label: 'Pas',                icon: 'steps' },
    HKQuantityTypeIdentifierDistanceWalkingRunning: { k: 'distance', agg: 'sum',  label: 'Distance',           icon: 'map',    unit: 'km' },
    HKQuantityTypeIdentifierActiveEnergyBurned:     { k: 'active',   agg: 'sum',  label: 'Énergie active',     icon: 'flame',  unit: 'kcal' },
    HKQuantityTypeIdentifierBasalEnergyBurned:      { k: 'basal',    agg: 'sum',  label: 'Métabolisme de base', icon: 'flame', unit: 'kcal' },
    HKQuantityTypeIdentifierFlightsClimbed:         { k: 'floors',   agg: 'sum',  label: 'Étages',             icon: 'activity' },
    HKQuantityTypeIdentifierAppleExerciseTime:      { k: 'exercise', agg: 'sum',  label: 'Exercice',           icon: 'dumbbell', unit: 'min' },
    HKQuantityTypeIdentifierAppleStandTime:         { k: 'stand',    agg: 'sum',  label: 'Debout',             icon: 'clock',  unit: 'min' },
    HKQuantityTypeIdentifierHeartRate:              { k: 'hr',       agg: 'avg',  label: 'Fréquence cardiaque', icon: 'pulse', unit: 'bpm' },
    HKQuantityTypeIdentifierRestingHeartRate:       { k: 'hrRest',   agg: 'avg',  label: 'FC au repos',        icon: 'pulse',  unit: 'bpm' },
    HKQuantityTypeIdentifierWalkingHeartRateAverage:{ k: 'hrWalk',   agg: 'avg',  label: 'FC a la marche',     icon: 'pulse',  unit: 'bpm' },
    HKQuantityTypeIdentifierHeartRateVariabilitySDNN:{ k: 'hrv',     agg: 'avg',  label: 'Variabilite (VFC)',  icon: 'pulse',  unit: 'ms' },
    HKQuantityTypeIdentifierVO2Max:                 { k: 'vo2',      agg: 'last', label: 'VO2 max',            icon: 'activity', unit: 'ml/kg/min' },
    HKQuantityTypeIdentifierRespiratoryRate:        { k: 'resp',     agg: 'avg',  label: 'Respiration',        icon: 'water',  unit: '/min' },
    HKQuantityTypeIdentifierOxygenSaturation:       { k: 'spo2',     agg: 'avg',  label: 'Oxygene sanguin',    icon: 'water',  unit: '%' },
    HKQuantityTypeIdentifierBodyMass:               { k: 'weight',   agg: 'last', label: 'Poids',              icon: 'scale',  unit: 'kg' },
    HKQuantityTypeIdentifierBodyFatPercentage:      { k: 'fat',      agg: 'last', label: 'Masse grasse',       icon: 'scale',  unit: '%' },
    HKQuantityTypeIdentifierLeanBodyMass:           { k: 'lean',     agg: 'last', label: 'Masse maigre',       icon: 'scale',  unit: 'kg' },
    HKQuantityTypeIdentifierDietaryWater:           { k: 'hkWater',  agg: 'sum',  label: 'Eau',                icon: 'water',  unit: 'ml' },
    HKQuantityTypeIdentifierBloodPressureSystolic:  { k: 'bpSys',    agg: 'avg',  label: 'Tension systolique', icon: 'pulse' },
    HKQuantityTypeIdentifierBloodPressureDiastolic: { k: 'bpDia',    agg: 'avg',  label: 'Tension diastolique', icon: 'pulse' },
    HKCategoryTypeIdentifierSleepAnalysis:          { k: 'sleep',    agg: 'dur',  label: 'Sommeil',            icon: 'moon',   unit: 'min' },
    HKCategoryTypeIdentifierMindfulSession:         { k: 'mindful',  agg: 'dur',  label: 'Meditation',         icon: 'leaf',   unit: 'min' }
  };

  const WORKOUTS = {
    HKWorkoutActivityTypeRunning: 'Course', HKWorkoutActivityTypeWalking: 'Marche',
    HKWorkoutActivityTypeCycling: 'Velo', HKWorkoutActivityTypeSwimming: 'Natation',
    HKWorkoutActivityTypeTraditionalStrengthTraining: 'Musculation',
    HKWorkoutActivityTypeFunctionalStrengthTraining: 'Renforcement',
    HKWorkoutActivityTypeHighIntensityIntervalTraining: 'HIIT',
    HKWorkoutActivityTypeYoga: 'Yoga', HKWorkoutActivityTypeElliptical: 'Elliptique',
    HKWorkoutActivityTypeRowing: 'Rameur', HKWorkoutActivityTypeHiking: 'Randonnée',
    HKWorkoutActivityTypeTennis: 'Tennis', HKWorkoutActivityTypeSoccer: 'Football',
    HKWorkoutActivityTypeBasketball: 'Basket', HKWorkoutActivityTypeDownhillSkiing: 'Ski',
    HKWorkoutActivityTypeSnowboarding: 'Snowboard', HKWorkoutActivityTypeCoreTraining: 'Gainage',
    HKWorkoutActivityTypeOther: 'Autre'
  };

  let root = null;
  let range = 7;

  const daily = () => Store.all('healthDays');
  const dayOf = (k) => daily().find((d) => d.day === k) || null;
  const goals = () => Object.assign({ steps: 10000, exercise: 30, active: 500, sleep: 450 }, Store.get('healthGoals', {}));

  function lastDays(n) {
    const map = {}; daily().forEach((d) => map[d.day] = d);
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const k = UI.day.add(UI.day.today(), -i);
      out.push(map[k] || { day: k });
    }
    return out;
  }

  /* ============================================================
     Rendu
     ============================================================ */
  function mount(el) { root = el; render(); }

  function render() {
    const days = lastDays(range);
    const today = dayOf(UI.day.today()) || days[days.length - 1] || {};
    const has = daily().length > 0;

    root.innerHTML = '<div class="wrap">' +
      (has ? todayBlock(today) + rangeBar() + trendBlock(days) + workoutsBlock() + insightBlock(days) : onboarding()) +
      sourcesBlock() +
      '</div>';
    bind();
  }

  function onboarding() {
    return '<div class="section">' +
      '<div class="panel" style="text-align:center;padding:26px 18px">' +
        '<div class="ei" style="width:56px;height:56px;margin:0 auto 14px;border-radius:18px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)">' + Icon('heart', 28) + '</div>' +
        '<b style="font-size:18px;display:block;margin-bottom:8px">Importe tes données Apple Santé</b>' +
        '<p class="muted" style="font-size:13.5px;line-height:1.55;max-width:380px;margin:0 auto 16px">' +
          'iOS ne laisse aucune page web lire Santé en direct. Le seul chemin est un export, et il est simple.' +
        '</p>' +
        '<div class="list" style="text-align:left;margin-bottom:16px">' +
          step(1, 'Ouvre l\'app Santé sur ton iPhone') +
          step(2, 'Touche ta photo de profil, en haut a droite') +
          step(3, 'Descends jusqu\'a « Exporter toutes les données »') +
          step(4, 'Enregistre le fichier, puis reviens ici') +
        '</div>' +
        '<button class="btn primary block lg" data-act="import">' + Icon('upload', 18) + 'Choisir le fichier</button>' +
        '<button class="btn ghost block" style="margin-top:8px" data-act="manual">' + Icon('plus', 16) + 'Saisir une journée a la main</button>' +
        '<p class="muted" style="font-size:11.5px;margin-top:14px">Le fichier est lu sur l\'appareil. Rien n\'est envoye a un serveur.</p>' +
      '</div></div>';
  }
  const step = (n, t) => '<div class="rowitem"><span class="ic">' + n + '</span><span class="tx"><b style="font-weight:600">' + UI.esc(t) + '</b></span></div>';

  function todayBlock(d) {
    const g = goals();
    return '<div class="section" style="padding-top:14px">' +
      '<div class="sechead"><h2 style="font-size:17px">' + UI.esc(UI.day.label(d.day || UI.day.today())) + '</h2>' +
      '<span>' + (d.day === UI.day.today() ? 'Aujourd\'hui' : 'Dernier jour connu') + '</span></div>' +
      '<div class="panel"><div class="rings">' +
        UI.ring(d.active || 0, g.active, UI.fmt.n(d.active || 0), 'kcal actives') +
        UI.ring(d.exercise || 0, g.exercise, UI.fmt.n(d.exercise || 0), 'min exercice') +
        UI.ring(d.steps || 0, g.steps, UI.fmt.n(d.steps || 0), 'pas') +
      '</div></div>' +
      '<div class="stats" style="margin-top:12px">' +
        stat('Sommeil', d.sleep != null ? UI.fmt.dur(d.sleep) : '—', 'moon') +
        stat('FC repos', d.hrRest != null ? Math.round(d.hrRest) + ' bpm' : '—', 'pulse') +
        stat('VFC', d.hrv != null ? Math.round(d.hrv) + ' ms' : '—', 'pulse') +
        stat('Distance', d.distance != null ? UI.fmt.km(d.distance) : '—', 'map') +
        stat('Étages', d.floors != null ? UI.fmt.n(d.floors) : '—', 'activity') +
        stat('Poids', d.weight != null ? d.weight.toFixed(1).replace('.', ',') + ' kg' : lastKnown('weight'), 'scale') +
      '</div></div>';
  }
  const stat = (k, v, ic) => '<div class="stat"><div class="k">' + Icon(ic, 13) + UI.esc(k) + '</div><div class="v" style="font-size:19px">' + UI.esc(v) + '</div></div>';
  function lastKnown(key) {
    const rows = daily().filter((d) => d[key] != null).sort((a, b) => a.day < b.day ? 1 : -1);
    if (!rows.length) return '—';
    const v = rows[0][key];
    return (typeof v === 'number' ? v.toFixed(1).replace('.', ',') : v) + (key === 'weight' ? ' kg' : '');
  }

  function rangeBar() {
    return '<div class="seg full" style="margin:6px 0 2px">' +
      [7, 30, 90, 365].map((n) => '<button data-range="' + n + '" class="' + (range === n ? 'on' : '') + '">' +
        (n === 365 ? '1 an' : n + ' j') + '</button>').join('') + '</div>';
  }

  function trendBlock(days) {
    const series = [
      { k: 'steps',    label: 'Pas',            fmt: (v) => UI.fmt.n(v) },
      { k: 'active',   label: 'Énergie active', fmt: (v) => UI.fmt.n(v) + ' kcal' },
      { k: 'sleep',    label: 'Sommeil',        fmt: (v) => UI.fmt.dur(v) },
      { k: 'hrRest',   label: 'FC au repos',    fmt: (v) => Math.round(v) + ' bpm' },
      { k: 'hrv',      label: 'Variabilite',    fmt: (v) => Math.round(v) + ' ms' },
      { k: 'weight',   label: 'Poids',          fmt: (v) => v.toFixed(1).replace('.', ',') + ' kg' }
    ];
    const cards = series.map((s) => {
      const vals = days.map((d) => d[s.k]).filter((v) => v != null);
      if (vals.length < 2) return '';
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const half = Math.floor(vals.length / 2);
      const a1 = vals.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
      const a2 = vals.slice(half).reduce((a, b) => a + b, 0) / (vals.length - half || 1);
      const delta = a1 ? ((a2 - a1) / a1) * 100 : 0;
      const good = s.k === 'hrRest' ? delta < 0 : true;
      return '<div class="panel" style="margin-bottom:10px">' +
        '<div class="row-between"><b style="font-size:14px">' + s.label + '</b>' +
        '<span class="muted" style="font-size:12.5px">moyenne ' + s.fmt(avg) + '</span></div>' +
        UI.sparkline(days.map((d) => d[s.k] == null ? null : d[s.k]).filter((v) => v != null)) +
        '<div class="d ' + (Math.abs(delta) < 2 ? 'flat' : (delta > 0) === good ? 'up' : 'down') + '" style="font-size:12px;font-weight:650">' +
          (Math.abs(delta) < 2 ? 'stable' : (delta > 0 ? '+' : '') + delta.toFixed(0) + ' % sur la période') +
        '</div></div>';
    }).join('');
    return '<div class="section">' + (cards || UI.empty('chart', 'Pas assez de données', 'Importé un export plus large pour voir les tendances.')) + '</div>';
  }

  function workoutsBlock() {
    const w = Store.all('workouts').sort((a, b) => b.start - a.start).slice(0, 12);
    if (!w.length) return '';
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Entrainements</h2><span>' + Store.all('workouts').length + '</span></div>' +
      '<div class="list">' + w.map((x) =>
        '<div class="rowitem"><span class="ic">' + Icon('dumbbell', 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(x.nom) + '</b><small>' + UI.esc(UI.fmt.dateShort(x.start)) + ' · ' + UI.fmt.dur(x.minutes) +
        (x.km ? ' · ' + UI.fmt.km(x.km) : '') + '</small></span>' +
        '<span class="rt tabnum">' + (x.kcal ? UI.fmt.n(x.kcal) + ' kcal' : '') + '</span></div>').join('') + '</div></div>';
  }

  function insightBlock(days) {
    const cached = Store.get('healthInsight', null);
    const fresh = cached && Date.now() - cached.at < 20 * 3600e3;
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Lecture de la forme</h2>' +
      (fresh ? '<button data-act="insight">Refaire</button>' : '') + '</div>' +
      (fresh
        ? '<div class="panel" style="background:var(--accent-soft)"><div class="row" style="align-items:flex-start;gap:10px">' + Icon('sparkle', 18) +
          '<div><p style="font-size:14px;line-height:1.55">' + UI.esc(cached.data.lecture) + '</p>' +
          (cached.data.points && cached.data.points.length ? '<ul style="padding-left:18px;margin-top:10px">' + cached.data.points.map((p) => '<li style="font-size:13.5px;margin-bottom:5px">' + UI.esc(p) + '</li>').join('') + '</ul>' : '') +
          (cached.data.action ? '<p style="margin-top:12px;font-size:13.5px"><b>À faire aujourd\'hui : </b>' + UI.esc(cached.data.action) + '</p>' : '') +
          '</div></div></div>'
        : '<div class="panel" style="text-align:center"><p class="muted" style="font-size:13px;margin-bottom:12px">Sommeil, cardio, activité et alimentation croises en une lecture courte.</p>' +
          '<button class="btn primary" data-act="insight">' + Icon('sparkle', 17) + 'Analyser</button></div>') +
      '</div>';
  }

  function sourcesBlock() {
    const meta = Store.get('healthImport', null);
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Données</h2></div>' +
      '<div class="list">' +
        '<button class="rowitem" data-act="import"><span class="ic">' + Icon('upload', 17) + '</span>' +
          '<span class="tx"><b>Importer un export Apple Santé</b><small>' +
          (meta ? UI.fmt.n(meta.records) + ' mesures · ' + UI.fmt.dateShort(meta.at) : 'export.zip ou export.xml') + '</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></button>' +
        '<button class="rowitem" data-act="manual"><span class="ic">' + Icon('edit', 17) + '</span>' +
          '<span class="tx"><b>Saisir une journée</b><small>Entre deux exports</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></button>' +
        '<button class="rowitem" data-act="goals"><span class="ic">' + Icon('target', 17) + '</span>' +
          '<span class="tx"><b>Mes objectifs</b><small>Pas, exercice, énergie, sommeil</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></button>' +
        (daily().length ? '<button class="rowitem" data-act="clear"><span class="ic" style="background:var(--danger-soft);color:var(--danger)">' + Icon('trash', 17) + '</span>' +
          '<span class="tx"><b>Effacer les données santé</b><small>' + daily().length + ' journées</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></button>' : '') +
      '</div>' +
      '<p class="muted" style="font-size:11.5px;margin-top:10px;line-height:1.5">' +
      'Apple Santé ne propose aucune connexion directe pour le web. Un export met une a deux minutes a se générer sur l\'iPhone et couvre tout l\'historique.</p>' +
      '</div>';
  }

  function bind() {
    root.querySelectorAll('[data-range]').forEach((b) => b.onclick = () => { range = +b.dataset.range; render(); });
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => acts[b.dataset.act] && acts[b.dataset.act]());
  }

  const acts = {
    import: () => importFlow(),
    manual: () => manualDay(),
    goals: () => editGoals(),
    insight: () => insight(),
    clear: async () => {
      if (!await UI.confirmSheet('Effacer les données santé', 'Les journées importées et les entrainements seront supprimes de cet appareil.', true)) return;
      Store.all('healthDays').forEach((d) => Store.del('healthDays', d.id));
      Store.all('workouts').forEach((d) => Store.del('workouts', d.id));
      Store.set('healthImport', null);
      render(); UI.toast('Effacé');
    }
  };

  /* ============================================================
     Import
     ============================================================ */
  function importFlow() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.xml,application/zip,text/xml';
    input.onchange = async () => {
      const f = input.files && input.files[0];
      if (!f) return;
      const box = UI.openSheet('<div class="mbody"><h2 style="font-size:20px;margin-bottom:14px">Import en cours</h2>' +
        '<div class="bar-track"><div class="bar-fill" data-prog style="width:2%"></div></div>' +
        '<p class="muted" style="font-size:13px;margin-top:10px" data-msg>Lecture du fichier…</p></div>');
      const msg = (t) => { const e = box.querySelector('[data-msg]'); if (e) e.textContent = t; };
      const prog = (p) => { const e = box.querySelector('[data-prog]'); if (e) e.style.width = Math.max(2, Math.min(100, p * 100)).toFixed(0) + '%'; };

      try {
        let stats;
        if (/\.zip$/i.test(f.name) || f.type === 'application/zip') {
          msg('Décompression…');
          const xml = await unzipExport(f);
          msg('Analyse des mesures…');
          stats = await parseXmlText(xml, prog, msg);
        } else {
          stats = await parseXmlFile(f, prog, msg);
        }
        commit(stats);
        UI.closeSheet();
        UI.toast(UI.fmt.n(stats.records) + ' mesures importées');
        if (global.Game) Game.award('import-sante', 40);
        render();
      } catch (e) {
        UI.closeSheet();
        console.error(e);
        UI.openSheet('<div class="mbody"><h2 style="font-size:20px">Import impossible</h2>' +
          '<p class="mdesc">' + UI.esc(String(e.message || e)) + '</p>' +
          '<div class="banner warn" style="margin-top:14px">' + Icon('info', 18) +
          '<span>Si le fichier dépassé quelques centaines de mega-octets, dezippe-le sur ton telephone et choisis directement <b>export.xml</b> : la lecture se fait alors par morceaux et ne sature plus la memoire.</span></div></div>');
      }
    };
    input.click();
  }

  function loadFflate() {
    if (global.fflate) return Promise.resolve(global.fflate);
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = FFLATE; s.onload = () => res(global.fflate); s.onerror = () => rej(new Error('Décompression indisponible hors ligne'));
      document.head.appendChild(s);
    });
  }

  async function unzipExport(file) {
    const fflate = await loadFflate();
    const buf = new Uint8Array(await file.arrayBuffer());
    const files = fflate.unzipSync(buf, {
      filter: (f) => /export\.xml$/i.test(f.name) || /экспорт|Exportar|Ausfuhr/i.test(f.name)
    });
    const name = Object.keys(files).find((n) => /export\.xml$/i.test(n)) || Object.keys(files)[0];
    if (!name) throw new Error("export.xml introuvable dans l'archive");
    return new TextDécoder('utf-8').decode(files[name]);
  }

  /* Lecture par tranches : on ne charge jamais tout le XML d'un
     coup, et on garde la fin de chaque tranche pour ne pas couper
     un enregistrement en deux. */
  function parseXmlFile(file, prog, msg) {
    return new Promise((resolve, reject) => {
      const CHUNK = 4 * 1024 * 1024;
      const acc = newAcc();
      let offset = 0, tail = '';
      const dec = new TextDécoder('utf-8');
      const reader = new FileReader();

      reader.onerror = () => reject(new Error('Lecture du fichier interrompue'));
      reader.onload = () => {
        const text = tail + dec.decode(new Uint8Array(reader.result), { stream: true });
        const cut = text.lastIndexOf('<');
        const usable = cut > 0 ? text.slice(0, cut) : text;
        tail = cut > 0 ? text.slice(cut) : '';
        scan(usable, acc);
        offset += CHUNK;
        prog(Math.min(0.98, offset / file.size));
        if (offset < file.size) next();
        else { scan(tail, acc); msg('Consolidation…'); resolve(finish(acc)); }
      };
      const next = () => reader.readAsArrayBuffer(file.slice(offset, offset + CHUNK));
      next();
    });
  }

  async function parseXmlText(text, prog, msg) {
    const acc = newAcc();
    const CH = 4 * 1024 * 1024;
    for (let i = 0; i < text.length; i += CH) {
      scan(text.slice(i, i + CH + 4096), acc);
      prog(i / text.length);
      await UI.sleep(0);
    }
    msg('Consolidation…');
    return finish(acc);
  }

  function newAcc() { return { days: {}, workouts: [], records: 0, seen: new Set() }; }

  const RE_RECORD = /<Record\s+type="([^"]+)"[^>]*?(?:unit="([^"]*)"\s*)?startDate="([^"]+)"[^>]*?endDate="([^"]+)"[^>]*?value="([^"]*)"/g;
  const RE_WORKOUT = /<Workout\s+workoutActivityType="([^"]+)"[^>]*?duration="([^"]*)"[^>]*?(?:duration[Uu]nit="([^"]*)")?[^>]*?startDate="([^"]+)"/g;
  const RE_WO_DIST = /totalDistance="([\d.]+)"/;
  const RE_WO_KCAL = /totalEnergyBurned="([\d.]+)"/;

  function scan(text, acc) {
    let m;
    RE_RECORD.lastIndex = 0;
    while ((m = RE_RECORD.exec(text))) {
      const type = m[1], unit = m[2] || '', start = m[3], end = m[4], value = m[5];
      const def = TYPES[type];
      if (!def) continue;
      const dayKey = start.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) continue;

      /* Anti-doublon : un export contient les mêmes mesures venues
         du telephone et de la montre. */
      const sig = type + '|' + start + '|' + value;
      if (acc.seen.has(sig)) continue;
      acc.seen.add(sig);
      if (acc.seen.size > 900000) acc.seen.clear();

      const d = acc.days[dayKey] || (acc.days[dayKey] = {});
      const slot = d[def.k] || (d[def.k] = { sum: 0, n: 0, last: null, dur: 0 });
      acc.records++;

      if (def.agg === 'dur') {
        if (type === 'HKCategoryTypeIdentifierSleepAnalysis' && /Awake/i.test(value)) continue;
        slot.dur += minutesBetween(start, end);
      } else {
        let v = parseFloat(value);
        if (isNaN(v)) continue;
        if (def.unit === 'km' && /^mi$/i.test(unit)) v *= 1.60934;
        if (def.k === 'spo2' && v <= 1) v *= 100;
        slot.sum += v; slot.n++; slot.last = v;
      }
    }

    RE_WORKOUT.lastIndex = 0;
    while ((m = RE_WORKOUT.exec(text))) {
      const tag = text.slice(m.index, m.index + 700);
      const dist = RE_WO_DIST.exec(tag), kcal = RE_WO_KCAL.exec(tag);
      acc.workouts.push({
        nom: WORKOUTS[m[1]] || m[1].replace('HKWorkoutActivityType', ''),
        minutes: Math.round(parseFloat(m[2]) || 0),
        start: new Date(m[4]).getTime(),
        km: dist ? parseFloat(dist[1]) : null,
        kcal: kcal ? Math.round(parseFloat(kcal[1])) : null
      });
    }
  }

  function minutesBetween(a, b) {
    const t1 = new Date(a.replace(' ', 'T')).getTime(), t2 = new Date(b.replace(' ', 'T')).getTime();
    if (isNaN(t1) || isNaN(t2)) return 0;
    return Math.max(0, (t2 - t1) / 60000);
  }

  function finish(acc) {
    const out = { days: [], workouts: acc.workouts, records: acc.records };
    Object.keys(acc.days).forEach((k) => {
      const src = acc.days[k], row = { day: k };
      Object.keys(TYPES).forEach((t) => {
        const def = TYPES[t], s = src[def.k];
        if (!s) return;
        if (def.agg === 'sum') row[def.k] = round2(s.sum);
        else if (def.agg === 'avg') row[def.k] = s.n ? round2(s.sum / s.n) : null;
        else if (def.agg === 'last') row[def.k] = s.last;
        else if (def.agg === 'dur') row[def.k] = Math.round(s.dur);
      });
      out.days.push(row);
    });
    out.days.sort((a, b) => a.day < b.day ? -1 : 1);
    return out;
  }
  const round2 = (v) => Math.round(v * 100) / 100;

  function commit(stats) {
    const existing = {};
    Store.all('healthDays').forEach((d) => existing[d.day] = d);
    stats.days.forEach((row) => {
      if (existing[row.day]) Store.put('healthDays', existing[row.day].id, row);
      else Store.add('healthDays', row);
    });
    const known = new Set(Store.all('workouts').map((w) => w.start + '|' + w.nom));
    stats.workouts.forEach((w) => { if (!known.has(w.start + '|' + w.nom)) Store.add('workouts', w); });
    Store.set('healthImport', { at: Date.now(), records: stats.records, days: stats.days.length });
    Store.set('healthInsight', null);
  }

  /* ============================================================
     Saisie manuelle et objectifs
     ============================================================ */
  async function manualDay() {
    const k = UI.day.today();
    const cur = dayOf(k) || {};
    const res = await UI.promptSheet('Journée du ' + UI.day.label(k), [
      { name: 'steps', label: 'Pas', type: 'number', inputmode: 'numeric', value: cur.steps || '' },
      { name: 'exercise', label: 'Minutes d\'exercice', type: 'number', inputmode: 'numeric', value: cur.exercise || '' },
      { name: 'active', label: 'Calories actives', type: 'number', inputmode: 'numeric', value: cur.active || '' },
      { name: 'sleep', label: 'Sommeil (minutes)', type: 'number', inputmode: 'numeric', value: cur.sleep || '' },
      { name: 'hrRest', label: 'FC au repos', type: 'number', inputmode: 'numeric', value: cur.hrRest || '' },
      { name: 'weight', label: 'Poids (kg)', type: 'number', step: '0.1', inputmode: 'decimal', value: cur.weight || '' }
    ], 'Enregistrer');
    if (!res) return;
    const row = { day: k };
    Object.keys(res).forEach((f) => { if (res[f] !== '') row[f] = Number(res[f]); });
    if (cur.id) Store.put('healthDays', cur.id, row); else Store.add('healthDays', row);
    Store.set('healthInsight', null);
    render(); UI.toast('Enregistre');
  }

  async function editGoals() {
    const g = goals();
    const res = await UI.promptSheet('Mes objectifs', [
      { name: 'steps', label: 'Pas par jour', type: 'number', inputmode: 'numeric', value: g.steps },
      { name: 'exercise', label: 'Minutes d\'exercice', type: 'number', inputmode: 'numeric', value: g.exercise },
      { name: 'active', label: 'Calories actives', type: 'number', inputmode: 'numeric', value: g.active },
      { name: 'sleep', label: 'Sommeil (minutes)', type: 'number', inputmode: 'numeric', value: g.sleep }
    ], 'Enregistrer');
    if (!res) return;
    Store.set('healthGoals', { steps: +res.steps || 10000, exercise: +res.exercise || 30, active: +res.active || 500, sleep: +res.sleep || 450 });
    render();
  }

  /* ============================================================
     Lecture IA
     ============================================================ */
  const INSIGHT_SCHEMA = AI.T.obj({
    lecture: AI.T.str('Trois phrases maximum, un constat honnete de la forme actuelle'),
    points: AI.T.arr(AI.T.str(''), 'Trois observations concretes, chiffrees'),
    action: AI.T.str('Une seule action pour aujourd hui, précise et réalisable')
  });

  async function insight() {
    if (!AI.available()) { UI.toast('Ajoute ta clé Gemini dans Réglages'); App.go('#/m/settings/ia'); return; }
    const days = lastDays(Math.max(14, range));
    const food = global.Food ? Food.summary(7) : [];
    UI.toast('Analyse…');
    const table = days.filter((d) => d.steps != null || d.sleep != null).map((d) =>
      d.day + ' : ' + [
        d.steps != null ? d.steps + ' pas' : null,
        d.exercise != null ? d.exercise + ' min exercice' : null,
        d.active != null ? Math.round(d.active) + ' kcal actives' : null,
        d.sleep != null ? Math.round(d.sleep) + ' min de sommeil' : null,
        d.hrRest != null ? 'FC repos ' + Math.round(d.hrRest) : null,
        d.hrv != null ? 'VFC ' + Math.round(d.hrv) + ' ms' : null,
        d.weight != null ? d.weight + ' kg' : null
      ].filter(Boolean).join(', ')).join('\n');

    const nutri = food.filter((f) => f.kcal).map((f) => f.day + ' : ' + Math.round(f.kcal) + ' kcal, ' + Math.round(f.prot) + ' g de protéines').join('\n');

    try {
      const res = await AI.json(
        "Tu lis des données Apple Santé. Sois factuel, direct, sans flatterie et sans alarmisme. Tu n'es pas medecin : aucune conclusion diagnostique.\n\n" +
        "DONNEES QUOTIDIENNES :\n" + table + "\n\n" +
        (nutri ? "ALIMENTATION :\n" + nutri + "\n\n" : "") +
        "Objectifs : " + JSON.stringify(goals()) + "\n\n" +
        "Croise sommeil, fréquence cardiaque au repos, variabilite et activité. Signale une tendance seulement si elle est visible dans les chiffres. Réponds en francais.",
        INSIGHT_SCHEMA, { cache: false, temperature: 0.5 });
      Store.set('healthInsight', { at: Date.now(), data: res });
      render();
    } catch (e) { UI.toast(AI.humanError(e)); }
  }

  /* Expose pour les autres modules. */
  function today() { return dayOf(UI.day.today()) || {}; }
  function streakActive(goalSteps) {
    const g = goalSteps || goals().steps;
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const d = dayOf(UI.day.add(UI.day.today(), -i));
      if (d && d.steps >= g) n++; else if (i > 0) break;
    }
    return n;
  }

  global.Health = { mount, today, lastDays, goals, streakActive, TYPES };
  App.register('health', { mount: mount });
})(window);
