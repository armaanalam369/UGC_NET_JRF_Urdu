/* =====================================================================
   Wise Choice · UGC NET / JRF Paper II — app.js
   Needs: data/manifest.js (window.RULES, window.SUBJECTS, window.PAPER_LIST, window.QUOTES)
          data/<paper>.js  (window.PAPERS[id]) — loaded on demand
   ===================================================================== */
(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };
window.PAPERS = window.PAPERS || {};

/* ---------- config (falls back to a tiny demo if manifest.js is missing) ---------- */
var R = window.RULES, SUBS = window.SUBJECTS, PLALL = window.PAPER_LIST,
    demo = !(R && SUBS && SUBS.length && PLALL && PLALL.length);
if (demo) {
  R = { examName: 'UGC NET/JRF · Paper II', shortName: 'UGC NET', totalQuestions: 100, marksPerQ: 2, fullMinutes: 120, negative: 0, sessions: ['June', 'December'] };
  SUBS = [{ id: 'demo', n: 'Demo subject', short: 'Demo', i: '🎓', units: [{ n: 'Unit 1 · Basics', i: '📘', k: 'U1' }, { n: 'Unit 2 · Reasoning', i: '🧠', k: 'U2' }] }];
  PLALL = [{ id: 'demo-2025-june', subject: 'demo', year: 2025, session: 'June', file: '' }];
  window.PAPERS['demo-2025-june'] = { id: 'demo-2025-june', questions: [
    { s: 'Unit 1 · Basics', c: 'Synonyms', q: 'Synonym of "RAPID"?', o: ['Slow', 'Quick', 'Late', 'Weak'], a: 1, e: 'Rapid means quick.' },
    { s: 'Unit 1 · Basics', c: 'Constitution', q: 'Who chaired the Drafting Committee of the Constituent Assembly?', o: ['Nehru', 'Gandhi', 'B. R. Ambedkar', 'Patel'], a: 2, e: 'Dr B. R. Ambedkar chaired the Drafting Committee.' },
    { s: 'Unit 2 · Reasoning', c: 'Number Series', q: 'Next term: 2, 6, 12, 20, ?', o: ['28', '30', '32', '36'], a: 1, e: 'Differences are 4, 6, 8, 10 → 30.' }] };
}
R.sessions = R.sessions || ['June', 'December']; R.marksPerQ = R.marksPerQ || 2; R.totalQuestions = R.totalQuestions || 100;
R.fullMinutes = R.fullMinutes || 120; R.negative = R.negative || 0; R.shortName = R.shortName || 'UGC NET';
var QUOTES = (window.QUOTES && window.QUOTES.length) ? window.QUOTES : ['Small steps every day beat big plans someday.'];
var app = $('#app'), root = document.documentElement;
var DAY = 86400000, INT = [1, 3, 7, 14];   /* spaced-repetition gaps (days) for Leitner boxes 1-4 */

/* ---------- storage ---------- */
function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
function del(k) { try { localStorage.removeItem(k); } catch (e) {} }
var SET = Object.assign({ font: 1, motion: true, showTimer: true, autoNext: false, shuffleQ: false, shuffleO: false, confirmSubmit: true,
  autoWrong: true, nast: true, haptic: true, wake: false, defMins: 30, defNeg: false, negAmt: 0.5, tools: true, fullscreen: true, subject: null, goal: 25, target: '' }, get('un_set', {}));
var ATT = get('un_att', []), SAV = get('un_sav', {}), DAYM = get('un_days', {}), SEEN = get('un_seen', {});
root.dataset.theme = get('un_t', 'dark'); root.dataset.pal = get('un_p', 'royal');
var pad = function (n) { return String(n).padStart(2, '0'); };
var dkey = function (d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
var today0 = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ---------- subjects & papers ---------- */
var SUB, TOPICS, ICON, CODE, PL, latest, BAD = {}, LOADED = false;
var sesN = function (s) { return R.sessions.indexOf(s) + 1; };
var pOrder = function (a, b) { return (b.year - a.year) || (sesN(b.session) - sesN(a.session)); };
var plabel = function (p) { return p.session + ' ' + p.year; };
var pshort = function (p) { return p.session.slice(0, 3) + ' ' + p.year; };
function setSubject(id) {
  SUB = SUBS.filter(function (s) { return s.id === id; })[0] || SUBS[0];
  TOPICS = []; ICON = {}; CODE = {};
  SUB.units.forEach(function (u) { TOPICS.push(u.n); ICON[u.n] = u.i || '📘'; CODE[u.n] = u.k || u.n.slice(0, 5); });
  PL = PLALL.filter(function (p) { return p.subject === SUB.id && !BAD[p.id]; }).sort(pOrder);
  latest = PL[0] || null;
}
setSubject(SET.subject);
var ti = function (s) { var i = TOPICS.indexOf(s); return i < 0 ? 999 : i; };
var S = { kind: 'test', run: 'test', el: 0, view: 'home', paper: 'all', ses: 'all', mode: 'full', pool: 'all', secs: {}, neg: SET.defNeg, tneg: false, mins: SET.defMins, cnt: 20,
  qs: [], ans: [], qt: [], mk: {}, fl: [], cur: 0, left: 0, total: 0, t: null, grid: false, itab: 'last', sf: 'all', wl: null, src: '',
  paused: false, fs: false, fsx: 0, tabx: 0, tabNote: false, pf: 'all', rf: 'all', res: null, ttab: 'pad', tourN: 0 };
function resetSecs() { S.secs = {}; TOPICS.forEach(function (t) { S.secs[t] = false; }); }
function fixPaper() {
  if (S.paper !== 'all' && !PL.some(function (p) { return p.id === S.paper; })) S.paper = latest ? latest.id : 'all';
  if (S.mode === 'full' && S.paper === 'all') S.paper = latest ? latest.id : 'all';
}
resetSecs(); fixPaper();
var isFull = function (m) { return m === 'full' || m === 'mock'; };
function prefs() { root.style.setProperty('--fs', ['14.5px', '16px', '18px'][SET.font]); root.dataset.motion = SET.motion ? 'on' : 'off'; root.dataset.nast = SET.nast ? 'on' : 'off'; }
function saveSet() { put('un_set', SET); prefs(); }
prefs();
if (!Object.keys(DAYM).length && ATT.length) {   /* seed the heatmap from older attempts */
  ATT.forEach(function (a) { var k = dkey(new Date(a.ts)), n = 0; Object.keys(a.secs).forEach(function (t) { n += a.secs[t].c + a.secs[t].w; }); var x = DAYM[k] || (DAYM[k] = { q: 0, t: 0 }); x.q += n; x.t++; });
  put('un_days', DAYM);
}

/* ---------- helpers ---------- */
var fmt = function (s) { s = Math.max(0, s); var h = Math.floor(s / 3600); return (h ? h + ':' : '') + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60); };
var pct = function (a, b) { return b ? Math.round(a / b * 100) : 0; };
var tone = function (p) { return p >= 75 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444'; };
var lab = function (p) { return p >= 75 ? 'Strong' : p >= 50 ? 'Average' : 'Weak'; };
var fm = function (v) { return Number.isInteger(v) ? String(v) : v.toFixed(2); };
var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
function bar(p) { return '<div class="bar"><i style="width:' + p + '%;background:' + tone(p) + '"></i></div>'; }
function render(h, keep) {
  var y = window.scrollY;
  app.innerHTML = h;
  if (keep) { window.scrollTo(0, y); return; }
  app.classList.remove('in'); void app.offsetWidth; app.classList.add('in'); window.scrollTo(0, 0);
}
function sw(on, act, v) { return '<button class="sw ' + (on ? 'on' : '') + '" role="switch" aria-checked="' + !!on + '" data-act="' + act + '" data-v="' + esc(v || '') + '"><i></i></button>'; }
function buzz() { if (SET.haptic && navigator.vibrate) try { navigator.vibrate(10); } catch (e) {} }
function getWake() { if (SET.wake && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { S.wl = l; }).catch(function () {}); }
function relWake() { try { if (S.wl) S.wl.release(); } catch (e) {} S.wl = null; }
function shuf(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function label(q) { return (ICON[q.s] || '') + ' ' + esc(q.s) + (q.c ? ' · ' + esc(q.c) : ''); }
function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('show'); }, 2600); }
function download(name, txt, mime) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: mime || 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
var FL = { s: '🟢 Sure', g: '🟡 Guess', c: '🔴 Confused', u: '⚪ Not flagged' };
var mine = function () { return ATT.filter(function (a) { return a.sub === SUB.id; }); };
var maxMarks = function (n) { return n * R.marksPerQ; };

/* ---------- icons (inline SVG) ---------- */
var ICO = {
  home: '<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  play: '<path fill="currentColor" stroke="none" d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/>',
  repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01"/>',
  pause: '<path stroke-width="3" d="M8 5v14M16 5v14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path stroke-width="3" d="M5 13l4 4L19 7"/>'
};
function ic(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[n] + '</svg>'; }

/* ---------- floating dock + header ---------- */
function dk(i, l, act, v, on) { return '<button class="dk ' + (on ? 'on' : '') + '" data-act="' + act + '" data-v="' + (v || '') + '" aria-label="' + l + '">' + ic(i) + '<span>' + l + '</span></button>'; }
function dkc(i, l, act) { return '<button class="dkc" data-act="' + act + '" aria-label="' + l + '">' + ic(i) + '<span>' + l + '</span></button>'; }
function dock() {
  var h, v = S.view;
  if (v === 'test') {
    var qz = S.run === 'quiz';
    h = dk('grid', 'Palette', 'grid') + (SET.tools ? dk('pen', 'Pad', 'tools', 'pad') : '') + (qz ? dkc('check', 'Finish', 'submit') : dkc('pause', 'Pause', 'pause')) + (SET.tools ? dk('calc', 'Calc', 'tools', 'calc') : '') + dk('x', 'Exit', 'exit');
  } else {
    h = dk('home', 'Home', 'nav', 'home', v === 'home') + dk('chart', 'Insights', 'nav', 'insights', v === 'insights') + dkc('play', 'Start', 'start') +
      dk('repeat', 'Revise', 'nav', 'revise', v === 'revise') + dk('sliders', 'Settings', 'nav', 'settings', v === 'settings');
  }
  $('#dock').innerHTML = h;
}
function hdr() {
  if (S.view === 'test') {
    $('#hr').innerHTML = '<span class="pill">' + (S.run === 'quiz' ? '💡 Quiz' : '📝 Test') + '</span>' + (S.run === 'quiz' ? '' : '<span class="timer ' + (S.left < 300 ? 'low' : '') + '" id="tm">' + (SET.showTimer ? fmt(S.left) : '⏱ ••') + '</span>');
  } else {
    $('#hr').innerHTML = (SUBS.length > 1 ? '<button class="subchip" data-act="subject" aria-label="Change subject">' + SUB.i + ' ' + esc(SUB.short || SUB.n) + ' ▾</button>' : '<span class="subchip" dir="auto">' + SUB.i + ' ' + esc(SUB.short || SUB.n) + '</span>') + '<button class="sw" id="tgl" data-act="theme" aria-label="Dark / light mode"><i></i></button>';
  }
}

/* ---------- saved questions + spaced repetition (Leitner boxes) ---------- */
function keep(q, f) {
  var e = SAV[q._k] || (SAV[q._k] = { k: q._k, sub: SUB.id, s: q.s, c: q.c || '', q: q.q, o: q.o, a: q.a, e: q.e || '', src: q._src || '' });
  e[f] = true;
}
function persist() { Object.keys(SAV).forEach(function (k) { if (!SAV[k].b && !SAV[k].w) delete SAV[k]; }); put('un_sav', SAV); }
function mySav() { return Object.keys(SAV).map(function (k) { return SAV[k]; }).filter(function (e) { return !e.sub || e.sub === SUB.id; }); }
function dueList() { return mySav().filter(function (e) { return e.w && (e.due || 0) <= today0(); }); }
function dueText(e) { var d = Math.round(((e.due || 0) - today0()) / DAY); return d <= 0 ? 'Due today' : 'Review in ' + d + 'd'; }

