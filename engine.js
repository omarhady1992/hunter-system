/* Hunter System engine: pure functions. Turns fitness-data (data.json) + manual ticks into XP, levels, stats, ranks. */
(function (root) {
  'use strict';
  const DAYS = ['Day 1 Pull', 'Day 2 Push', 'Day 3 Legs', 'Day 4 EMOM', 'Day 5 Skills'];
  const XP = {
    training: 60, activity: 30, rest: 20, protein: 30, proteinPartial: 10, kcal: 25, lunch: 10, logged: 10,
    water: 10, posture: 15, midday: 10, midafternoon: 15, penaltyClear: 50, weekly: 100,
    weightMilestone: 75, boss: 150, bossImprove: 50, skill: 200,
  };
  const MANUAL = [
    { id: 'water', label: 'Drink 3 L of water', xp: XP.water, stat: 'VIT' },
    { id: 'posture', label: 'Posture block after the warm-up', xp: XP.posture, stat: 'PER' },
    { id: 'midday', label: 'Midday posture fix', xp: XP.midday, stat: 'PER' },
    { id: 'midafternoon', label: '100 g protein by mid-afternoon', xp: XP.midafternoon, stat: 'VIT' },
  ];
  const SKILLS = [
    { id: 'archer', label: 'Clean archer pull-up (3 per side)', stat: 'STR' },
    { id: 'lsit', label: 'Tucked L-sit, 10 s', stat: 'PER' },
    { id: 'pistol', label: 'Unassisted pistol squat (1 per side)', stat: 'AGI' },
    { id: 'mut', label: 'Muscle-up transition on the bar', stat: 'STR' },
    { id: 'muscleup', label: 'First full muscle-up', stat: 'STR' },
    { id: 'hs60', label: 'Handstand hold, 60 s', stat: 'PER' },
  ];
  const RANKS = [
    { r: 'E', lv: 1, wm: 0, bosses: 0, skills: [], label: 'Starting rank' },
    { r: 'D', lv: 10, wm: 0, bosses: 1, skills: [], label: 'Level 10 and clear your first Boss (benchmark test)' },
    { r: 'C', lv: 20, wm: 2, bosses: 1, skills: ['archer'], label: 'Level 20, 1 kg down, clean archer pull-up' },
    { r: 'B', lv: 30, wm: 4, bosses: 3, skills: ['archer', 'lsit'], label: 'Level 30, 2 kg down, 3 Bosses, tucked L-sit' },
    { r: 'A', lv: 40, wm: 6, bosses: 4, skills: ['archer', 'lsit', 'pistol', 'mut'], label: 'Level 40, 3 kg down, pistol squat, muscle-up transition' },
    { r: 'S', lv: 50, wm: 8, bosses: 6, skills: ['archer', 'lsit', 'pistol', 'mut', 'muscleup', 'hs60'], label: 'Level 50, 4 kg down, first muscle-up, 60 s handstand' },
  ];
  const WEIGHT_BASE = 75.5; // home scale, Nov 7 2026
  const GATES = [
    { id: 'camp', kind: 'gate', name: 'Red Gate: Field Camp', from: '2026-11-08', to: '2026-11-22', detail: 'Survive the hitch: train on the goal posts, hit protein with camp food. Clinic scale is its own series.' },
    { id: 'boss1', kind: 'boss', name: 'Boss 1: First Benchmark', from: '2026-11-15', to: '2026-11-15', detail: 'Day 5. Max push-ups, max pull-ups, longest handstand hold.' },
    { id: 'deload1', kind: 'dungeon', name: 'Dungeon: Deload Week', from: '2026-12-03', to: '2026-12-10', detail: 'About 60% of normal volume. Clear it by showing up and holding back.' },
    { id: 'boss2', kind: 'boss', name: 'Boss 2: Benchmark', from: '2026-12-13', to: '2026-12-13', detail: 'Beat Boss 1 numbers for bonus XP.' },
    { id: 'restfloor', kind: 'floor', name: 'Rest Floor: Diet Break', from: '2027-01-01', to: '2027-01-14', detail: '1-2 weeks at maintenance calories. Training continues; kcal quest becomes maintenance.' },
    { id: 'boss3', kind: 'boss', name: 'Boss 3: Benchmark', from: '2027-01-10', to: '2027-01-10', detail: 'Every 4 weeks.' },
    { id: 'deload2', kind: 'dungeon', name: 'Dungeon: Deload Week', from: '2027-01-14', to: '2027-01-21', detail: 'Second deload, 5-6 weeks after the first.' },
    { id: 'boss4', kind: 'boss', name: 'Boss 4: Benchmark', from: '2027-02-07', to: '2027-02-07', detail: 'Every 4 weeks.' },
  ];

  const pad = n => String(n).padStart(2, '0');
  const toD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const fromD = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  const addDays = (s, n) => { const d = toD(s); d.setUTCDate(d.getUTCDate() + n); return fromD(d); };
  const dow = s => toD(s).getUTCDay();
  function todayLocal() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function need(level) { return 100 + 20 * level; } // XP from level -> level+1
  function levelFromXp(xp) {
    let lv = 1, rest = xp;
    while (rest >= need(lv)) { rest -= need(lv); lv++; }
    return { level: lv, into: rest, need: need(lv) };
  }

  function parsePRs(workouts) {
    const pr = { dips: null, planche: null, handstand: null };
    for (const w of workouts) {
      const n = w.notes || '';
      let m = n.match(/dips[^(]*?\((\d+)/i); if (m) pr.dips = Math.max(pr.dips || 0, +m[1]);
      m = n.match(/planche[^(]*?\((\d+)/i); if (m) pr.planche = Math.max(pr.planche || 0, +m[1]);
      m = n.match(/handstand[^;.]*?((?:\d+\/)+\d+)\s*s/i);
      if (m) pr.handstand = Math.max(pr.handstand || 0, ...m[1].split('/').map(Number));
      m = n.match(/handstand[^;.]*?\d+\s*x\s*(\d+)\s*s/i); if (m) pr.handstand = Math.max(pr.handstand || 0, +m[1]);
      for (const ex of (w.exercises || [])) {
        const nm = (ex.name || '').toLowerCase(), sets = ex.sets || [];
        if (/handstand/.test(nm) && /hold/.test(nm)) for (const s of sets) if (s.seconds) pr.handstand = Math.max(pr.handstand || 0, s.seconds);
        if (/dips/.test(nm)) { const t = sets.reduce((a, s) => a + (s.reps || 0), 0); if (t) pr.dips = Math.max(pr.dips || 0, t); }
        if (/planche/.test(nm)) { const t = sets.reduce((a, s) => a + (s.reps || 0), 0); if (t) pr.planche = Math.max(pr.planche || 0, t); }
      }
    }
    return pr;
  }

  function weightInfo(weights) {
    const home = [], clinic = [];
    for (const w of weights || []) (w.source === 'clinic' ? clinic : home).push(w);
    home.sort((a, b) => a.date.localeCompare(b.date)); clinic.sort((a, b) => a.date.localeCompare(b.date));
    // Home: milestones measured from 75.5 kg. Clinic: from its own first reading. Never mixed.
    const hMin = home.filter(w => w.date >= '2026-11-07').reduce((m, w) => Math.min(m, w.kg), WEIGHT_BASE);
    const hMs = Math.max(0, Math.floor((WEIGHT_BASE - hMin) / 0.5 + 1e-9));
    let cMs = 0, cBase = null;
    if (clinic.length) { cBase = clinic[0].kg; const cMin = Math.min(...clinic.map(w => w.kg)); cMs = Math.max(0, Math.floor((cBase - cMin) / 0.5 + 1e-9)); }
    return { home, clinic, homeMilestones: hMs, clinicMilestones: cMs, clinicBase: cBase, milestones: Math.max(hMs, cMs), homeBest: hMin };
  }

  /* data: fitness data.json; st: local state {manual:{date:{id:true}}, bosses:[...], skills:{id:date}, alloc:{STR..}, penalties:{date:true}} */
  function compute(data, st, today) {
    today = today || todayLocal();
    st = st || {};
    const manual = st.manual || {};
    const workouts = (data.workouts || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const food = data.food || [], acts = data.activities || [];
    const byDate = {};
    const day = d => byDate[d] || (byDate[d] = { date: d, food: [], train: [], other: [], acts: [] });
    for (const f of food) day(f.date).food.push(f);
    for (const w of workouts) (DAYS.includes(w.day) ? day(w.date).train : day(w.date).other).push(w);
    for (const a of acts) day(a.date).acts.push(a);
    const dates = Object.keys(byDate).concat(Object.keys(manual)).sort();
    if (!dates.length) return null;
    const start = dates[0];
    const days = [];
    let total = 0, restRun = 0, trainRun = 0, lastCycle = null;
    const counts = { STR: 0, AGI: 0, VIT: 0, PER: 0, INT: 0 };
    const tally = { sessions: 0, cycles: 0, proteinDays: 0, loggedDays: 0, football: 0, camp: 0, hospitality: 0, iron: 0, combo: 0 };
    const penalties = [];
    let cycleStep = 0;
    for (let d = start; d <= today; d = addDays(d, 1)) {
      const b = byDate[d] || { date: d, food: [], train: [], other: [], acts: [] };
      const m = manual[d] || {};
      const isToday = d === today;
      const q = [];
      const add = (id, label, xp, done, src, stat) => { q.push({ id, label, xp, done: !!done, src }); if (done) { total += xp; dayXp += xp; if (stat) counts[stat] += 1; } };
      let dayXp = 0;
      // Training / rest
      const trained = b.train.length > 0 || (!!m.trained && b.train.length === 0);
      if (b.train.length) {
        for (const w of b.train) {
          add('train', 'Training: ' + w.day, XP.training, true, 'data', /Pull|Push|Legs/.test(w.day) ? 'STR' : /EMOM/.test(w.day) ? 'AGI' : 'PER');
          tally.sessions++;
          if (d >= '2026-11-08' && d <= '2026-11-22') tally.camp++;
          if (/25-hour/i.test(w.notes || '')) tally.iron++;
          const idx = DAYS.indexOf(w.day);
          if (idx === cycleStep) { cycleStep = (cycleStep + 1) % 5; if (cycleStep === 0) tally.cycles++; } else cycleStep = idx === 0 ? 1 : 0;
          lastCycle = w.day;
        }
      } else if (m.trained) add('train', 'Training session (ticked, waiting for the log)', XP.training, true, 'manual', 'STR');
      if (trained) { restRun = 0; trainRun++; }
      else if (!isToday || m.rest) {
        restRun++; trainRun = 0;
        const ok = restRun <= 2;
        add('rest', ok ? 'Rest day within the rules' : 'Rest day ' + restRun + ' in a row', XP.rest, ok, isToday ? 'manual' : 'data');
        if (!ok) penalties.push(d);
      }
      // Extra activity
      const extra = b.other.length + b.acts.length;
      if (extra) {
        const lbl = (b.other[0] && /football/i.test(b.other[0].notes || '')) || (b.acts[0] && /foot|soccer|5-a-side/i.test(b.acts[0].type || '')) ? 'Football' : 'Extra activity';
        if (lbl === 'Football') tally.football++;
        if (b.train.length) tally.combo++;
        add('extra', lbl, XP.activity, true, 'data', 'AGI');
      }
      // Diet
      const hasFood = b.food.length > 0;
      const p = b.food.reduce((a, f) => a + (+f.proteinG || 0), 0), k = b.food.reduce((a, f) => a + (+f.kcal || 0), 0);
      const lunchP = b.food.filter(f => f.meal === 'Lunch').reduce((a, f) => a + (+f.proteinG || 0), 0);
      const hosp = b.food.some(f => /in-law|hospitality/i.test(f.description || ''));
      if (hosp) tally.hospitality++;
      const restFloor = d >= '2027-01-01' && d <= '2027-01-14';
      if (hasFood) {
        if (p >= 140) { add('protein', 'Protein 140 g+ (' + Math.round(p) + ' g)', XP.protein, true, 'data', 'VIT'); tally.proteinDays++; }
        else if (p >= 120) add('protein', 'Protein 120 g+, partial (' + Math.round(p) + ' g)', XP.proteinPartial, true, 'data');
        else add('protein', 'Protein 140 g+ (' + Math.round(p) + ' g so far)', XP.protein, false, 'data');
        const kOk = hosp || (restFloor ? k >= 1900 && k <= 2300 : k >= 1450 && k <= 1750);
        add('kcal', (hosp ? 'Calories: hospitality meal, no penalty' : restFloor ? 'Maintenance calories' : 'Calories 1,600-1,700') + ' (' + Math.round(k).toLocaleString('en-US') + ' kcal)', XP.kcal, kOk && (!isToday || k >= 1450), 'data');
        add('lunch', 'Lunch 40 g+ protein' + (lunchP ? ' (' + Math.round(lunchP) + ' g)' : ''), XP.lunch, lunchP >= 40 || m.lunch, lunchP >= 40 ? 'data' : 'manual', 'VIT');
        const logged = b.food.length >= 3;
        if (logged) tally.loggedDays++;
        add('logged', 'Log every meal (3+ entries)', XP.logged, logged, 'data', 'INT');
      } else {
        add('protein', 'Protein 140 g+', XP.protein, !!m.protein, 'manual', 'VIT');
        add('kcal', 'Calories 1,600-1,700', XP.kcal, !!m.kcal, 'manual');
        add('lunch', 'Lunch 40 g+ protein', XP.lunch, !!m.lunch, 'manual', 'VIT');
      }
      for (const mq of MANUAL) add(mq.id, mq.label, mq.xp, !!m[mq.id], 'manual', mq.stat);
      if (st.penalties && st.penalties[d]) { total += XP.penaltyClear; dayXp += XP.penaltyClear; }
      const core = q.filter(x => (x.id === 'train' || x.id === 'rest' || x.id === 'protein')).every(x => x.done) && q.some(x => x.id === 'protein' && x.done && x.xp === XP.protein) && q.some(x => (x.id === 'train' || x.id === 'rest') && x.done);
      days.push({ date: d, quests: q, xp: dayXp, protein: hasFood ? p : null, kcal: hasFood ? k : null, train: b.train.map(w => w.day), notes: b.train.concat(b.other).map(w => w.notes).filter(Boolean), core, restRun, hosp, isToday });
      // Weekly quest closes on Saturday (week starts Sunday)
      if (dow(d) === 6 || isToday) {
        const wk = days.slice(-7).filter(x => x.date > addDays(d, -7));
        const sess = wk.reduce((a, x) => a + x.train.length, 0), rests = wk.filter(x => !x.train.length && !x.isToday).length;
        const pen = wk.some(x => penalties.includes(x.date));
        if (dow(d) === 6 && wk.length === 7 && sess >= 4 && rests >= 1 && !pen) { total += XP.weekly; days[days.length - 1].xp += XP.weekly; days[days.length - 1].weekly = true; }
      }
    }
    // Weight, bosses, skills
    const wi = weightInfo(data.weight);
    total += wi.milestones * XP.weightMilestone; counts.VIT += wi.milestones * 2;
    const bosses = (st.bosses || []).map(b => Object.assign({}, b)).sort((a, b) => a.date.localeCompare(b.date));
    let prev = null;
    for (const bo of bosses) {
      let x = XP.boss; bo.improved = [];
      if (prev) for (const k of ['pushups', 'pullups', 'hold']) if (+bo[k] > +prev[k]) { x += XP.bossImprove; bo.improved.push(k); }
      bo.xp = x; total += x; counts.STR += 2; counts.PER += 1; prev = bo;
    }
    const skills = st.skills || {};
    const skillCount = Object.keys(skills).filter(k => skills[k]).length;
    total += skillCount * XP.skill;
    for (const s of SKILLS) if (skills[s.id]) counts[s.stat] += 3;
    const pr = parsePRs(workouts);
    const lv = levelFromXp(total);
    // Rank
    let rank = RANKS[0], next = RANKS[1];
    for (let i = 1; i < RANKS.length; i++) {
      const R = RANKS[i];
      const ok = lv.level >= R.lv && wi.milestones >= R.wm && bosses.length >= R.bosses && R.skills.every(s => skills[s]);
      if (ok) { rank = R; next = RANKS[i + 1] || null; } else { next = R; break; }
    }
    // Streak of core days (today counts only if complete)
    let streak = 0, best = 0, run = 0;
    for (const x of days) { if (x.core) { run++; best = Math.max(best, run); } else if (!x.isToday) run = 0; }
    for (let i = days.length - 1; i >= 0; i--) { if (days[i].core) streak++; else if (days[i].isToday) continue; else break; }
    let pStreak = 0, pBest = 0; for (const x of days) { if (x.protein != null && x.protein >= 140) { pStreak++; pBest = Math.max(pBest, pStreak); } else if (!x.isToday) pStreak = 0; }
    // Stats
    const alloc = st.alloc || {};
    const base = { STR: 10, AGI: 10, VIT: 10, PER: 10, INT: 10 };
    const stats = {}; for (const k in base) stats[k] = base[k] + Math.floor(counts[k] / 2) + (alloc[k] || 0);
    const pointsEarned = (lv.level - 1) * 3, pointsSpent = Object.values(alloc).reduce((a, b) => a + b, 0);
    // Titles
    const T = [];
    const t = (id, name, desc, got) => T.push({ id, name, desc, got: !!got });
    t('player', 'Player', 'Accepted the System.', st.accepted);
    t('iron', 'Iron Will', 'Trained after a 25-hour shift.', tally.iron);
    t('field', 'Field Operative', 'Five sessions inside the Field Camp gate.', tally.camp >= 5);
    t('cycle', 'Cycle Keeper', 'Completed a full Day 1 to Day 5 cycle in order.', tally.cycles >= 1);
    t('cycle3', 'Wheel of Iron', 'Three full cycles in order.', tally.cycles >= 3);
    t('protein7', 'Protein Hunter', 'Seven days in a row at 140 g+.', pBest >= 7);
    t('protein14', 'Apex Predator', 'Fourteen days in a row at 140 g+.', pBest >= 14);
    t('scribe', 'Scribe', 'Fourteen fully logged days.', tally.loggedDays >= 14);
    t('diplomat', 'Diplomat', 'Handled a hospitality meal without guilt.', tally.hospitality);
    t('double', 'Double Shift', 'Football and a training session on the same day.', tally.combo);
    t('boss', 'Boss Slayer', 'Cleared a benchmark Boss.', bosses.length);
    t('kg1', 'Lighter Step', 'One kilogram down from 75.5 kg (or the clinic baseline).', wi.milestones >= 2);
    t('streak7', 'Unbroken', 'Seven core days in a row (training or valid rest, plus 140 g protein).', best >= 7);
    return { start, today, days, total, lv, rank, next, stats, counts, pointsEarned, pointsSpent, points: pointsEarned - pointsSpent, pr, wi, bosses, skills, skillCount, titles: T, streak, bestStreak: best, proteinBest: pBest, tally, penalties, openPenalties: penalties.filter(p => !(st.penalties && st.penalties[p])), lastCycle, nextDay: lastCycle ? DAYS[(DAYS.indexOf(lastCycle) + 1) % 5] : DAYS[0], trainRun, restRun };
  }

  root.HunterEngine = { compute, levelFromXp, need, DAYS, XP, MANUAL, SKILLS, RANKS, GATES, todayLocal, addDays, parsePRs, WEIGHT_BASE };
})(typeof window !== 'undefined' ? window : globalThis);
