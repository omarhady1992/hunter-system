/* Hunter System UI. Data: private fitness-data repo via the token the Calisthenics Tracker already saved on this origin. */
(function () {
  'use strict';
  const E = window.HunterEngine;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ST_KEY = 'hunter.state', CACHE = 'hunter.cache', CFG = 'hunter.cfg';
  const TRACKER_CFG = 'fitTracker.cfg', TRACKER_CACHE = 'fitTracker.cache';
  const WEB = /github\.io$/.test(location.hostname);
  const TRACKER_URL = 'https://omarhady1992.github.io/calisthenics-tracker/';
  const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';
  const STAT_NAMES = { STR: 'Strength', AGI: 'Agility', VIT: 'Vitality', PER: 'Sense', INT: 'Intelligence' };
  const STAT_SRC = { STR: 'Pull, Push, Legs, Bosses', AGI: 'EMOM, football', VIT: 'Protein days, weight', PER: 'Skills, posture, balance', INT: 'Logging' };
  const fmtD = s => { const d = new Date(s + 'T12:00:00'); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const ls = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };

  let st = Object.assign({ manual: {}, bosses: [], skills: {}, alloc: {}, penalties: {}, penaltyProgress: {}, seen: null, accepted: false, title: null, lastQuestToast: null }, ls(ST_KEY) || {});
  let data = null, R = null, view = 'status', qDate = E.todayLocal();
  const save = () => ls(ST_KEY, st);

  // ---------- data ----------
  function cfg() { return ls(CFG) || (WEB ? ls(TRACKER_CFG) : null); }
  async function fetchLive(c) {
    const url = 'https://api.github.com/repos/' + encodeURIComponent(c.owner || 'omarhady1992') + '/' + encodeURIComponent(c.repo || 'fitness-data') + '/contents/' + (c.path || 'data.json') + '?t=' + Date.now();
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' });
    if (!r.ok) { const e = new Error('GitHub ' + r.status); e.status = r.status; throw e; }
    return r.json();
  }
  function setSync(t, c) { const s = $('syncState'); s.textContent = t; s.className = 'sync ' + (c || ''); }
  async function load() {
    const qp = new URLSearchParams(location.search).get('data');
    if (qp) { // local snapshot, used for testing
      try { const r = await fetch(qp, { cache: 'no-store' }); data = await r.json(); setSync('snapshot', 'ok'); return true; } catch (e) { setSync('snapshot failed', 'err'); }
    }
    const c = cfg();
    if (c && c.token) {
      setSync('syncing…');
      try {
        data = await fetchLive(c); ls(CACHE, data); setSync('synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 'ok'); return true;
      } catch (e) { setSync(navigator.onLine ? 'sync failed' : 'offline', 'err'); }
    }
    if (!c) setSync('not linked');
    const cached = ls(CACHE) || (WEB ? ls(TRACKER_CACHE) : null);
    if (cached) { data = cached; if (!c) setSync('cached', ''); return true; }
    return false;
  }

  // ---------- effects ----------
  function toast(title, msg, cls, ms) {
    const t = document.createElement('div'); t.className = 'toast ' + (cls || '');
    t.innerHTML = '<div class="t">' + esc(title) + '</div><div class="m">' + esc(msg) + '</div>';
    $('toasts').appendChild(t);
    const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 360); };
    t.onclick = kill; setTimeout(kill, ms || 3200);
  }
  function burst(x, y, txt) {
    if (txt) { const f = document.createElement('div'); f.className = 'float'; f.textContent = txt; f.style.left = (x - 20) + 'px'; f.style.top = (y - 20) + 'px'; document.body.appendChild(f); setTimeout(() => f.remove(), 1200); }
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('div'); s.className = 'spark'; const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
      s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      document.body.appendChild(s); setTimeout(() => s.remove(), 800);
    }
    if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) try { navigator.vibrate(25); } catch (e) { /* no-op */ }
  }
  function overlay(html, cls) { const o = $('overlay'); o.className = cls || ''; o.innerHTML = html; o.hidden = false; return o; }
  function closeOverlay() { const o = $('overlay'); o.hidden = true; o.innerHTML = ''; o.className = ''; }
  function typeText(el, text, speed) { let i = 0; el.textContent = ''; const iv = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(iv); }, speed || 28); }
  function countUp(el, from, to, ms) { const t0 = performance.now(); const step = t => { const p = Math.min(1, (t - t0) / ms); el.textContent = Math.round(from + (to - from) * p); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }

  // ---------- modal queue ----------
  const queue = []; let busy = false;
  function enqueue(fn) { queue.push(fn); if (!busy) next(); }
  function next() { const fn = queue.shift(); if (!fn) { busy = false; return; } busy = true; fn(() => { closeOverlay(); setTimeout(next, 150); }); }

  function awakening(done) {
    const o = overlay('<div class="modal"><div class="win"><div class="wt"><span>NOTIFICATION</span></div><p class="type" id="aw1" style="font-size:17px;text-align:center"></p><p class="muted" id="aw2" style="text-align:center;opacity:0;transition:opacity .6s">Daily quests, XP and ranks are built from your real logs since ' + esc(fmtD(R.start)) + '. Every day you logged already earned its XP.</p><div style="display:flex;gap:10px;justify-content:center;margin-top:14px"><button class="btn" id="awYes">Accept</button></div></div></div>');
    typeText(o.querySelector('#aw1'), 'You have acquired the qualifications to be a Player. Will you accept?', 32);
    setTimeout(() => { const a = o.querySelector('#aw2'); if (a) a.style.opacity = 1; }, 2300);
    o.querySelector('#awYes').onclick = () => { st.accepted = true; save(); refresh(); done(); };
  }
  function levelUp(from, to, pts, done) {
    const o = overlay('<div class="modal"><div class="rays"><div class="n" id="luN">' + from + '</div></div><div class="big">LEVEL UP!</div><div class="win"><div class="wt"><span>NOTIFICATION</span></div><p style="text-align:center;margin:0">Level ' + from + ' → <b>' + to + '</b></p><p class="muted" style="text-align:center">You gained ' + pts + ' stat points. Spend them in your Status window.</p><div style="display:flex;gap:10px;justify-content:center;margin-top:10px"><button class="btn gold" id="luA">Allocate</button><button class="btn ghost" id="luC">Later</button></div></div></div>');
    countUp(o.querySelector('#luN'), from, to, Math.min(2200, 300 + (to - from) * 160));
    o.querySelector('#luA').onclick = () => { done(); show('status'); };
    o.querySelector('#luC').onclick = done;
  }
  function rankUp(from, to, done) {
    const o = overlay('<div class="modal"><div class="rays gold"><div class="n"><div class="rank ' + to + '" style="width:110px;height:124px;font-size:56px">' + to + '</div></div></div><div class="big gold">RANK UP</div><div class="win"><div class="wt"><span>NOTIFICATION</span></div><p style="text-align:center">Your rank has been re-evaluated: ' + from + ' → ' + to + '.</p><div style="text-align:center"><button class="btn gold" id="ruO">Continue</button></div></div></div>');
    o.querySelector('#ruO').onclick = done;
  }

  // ---------- compute + diff ----------
  function refresh(silent) {
    if (!data) return;
    const prevR = R; R = E.compute(data, st, E.todayLocal());
    if (!R) return;
    render();
    if (silent) return;
    if (!st.accepted) { enqueue(awakening); return; }
    const seen = st.seen || { level: 1, rank: 'E', titles: [], xp: 0 };
    if (R.lv.level > seen.level) { const f = seen.level, t = R.lv.level; enqueue(d => levelUp(f, t, (t - f) * 3, d)); }
    if (R.rank.r !== seen.rank && 'EDCBAS'.indexOf(R.rank.r) > 'EDCBAS'.indexOf(seen.rank)) { const f = seen.rank, t = R.rank.r; enqueue(d => rankUp(f, t, d)); }
    const got = R.titles.filter(t => t.got).map(t => t.id);
    const fresh = got.filter(id => !seen.titles.includes(id)).map(id => R.titles.find(x => x.id === id));
    if (fresh.length > 2) setTimeout(() => toast('TITLES ACQUIRED', fresh.length + ' titles: ' + fresh.map(t => t.name).join(', ') + '. See Status.', 'gold', 5000), 600);
    else fresh.forEach((t, i) => setTimeout(() => toast('TITLE ACQUIRED', '[' + t.name + '] ' + t.desc, 'gold', 4200), 600 + i * 900));
    if (prevR && R.total > prevR.total) toast('NOTIFICATION', '+' + (R.total - prevR.total) + ' XP', '', 1800);
    st.seen = { level: R.lv.level, rank: R.rank.r, titles: got, xp: R.total }; save();
    if (st.lastQuestToast !== R.today) { st.lastQuestToast = R.today; save(); setTimeout(() => toast('DAILY QUEST', 'Daily Quest: The Hunter\'s Regimen has arrived. Open Quests.', '', 4200), 900); }
    if (R.openPenalties.length) setTimeout(() => toast('WARNING', 'A Penalty Quest is waiting. Open Quests.', 'red', 4200), 1600);
  }

  // ---------- views ----------
  function show(v) {
    view = v;
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    document.querySelectorAll('.view').forEach(s => { s.hidden = s.id !== 'v-' + v; });
    render(); window.scrollTo(0, 0);
  }
  function render() {
    if (!R) return;
    ({ status: rStatus, quests: rQuests, gates: rGates, log: rLog, codex: rCodex })[view]();
    requestAnimationFrame(() => setTimeout(() => document.querySelectorAll('.bar i[data-w]').forEach(i => { i.style.width = i.dataset.w; }), 30));
  }
  const bar = (p, cls) => '<div class="bar ' + (cls || '') + '"><i data-w="' + Math.max(0, Math.min(100, p)).toFixed(1) + '%"></i></div>';
  const today = () => R.days[R.days.length - 1];

  function rStatus() {
    const got = R.titles.filter(t => t.got);
    const title = (got.find(t => t.id === st.title) || got[got.length - 1] || { name: 'None' }).name;
    const inCamp = R.today >= '2026-11-08' && R.today <= '2026-11-22';
    const td = today(); const nx = R.next;
    const lastHome = R.wi.home.length ? R.wi.home[R.wi.home.length - 1] : null, lastClinic = R.wi.clinic.length ? R.wi.clinic[R.wi.clinic.length - 1] : null;
    let h = '<div class="win"><div class="wt"><span>STATUS</span></div><div class="hero"><div class="lvl"><div class="n">' + R.lv.level + '</div><div class="l">LEVEL</div></div>' +
      '<div class="kv"><b>Name</b><span>Omar</span><b>Job</b><span>' + (inCamp ? 'Field Hunter' : 'Hunter') + '</span><b>Title</b><span>' + esc(title) + '</span><b>Streak</b><span>' + R.streak + ' day' + (R.streak === 1 ? '' : 's') + ' (best ' + R.bestStreak + ')</span></div>' +
      '<div class="rank ' + R.rank.r + '">' + R.rank.r + '</div></div>' +
      bar(R.lv.into / R.lv.need * 100) + '<div class="barlbl"><span>XP ' + R.lv.into + ' / ' + R.lv.need + '</span><span>Total ' + R.total.toLocaleString() + ' · today +' + td.xp + '</span></div></div>';
    h += '<div class="win"><div class="wt"><span>STATS</span></div><div class="stats">' + Object.keys(R.stats).map(k => '<div class="stat"><div class="k">' + k + '<small>' + STAT_NAMES[k] + ' · ' + STAT_SRC[k] + '</small></div><div class="v">' + R.stats[k] + (R.points > 0 ? '<button class="plus" data-stat="' + k + '">+</button>' : '') + '</div></div>').join('') + '</div>' +
      (R.points > 0 ? '<div class="pts">Available points: ' + R.points + '</div>' : '<div class="pts" style="color:var(--dim)">3 points every level</div>') + '</div>';
    const pr = R.pr;
    h += '<div class="win"><div class="wt"><span>RECORDS</span></div><div class="recs">' +
      '<div class="rec"><div class="n">' + (pr.dips || '–') + '</div><div class="l">Chair dips total</div></div><div class="rec"><div class="n">' + (pr.planche || '–') + '</div><div class="l">Pseudo planche</div></div><div class="rec"><div class="n">' + (pr.handstand ? pr.handstand + 's' : '–') + '</div><div class="l">Handstand hold</div></div>' +
      '<div class="rec"><div class="n">' + R.tally.sessions + '</div><div class="l">Sessions</div></div><div class="rec"><div class="n">' + R.tally.proteinDays + '</div><div class="l">140 g days</div></div><div class="rec"><div class="n">' + R.tally.cycles + '</div><div class="l">Full cycles</div></div></div>' +
      '<h3>Weight</h3><div class="muted">' + (lastHome ? 'Home scale: ' + lastHome.kg + ' kg on ' + fmtD(lastHome.date) + '. ' : '') + (lastClinic ? 'Clinic scale: ' + lastClinic.kg + ' kg on ' + fmtD(lastClinic.date) + ' (own series, start ' + R.wi.clinicBase + ' kg). ' : 'No clinic weigh-ins yet. ') + 'Weight milestones cleared: ' + R.wi.milestones + ' (one per 0.5 kg below 75.5 kg home, or below the first clinic reading).</div></div>';
    if (nx) {
      const reqs = [['Level ' + nx.lv, R.lv.level >= nx.lv, 'now ' + R.lv.level]];
      if (nx.bosses) reqs.push(['Bosses cleared: ' + nx.bosses, R.bosses.length >= nx.bosses, R.bosses.length + ' so far']);
      if (nx.wm) reqs.push([(nx.wm / 2) + ' kg down (' + nx.wm + ' milestones)', R.wi.milestones >= nx.wm, R.wi.milestones + ' cleared']);
      nx.skills.forEach(s => { const sk = E.SKILLS.find(x => x.id === s); reqs.push(['Skill: ' + sk.label, !!R.skills[s], '']); });
      h += '<div class="win purple"><div class="wt"><span>NEXT RANK: ' + nx.r + '</span></div>' + reqs.map(r => '<div class="q ' + (r[1] ? 'done' : '') + ' lock"><div class="box">' + (r[1] ? '✓' : '') + '</div><div class="txt">' + esc(r[0]) + (r[2] ? '<small>' + esc(r[2]) + '</small>' : '') + '</div></div>').join('') + '</div>';
    }
    h += '<div class="win"><div class="wt"><span>TITLES</span></div><div class="muted" style="margin-bottom:8px">Tap an earned title to wear it.</div><div class="row">' + R.titles.map(t => '<button class="chip ' + (t.got ? (t.name === title ? 'gold' : 'ok') : 'no') + '" data-title="' + t.id + '" title="' + esc(t.desc) + '">' + (t.got ? '' : '🔒 ') + esc(t.name) + '</button>').join('') + '</div><div class="muted" id="tdesc" style="margin-top:8px"></div></div>';
    const el = $('v-status'); el.innerHTML = h;
    el.querySelectorAll('[data-stat]').forEach(b => b.onclick = e => { const k = b.dataset.stat; st.alloc[k] = (st.alloc[k] || 0) + 1; save(); const r = b.getBoundingClientRect(); burst(r.left + 14, r.top + 14, '+1 ' + k); refresh(true); });
    el.querySelectorAll('[data-title]').forEach(b => b.onclick = () => { const t = R.titles.find(x => x.id === b.dataset.title); $('tdesc').textContent = t.name + ': ' + t.desc + (t.got ? '' : ' (locked)'); if (t.got) { st.title = t.id; save(); refresh(true); $('tdesc').textContent = t.name + ': ' + t.desc; } });
  }

  function questRow(q, d, editable) {
    const lock = q.src === 'data';
    return '<div class="q ' + (q.done ? 'done ' : '') + (lock ? 'lock' : '') + '" data-q="' + q.id + '" data-d="' + d + '" data-edit="' + (editable && !lock ? 1 : 0) + '"><div class="box">' + (q.done ? '✓' : '') + '</div><div class="txt">' + esc(q.label) + '<small>' + (lock ? 'Verified from your log' : 'Tap to mark done') + '</small></div><div class="xp">+' + q.xp + ' XP</div></div>';
  }
  function rQuests() {
    const days = R.days.slice(-3).reverse();
    if (!days.find(x => x.date === qDate)) qDate = R.today;
    const d = R.days.find(x => x.date === qDate);
    let h = '';
    if (R.openPenalties.length) h += '<div class="win red glitch"><div class="wt"><span>PENALTY QUEST</span></div><p style="margin:0 0 10px">A third rest day in a row was detected (' + R.openPenalties.map(fmtD).join(', ') + ').</p><button class="btn red" id="enterPZ">Enter the Penalty Zone</button></div>';
    h += '<div class="seg">' + days.map(x => '<button class="' + (x.date === qDate ? 'on' : '') + '" data-qd="' + x.date + '">' + (x.date === R.today ? 'Today' : fmtD(x.date)) + '</button>').join('') + '</div>';
    const done = d.quests.filter(q => q.done).length, tot = d.quests.length + (d.quests.some(q => q.id === 'train' || q.id === 'rest') ? 0 : 1);
    h += '<div class="win"><div class="wt"><span>DAILY QUEST</span></div><div style="text-align:center;font-weight:700;letter-spacing:.08em">The Hunter\'s Regimen</div><div class="muted" style="text-align:center">' + fmtD(d.date) + ' · ' + done + ' of ' + tot + ' goals · +' + d.xp + ' XP earned</div>' + bar(done / tot * 100) + '<div class="empty-pad"></div>';
    if (!d.quests.some(q => q.id === 'train' || q.id === 'rest')) {
      h += '<div class="q"><div class="box"></div><div class="txt">Training: ' + esc(R.nextDay) + ' or a valid rest day<small>Training days in a row: ' + R.trainRun + '. ' + (R.trainRun >= 3 ? 'Rest is due today.' : 'Cycle order: ' + esc(R.nextDay) + ' is next.') + '</small></div></div><div class="row" style="margin:6px 0 4px 38px"><button class="btn" id="tickTrain">Trained</button><button class="btn ghost" id="tickRest">Rest day</button></div>';
    }
    h += d.quests.map(q => questRow(q, d.date, true)).join('');
    h += '<p class="muted" style="margin-top:10px">Goals marked "verified" come from what you send me to log. The others are yours to tick. Ticks stay on this phone.</p></div>';
    // weekly
    const wkStart = (() => { let s = R.today; while (new Date(s + 'T12:00:00').getDay() !== 0) s = E.addDays(s, -1); return s; })();
    const wk = R.days.filter(x => x.date >= wkStart);
    const sess = wk.reduce((a, x) => a + x.train.length, 0), rests = wk.filter(x => !x.train.length && !x.isToday).length;
    h += '<div class="win"><div class="wt"><span>WEEKLY QUEST</span></div><div class="muted">Week from ' + fmtD(wkStart) + ': 4+ cycle sessions, a rest day taken, no Penalty. Reward +' + E.XP.weekly + ' XP on Saturday.</div>' + bar(Math.min(sess, 4) / 4 * 100) + '<div class="barlbl"><span>Sessions ' + sess + ' / 4</span><span>Rest days ' + rests + ' (aim for 2)</span></div></div>';
    h += '<div class="win purple"><div class="wt"><span>SKILL UNLOCKS</span></div><div class="muted" style="margin-bottom:6px">Mark a skill only when you can do it cleanly. +' + E.XP.skill + ' XP each.</div>' + E.SKILLS.map(s => '<div class="q ' + (R.skills[s.id] ? 'done' : '') + '" data-skill="' + s.id + '"><div class="box">' + (R.skills[s.id] ? '✓' : '') + '</div><div class="txt">' + esc(s.label) + '<small>' + (R.skills[s.id] ? 'Unlocked ' + fmtD(R.skills[s.id]) : s.stat + ' skill') + '</small></div><div class="xp">+' + E.XP.skill + '</div></div>').join('') + '</div>';
    const el = $('v-quests'); el.innerHTML = h;
    el.querySelectorAll('[data-qd]').forEach(b => b.onclick = () => { qDate = b.dataset.qd; render(); });
    el.querySelectorAll('.q[data-edit="1"]').forEach(row => row.onclick = () => tick(row.dataset.d, row.dataset.q, row));
    el.querySelectorAll('.q.lock[data-q]').forEach(row => row.onclick = () => { row.classList.add('shake'); setTimeout(() => row.classList.remove('shake'), 500); toast('NOTIFICATION', 'This goal is set from your logged data. Send me a correction to change it.', '', 2600); });
    const tt = $('tickTrain'), tr = $('tickRest');
    if (tt) tt.onclick = e => tick(qDate, 'trained', tt);
    if (tr) tr.onclick = e => tick(qDate, 'rest', tr);
    el.querySelectorAll('[data-skill]').forEach(row => row.onclick = () => {
      const id = row.dataset.skill;
      if (R.skills[id]) { if (confirm('Lock this skill again?')) { delete st.skills[id]; save(); refresh(); } return; }
      if (!confirm('Unlock "' + E.SKILLS.find(s => s.id === id).label + '"? Only if you did it cleanly.')) return;
      st.skills[id] = R.today; save(); const r = row.getBoundingClientRect(); burst(r.left + 20, r.top + 20, '+' + E.XP.skill + ' XP');
      toast('SKILL ACQUIRED', E.SKILLS.find(s => s.id === id).label, 'gold', 3500); refresh();
    });
    const pz = $('enterPZ'); if (pz) pz.onclick = () => penaltyZone(R.openPenalties[0]);
  }
  function tick(d, id, el) {
    if (id === 'train') id = 'trained';
    const m = st.manual[d] || (st.manual[d] = {});
    const was = !!m[id];
    if (id === 'trained') delete m.rest; if (id === 'rest') delete m.trained;
    m[id] = !was; if (!m[id]) delete m[id];
    save();
    const before = R.days.find(x => x.date === d);
    const prevDone = before.quests.filter(q => q.done).length, prevAll = before.quests.length && before.quests.every(q => q.done);
    if (!was) { const r = el.getBoundingClientRect(); const q = before.quests.find(x => x.id === id || (id === 'trained' && x.id === 'train')); burst(r.left + 20, r.top + r.height / 2, '+' + (q ? q.xp : id === 'trained' ? E.XP.training : E.XP.rest) + ' XP'); }
    refresh();
    const after = R.days.find(x => x.date === d);
    const row = document.querySelector('.q[data-q="' + (id === 'trained' ? 'train' : id) + '"][data-d="' + d + '"]'); if (row) row.classList.add('flash');
    if (!prevAll && after.quests.length && after.quests.every(q => q.done) && after.quests.some(q => q.id === 'train' || q.id === 'rest')) {
      toast('QUEST COMPLETE', 'Daily Quest cleared for ' + fmtD(d) + '. Rewards granted.', 'gold', 4000);
    } else if (!was && after.quests.filter(q => q.done).length > prevDone) toast('NOTIFICATION', 'Quest goal complete.', '', 1500);
  }
  function penaltyZone(date) {
    const prog = st.penaltyProgress[date] || (st.penaltyProgress[date] = [false, false, false, false, false]);
    const items = ['25 push-ups (set 1)', '25 push-ups (set 2)', '25 push-ups (set 3)', '25 push-ups (set 4)', '15-minute brisk walk'];
    const draw = () => {
      const o = overlay('<div class="modal"><div class="big red glitch">PENALTY ZONE</div><div class="win red"><div class="wt"><span>PENALTY QUEST</span></div><p style="margin-top:0">Survive. ' + (date === 'preview' ? 'This is a preview of what opens after a third rest day in a row.' : 'A third rest day in a row on ' + esc(fmtD(date)) + ' broke the rest rule.') + ' Clear this any time today; spread the sets out.</p>' +
        items.map((t, i) => '<div class="q ' + (prog[i] ? 'done' : '') + '" data-pi="' + i + '"><div class="box">' + (prog[i] ? '✓' : '') + '</div><div class="txt">' + t + '</div></div>').join('') +
        bar(prog.filter(Boolean).length / items.length * 100, 'red') + '<p class="muted">Reward for clearing: +' + E.XP.penaltyClear + ' XP. Nothing is taken away.</p><div style="text-align:center"><button class="btn ghost" id="pzX">Leave for now</button></div></div></div>', 'redz');
      o.querySelectorAll('[data-pi]').forEach(r => r.onclick = () => {
        const i = +r.dataset.pi; prog[i] = !prog[i]; save();
        if (prog.every(Boolean)) { if (date !== 'preview') st.penalties[date] = true; save(); closeOverlay(); toast('NOTIFICATION', 'Penalty Quest cleared. You have survived.', 'gold', 4000); refresh(); if (date === 'preview') delete st.penaltyProgress.preview; save(); return; }
        const b = r.getBoundingClientRect(); burst(b.left + 20, b.top + 20); draw();
      });
      o.querySelector('#pzX').onclick = closeOverlay;
    };
    draw();
  }
  function bossRoom(g) {
    const prev = R.bosses[R.bosses.length - 1];
    const o = overlay('<div class="modal"><div class="big" style="text-shadow:0 0 24px var(--purple)">BOSS ROOM</div><div class="win purple"><div class="wt"><span>' + esc(g.name.toUpperCase()) + '</span></div><p class="muted" style="margin-top:0">Fresh, after the warm-up and posture block. One max set each, full rest between.' + (prev ? ' Last Boss: ' + prev.pushups + ' push-ups, ' + prev.pullups + ' pull-ups, ' + prev.hold + ' s hold.' : '') + '</p>' +
      '<label class="f">Date</label><input type="date" id="bD" value="' + (R.today) + '"><label class="f">Max push-ups</label><input type="number" inputmode="numeric" id="bP"><label class="f">Max pull-ups</label><input type="number" inputmode="numeric" id="bU"><label class="f">Longest handstand hold (s)</label><input type="number" inputmode="numeric" id="bH">' +
      '<div style="display:flex;gap:10px;justify-content:center;margin-top:14px"><button class="btn gold" id="bGo">Defeat the Boss</button><button class="btn ghost" id="bX">Retreat</button></div></div></div>', 'boss');
    o.querySelector('#bX').onclick = closeOverlay;
    o.querySelector('#bGo').onclick = () => {
      const v = id => parseInt(o.querySelector(id).value, 10);
      const rec = { date: o.querySelector('#bD').value || R.today, gate: g.id, pushups: v('#bP'), pullups: v('#bU'), hold: v('#bH') };
      if ([rec.pushups, rec.pullups, rec.hold].some(n => !(n >= 0))) { o.querySelector('.win').classList.add('shake'); setTimeout(() => o.querySelector('.win') && o.querySelector('.win').classList.remove('shake'), 500); return; }
      st.bosses = st.bosses.filter(b => b.gate !== g.id).concat([rec]); save();
      closeOverlay();
      enqueue(done => { const ov = overlay('<div class="modal"><div class="rays"><div class="n">⚔</div></div><div class="big gold">BOSS CLEARED</div><div class="win"><div class="wt"><span>REWARDS</span></div><p style="text-align:center">' + rec.pushups + ' push-ups · ' + rec.pullups + ' pull-ups · ' + rec.hold + ' s handstand</p><p class="muted" style="text-align:center">+' + E.XP.boss + ' XP, +' + E.XP.bossImprove + ' XP for each number that beats the last Boss.</p><div style="text-align:center"><button class="btn gold" id="bOk">Claim</button></div></div></div>', 'boss'); ov.querySelector('#bOk').onclick = done; });
      enqueue(done => { done(); refresh(); });
    };
  }
  function rGates() {
    const t = R.today;
    let h = '<div class="win"><div class="wt"><span>GATES</span></div>' + E.GATES.map(g => {
      const status = g.kind === 'boss' ? (R.bosses.find(b => b.gate === g.id) ? 'Cleared' : t >= g.from ? 'Open' : 'Upcoming') : t > g.to ? 'Cleared' : t >= g.from ? 'Active' : 'Upcoming';
      const cls = status === 'Cleared' ? 'ok' : status === 'Upcoming' ? 'no' : 'gold';
      let extra = '';
      if (g.kind !== 'boss' && status === 'Active') { const tot = (new Date(g.to) - new Date(g.from)) / 864e5 + 1, el = (new Date(t) - new Date(g.from)) / 864e5 + 1; extra = bar(el / tot * 100) + '<div class="barlbl"><span>Day ' + el + ' of ' + tot + '</span><span>' + R.days.filter(x => x.date >= g.from && x.date <= g.to).reduce((a, x) => a + x.xp, 0) + ' XP inside</span></div>'; }
      const b = R.bosses.find(x => x.gate === g.id);
      if (b) extra = '<div class="muted">' + b.pushups + ' push-ups · ' + b.pullups + ' pull-ups · ' + b.hold + ' s hold · +' + b.xp + ' XP</div>';
      const btn = g.kind === 'boss' ? '<button class="btn ' + (status === 'Open' ? 'gold' : 'ghost') + '" data-boss="' + g.id + '" style="margin-top:6px">' + (b ? 'Edit result' : status === 'Open' ? 'Enter Boss Room' : 'Enter early') + '</button>' : '';
      return '<div class="gate"><div class="ico ' + g.kind + '">' + ({ gate: '◆', boss: '☠', dungeon: '▼', floor: '◎' })[g.kind] + '</div><div class="b"><b>' + esc(g.name) + '</b><span class="chip ' + cls + '">' + status + '</span> <span class="muted">' + fmtD(g.from) + (g.to !== g.from ? ' – ' + fmtD(g.to) : '') + '</span><div class="muted">' + esc(g.detail) + '</div>' + extra + btn + '</div></div>';
    }).join('') + '</div>';
    const el = $('v-gates'); el.innerHTML = h;
    el.querySelectorAll('[data-boss]').forEach(b => b.onclick = () => bossRoom(E.GATES.find(g => g.id === b.dataset.boss)));
  }
  function rLog() {
    const ds = R.days;
    const max = Math.max(...ds.map(d => d.xp), 100), W = 520, H = 120, bw = W / ds.length;
    let svg = '<svg viewBox="0 0 ' + W + ' ' + (H + 22) + '" width="100%">' + ds.map((d, i) => { const hh = d.xp / max * H; return '<rect x="' + (i * bw + 1) + '" y="' + (H - hh) + '" width="' + Math.max(1, bw - 2) + '" height="' + hh + '" fill="' + (d.train.length ? '#4fd2ff' : '#2a6bb0') + '" opacity="' + (d.isToday ? .6 : 1) + '"><title>' + d.date + ': ' + d.xp + ' XP</title></rect>'; }).join('') +
      '<text x="0" y="' + (H + 16) + '" fill="#7d9cbc" font-size="11">' + fmtD(ds[0].date) + '</text><text x="' + W + '" y="' + (H + 16) + '" fill="#7d9cbc" font-size="11" text-anchor="end">' + fmtD(ds[ds.length - 1].date) + '</text></svg>';
    let h = '<div class="win"><div class="wt"><span>XP PER DAY</span></div>' + svg + '<div class="muted">Bright bars are training days. ' + R.total.toLocaleString() + ' XP since ' + fmtD(R.start) + '.</div></div>';
    h += '<div class="win"><div class="wt"><span>QUEST LOG</span></div>' + ds.slice().reverse().map(d => '<div class="day"><div class="h"><b>' + fmtD(d.date) + (d.isToday ? ' · today' : '') + '</b><span class="xp">+' + d.xp + ' XP</span></div><div class="row">' +
      d.quests.filter(q => q.done || q.src === 'data').map(q => '<span class="chip ' + (q.done ? 'ok' : 'no') + '">' + esc(q.label) + '</span>').join('') + (d.weekly ? '<span class="chip gold">Weekly Quest +100</span>' : '') + (R.penalties.includes(d.date) ? '<span class="chip red">Penalty</span>' : '') + '</div>' +
      (d.notes.length ? '<div class="note">' + esc(d.notes.join(' · ').slice(0, 220)) + '</div>' : '') + '</div>').join('') + '</div>';
    $('v-log').innerHTML = h;
  }
  function rCodex() {
    const X = E.XP;
    const rows = [['Training session (Day 1-5, in cycle)', X.training], ['Rest day within the rules', X.rest], ['Extra activity (football etc.)', X.activity], ['Protein 140 g+ (120 g+ earns ' + X.proteinPartial + ')', X.protein], ['Calories 1,600-1,700 (1,450-1,750 accepted)', X.kcal], ['Lunch with 40 g+ protein', X.lunch], ['All meals logged (3+ entries)', X.logged], ['3 L water', X.water], ['Posture block', X.posture], ['Midday posture fix', X.midday], ['100 g protein by mid-afternoon', X.midafternoon], ['Weekly Quest (4+ sessions, rest taken)', X.weekly], ['Each 0.5 kg milestone', X.weightMilestone], ['Boss cleared (+' + X.bossImprove + ' per beaten number)', X.boss], ['Skill unlocked', X.skill], ['Penalty Quest cleared', X.penaltyClear]];
    let h = '<div class="win"><div class="wt"><span>CODEX</span></div><p class="muted" style="margin-top:0">Your logs are the source of truth. A day with nothing logged earns nothing. Hospitality meals at the in-laws pass the calorie goal automatically.</p><table><tr><th>Goal</th><th>XP</th></tr>' + rows.map(r => '<tr><td>' + esc(r[0]) + '</td><td>+' + r[1] + '</td></tr>').join('') + '</table></div>';
    h += '<div class="win"><div class="wt"><span>LEVELS & RANKS</span></div><p class="muted" style="margin-top:0">Level n to n+1 costs 100 + 20 × n XP (Level 1→2: 120, Level 20→21: 500). Each level gives 3 stat points. Ranks need levels and real milestones:</p><table><tr><th>Rank</th><th>Needs</th></tr>' + E.RANKS.map(r => '<tr><td><b>' + r.r + '</b></td><td style="color:var(--text);text-align:left">' + esc(r.label) + '</td></tr>').join('') + '</table></div>';
    h += '<div class="win"><div class="wt"><span>RULES</span></div><ul class="muted" style="padding-left:18px;margin:0"><li>Keep the cycle order: Pull, Push, Legs, EMOM, Skills.</li><li>No more than 3 training days in a row; 2 rest days a week.</li><li>Two rest days back to back only with a reason. A 3rd in a row opens the Penalty Zone: 100 push-ups in 4 sets plus a 15-minute walk. Clearing it earns XP; nothing is taken away.</li><li>Weight: home and clinic scales are separate series and never compared. Milestones count from 75.5 kg at home or from the first clinic reading.</li><li>Bosses are the 4-weekly benchmark tests: max push-ups, max pull-ups, longest handstand hold.</li><li>Stats grow from what you do (STR from Pull, Push, Legs; AGI from EMOM and football; VIT from protein days and weight; SENSE from Skills and posture; INT from logging) plus the points you place.</li></ul>' +
      '<div class="row" style="margin-top:14px"><button class="btn red" id="pvPZ">Preview the Penalty Zone</button><button class="btn ghost" id="exp">Back up my ticks</button><button class="btn ghost" id="imp">Restore ticks</button></div></div>';
    h += '<div class="win"><div class="wt"><span>DATA LINK</span></div><p class="muted" style="margin-top:0">' + (ls(CFG) ? 'Linked to your private fitness-data log with the key saved in this app. New logs show up each time you open it or tap ⟳.' : cfg() ? 'Reading your private fitness-data log with the key the Calisthenics Tracker saved in this browser. New logs show up each time you open the app.' : 'Not linked.') + '</p><div class="row">' + (ls(CFG) ? '<button class="btn ghost" id="unlink">Remove key</button>' : '') + '<a class="btn ghost" style="display:inline-block;text-decoration:none" target="_blank" rel="noopener" href="' + TRACKER_URL + '">Open Calisthenics Tracker</a></div></div>';
    const el = $('v-codex'); el.innerHTML = h;
    const ul = $('unlink'); if (ul) ul.onclick = () => { if (confirm('Remove the GitHub key from this app? Your ticks stay.')) { localStorage.removeItem(CFG); localStorage.removeItem(CACHE); location.reload(); } };
    $('pvPZ').onclick = () => penaltyZone('preview');
    $('exp').onclick = () => { const blob = new Blob([JSON.stringify(st, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hunter-state-' + R.today + '.json'; a.click(); };
    $('imp').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json'; i.onchange = () => { const f = i.files[0]; if (!f) return; f.text().then(t => { try { st = Object.assign(st, JSON.parse(t)); save(); refresh(); toast('NOTIFICATION', 'Ticks restored.'); } catch (e) { toast('WARNING', 'That file could not be read.', 'red'); } }); }; i.click(); };
  }

  function connectScreen() {
    const steps = '<ol class="muted" style="padding-left:18px;text-align:left">' +
      '<li>On GitHub open <b>Settings → Developer settings → Fine-grained tokens → Generate new token</b> (<a style="color:var(--soft)" target="_blank" rel="noopener" href="' + TOKEN_URL + '">open it</a>).</li>' +
      '<li>Name it "Hunter System" and pick an expiry.</li>' +
      '<li>Repository access: <b>Only select repositories → fitness-data</b>.</li>' +
      '<li>Permissions → Repository → <b>Contents: Read-only</b>. Nothing else.</li>' +
      '<li>Generate, copy the token (starts with github_pat_) and paste it below.</li></ol>';
    const h = '<div class="win"><div class="wt"><span>NOTIFICATION</span></div><p>Link the System to your logs.</p><p class="muted">The app reads your private fitness-data log, so it needs a read-only GitHub key once. The key stays on this device only.' + (WEB ? ' In this browser you can also just open the Calisthenics Tracker once; the System then uses its key.' : '') + '</p>' + steps +
      (WEB ? '<a class="btn ghost" style="display:inline-block;text-decoration:none;margin-bottom:6px" href="' + TRACKER_URL + '">Open Calisthenics Tracker</a>' : '') +
      '<label class="f">GitHub key (Contents: Read-only)</label><input type="password" id="tok" autocomplete="off" placeholder="github_pat_…"><div class="muted" id="tokMsg" style="min-height:1.4em;margin-top:6px"></div><div style="margin-top:6px"><button class="btn gold" id="tokGo">Link</button></div></div>';
    $('v-status').innerHTML = h;
    $('tokGo').onclick = async () => {
      const t = $('tok').value.trim(); const msg = $('tokMsg'); if (!t) { msg.textContent = 'Paste the key first.'; return; }
      const c = { token: t, owner: 'omarhady1992', repo: 'fitness-data', path: 'data.json' };
      msg.textContent = 'Checking the key…';
      try {
        data = await fetchLive(c); ls(CFG, c); ls(CACHE, data); setSync('synced', 'ok'); msg.textContent = ''; refresh();
      } catch (e) {
        msg.textContent = e.status === 401 ? 'GitHub rejected that key (401). Check it was copied in full and has not expired.' : e.status === 404 || e.status === 403 ? 'That key cannot see fitness-data (' + e.status + '). Give it access to the fitness-data repo with Contents: Read-only.' : 'Could not reach GitHub. Check the connection and try again.';
        $('tok').classList.add('shake'); setTimeout(() => $('tok').classList.remove('shake'), 500);
      }
    };
  }

  // ---------- boot ----------
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { if (R) show(b.dataset.v); });
  $('overlay').addEventListener('click', e => { if (e.target.id === 'overlay' && !busy) closeOverlay(); });
  $('syncBtn').onclick = async () => { $('syncBtn').classList.add('shake'); setTimeout(() => $('syncBtn').classList.remove('shake'), 500); if (await load()) refresh(); };
  document.addEventListener('visibilitychange', async () => { if (!document.hidden && R) { if (await load()) refresh(); } });
  (async () => {
    const ok = await load();
    if (ok) refresh(); else connectScreen();
  })();
  if ('serviceWorker' in navigator && WEB) navigator.serviceWorker.register('sw.js').catch(() => { /* offline install optional */ });
})();