/* ---------- streaks, goal, countdown ---------- */
function streak() {
  var n = 0, x = new Date(); if (!DAYM[dkey(x)]) x.setDate(x.getDate() - 1);
  while (DAYM[dkey(x)]) { n++; x.setDate(x.getDate() - 1); } return n;
}
function bestStreak() {
  var b = 0, c = 0, prev = null;
  Object.keys(DAYM).sort().forEach(function (k) { var d = new Date(k + 'T00:00'); c = (prev && Math.round((d - prev) / DAY) === 1) ? c + 1 : 1; if (c > b) b = c; prev = d; });
  return b;
}
function daysToExam() { if (!SET.target) return null; var d = new Date(SET.target + 'T00:00'); if (isNaN(d)) return null; return Math.round((d.getTime() - today0()) / DAY); }
function goalRing() {
  var q = (DAYM[dkey()] || { q: 0 }).q, g = Math.max(1, SET.goal || 25), p = Math.min(1, q / g);
  return '<div class="goal" title="Daily goal"><svg viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--a)"/><stop offset="1" style="stop-color:var(--b)"/></linearGradient></defs><circle class="t" cx="40" cy="40" r="34"/><circle class="f" cx="40" cy="40" r="34" style="stroke-dashoffset:' + (213.6 * (1 - p)).toFixed(1) + '"/></svg><div><b>' + q + '</b><small>of ' + g + ' Qs</small></div></div>';
}

/* ---------- in-progress test: autosave / resume ---------- */
function saveRun() {
  if (S.view !== 'test') return;
  put('un_run', { run: S.run, mode: S.mode, tneg: S.tneg, src: S.src, ans: S.ans, qt: S.qt, mk: S.mk, fl: S.fl, cur: S.cur, left: S.left, total: S.total, el: S.el, fsx: S.fsx, tabx: S.tabx, sub: SUB.id });
}
function clearRun() { del('un_run'); del('un_run_q'); }
function resume() {
  var r = get('un_run', null), q = get('un_run_q', null); if (!r || !q) return;
  if (r.sub && r.sub !== SUB.id) { SET.subject = r.sub; saveSet(); setSubject(r.sub); resetSecs(); fixPaper(); LOADED = false; preload(); }
  Object.assign(S, { run: r.run, mode: r.mode, tneg: r.tneg, src: r.src, qs: q, ans: r.ans, qt: r.qt, mk: r.mk, fl: r.fl || q.map(function () { return null; }),
    cur: r.cur, left: r.left, total: r.total, el: r.el, fsx: r.fsx || 0, tabx: r.tabx || 0, paused: false });
  clearInterval(S.t); S.t = setInterval(tick, 1000); getWake(); reqFS(S.run, S.mode); test();
}

/* ---------- full-screen exam mode (full / mock tests) ---------- */
function reqFS(kind, mode) {
  var el = document.documentElement;
  if (kind === 'test' && isFull(mode) && SET.fullscreen && el.requestFullscreen) { S.fs = true; el.requestFullscreen().catch(function () { S.fs = false; }); }
  else S.fs = false;
}
function exitFS() { S.fs = false; if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); }
document.addEventListener('fullscreenchange', function () {
  if (document.fullscreenElement) { $('#warn').classList.remove('show'); return; }
  if (S.fs && S.view === 'test' && !S.paused) { S.fsx++; saveRun(); $('#warn').classList.add('show'); }
});
document.addEventListener('visibilitychange', function () {
  if (document.hidden) { if (S.view === 'test' && S.run === 'test' && isFull(S.mode) && !S.paused) { S.tabx++; S.tabNote = true; saveRun(); } }
  else if (S.tabNote) { S.tabNote = false; toast('⚠️ Tab switch recorded (' + S.tabx + ')'); }
});

/* ---------- pause / resume ---------- */
function pause() {
  if (S.view !== 'test' || S.run !== 'test' || S.paused) return;
  S.paused = true; closeGrid(); closeTools(); saveRun();
  $('#pLeft').textContent = fmt(S.left); $('#pause').classList.add('show');
}
function unpause() {
  S.paused = false; $('#pause').classList.remove('show');
  if (S.fs && !document.fullscreenElement) reqFS(S.run, S.mode);
}

/* ---------- question pool, counts, "unseen" tracking ---------- */
function poolQs() {
  var out = [];
  PL.forEach(function (p) { var pp = window.PAPERS[p.id]; if (pp) pp.questions.forEach(function (q, i) { out.push({ s: q.s, k: p.id + '#' + i, y: p.id, ses: p.session }); }); });
  return out;
}
function counts(paper, unseen, ses) {
  var c = {}; TOPICS.forEach(function (t) { c[t] = 0; });
  poolQs().forEach(function (x) {
    if (paper !== 'all' && x.y !== paper) return;
    if (paper === 'all' && ses && ses !== 'all' && x.ses !== ses) return;
    if (unseen && SEEN[x.k]) return;
    if (c[x.s] !== undefined) c[x.s]++;
  });
  return c;
}
var sumC = function (c, only) { return Object.keys(c).reduce(function (n, k) { return n + (!only || only[k] ? c[k] : 0); }, 0); };
function load(p) {
  return new Promise(function (res, rej) {
    if (window.PAPERS[p.id]) return res(window.PAPERS[p.id]);
    if (!p.file) return rej();
    var s = document.createElement('script'); s.src = p.file;
    s.onload = function () { window.PAPERS[p.id] ? res(window.PAPERS[p.id]) : rej(); };
    s.onerror = rej; document.body.appendChild(s);
  });
}
function preload() {
  var sid = SUB.id;
  return Promise.all(PL.map(function (p) { return load(p).then(function () { return 1; }, function () { BAD[p.id] = 1; return 0; }); })).then(function () {
    if (SUB.id !== sid) return;
    setSubject(sid); fixPaper(); LOADED = true; if (S.view === 'home') home(true);
  });
}

/* ---------- home ---------- */
function stat(l, v) { return '<div class="stat"><span class="mu">' + l + '</span><b>' + v + '</b></div>'; }
function agg() {
  var s = {};
  mine().forEach(function (a) { Object.keys(a.secs).forEach(function (k) { var v = a.secs[k], x = s[k] || (s[k] = { c: 0, w: 0, n: 0, t: 0 }); x.c += v.c; x.w += v.w; x.n += v.n; x.t += v.t; }); });
  return s;
}
function aggConf() {
  var s = {};
  mine().forEach(function (a) { Object.keys(a.conf || {}).forEach(function (k) { var v = a.conf[k], x = s[k] || (s[k] = { c: 0, w: 0, n: 0 }); x.c += v.c; x.w += v.w; x.n += v.n; }); });
  return s;
}
function weakFirst(g) { return Object.keys(g).sort(function (a, b) { return pct(g[a].c, g[a].t) - pct(g[b].c, g[b].t) || ti(a) - ti(b); }); }
function coachInfo() {
  var g = agg(), ks = weakFirst(g).filter(function (k) { return g[k].t >= 3 && TOPICS.indexOf(k) > -1; });
  return ks.length ? { k: ks[0], p: pct(g[ks[0]].c, g[ks[0]].t) } : null;
}
function homeCards() {
  var h = '', run = get('un_run', null);
  if (run && get('un_run_q', null)) {
    var done = run.ans.filter(function (x) { return x !== null; }).length;
    h += '<div class="card" style="border-color:var(--a)"><b>⏯ Unfinished ' + (run.run === 'quiz' ? 'quiz' : 'test') + '</b><p class="mu" style="margin:4px 0 10px">' + esc(run.src) + ' · Q' + (run.cur + 1) + ' · ' + done + ' answered' + (run.run === 'test' ? ' · ' + fmt(run.left) + ' left' : '') + '</p><div class="row"><button class="btn s" data-act="resume">▶ Resume</button><button class="btn g s" data-act="discard">Discard</button></div></div>';
  }
  var due = dueList().length;
  if (due) h += '<div class="card hint"><span><b>🔁 Revision due: ' + due + '</b><br><span class="mu">Wrong answers ready for review</span></span><button class="btn s" data-act="revdue">Revise</button></div>';
  var c = coachInfo();
  h += c ? '<div class="card hint"><span><b>🎯 Weak-area coach</b><br><span class="mu">Weakest unit: <b style="color:' + tone(c.p) + '">' + esc(c.k) + ' (' + c.p + '%)</b>. Try 10 questions?</span></span><button class="btn s" data-act="coach" data-v="' + esc(c.k) + '">Practise</button></div>'
           : '<div class="card"><b>🎯 Weak-area coach</b><p class="mu" style="margin-top:4px">Take a few tests and I\'ll pick the unit that needs you most.</p></div>';
  return '<div class="smart">' + h + '</div>';
}
function ucard(t, n, gp, on) {
  return '<button class="ucard ' + (on ? 'on' : '') + '" ' + (LOADED && !n && !on ? 'disabled ' : '') + 'data-act="sec" data-v="' + esc(t) + '"><span class="ui">' + ICON[t] + '</span><span class="un"><small>Unit ' + (ti(t) + 1) + '</small>' + esc(t) + '</span><span class="cn">' + (LOADED ? n : '…') + '</span>' +
    (gp === null ? '' : '<i class="mdot" style="background:' + tone(gp) + '" title="Your accuracy: ' + gp + '%"></i>') + '<span class="ck">✓</span></button>';
}
function home(keepScroll) {
  if (S.mode === 'saved') S.mode = 'full';
  fixPaper();
  S.view = 'home'; clearInterval(S.t); relWake(); closeGrid(); closeTools(); dock(); hdr();
  var q = S.kind === 'quiz', mode = S.mode, full = mode === 'full', mock = mode === 'mock', sec = mode === 'sec';
  var un = sec && S.pool === 'unseen', g = agg(), M = R.marksPerQ, hrN = new Date().getHours();
  var greet = hrN < 12 ? 'Good morning' : hrN < 17 ? 'Good afternoon' : 'Good evening';
  var dte = daysToExam(), cd = dte === null ? '' : dte > 0 ? '<span class="pill">⏳ ' + dte + ' day' + (dte === 1 ? '' : 's') + ' to exam</span>' : dte === 0 ? '<span class="pill">🎯 Exam day — all the best!</span>' : '';
  var cAllPaper = counts(S.paper, false, S.ses), cY = counts(S.paper, un, S.ses), cAll = counts('all', false);
  var nTotal = sumC(cAll), nCov = TOPICS.filter(function (t) { return cAll[t] > 0; }).length;
  var hero = '<section class="card hero"><div><span class="eyebrow">' + greet + ' 👋</span><h1>UGC NET · JRF <em>Urdu</em> <span dir="rtl" lang="ur" class="ur">اردو</span></h1><p class="mu">' + SUB.i + ' ' + esc(SUB.n) + ' · ' + R.totalQuestions + ' questions · ' + maxMarks(R.totalQuestions) + ' marks · held twice a year (' + R.sessions.join(' &amp; ') + ')</p>' +
    '<div class="row"><span class="pill">🔥 ' + streak() + '-day streak</span><span class="pill">📝 ' + ATT.length + ' tests</span>' + cd + '</div></div>' + goalRing() + '</section>';
  var pattern = '<div class="stats pattern">' + stat('Questions', R.totalQuestions) + stat('Total marks', maxMarks(R.totalQuestions) + ' <span class="mu">(' + M + ' each)</span>') +
    stat('Duration', R.fullMinutes + ' min') + stat('Negative marks', R.negative > 0 ? '−' + R.negative : 'None') + '</div>';
  var stats = '<div class="stats">' + stat('Papers', PL.length) + stat('Questions', LOADED ? nTotal : '…') + stat('Units covered', LOADED ? nCov + '/' + TOPICS.length : '…') + stat('Sessions / year', R.sessions.length) + '</div>';

  /* paper carousel */
  var pc = '';
  if (!mock) {
    pc = '<div class="prow">' + (sec ? '<button class="pcard ' + (S.paper === 'all' ? 'on' : '') + '" data-act="paper" data-v="all"><span class="se">📚</span><b>All</b><span class="mu">' + (LOADED ? sumC(counts('all', false, S.ses)) + ' Qs' : '…') + '</span></button>' : '') +
      PL.map(function (p) {
        var n = LOADED ? sumC(counts(p.id, false)) : null, ico = R.sessions.indexOf(p.session) === 0 ? '☀️' : '❄️';
        return '<button class="pcard ' + (S.paper === p.id ? 'on' : '') + '" data-act="paper" data-v="' + esc(p.id) + '"><span class="se">' + ico + '</span><b>' + esc(p.session.slice(0, 3)) + ' ' + p.year + '</b><span class="mu">' + (n === null ? '…' : n + ' Qs') + '</span></button>';
      }).join('') + '</div>';
    if (!PL.length) pc = '<div class="empty"><b>📭</b><div style="color:var(--tx);font-weight:700">No paper added for this subject yet</div><div>Add a paper to data/manifest.js — see the notes at the top of that file.</div></div>';
  }
  var card = '';
  if (full) {
    var yt = sumC(cAllPaper), pp = PL.filter(function (p) { return p.id === S.paper; })[0];
    card = '<b>Standard Paper II pattern</b><p class="mu" style="margin-top:4px">' + R.totalQuestions + ' questions · ' + maxMarks(R.totalQuestions) + ' marks · ' + R.fullMinutes + ' minutes · ' + (R.negative > 0 ? 'negative marking of ' + R.negative + ' per wrong answer.' : 'no negative marking (official rule).') + '</p>' +
      (LOADED ? '<div class="sec" style="margin-top:12px">' + (pp ? esc(plabel(pp)) : '') + ' paper · ' + yt + ' questions' + (yt < R.totalQuestions && yt ? ' · timer scaled to ' + Math.max(1, Math.round(R.fullMinutes * yt / R.totalQuestions)) + ' min' : '') + '</div><div class="tgrid">' + TOPICS.map(function (t) { return '<span class="tag" style="' + (cAllPaper[t] ? '' : 'opacity:.4') + '">' + ICON[t] + ' ' + esc(CODE[t]) + ' <b>' + cAllPaper[t] + '</b></span>'; }).join('') + '</div>' : '<p class="mu">Loading paper details…</p>');
  } else if (mock) {
    var per = Math.max(1, Math.round(R.totalQuestions / TOPICS.length)), avail = 0;
    TOPICS.forEach(function (t) { avail += Math.min(per, cAll[t]); });
    card = '<b>⚡ Smart mock</b><p class="mu" style="margin-top:4px">Builds a fresh Paper II from <b style="color:var(--tx)">all papers</b> — about ' + per + ' questions from every unit, new (unseen) questions first. ' + (LOADED ? avail + ' questions can be built now.' : '') + '</p>';
  } else {
    var sel = TOPICS.filter(function (t) { return S.secs[t]; }), selSet = {}; sel.forEach(function (t) { selSet[t] = 1; });
    var av = sumC(cY, selSet);
    if (q) card += '<b>Instant-feedback quiz</b><p class="mu" style="margin:4px 0 8px">See the right answer and explanation right after each question. No timer.</p>';
    if (S.paper === 'all') card += '<div class="chips sm" style="margin-bottom:8px"><button class="chip ' + (S.ses === 'all' ? 'on' : '') + '" data-act="ses" data-v="all">All sessions</button>' + R.sessions.map(function (s) { return '<button class="chip ' + (S.ses === s ? 'on' : '') + '" data-act="ses" data-v="' + s + '">' + (R.sessions.indexOf(s) === 0 ? '☀️ ' : '❄️ ') + s + '</button>'; }).join('') + '</div>';
    card += '<div class="line"><b>Choose units / chapters</b><span class="row"><button class="btn g s" data-act="topall">All</button><button class="btn g s" data-act="topweak">🎯 Weakest 3</button><button class="btn g s" data-act="topnone">None</button></span></div>' +
      '<p class="mu"><b style="color:var(--tx)">' + sel.length + '</b> of ' + TOPICS.length + ' units · <b style="color:var(--tx)">' + (LOADED ? av : '…') + '</b> questions available</p><div class="ugrid">' +
      TOPICS.map(function (t) { return ucard(t, cY[t], g[t] && g[t].t ? pct(g[t].c, g[t].t) : null, S.secs[t]); }).join('') +
      '</div><p class="mu" style="margin-top:10px"><i class="mdot" style="background:#10b981"></i> strong <i class="mdot" style="background:#f59e0b"></i> average <i class="mdot" style="background:#ef4444"></i> weak — from your past tests</p>' +
      '<div class="line"><span>Question pool</span><span class="row"><button class="chip ' + (!un ? 'on' : '') + '" data-act="pool" data-v="all">All</button><button class="chip ' + (un ? 'on' : '') + '" data-act="pool" data-v="unseen">🆕 Unseen only</button></span></div>' +
      '<div class="line"><span>Number of questions</span><span class="row">' + [10, 20, 30, 0].map(function (c) { return '<button class="chip ' + (S.cnt === c ? 'on' : '') + '" data-act="cnt" data-v="' + c + '">' + (c || 'All' + (LOADED ? ' (' + av + ')' : '')) + '</button>'; }).join('') + '</span></div>';
  }
  if (!full && !mock) card += '<div class="line"><span>Practice negative marking<small>−' + SET.negAmt + ' per wrong answer (official exam has none)</small></span>' + sw(S.neg, 'neg') + '</div>';
  if (sec && !q) card += '<div class="line"><span>Time (minutes)</span><input type="number" id="mins" min="1" max="180" value="' + S.mins + '"></div>';
  card += '<div class="line"><span>Rough pad &amp; calculator<small>Show ✏️ and 🧮 in the dock during the test</small></span>' + sw(SET.tools, 'tg', 'tools') + '</div>';
  if (!q && (full || mock)) card += '<div class="line"><span>Full-screen exam mode<small>Warns if you leave full-screen or switch tabs</small></span>' + sw(SET.fullscreen, 'tg', 'fullscreen') + '</div>';
  var selM = {}; TOPICS.forEach(function (t) { if (S.secs[t]) selM[t] = 1; });
  var nStart = full ? sumC(cAllPaper) : mock ? (function () { var per2 = Math.max(1, Math.round(R.totalQuestions / TOPICS.length)), n = 0; TOPICS.forEach(function (t) { n += Math.min(per2, cAll[t]); }); return n; })() : Math.min(S.cnt || 1e9, sumC(cY, selM));
  render(hero + pattern + homeCards() + stats +
    '<h2>1 · Mode</h2><div class="seg"><button class="' + (!q ? 'on' : '') + '" data-act="kind" data-v="test">📝 Exam Test</button><button class="' + (q ? 'on' : '') + '" data-act="kind" data-v="quiz">💡 Quiz · instant answers</button></div>' +
    '<h2>2 · Scope</h2><div class="seg"><button class="' + (full ? 'on' : '') + '" data-act="mode" data-v="full">Full paper</button><button class="' + (sec ? 'on' : '') + '" data-act="mode" data-v="sec">Chapter-wise</button><button class="' + (mock ? 'on' : '') + '" data-act="mode" data-v="mock">⚡ Smart mock</button></div>' +
    (mock ? '' : '<h2>3 · ' + (full ? 'Choose paper' : 'Paper filter') + '</h2>' + pc) +
    '<div class="card" style="margin-top:12px">' + card + '</div>' +
    '<button class="btn cta" data-act="start">' + (q ? 'Start Quiz' : 'Start Test') + (LOADED && nStart ? ' · ' + nStart + ' questions' : '') + ' →</button>' +
    '<div class="card quote" style="margin-top:14px"><span class="mu">💬 Today\'s motivation</span><p>' + esc(QUOTES[Math.floor(today0() / DAY) % QUOTES.length]) + '</p></div>' +
    (demo ? '<p class="note">Demo mode: <b>data/manifest.js</b> was not found, so a built-in sample is shown. Keep index.html next to the data folder to use your own papers.</p>' : ''),
    keepScroll);
}
document.addEventListener('change', function (e) {
  if (e.target.id === 'tgt') { SET.target = e.target.value; saveSet(); toast(SET.target ? '🎯 Exam date saved' : 'Exam date cleared'); }
});
document.addEventListener('input', function (e) {
  if (e.target.id === 'mins') S.mins = +e.target.value || 1;
  if (e.target.id === 'dm') { SET.defMins = Math.max(1, Math.min(180, +e.target.value || 30)); S.mins = SET.defMins; saveSet(); }
  if (e.target.id === 'goal') { SET.goal = Math.max(1, Math.min(500, +e.target.value || 25)); saveSet(); }
  if (e.target.id === 'negamt') { SET.negAmt = Math.max(0, Math.min(2, +e.target.value || 0)); saveSet(); }
});

/* ---------- start a test ---------- */
async function start(opt) {
  if (S.view === 'test') return;
  var mode = S.mode, sec = mode === 'sec', mock = mode === 'mock', secs = TOPICS.filter(function (t) { return S.secs[t]; });
  if (sec && !secs.length) { if (S.view !== 'home') home(); return toast('Pick at least one unit first'); }
  var list = mode === 'full' ? PL.filter(function (p) { return p.id === S.paper; }) : mock ? PL.slice()
    : PL.filter(function (p) { return S.paper === 'all' ? (S.ses === 'all' || p.session === S.ses) : p.id === S.paper; });
  if (!list.length) return alert('No paper is available for this subject yet. Add one in data/manifest.js.');
  if (get('un_run', null) && !confirm('You have an unfinished test. Discard it and start a new one?')) return;
  reqFS(S.kind, S.mode);   /* must run inside the click gesture, before any await */
  var papers;
  try { papers = await Promise.all(list.map(load)); } catch (e) { exitFS(); return alert('Could not load a paper file. Check the paths in data/manifest.js.'); }
  var qs = [], cnt = (opt && opt.cnt != null) ? opt.cnt : S.cnt;
  papers.forEach(function (p, pi) {
    p.questions.forEach(function (q, i) {
      if (!sec || secs.indexOf(q.s) > -1) qs.push(Object.assign({}, q, { _k: list[pi].id + '#' + i, _src: R.shortName + ' ' + plabel(list[pi]) }));
    });
  });
  if (sec && S.pool === 'unseen') qs = qs.filter(function (q) { return !SEEN[q._k]; });
  if (!qs.length) { exitFS(); return alert(sec && S.pool === 'unseen' ? 'You have already seen every question in this selection. Switch the pool to "All".' : 'No questions found for this selection.'); }
  if (mock) {
    var per = Math.max(1, Math.round(R.totalQuestions / TOPICS.length)), out = [];
    TOPICS.forEach(function (t) { var pool = qs.filter(function (q) { return q.s === t; }); out = out.concat(shuf(pool.filter(function (q) { return !SEEN[q._k]; })).concat(shuf(pool.filter(function (q) { return SEEN[q._k]; }))).slice(0, per)); });
    qs = out; if (!qs.length) { exitFS(); return alert('No questions found for this subject.'); }
    S.src = R.shortName + ' · Smart mock · ' + SUB.short;
  } else if (sec) {
    if (cnt > 0 && qs.length > cnt) qs = shuf(qs).slice(0, cnt);
    qs.sort(function (a, b) { return ti(a.s) - ti(b.s); });
    S.src = R.shortName + ' · Chapter practice' + (S.paper === 'all' ? (S.ses === 'all' ? '' : ' · ' + S.ses) : ' · ' + plabel(list[0]));
  } else S.src = R.shortName + ' ' + plabel(list[0]);
  var secsTotal = S.kind === 'quiz' ? 0 : isFull(mode) ? Math.max(1, Math.round(R.fullMinutes * Math.min(1, qs.length / R.totalQuestions))) * 60 : Math.max(1, S.mins) * 60;
  begin(qs, secsTotal);
}
function begin(qs, total, kind) {
  S.run = kind || S.kind; S.tneg = S.neg; S.paused = false; S.fsx = 0; S.tabx = 0; S.tabNote = false; S.pf = 'all';
  if (SET.shuffleQ) { var g = {}, o = []; qs.forEach(function (q) { if (!g[q.s]) { g[q.s] = []; o.push(q.s); } g[q.s].push(q); }); qs = []; o.forEach(function (s) { qs = qs.concat(shuf(g[s])); }); }
  if (SET.shuffleO) qs = qs.map(function (q) { var ord = shuf(q.o.map(function (_, i) { return i; })); return Object.assign({}, q, { o: ord.map(function (i) { return q.o[i]; }), a: ord.indexOf(q.a) }); });
  S.qs = qs; S.ans = qs.map(function () { return null; }); S.qt = qs.map(function () { return 0; }); S.fl = qs.map(function () { return null; }); S.mk = {};
  S.cur = 0; S.total = total; S.left = total; S.el = 0;
  PAD.strokes = []; CALC = calcNew(); calcUI();
  put('un_run_q', qs);
  clearInterval(S.t); S.t = setInterval(tick, 1000); getWake(); test();
}
function tick() {
  if (S.paused) return;
  S.el++; if (S.view === 'test') S.qt[S.cur]++;
  if (S.el % 5 === 0) saveRun();
  if (S.run === 'quiz') return;
  S.left--;
  var el = $('#tm'); if (el) { el.textContent = SET.showTimer ? fmt(S.left) : '⏱ ••'; el.classList.toggle('low', S.left < 300); }
  if (S.left <= 0) { toast('⏰ Time is up!'); submit(); }
}

/* ---------- question screens ---------- */
function qcls(i) {
  if (S.run === 'quiz') return S.ans[i] === null ? '' : (S.ans[i] === S.qs[i].a ? 'ok' : 'bad');
  return (S.ans[i] !== null ? 'ans' : '') + ' ' + (S.mk[i] ? 'mk' : '');
}
function rail() {
  return '<div class="rail" role="group" aria-label="Question map">' + S.qs.map(function (_, i) { return '<button class="tk ' + qcls(i) + (i === S.cur ? ' cur' : '') + '" data-act="jump" data-v="' + i + '" aria-label="Question ' + (i + 1) + '"></button>'; }).join('') + '</div>';
}
function tchips(q) {
  var secs = []; S.qs.forEach(function (x) { if (secs.indexOf(x.s) < 0) secs.push(x.s); });
  return '<div class="tscroll">' + secs.map(function (s) { return '<button class="chip ' + (s === q.s ? 'on' : '') + '" data-act="secjump" data-v="' + esc(s) + '">' + (ICON[s] || '') + ' ' + esc(CODE[s] || s) + '</button>'; }).join('') + '</div>';
}
function centerChip() { var c = $('.tscroll .on'); if (c) { var p = c.parentNode; p.scrollLeft = c.offsetLeft - p.clientWidth / 2 + c.clientWidth / 2; } }
function flagsRow(locked) {
  var f = S.fl[S.cur];
  return '<div class="flags"><span class="mu">Confidence:</span>' + [['s', '🟢 Sure'], ['g', '🟡 Guess'], ['c', '🔴 Confused']].map(function (x) {
    return '<button class="chip ' + (f === x[0] ? 'on' : '') + '" ' + (locked ? 'disabled' : '') + ' data-act="flag" data-v="' + x[0] + '">' + x[1] + '</button>';
  }).join('') + '</div>';
}
function optHtml(q, cls) { return q.o.map(function (o, i) { return '<button class="opt ' + cls(i) + '" data-act="opt" data-v="' + i + '"><span class="ol">' + 'ABCD'.charAt(i) + '</span><span class="ot" dir="auto">' + o + '</span></button>'; }).join(''); }
function quizView(keepS) {
  var q = S.qs[S.cur], a = S.ans[S.cur], done = a !== null, c = 0, w = 0, sv = SAV[q._k] && SAV[q._k].b;
  S.ans.forEach(function (x, i) { if (x !== null) { x === S.qs[i].a ? c++ : w++; } });
  hdr();
  render('<div class="tbar"><div class="tq"><b>' + (S.cur + 1) + '</b> / ' + S.qs.length + '</div><div class="tmeta"><span class="pill">✅ ' + c + '</span><span class="pill">❌ ' + w + '</span></div></div>' + rail() + tchips(q) +
    '<div class="card qcard"><span class="tag">' + label(q) + '</span><div style="height:10px"></div><b class="qt" dir="auto">' + q.q + '</b>' +
    optHtml(q, function (i) { return done ? (i === q.a ? 'ok' : i === a ? 'bad' : '') : ''; }) + flagsRow(done) +
    (done ? '<div class="expl" dir="auto"><b>' + (a === q.a ? '✅ Correct!' : '❌ Incorrect') + '</b> · Answer: ' + 'ABCD'.charAt(q.a) + '<br>💡 ' + (q.e || 'No explanation added for this question yet.') + '</div>' : '') + '</div>' +
    '<div class="acts"><button class="btn g" data-act="prev">←</button><button class="btn g" data-act="save">' + (sv ? '🔖 Saved' : '🔖 Save') + '</button><button class="btn nx" data-act="next">' + (S.cur === S.qs.length - 1 ? 'Finish ✓' : 'Next →') + '</button></div>', keepS);
  centerChip(); if (S.grid) fillGrid(); saveRun();
}
function test(keepS) {
  S.view = 'test'; dock(); if (S.run === 'quiz') return quizView(keepS);
  hdr();
  var q = S.qs[S.cur], done = S.ans.filter(function (a) { return a !== null; }).length, mk = Object.keys(S.mk).length, sv = SAV[q._k] && SAV[q._k].b;
  var rem = S.qs.length - done, pace = rem > 0 && S.left > 0 ? Math.round(S.left / rem) : 0;
  render('<div class="tbar"><div class="tq"><b>' + (S.cur + 1) + '</b> / ' + S.qs.length + '</div><div class="tmeta"><span class="pill">✅ ' + done + '</span><span class="pill">★ ' + mk + '</span>' + (pace ? '<span class="pill">⚡ ' + pace + 's/Q left</span>' : '') + '</div></div>' + rail() + tchips(q) +
    '<div class="card qcard"><span class="tag">' + label(q) + '</span><div style="height:10px"></div><b class="qt" dir="auto">' + q.q + '</b>' +
    optHtml(q, function (i) { return S.ans[S.cur] === i ? 'sel' : ''; }) + flagsRow(false) + '</div>' +
    '<div class="acts"><button class="btn g" data-act="prev">←</button><button class="btn g" data-act="mark">' + (S.mk[S.cur] ? '★ Marked' : '☆ Mark') + '</button><button class="btn g" data-act="save">' + (sv ? '🔖 Saved' : '🔖 Save') + '</button><button class="btn g" data-act="clear">Clear</button><button class="btn nx" data-act="next">' + (S.cur === S.qs.length - 1 ? 'Submit ✓' : 'Next →') + '</button></div>', keepS);
  centerChip(); if (S.grid) fillGrid(); saveRun();
}
function fillGrid() {
  var a = S.ans.filter(function (x) { return x !== null; }).length, m = Object.keys(S.mk).length;
  var show = function (i) { return S.pf === 'all' || (S.pf === 'un' && S.ans[i] === null) || (S.pf === 'mk' && S.mk[i]); };
  $('#drawer').innerHTML = '<div class="line" style="border:0;padding-top:0"><b style="font-size:1.1rem">Question palette</b><button class="btn g s" data-act="closegrid">✕</button></div><p class="mu">🟦 ' + a + ' answered · 🟧 ' + m + ' marked · ' + (S.qs.length - a) + ' left</p>' +
    '<div class="chips sm" style="margin-top:10px">' + [['all', 'All'], ['un', 'Unanswered'], ['mk', 'Marked']].map(function (x) { return '<button class="chip ' + (S.pf === x[0] ? 'on' : '') + '" data-act="pfil" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div class="grid">' +
    S.qs.map(function (_, i) { return show(i) ? '<button class="qn ' + qcls(i) + ' ' + (i === S.cur ? 'cur' : '') + '" data-act="jump" data-v="' + i + '">' + (i + 1) + '</button>' : ''; }).join('') +
    '</div><button class="btn" data-act="submit" style="width:100%">' + (S.run === 'quiz' ? 'Finish Quiz' : 'Submit Test') + '</button>';
}
function openGrid() { S.grid = true; closeTools(); fillGrid(); $('#drawer').classList.add('show'); $('#shade').classList.add('show'); }
function closeGrid() { S.grid = false; $('#drawer').classList.remove('show'); $('#shade').classList.remove('show'); }

/* ---------- submit (with a summary confirmation) ---------- */
function askSubmit() {
  if (!SET.confirmSubmit) return submit();
  var a = S.ans.filter(function (x) { return x !== null; }).length, m = Object.keys(S.mk).length, quiz = S.run === 'quiz';
  $('#subc').innerHTML = '<div class="big">' + (quiz ? '🏁' : '📨') + '</div><h2>' + (quiz ? 'Finish the quiz?' : 'Submit the test?') + '</h2><div class="sumg"><div><b>' + a + '</b><span>Answered</span></div><div><b>' + (S.qs.length - a) + '</b><span>Unanswered</span></div><div><b>' + m + '</b><span>Marked</span></div></div>' +
    (S.qs.length - a ? '<p class="mu">You still have unanswered questions' + (quiz ? '.' : ' — they will score zero.') + '</p>' : '<p class="mu">All questions answered. Nice work!</p>') +
    '<div class="row" style="justify-content:center;margin-top:14px"><button class="btn g" data-act="subno">Keep going</button><button class="btn" data-act="subyes">' + (quiz ? 'Finish' : 'Submit') + '</button></div>';
  $('#subm').classList.add('show');
}
function submit() {
  clearInterval(S.t); relWake(); closeGrid(); closeTools(); exitFS(); clearRun();
  S.paused = false; $('#pause').classList.remove('show'); $('#warn').classList.remove('show'); $('#subm').classList.remove('show'); S.view = 'result'; S.rf = 'all';
  var neg = (S.run === 'test' && isFull(S.mode)) ? R.negative : (S.tneg ? (R.negative > 0 ? R.negative : SET.negAmt) : 0), M = R.marksPerQ;
  var st = {}, det = [], full = [], conf = {}, sc = 0, att = 0, mastered = 0, tomorrow = today0() + DAY;
  S.qs.forEach(function (q, i) {
    var r = S.ans[i] === null ? 'n' : S.ans[i] === q.a ? 'c' : 'w', f = S.fl[i] || 'u';
    var x = st[q.s] = st[q.s] || { c: 0, w: 0, n: 0, t: 0 }, cf = conf[f] = conf[f] || { c: 0, w: 0, n: 0 };
    x.t++; x[r]++; cf[r]++; if (r === 'c') sc += M; if (r === 'w') sc -= neg; if (r !== 'n') att++;
    if (r !== 'n' && q._k) SEEN[q._k] = 1;
    det.push({ s: q.s, r: r, t: S.qt[i] || 0, f: f });
    full.push({ s: q.s, c: q.c || '', q: q.q, o: q.o, a: q.a, y: S.ans[i], t: S.qt[i] || 0, f: f, e: q.e || '' });
    var e = SAV[q._k];
    if (r === 'w' && (SET.autoWrong || S.mode === 'saved')) { keep(q, 'w'); e = SAV[q._k]; e.box = 1; e.due = tomorrow; }   /* wrong → back to box 1 */
    else if (r === 'c' && S.mode === 'saved' && e && e.w) {                                                                    /* right → next box */
      e.box = (e.box || 1) + 1;
      if (e.box > 4) { e.w = false; e.box = 0; delete e.due; mastered++; } else e.due = today0() + INT[e.box - 1] * DAY;
    }
  });
  persist(); put('un_seen', SEEN);
  var dk_ = dkey(), dd = DAYM[dk_] || (DAYM[dk_] = { q: 0, t: 0 }); dd.q += att; dd.t++; put('un_days', DAYM);
  ATT.push({ ts: Date.now(), sub: SUB.id, src: S.mode === 'saved' ? 'Revision practice' : S.src + (S.run === 'quiz' ? ' · Quiz' : ''), mode: S.mode, run: S.run, sc: sc, max: maxMarks(S.qs.length), nq: S.qs.length, mpq: M, neg: neg, used: S.el, total: S.total, secs: st, det: det, conf: conf, fsx: S.fsx, tabx: S.tabx, full: full });
  if (ATT.length > 60) ATT.shift();
  ATT.forEach(function (a, i) { if (i < ATT.length - 5) delete a.full; });   /* keep full question detail for the last 5 attempts only */
  put('un_att', ATT);
  S.res = { sc: sc, st: st, mastered: mastered, neg: neg };
  dock(); hdr(); resultView(false);
}
function resultView(again) {
  var r = S.res, st = r.st, a = ATT[ATT.length - 1], M = R.marksPerQ, nq = S.qs.length, wrongN = 0, rightN = 0;
  S.ans.forEach(function (x, i) { if (x !== null) { if (x === S.qs[i].a) rightN++; else wrongN++; } });
  var idx = S.qs.map(function (_, i) { return i; }).filter(function (i) { var x = S.ans[i] === null ? 'n' : S.ans[i] === S.qs[i].a ? 'c' : 'w'; return S.rf === 'all' || S.rf === x; });
  render('<div class="card res">' + ring(r.sc, maxMarks(nq)) + '<p class="mu">' + rightN + ' × ' + M + ' = +' + (rightN * M) + (r.neg ? ' · ' + wrongN + ' × ' + r.neg + ' = −' + fm(wrongN * r.neg) : '') + ' &nbsp;·&nbsp; Time taken: ' + fmt(a.used) + (S.fsx + S.tabx ? ' · ⚠️ ' + (S.fsx + S.tabx) + ' focus lapse(s)' : '') + '</p></div>' +
    Object.keys(st).sort(function (x, y) { return ti(x) - ti(y); }).map(function (k) { var v = st[k]; return '<div class="card"><b>' + (ICON[k] || '') + ' ' + esc(k) + '</b> <span class="mu">✅ ' + v.c + ' · ❌ ' + v.w + ' · ⏭ ' + v.n + '</span><div class="bar" style="margin-bottom:0"><i style="width:' + pct(v.c, v.t) + '%"></i></div></div>'; }).join('') +
    '<div class="row" style="margin:6px 0"><button class="btn" data-act="sheet" data-v="last">📊 Full analysis</button><button class="btn g" data-act="exportq">⬇ Export attempted (CSV)</button><button class="btn g" data-act="share">↗ Share</button><button class="btn g" data-act="home">← Home</button></div>' +
    (r.mastered ? '<p class="mu">🎉 ' + r.mastered + ' question(s) mastered and removed from your wrong notebook.</p>' : '') +
    (S.mode !== 'saved' && SET.autoWrong ? '<p class="mu">Wrong answers were added to your 🔖 Saved notebook and scheduled for spaced revision.</p>' : '') +
    '<h2>Review</h2><div class="chips sm">' + [['all', 'All'], ['w', '❌ Wrong'], ['n', '⏭ Skipped'], ['c', '✅ Right']].map(function (x) { return '<button class="chip ' + (S.rf === x[0] ? 'on' : '') + '" data-act="rfil" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    (idx.length ? idx.map(function (i) {
      var q = S.qs[i];
      return '<div class="card"><div class="line" style="padding-top:0"><span class="mu">' + label(q) + ' · Q' + (i + 1) + ' · ⏱ ' + (S.qt[i] || 0) + 's' + (S.fl[i] ? ' · ' + FL[S.fl[i]] : '') + '</span><button class="btn g s" data-act="rsave" data-v="' + i + '">' + (SAV[q._k] && SAV[q._k].b ? '🔖 Saved' : '🔖 Save') + '</button></div><b class="qt" dir="auto">' + q.q + '</b>' +
        q.o.map(function (o, j) { return '<div class="opt ' + (j === q.a ? 'ok' : S.ans[i] === j ? 'bad' : '') + '"><span class="ol">' + 'ABCD'.charAt(j) + '</span><span class="ot" dir="auto">' + o + '</span></div>'; }).join('') + (q.e ? '<div class="expl" dir="auto">💡 ' + q.e + '</div>' : '') + '</div>';
    }).join('') : '<div class="empty"><b>🎉</b>Nothing in this filter.</div>'), again);
  if (!again) celebrate(r.sc / maxMarks(nq), r.sc);
}
/* ---------- score ring + confetti ---------- */
function ring(sc, max) {
  var c = 0, w = 0, n = 0, p = Math.max(0, Math.min(1, sc / max));
  S.ans.forEach(function (a, i) { if (a === null) n++; else if (a === S.qs[i].a) c++; else w++; });
  var msg = p >= .75 ? 'Outstanding result!' : p >= .5 ? 'Good going — keep climbing' : p >= .25 ? 'Solid start — review and retry' : 'Every mistake here is a mark saved later';
  return '<div class="ringw"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--a)"/><stop offset="1" style="stop-color:var(--b)"/></linearGradient></defs>' +
    '<circle class="t" cx="60" cy="60" r="52"/><circle class="f" cx="60" cy="60" r="52" style="--o:' + (326.7 * (1 - p)).toFixed(1) + '"/></svg>' +
    '<div class="ringc"><b id="rnum">' + fm(sc) + '</b><small>out of ' + max + ' · ' + Math.round(p * 100) + '%</small></div></div>' +
    '<h3>' + msg + '</h3><div class="rp"><span style="color:#10b981">✅ ' + c + '</span><span style="color:#ef4444">❌ ' + w + '</span><span>⏭ ' + n + '</span></div>';
}
function celebrate(p, sc) {
  var el = $('#rnum'), t0 = performance.now(), whole = Number.isInteger(sc);
  if (el && SET.motion) (function f(t) { var k = Math.min(1, (t - t0) / 1500), v = sc * (1 - Math.pow(1 - k, 3)); el.textContent = whole ? Math.round(v) : v.toFixed(2); if (k < 1) requestAnimationFrame(f); })(t0);
  if (p < .25 || !SET.motion || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) return;
  var cv = $('#cf'), c = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, ps = [], i,
      cols = ['#4f8cff', '#ffb020', '#22d3b6', '#f0567a', '#2fbf8f', '#ff8a3d'], N = Math.round(70 + p * 150), st = performance.now();
  for (i = 0; i < N; i++) ps.push({ x: W / 2 + (Math.random() - .5) * 120, y: H * .3, vx: (Math.random() - .5) * 15, vy: -Math.random() * 15 - 4, w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length] });
  (function loop(t) {
    c.clearRect(0, 0, W, H);
    ps.forEach(function (q) { q.vy += .3; q.vx *= .992; q.x += q.vx; q.y += q.vy; q.r += q.vr; c.save(); c.translate(q.x, q.y); c.rotate(q.r); c.fillStyle = q.c; c.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); c.restore(); });
    if (t - st < 4200) requestAnimationFrame(loop); else c.clearRect(0, 0, W, H);
  })(st);
}
/* export the questions you attempted, with your answers (opens in Excel / Google Sheets) */
function exportQ() {
  var m = mine(), a = m[m.length - 1]; if (!a || !a.full) return alert('Nothing to export yet. Finish a test first.');
  var rows = [['#', 'Unit', 'Sub-topic', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Your answer', 'Correct answer', 'Result', 'Time (s)', 'Confidence', 'Explanation']];
  a.full.forEach(function (x, i) {
    if (x.y === null || x.y === undefined) return;
    rows.push([i + 1, x.s, x.c, x.q, x.o[0] || '', x.o[1] || '', x.o[2] || '', x.o[3] || '', 'ABCD'.charAt(x.y) + '. ' + x.o[x.y], 'ABCD'.charAt(x.a) + '. ' + x.o[x.a], x.y === x.a ? 'Correct' : 'Wrong', x.t, FL[x.f] ? FL[x.f].replace(/^\S+\s/, '') : '', x.e]);
  });
  if (rows.length === 1) return alert('You did not attempt any question in the last test.');
  var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/<[^>]*>/g, ' ').replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
  download('ugcnet-attempted-' + dkey(new Date(a.ts)) + '.csv', csv, 'text/csv;charset=utf-8');
}

/* ---------- charts ---------- */
function radar(map) {
  var N = TOPICS.length, cx = 170, cy = 160, r = 96, f1 = function (n) { return n.toFixed(1); };
  var pt = function (i, v) { var a = -Math.PI / 2 + 2 * Math.PI * i / N; return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v]; };
  var s = '<svg viewBox="0 0 340 320" style="width:100%;height:auto" role="img" aria-label="Radar chart of unit strengths">';
  [.25, .5, .75, 1].forEach(function (l) { s += '<polygon points="' + TOPICS.map(function (_, i) { return pt(i, l).map(f1).join(','); }).join(' ') + '" fill="none" stroke="var(--bd)" stroke-width="1"/>'; });
  TOPICS.forEach(function (t, i) {
    var e = pt(i, 1), l = pt(i, 1.17), c = Math.cos(-Math.PI / 2 + 2 * Math.PI * i / N), has = !!(map[t] && map[t].t);
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f1(e[0]) + '" y2="' + f1(e[1]) + '" stroke="var(--bd)"/><text x="' + f1(l[0]) + '" y="' + f1(l[1] + 3) + '" text-anchor="' + (c > .3 ? 'start' : c < -.3 ? 'end' : 'middle') + '" font-size="9" font-weight="700" style="fill:var(--mu)" opacity="' + (has ? 1 : .4) + '">' + esc(CODE[t]) + '</text>';
  });
  var vals = TOPICS.map(function (t, i) { var m = map[t]; return pt(i, m && m.t ? pct(m.c, m.t) / 100 : 0); });
  s += '<polygon points="' + vals.map(function (p) { return p.map(f1).join(','); }).join(' ') + '" style="fill:var(--a);stroke:var(--a)" fill-opacity=".28" stroke-width="2" stroke-linejoin="round"/>';
  vals.forEach(function (p, i) { var m = map[TOPICS[i]]; if (m && m.t) s += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="3" fill="' + tone(pct(m.c, m.t)) + '"/>'; });
  return s + '</svg><div class="codes">' + TOPICS.map(function (t, i) { return '<span><b>' + esc(CODE[t]) + '</b> ' + esc(t) + '</span>'; }).join('') + '</div>';
}
function bars(map) {
  var rh = 20, s = '<svg viewBox="0 0 340 ' + (TOPICS.length * rh + 6) + '" style="width:100%;height:auto" role="img" aria-label="Accuracy by unit">';
  TOPICS.forEach(function (t, i) {
    var y = i * rh + 3, has = map[t] && map[t].t, p = has ? pct(map[t].c, map[t].t) : 0;
    s += '<text x="0" y="' + (y + 11) + '" font-size="9.5" style="fill:var(--tx)" opacity="' + (has ? 1 : .45) + '">' + esc(CODE[t]) + '</text><rect x="92" y="' + (y + 2) + '" width="200" height="10" rx="5" style="fill:var(--bd)"/>' +
      (has ? '<rect x="92" y="' + (y + 2) + '" width="' + Math.max(4, p * 2) + '" height="10" rx="5" fill="' + tone(p) + '"/>' : '') +
      '<text x="340" y="' + (y + 11) + '" text-anchor="end" font-size="9.5" font-weight="700" style="fill:var(--mu)">' + (has ? p + '%' : '–') + '</text>';
  });
  return s + '</svg>';
}
function heat() {
  var W = 17, cell = 14, gap = 3, today = new Date(); today.setHours(0, 0, 0, 0);
  var start = new Date(today); start.setDate(today.getDate() - ((W - 1) * 7 + today.getDay()));
  var op = [0, .3, .55, .8, 1], mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], lastM = -1, act = 0;
  var s = '<svg viewBox="0 0 ' + (W * (cell + gap)) + ' ' + (7 * (cell + gap) + 14) + '" style="width:100%;height:auto" role="img" aria-label="Daily practice heatmap">';
  for (var w = 0; w < W; w++) for (var d = 0; d < 7; d++) {
    var dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d); if (dt > today) continue;
    var rec = DAYM[dkey(dt)], q = rec ? rec.q : 0, lv = !q ? 0 : q < 10 ? 1 : q < 25 ? 2 : q < 50 ? 3 : 4;
    if (q) act++;
    if (d === 0 && dt.getMonth() !== lastM) { lastM = dt.getMonth(); s += '<text x="' + (w * (cell + gap)) + '" y="9" font-size="8.5" style="fill:var(--mu)">' + mn[lastM] + '</text>'; }
    s += '<rect x="' + (w * (cell + gap)) + '" y="' + (14 + d * (cell + gap)) + '" width="' + cell + '" height="' + cell + '" rx="3" style="fill:' + (lv ? 'var(--a)' : 'var(--bd)') + '" fill-opacity="' + (lv ? op[lv] : 1) + '"><title>' + dkey(dt) + ': ' + q + ' question(s)</title></rect>';
  }
  return s + '</svg><div class="legend"><span style="margin-right:auto">' + act + ' active day' + (act === 1 ? '' : 's') + ' in the last ' + W + ' weeks</span>Less ' + op.map(function (o, i) { return '<i style="' + (i ? 'opacity:' + o : 'background:var(--bd)') + '"></i>'; }).join('') + ' More</div>';
}

/* ---------- analytics pages ---------- */
function empty(i, t, d) { return '<div class="empty"><b>' + i + '</b><div style="color:var(--tx);font-weight:700">' + t + '</div><div>' + d + '</div></div>'; }
function trow(k, v, btn) {
  var p = pct(v.c, v.t);
  return '<div class="card"><div class="line" style="padding:0;border:0"><b>' + (ICON[k] || '') + ' ' + esc(k) + '</b><b style="color:' + tone(p) + '">' + p + '% · ' + lab(p) + '</b></div>' +
    '<div class="line" style="padding:4px 0 0;border:0"><span class="mu">' + v.c + '/' + v.t + ' correct · ' + v.w + ' wrong · ' + v.n + ' skipped</span>' +
    (btn ? '<button class="btn g s" data-act="ptopic" data-v="' + esc(k) + '">Practise</button>' : '') + '</div>' + bar(p) + '</div>';
}
function nums(list, col, max) {
  if (!list.length) return '<span class="mu">None 🎉</span>';
  return '<div class="cnum">' + list.slice(0, max || 15).map(function (n) { return '<span style="background:' + col + '">' + n + '</span>'; }).join('') + (list.length > (max || 15) ? '<span class="mu" style="background:none;color:var(--mu)">+' + (list.length - (max || 15)) + ' more</span>' : '') + '</div>';
}
function timeBlock(a) {
  var n = a.det.length, avg = a.det.reduce(function (s, d) { return s + d.t; }, 0) / n || 1;
  var ids = function (fn) { return a.det.map(function (d, i) { return fn(d) ? i + 1 : 0; }).filter(Boolean); };
  var sw_ = ids(function (d) { return d.r === 'w' && d.t >= 1.5 * avg; }), fw = ids(function (d) { return d.r === 'w' && d.t <= .5 * avg; }), sr = ids(function (d) { return d.r === 'c' && d.t >= 1.5 * avg; });
  var tm = {}; a.det.forEach(function (d) { var x = tm[d.s] || (tm[d.s] = { t: 0, n: 0 }); x.t += d.t; x.n++; });
  var ks = Object.keys(tm).sort(function (x, y) { return ti(x) - ti(y); }), mx = Math.max.apply(null, ks.map(function (k) { return tm[k].t / tm[k].n; })) || 1;
  return '<div class="sec">Time per question</div><div class="card"><p class="mu">Average: <b style="color:var(--tx)">' + avg.toFixed(0) + 's</b> per question' + (a.total ? ' · exam pace target ' + Math.round(a.total / n) + 's' : '') + '</p>' +
    '<div class="line" style="padding-bottom:0"><b>🐢 Slow &amp; wrong</b></div><span class="mu">Took 1.5× the average and still missed — likely concept gaps.</span>' + nums(sw_, '#ef4444') +
    '<div class="line" style="padding-bottom:0"><b>⚡ Fast &amp; wrong</b></div><span class="mu">Under half the average — rushed or guessed.</span>' + nums(fw, '#f59e0b') +
    '<div class="line" style="padding-bottom:0"><b>🐌 Slow but right</b></div><span class="mu">Correct, but costly — practise for speed.</span>' + nums(sr, '#3b82f6') + '</div>' +
    '<div class="card"><b>Average time by unit</b>' + ks.map(function (k) { var v = tm[k].t / tm[k].n; return '<div class="line" style="padding:6px 0 0;border:0"><span>' + (ICON[k] || '') + ' ' + esc(CODE[k] || k) + '</span><b>' + v.toFixed(0) + 's</b></div><div class="bar" style="margin:4px 0 2px"><i style="width:' + Math.round(v / mx * 100) + '%"></i></div>'; }).join('') + '</div>';
}
function confBlock(cf) {
  var keys = ['s', 'g', 'c', 'u'].filter(function (k) { return cf[k]; });
  if (!keys.length) return '';
  var tot = function (k) { return cf[k] ? cf[k].c + cf[k].w + cf[k].n : 0; };
  if (keys.length === 1 && keys[0] === 'u') return '<div class="sec">Confidence check</div><div class="card"><p class="mu">Tap 🟢 Sure / 🟡 Guess / 🔴 Confused while answering and this section will show how well your confidence matches your results.</p></div>';
  var h = '<div class="sec">Confidence check</div><div class="card"><div class="mtx"><b></b><b>Right</b><b>Wrong</b><b>Skipped</b>' + keys.map(function (k) { var v = cf[k]; return '<span class="l">' + FL[k] + '</span><span style="color:#10b981">' + v.c + '</span><span style="color:#ef4444">' + v.w + '</span><span>' + v.n + '</span>'; }).join('') + '</div>';
  if (cf.s && cf.s.w) h += '<p style="margin-top:10px">⚠️ <b>' + cf.s.w + '</b> "Sure" answer(s) were wrong — overconfidence. Revise those concepts first.</p>';
  if (cf.g && cf.g.c) h += '<p style="margin-top:8px">🍀 <b>' + cf.g.c + '</b> right guess(es) — lucky, not learned. Re-check them.</p>';
  if (cf.s && tot('s') && !cf.s.w) h += '<p style="margin-top:8px">✅ Your "Sure" answers were all correct — great calibration.</p>';
  return h + '</div>';
}
function tLast() {
  var m = mine(), a = m[m.length - 1]; if (!a) return empty('📊', 'No test yet', 'Finish a test in ' + esc(SUB.n) + ' and its full analysis shows up here.');
  var c = 0, w = 0, nq = a.nq || a.det.length;
  Object.keys(a.secs).forEach(function (k) { c += a.secs[k].c; w += a.secs[k].w; });
  return '<p class="mu" style="margin-bottom:10px">' + esc(a.src) + ' · ' + new Date(a.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</p>' +
    '<div class="stats">' + stat('Score', fm(a.sc) + ' / ' + a.max) + stat('Accuracy', pct(c, c + w) + '%') + stat('Attempted', (c + w) + ' / ' + nq) +
    stat('Negative marks', '−' + fm(w * (a.neg || 0))) + stat('Avg time / Q', Math.round(a.used / nq) + 's') + stat('Time taken', fmt(a.used)) +
    ((a.fsx || a.tabx) ? stat('Focus lapses', '⚠️ ' + ((a.fsx || 0) + (a.tabx || 0))) : '') + '</div>' +
    (a.full ? '<button class="btn" data-act="exportq" style="width:100%;margin-bottom:12px">⬇ Export attempted questions + my answers (CSV)</button>' : '') +
    '<div class="two"><div><div class="sec">Strength radar</div><div class="card">' + radar(a.secs) + '</div></div><div><div class="sec">Question map</div><div class="card"><div class="strip" style="margin:0">' + a.det.map(function (d, i) { return '<span style="background:' + (d.r === 'c' ? '#10b981' : d.r === 'w' ? '#ef4444' : '#6b7280') + '">' + (i + 1) + '</span>'; }).join('') + '</div></div></div></div>' +
    timeBlock(a) + confBlock(a.conf || {}) +
    '<div class="sec">Unit-wise (this test)</div>' + Object.keys(a.secs).sort(function (x, y) { return ti(x) - ti(y); }).map(function (k) { return trow(k, a.secs[k]); }).join('');
}
function spark() {
  var p = mine().slice(-12).map(function (a) { return Math.max(0, Math.min(100, a.sc / a.max * 100)); });
  if (p.length < 2) return '<p class="mu">Take 2+ tests to see your trend.</p>';
  return '<svg viewBox="0 0 200 50" preserveAspectRatio="none" style="width:100%;height:70px"><polyline points="' + p.map(function (v, i) { return (i * 200 / (p.length - 1)).toFixed(1) + ',' + (48 - v * .46).toFixed(1); }).join(' ') + '" fill="none" style="stroke:var(--a)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
}
function tAll() {
  var g = agg(), c = 0, w = 0, t = 0, best = 0, sum = 0, s = streak(), m = mine();
  Object.keys(g).forEach(function (k) { c += g[k].c; w += g[k].w; });
  m.forEach(function (a) { var p = a.sc / a.max * 100; sum += p; if (p > best) best = p; t += a.used; });
  var h = '<div class="stats">' + stat('Tests taken', m.length) + stat('Avg score', m.length ? Math.round(sum / m.length) + '%' : '–') + stat('Best score', m.length ? Math.round(best) + '%' : '–') + stat('Accuracy', m.length ? pct(c, c + w) + '%' : '–') +
    stat('Study streak', '🔥 ' + s + ' day' + (s === 1 ? '' : 's')) + stat('Best streak', '🏆 ' + bestStreak() + ' day' + (bestStreak() === 1 ? '' : 's')) + '</div>' +
    '<div class="sec">Daily practice calendar</div><div class="card">' + heat() + '</div>';
  if (!m.length) return h + empty('📈', 'No test data yet', 'Radar, bar charts and trends appear after your first test in ' + esc(SUB.n) + '.');
  var weak = weakFirst(g).filter(function (k) { return TOPICS.indexOf(k) > -1; }).slice(0, 3);
  return h + '<div class="card"><span class="mu">Score trend (last 12 tests)</span>' + spark() + '</div>' +
    '<div class="two"><div><div class="sec">Strength radar (all tests)</div><div class="card">' + radar(g) + '</div></div><div><div class="sec">Accuracy by unit</div><div class="card">' + bars(g) + '</div></div></div>' + confBlock(aggConf()) +
    '<div class="sec">Focus on these units</div>' + weak.map(function (k) { return trow(k, g[k], true); }).join('') +
    '<div class="sec">Recent tests</div>' + m.slice(-5).reverse().map(function (a) { return '<div class="line"><span>' + esc(a.src) + '<small>' + new Date(a.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + '</small></span><b>' + fm(a.sc) + '/' + a.max + '</b></div>'; }).join('') +
    '<div class="mu" style="margin-top:6px">Total practice time: ' + Math.round(t / 60) + ' min</div>';
}
function tTopics() {
  if (!mine().length) return empty('📚', 'No unit data', 'Take a test and all ' + TOPICS.length + ' units will be ranked here, weakest first.');
  var g = agg(), done = weakFirst(g).filter(function (k) { return TOPICS.indexOf(k) > -1; }), un = TOPICS.filter(function (k) { return !g[k]; });
  return '<div class="card">' + bars(g) + '</div><p class="mu" style="margin-bottom:10px">Weakest units first — tap Practise to drill one.</p>' + done.map(function (k) { return trow(k, g[k], true); }).join('') +
    (un.length ? '<div class="sec">Not attempted yet (' + un.length + ')</div><div class="tgrid">' + un.map(function (k) { return '<button class="chip" data-act="ptopic" data-v="' + esc(k) + '">' + ICON[k] + ' ' + esc(CODE[k]) + '</button>'; }).join('') + '</div>' : '');
}
function insights(keepS) {
  S.view = 'insights'; dock(); hdr();
  var tabs = [['last', '📊 Last test'], ['all', '📈 Overall'], ['chap', '📚 Units']];
  render('<div class="pagehead"><h1>Insights</h1><p class="mu">' + SUB.i + ' ' + esc(SUB.n) + ' — your performance, unit by unit.</p></div><div class="tabs">' +
    tabs.map(function (t) { return '<button class="chip ' + (S.itab === t[0] ? 'on' : '') + '" data-act="itab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' + ({ last: tLast, all: tAll, chap: tTopics })[S.itab](), keepS);
}
function savedList() {
  return mySav().filter(function (e) { return S.sf === 'all' || (S.sf === 'b' && e.b) || (S.sf === 'w' && e.w) || (S.sf === 'd' && e.w && (e.due || 0) <= today0()); })
    .sort(function (a, b) { return (a.due || 0) - (b.due || 0); });
}
function revise(keepS) {
  S.view = 'revise'; dock(); hdr();
  var all = mySav().length, l = savedList(), due = dueList().length;
  var h = '<div class="pagehead"><h1>Revision</h1><p class="mu">Spaced repetition: wrong answers return after 1 → 3 → 7 → 14 days. Get one right at the end and it\'s mastered.</p></div><div class="chips sm">' +
    [['all', 'All (' + all + ')'], ['d', '🔁 Due today (' + due + ')'], ['w', '❌ Wrong notebook'], ['b', '🔖 Bookmarked']].map(function (x) { return '<button class="chip ' + (S.sf === x[0] ? 'on' : '') + '" data-act="sfil" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
  if (!l.length) return render(h + empty('🔖', 'Nothing here', S.sf === 'd' ? 'No revision due today. Nice work! 🎉' : 'Tap 🔖 Save during a test. Wrong answers are saved automatically.'), keepS);
  render(h + '<button class="btn" data-act="practice" style="width:100%;margin-bottom:12px">▶ Practise these (' + l.length + ')</button>' + l.map(function (e) {
    return '<div class="card"><div class="line" style="padding:0 0 6px;border:0"><span><span class="tag">' + esc(e.s) + (e.c ? ' · ' + esc(e.c) : '') + '</span> ' + (e.w ? '<span class="tag" style="color:#ef4444">wrong · box ' + (e.box || 1) + ' · ' + dueText(e) + '</span>' : '') + '</span><button class="btn g s" data-act="delsav" data-v="' + esc(e.k) + '">🗑</button></div><b class="qt" dir="auto">' + e.q + '</b><div class="opt ok" style="margin-top:10px"><span class="ol">' + 'ABCD'.charAt(e.a) + '</span><span class="ot" dir="auto">' + e.o[e.a] + '</span></div>' + (e.e ? '<div class="expl" dir="auto">💡 ' + e.e + '</div>' : '') + '<span class="mu">' + esc(e.src) + '</span></div>';
  }).join(''), keepS);
}
function setRow(l, d, c) { return '<div class="line"><span>' + l + (d ? '<small>' + d + '</small>' : '') + '</span>' + c + '</div>'; }
function settings(keepS) {
  S.view = 'settings'; dock(); hdr();
  var kb = Math.round((JSON.stringify(ATT).length + JSON.stringify(SAV).length) / 1024 * 10) / 10;
  var cols = { royal: '#4f8cff', aurora: '#22d3b6', ember: '#ff7a45', emerald: '#34d399', orchid: '#e879f9' };
  render('<div class="pagehead"><h1>Settings</h1><p class="mu">Make the app yours — everything is saved on this device.</p></div>' +
    '<div class="sec">My exam</div><div class="card">' +
    (SUBS.length > 1 ? setRow('Subject<small>' + SUB.i + ' ' + esc(SUB.n) + '</small>', '', '<button class="btn g s" data-act="subject">Change</button>') : '') +
    setRow('Exam date<small>Shows a countdown on the home screen</small>', '', '<input type="date" id="tgt" value="' + esc(SET.target || '') + '">') +
    setRow('Daily goal<small>Questions per day</small>', '', '<input type="number" id="goal" min="1" max="500" value="' + SET.goal + '">') + '</div>' +
    '<div class="sec">Appearance</div><div class="card">' +
    setRow('Dark mode', '', sw(root.dataset.theme === 'dark', 'theme')) +
    '<div class="line"><span>Colour palette</span><span class="row">' + Object.keys(cols).map(function (k) { return '<button class="dot ' + (root.dataset.pal === k ? 'on' : '') + '" data-act="pick" data-v="' + k + '" style="background:' + cols[k] + '" aria-label="' + k + '"></button>'; }).join('') + '</span></div>' +
    '<div class="line"><span>Text size</span><span class="row">' + ['A−', 'A', 'A+'].map(function (l, i) { return '<button class="chip ' + (SET.font === i ? 'on' : '') + '" data-act="font" data-v="' + i + '">' + l + '</button>'; }).join('') + '</span></div>' +
    setRow('Motion graphics', 'Turn off to save battery', sw(SET.motion, 'tg', 'motion')) +
    setRow('Nastaliq font for Urdu text', 'Turn off for a plain Naskh-style font', sw(SET.nast, 'tg', 'nast')) + '</div>' +
    '<div class="sec">Test experience</div><div class="card">' +
    setRow('Rough pad &amp; calculator', 'Buttons shown during tests', sw(SET.tools, 'tg', 'tools')) +
    setRow('Full-screen exam mode', 'Full-paper &amp; smart-mock tests only', sw(SET.fullscreen, 'tg', 'fullscreen')) +
    setRow('Show timer', 'Hide it to reduce pressure', sw(SET.showTimer, 'tg', 'showTimer')) +
    setRow('Auto-next on answer', 'Jump ahead after choosing', sw(SET.autoNext, 'tg', 'autoNext')) +
    setRow('Shuffle questions', 'Within each unit', sw(SET.shuffleQ, 'tg', 'shuffleQ')) +
    setRow('Shuffle options', 'Stops memorising positions', sw(SET.shuffleO, 'tg', 'shuffleO')) +
    setRow('Confirm before submit', 'Shows a summary first', sw(SET.confirmSubmit, 'tg', 'confirmSubmit')) +
    setRow('Auto-save wrong answers', 'Builds your revision notebook', sw(SET.autoWrong, 'tg', 'autoWrong')) +
    setRow('Haptic feedback', 'Light vibration on taps', sw(SET.haptic, 'tg', 'haptic')) +
    setRow('Keep screen awake', 'During tests', sw(SET.wake, 'tg', 'wake')) +
    setRow('Default chapter-test time', 'Minutes', '<input type="number" id="dm" min="1" max="180" value="' + SET.defMins + '">') +
    setRow('Practice negative marking by default', 'For chapter-wise tests (official exam has none)', sw(SET.defNeg, 'tg', 'defNeg')) +
    setRow('Negative marks per wrong answer', 'Used when practice negative marking is on', '<input type="number" id="negamt" min="0" max="2" step="0.25" value="' + SET.negAmt + '">') + '</div>' +
    '<div class="sec">Help</div><div class="card"><button class="btn g s" data-act="tour">▶ Replay the app tour</button></div>' +
    '<div class="sec">Data</div><div class="card"><p class="mu" style="margin-bottom:10px">Stored on this device: ' + ATT.length + ' tests · ' + Object.keys(SAV).length + ' saved questions · ' + kb + ' KB</p>' +
    '<div class="row"><button class="btn g s" data-act="export">⬇ Backup</button><button class="btn g s" data-act="import">⬆ Restore</button><button class="btn g s" data-act="wipe" style="color:#ef4444">🗑 Clear data</button></div></div>' +
    '<p class="mu" style="text-align:center;margin-top:14px">Wise Choice · UGC NET JRF Paper II Test Series</p>', keepS);
}
function refresh() { ({ home: home, insights: insights, revise: revise, settings: settings })[S.view] && ({ home: home, insights: insights, revise: revise, settings: settings })[S.view](true); }

/* ---------- rough pad ---------- */
var PAD = { strokes: [], col: 'auto', erase: false, cur: null, cv: null, cx: null };
function inkColor(c) { return c === 'auto' ? getComputedStyle(root).getPropertyValue('--tx').trim() || '#fff' : c; }
function strokeSeg(s, pts) {
  var c = PAD.cx; c.save(); c.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
  c.strokeStyle = inkColor(s.c); c.lineWidth = s.e ? 18 : 2.6; c.lineCap = c.lineJoin = 'round'; c.beginPath();
  pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
  if (pts.length === 1) c.lineTo(pts[0][0] + .1, pts[0][1]); c.stroke(); c.restore();
}
function padDraw() { PAD.cx.clearRect(0, 0, PAD.cv.width, PAD.cv.height); PAD.strokes.forEach(function (s) { strokeSeg(s, s.p); }); }
function padResize() {
  var r = PAD.cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; if (!r.width) return;
  PAD.cv.width = Math.round(r.width * d); PAD.cv.height = Math.round(r.height * d); PAD.cx.setTransform(d, 0, 0, d, 0, 0); padDraw();
}
function padUI() {
  document.querySelectorAll('[data-pc]').forEach(function (b) { b.classList.toggle('on', !PAD.erase && b.dataset.pc === PAD.col); });
  $('#bErase').classList.toggle('on', PAD.erase);
}
function padInit() {
  PAD.cv = $('#pad'); PAD.cx = PAD.cv.getContext('2d');
  var pt = function (e) { var r = PAD.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  PAD.cv.addEventListener('pointerdown', function (e) {
    e.preventDefault(); try { PAD.cv.setPointerCapture(e.pointerId); } catch (x) {}
    PAD.cur = { c: PAD.col, e: PAD.erase, p: [pt(e)] }; PAD.strokes.push(PAD.cur); strokeSeg(PAD.cur, PAD.cur.p);
  });
  PAD.cv.addEventListener('pointermove', function (e) {
    if (!PAD.cur) return; var p = pt(e), l = PAD.cur.p[PAD.cur.p.length - 1]; PAD.cur.p.push(p); strokeSeg(PAD.cur, [l, p]);
  });
  var up = function () { PAD.cur = null; };
  PAD.cv.addEventListener('pointerup', up); PAD.cv.addEventListener('pointercancel', up);
  window.addEventListener('resize', function () { if (toolsOpen()) padResize(); });
}

/* ---------- calculator ---------- */
function calcNew() { return { cur: '0', acc: null, op: null, fresh: true }; }
var CALC = calcNew(), SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };
function fmtn(n) { if (!isFinite(n)) return 'Error'; var s = String(parseFloat(n.toPrecision(12))); return s.length > 14 ? n.toExponential(6) : s; }
function calcEval() {
  var a = CALC.acc, b = parseFloat(CALC.cur), r = 0;
  if (CALC.op === '+') r = a + b; else if (CALC.op === '-') r = a - b; else if (CALC.op === '*') r = a * b; else r = b === 0 ? NaN : a / b;
  CALC.cur = fmtn(r); CALC.acc = isFinite(r) ? r : null;
}
function calcUI() { $('#cval').textContent = CALC.cur; $('#cexp').textContent = (CALC.op && CALC.acc !== null) ? fmtn(CALC.acc) + ' ' + SYM[CALC.op] : ''; }
function calcPress(k) {
  var C = CALC;
  if (C.cur === 'Error' && k !== 'C') return;
  if (/^[0-9]$/.test(k)) { if (C.fresh) { C.cur = k; C.fresh = false; } else if (C.cur.replace(/[-.]/g, '').length < 14) C.cur = C.cur === '0' ? k : C.cur + k; }
  else if (k === '.') { if (C.fresh) { C.cur = '0.'; C.fresh = false; } else if (C.cur.indexOf('.') < 0) C.cur += '.'; }
  else if ('+-*/'.indexOf(k) > -1) { if (C.op && !C.fresh) calcEval(); else C.acc = parseFloat(C.cur); if (CALC.cur !== 'Error') { CALC.op = k; CALC.fresh = true; } }
  else if (k === '=') { if (C.op) { calcEval(); C.op = null; C.fresh = true; } }
  else if (k === 'C') CALC = calcNew();
  else if (k === 'B') { if (!C.fresh && C.cur.length > 1) C.cur = C.cur.slice(0, -1); else { C.cur = '0'; C.fresh = true; } }
  else if (k === '%') { C.cur = fmtn(parseFloat(C.cur) / 100); C.fresh = true; }
  else if (k === 'R') { var n = parseFloat(C.cur); C.cur = n < 0 ? 'Error' : fmtn(Math.sqrt(n)); C.fresh = true; }
  calcUI();
}
function calcInit() {
  var keys = [['C', 'C', 'op'], ['B', '⌫', 'op'], ['%', '%', 'op'], ['/', '÷', 'op'], ['7'], ['8'], ['9'], ['*', '×', 'op'], ['4'], ['5'], ['6'], ['-', '−', 'op'], ['1'], ['2'], ['3'], ['+', '+', 'op'], ['0'], ['.'], ['R', '√', 'op'], ['=', '=', 'eq']];
  $('#ckeys').innerHTML = keys.map(function (k) { return '<button class="' + (k[2] || '') + '" data-act="ck" data-v="' + k[0] + '">' + (k[1] || k[0]) + '</button>'; }).join(''); calcUI();
}

/* ---------- tools panel ---------- */
var toolsOpen = function () { return $('#tools').classList.contains('show'); };
function openTools(tab) { if (!SET.tools) return; closeGrid(); $('#tools').classList.add('show'); toolTab(tab || 'pad'); }
function closeTools() { $('#tools').classList.remove('show'); }
function toolTab(t) {
  S.ttab = t; $('#padWrap').style.display = t === 'pad' ? 'flex' : 'none'; $('#calcWrap').style.display = t === 'calc' ? 'flex' : 'none';
  $('#tabPad').classList.toggle('on', t === 'pad'); $('#tabCalc').classList.toggle('on', t === 'calc');
  if (t === 'pad') { padResize(); padUI(); }
}

/* ---------- subject picker ---------- */
function subjShow(first) {
  $('#subj').innerHTML = '<div class="ovc"><div class="big">' + (first ? '🎓' : SUB.i) + '</div><h2>' + (first ? 'Choose your subject' : 'Switch subject') + '</h2><p class="mu"> Pick the subject you are preparing for — you can change it any time from the header.</p><div class="subs">' +
    SUBS.map(function (s) { var np = PLALL.filter(function (p) { return p.subject === s.id; }).length; return '<button class="scard ' + (!first && s.id === SUB.id ? 'on' : '') + '" data-act="pickSubj" data-v="' + esc(s.id) + '"><span class="si">' + s.i + '</span><span><b>' + esc(s.n) + '</b><small>' + s.units.length + ' units · ' + np + ' paper' + (np === 1 ? '' : 's') + '</small></span></button>'; }).join('') +
    '</div>' + (first ? '' : '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn g" data-act="subjclose">Cancel</button></div>') + '</div>';
  $('#subj').classList.add('show');
}
function pickSubject(id) {
  SET.subject = id; saveSet(); LOADED = false; setSubject(id); resetSecs(); fixPaper(); S.ses = 'all'; S.pool = 'all';
  $('#subj').classList.remove('show'); home(); preload();
  if (!get('un_tour', 0)) tourShow(0);
}

/* ---------- onboarding tour ---------- */
var TOUR = [
  { i: '👋', t: 'Welcome to Wise Choice', d: 'Practise UGC NET / JRF <b>Urdu · Paper II</b> year-wise and session-wise (June &amp; December), or unit-by-unit across the syllabus — in exam-style tests or instant-feedback quizzes.' },
  { i: '📝', t: 'Three ways to practise', d: '<b>Full paper</b> — 100 questions, 200 marks, timed. <b>Chapter-wise</b> — pick only the units you want. <b>Smart mock</b> — a fresh 100-question paper built from every unit. Choose <b>Exam Test</b> or <b>Quiz</b> (instant answers).' },
  { i: '🧰', t: 'The floating dock', d: 'The dock at the bottom takes you around the app. During a test it turns into your toolbox: ▦ <b>palette</b>, ✏️ <b>rough pad</b>, 🧮 <b>calculator</b>, ⏸ <b>pause</b> and ✕ <b>exit</b>. Mark your <b>confidence</b> (Sure / Guess / Confused) on each question.' },
  { i: '📊', t: 'Know your strengths', d: 'Open <b>Insights</b> for a radar chart, accuracy bars per unit, time-per-question insights, your <b>daily practice calendar</b>, and export your attempted questions with your answers.' },
  { i: '🔁', t: 'Revise smartly', d: 'Wrong answers go to a <b>spaced-repetition notebook</b> (back after 1, 3, 7, 14 days). Set your <b>exam date</b> and <b>daily goal</b> in Settings, and let the <b>weak-area coach</b> pick the unit that needs you most.' }
];
function tourShow(n) {
  var s = TOUR[n], last = n === TOUR.length - 1;
  S.tourN = n;
  $('#tour').innerHTML = '<div class="ovc"><div class="big">' + s.i + '</div><h2>' + s.t + '</h2><p class="mu" style="color:var(--tx)">' + s.d + '</p><div class="dots">' + TOUR.map(function (_, i) { return '<i class="' + (i === n ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
    '<div class="row" style="justify-content:center">' + (n ? '<button class="btn g" data-act="tourback">←</button>' : '<button class="btn g" data-act="tourend">Skip</button>') + '<button class="btn" data-act="' + (last ? 'tourend' : 'tournext') + '">' + (last ? 'Let\'s go 🚀' : 'Next →') + '</button></div></div>';
  $('#tour').classList.add('show');
}
function tourEnd() { $('#tour').classList.remove('show'); put('un_tour', 1); }

/* ---------- actions ---------- */
$('#imp').addEventListener('change', function (e) {
  var f = e.target.files[0]; if (!f) return; var r = new FileReader();
  r.onload = function () {
    try { var d = JSON.parse(r.result); if (d.att) ATT = d.att; if (d.sav) SAV = d.sav; if (d.days) DAYM = d.days; if (d.set) Object.assign(SET, d.set); if (d.seen) SEEN = d.seen; put('un_att', ATT); put('un_sav', SAV); put('un_days', DAYM); put('un_seen', SEEN); saveSet(); setSubject(SET.subject); resetSecs(); fixPaper(); refresh(); alert('Backup restored.'); }
    catch (x) { alert('That file is not a valid backup.'); }
  };
  r.readAsText(f); e.target.value = '';
});
function setTopicOnly(v) { TOPICS.forEach(function (t) { S.secs[t] = (t === v); }); S.mode = 'sec'; S.kind = 'quiz'; S.paper = 'all'; S.ses = 'all'; S.pool = 'all'; }
function guard() { if (S.view === 'test') { toast('Finish or exit the current test first'); return true; } return false; }
var A = {
  theme: function () { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; put('un_t', root.dataset.theme); if (S.view === 'settings') settings(true); if (toolsOpen() && S.ttab === 'pad') padDraw(); },
  pick: function (v) { root.dataset.pal = v; put('un_p', v); if (S.view === 'settings') settings(true); },
  nav: function (v) { if (guard()) return; ({ home: home, insights: insights, revise: revise, settings: settings })[v](); },
  subject: function () { if (guard()) return; subjShow(false); },
  pickSubj: function (v) { pickSubject(v); }, subjclose: function () { $('#subj').classList.remove('show'); },
  mode: function (v) { S.mode = v; fixPaper(); home(true); },
  kind: function (v) { S.kind = v; home(true); },
  paper: function (v) { S.paper = v; home(true); },
  ses: function (v) { S.ses = v; home(true); },
  sec: function (v) { S.secs[v] = !S.secs[v]; home(true); },
  cnt: function (v) { S.cnt = +v; home(true); },
  topall: function () { var c = counts(S.paper, S.pool === 'unseen', S.ses); TOPICS.forEach(function (t) { S.secs[t] = !LOADED || c[t] > 0; }); home(true); },
  topweak: function () {
    var g = agg(), c = counts(S.paper, S.pool === 'unseen', S.ses), ks = weakFirst(g).filter(function (k) { return c[k] > 0; }).slice(0, 3);
    if (!ks.length) return toast('Take a test first — then I can find your weakest units.');
    TOPICS.forEach(function (t) { S.secs[t] = ks.indexOf(t) > -1; }); home(true);
  },
  pool: function (v) { S.pool = v; home(true); },
  topnone: function () { TOPICS.forEach(function (t) { S.secs[t] = false; }); home(true); },
  neg: function () { S.neg = !S.neg; home(true); },
  start: function () { if (guard()) return; start(); }, home: function () { home(); },
  resume: resume,
  discard: function () { if (confirm('Discard your unfinished test?')) { clearRun(); home(true); } },
  revdue: function () { S.sf = 'd'; A.practice(); },
  coach: function (v) { if (guard()) return; setTopicOnly(v); start({ cnt: 10 }); },
  opt: function (v) {
    if (S.run === 'quiz') { if (S.ans[S.cur] !== null) return; buzz(); S.ans[S.cur] = +v; test(true); return; }
    buzz(); S.ans[S.cur] = +v; var c = S.cur; test(true);
    if (SET.autoNext && c < S.qs.length - 1) setTimeout(function () { if (S.view === 'test' && S.cur === c && !S.paused) { S.cur++; test(); } }, 280);
  },
  flag: function (v) { if (S.run === 'quiz' && S.ans[S.cur] !== null) return; S.fl[S.cur] = S.fl[S.cur] === v ? null : v; test(true); },
  prev: function () { if (S.cur > 0) { S.cur--; test(); } },
  next: function () { if (S.cur < S.qs.length - 1) { S.cur++; test(); return; } askSubmit(); },
  mark: function () { if (S.mk[S.cur]) delete S.mk[S.cur]; else S.mk[S.cur] = 1; test(true); },
  clear: function () { S.ans[S.cur] = null; test(true); },
  save: function () { var q = S.qs[S.cur], e = SAV[q._k]; if (e && e.b) e.b = false; else keep(q, 'b'); persist(); test(true); },
  rsave: function (v, el) { var q = S.qs[+v], e = SAV[q._k]; if (e && e.b) e.b = false; else keep(q, 'b'); persist(); el.textContent = SAV[q._k] && SAV[q._k].b ? '🔖 Saved' : '🔖 Save'; },
  jump: function (v) { S.cur = +v; closeGrid(); test(); },
  secjump: function (v) { for (var i = 0; i < S.qs.length; i++) if (S.qs[i].s === v) { S.cur = i; break; } test(); },
  grid: function () { S.grid ? closeGrid() : openGrid(); }, closegrid: closeGrid, pfil: function (v) { S.pf = v; fillGrid(); },
  submit: function () { closeGrid(); askSubmit(); },
  subyes: function () { $('#subm').classList.remove('show'); submit(); }, subno: function () { $('#subm').classList.remove('show'); },
  exit: function () { if (confirm('Exit this test? Your progress will be lost.')) { clearRun(); exitFS(); S.paused = false; $('#warn').classList.remove('show'); home(); } },
  pause: pause, unpause: unpause,
  pauseexit: function () { $('#pause').classList.remove('show'); exitFS(); S.paused = false; home(); },
  fsback: function () { $('#warn').classList.remove('show'); reqFS(S.run, S.mode); },
  fsskip: function () { $('#warn').classList.remove('show'); S.fs = false; },
  tools: function (v) { if (S.view === 'test' && !S.paused) openTools(v); }, toolsclose: closeTools, ttab: function (v) { toolTab(v); },
  padcol: function (v) { PAD.col = v; PAD.erase = false; padUI(); },
  paderase: function () { PAD.erase = !PAD.erase; padUI(); },
  padundo: function () { PAD.strokes.pop(); padDraw(); },
  padclear: function () { PAD.strokes = []; padDraw(); },
  ck: function (v) { calcPress(v); },
  sheet: function (v) { if (v) S.itab = v; insights(); },
  itab: function (v) { S.itab = v; insights(); },
  rfil: function (v) { S.rf = v; resultView(true); },
  sfil: function (v) { S.sf = v; revise(true); },
  delsav: function (v) { delete SAV[v]; persist(); revise(true); },
  practice: function () {
    if (guard()) return;
    var l = savedList(); if (!l.length) { revise(); return; }
    if (get('un_run', null) && !confirm('You have an unfinished test. Discard it and start this revision?')) return;
    S.mode = 'saved';
    begin(l.map(function (e) { return { s: e.s, c: e.c, q: e.q, o: e.o.slice(), a: e.a, e: e.e, _k: e.k, _src: e.src }; }), 0, 'quiz');
  },
  ptopic: function (v) { if (guard()) return; setTopicOnly(v); home(); },
  exportq: exportQ,
  share: function () {
    var a = ATT[ATT.length - 1]; if (!a) return;
    var t = 'I scored ' + fm(a.sc) + '/' + a.max + ' in ' + a.src + ' on Wise Choice — Your Shortcut through the Syllabus!';
    if (navigator.share) navigator.share({ text: t }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('Result copied to clipboard'); });
  },
  tour: function () { tourShow(0); }, tournext: function () { tourShow(S.tourN + 1); }, tourback: function () { tourShow(S.tourN - 1); }, tourend: tourEnd,
  tg: function (v) { SET[v] = !SET[v]; if (v === 'defNeg') S.neg = SET.defNeg; saveSet(); refresh(); },
  font: function (v) { SET.font = +v; saveSet(); settings(true); },
  'export': function () { download('wisechoice-ugcnet-backup.json', JSON.stringify({ att: ATT, sav: SAV, set: SET, days: DAYM, seen: SEEN })); },
  'import': function () { $('#imp').click(); },
  wipe: function () { if (confirm('Delete all analytics, streaks and saved questions from this device?')) { ATT = []; SAV = {}; DAYM = {}; SEEN = {}; put('un_seen', SEEN); put('un_att', ATT); put('un_sav', SAV); put('un_days', DAYM); refresh(); } }
};
document.addEventListener('click', function (e) {
  var t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  var f = A[t.dataset.act]; if (f) { if (t.dataset.act !== 'opt') buzz(); f(t.dataset.v, t); }
});
/* keyboard: 1-4 choose option · N / → next · P / ← previous · M mark · G palette · calculator keys when it is open */
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape') { $('#subm').classList.remove('show'); closeGrid(); }
  if (toolsOpen()) {
    if (S.ttab === 'calc') {
      var k = e.key, m = { Enter: '=', '=': '=', Backspace: 'B', Delete: 'C', c: 'C', C: 'C', '%': '%' };
      if (/^[0-9.]$/.test(k) || '+-*/'.indexOf(k) > -1) { e.preventDefault(); calcPress(k); } else if (m[k]) { e.preventDefault(); calcPress(m[k]); }
    }
    if (e.key === 'Escape') closeTools();
    return;
  }
  if (S.view !== 'test' || S.paused || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || $('#subm').classList.contains('show')) return;
  var k2 = e.key.toLowerCase();
  if (k2 >= '1' && k2 <= '4') { if (S.qs[S.cur].o[+k2 - 1] !== undefined) A.opt(+k2 - 1); }
  else if (k2 === 'n' || k2 === 'arrowright') { if (S.cur < S.qs.length - 1) A.next(); }
  else if (k2 === 'p' || k2 === 'arrowleft') A.prev();
  else if (k2 === 'g') A.grid();
  else if (k2 === 'm' && S.run !== 'quiz') A.mark();
});

padInit(); calcInit();
home(); preload();
if (!SET.subject && SUBS.length > 1) subjShow(true); else { if (!SET.subject) { SET.subject = SUBS[0].id; saveSet(); } if (!get('un_tour', 0)) tourShow(0); }
})();
