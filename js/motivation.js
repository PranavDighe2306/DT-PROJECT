// StudySense / motivation.js: Streaks, daily goal, badges and the weekly summary.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

/* ---------- Streaks, daily goal, badges & weekly summary ---------- */
function streakInfo() {
  const act = state.activity || {}, today = dayKey(Date.now()), active = k => act[k] && act[k].q > 0;
  let cur = 0, k = active(today) ? today : addDays(today, -1);
  while (active(k)) { cur++; k = addDays(k, -1); }
  let best = 0, run = 0, prev = null;
  Object.keys(act).filter(active).sort().forEach(d => { run = prev && addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return { current:cur, best, doneToday:!!active(today), atRisk:cur > 0 && !active(today) };
}
function totalAnswered() { return Object.values(state.activity || {}).reduce((n, a) => n + a.q, 0); }

const BADGES = [
  { id:"first", icon:"🚀", name:"First Step", desc:"Finish your first assessment", test:s => s.history.length >= 1 },
  { id:"century", icon:"💯", name:"Century", desc:"Answer 100 questions", test:() => totalAnswered() >= 100 },
  { id:"sharp", icon:"🎯", name:"Sharpshooter", desc:"Score 100% on an assessment of 10+ questions", test:s => s.history.some(h => h.total >= 10 && h.accuracy === 100) },
  { id:"streak3", icon:"🔥", name:"On a Roll", desc:"Practise 3 days in a row", test:() => streakInfo().best >= 3 },
  { id:"streak7", icon:"📅", name:"Week Warrior", desc:"Practise 7 days in a row", test:() => streakInfo().best >= 7 },
  { id:"streak30", icon:"🌟", name:"Unstoppable", desc:"Practise 30 days in a row", test:() => streakInfo().best >= 30 },
  { id:"goal", icon:"✅", name:"Goal Getter", desc:"Reach your daily goal", test:s => Object.values(s.activity || {}).some(a => a.goal) },
  { id:"slayer", icon:"🛠️", name:"Mistake Slayer", desc:"Master 5 questions from your notebook", test:s => Object.values(s.mistakes || {}).filter(m => m.mastered).length >= 5 },
  { id:"explorer", icon:"🧭", name:"Explorer", desc:"Take assessments in 5 different subjects", test:s => new Set(s.history.map(h => h.subjectId)).size >= 5 },
  { id:"mock", icon:"⏱️", name:"Mock Master", desc:"Score 80% or more on a mock test", test:s => s.history.some(h => h.mode === "mock" && h.accuracy >= 80) },
  { id:"strong", icon:"🏆", name:"Strong Foundations", desc:"Get 5 topics to Strong (80%+)", test:s => Object.values(s.topicResults || {}).filter(r => r.accuracy >= 80).length >= 5 }
];
// Awards any newly earned badges; with silent=true it only records them (used for backfill on load/import).
function evaluateBadges(silent) {
  state.badges = state.badges || {};
  const fresh = BADGES.filter(b => !state.badges[b.id] && b.test(state));
  fresh.forEach(b => { state.badges[b.id] = Date.now(); });
  return silent ? [] : fresh;
}
// Called when an assessment or review finishes: logs the day's activity, then checks the daily goal and badges.
function trackProgress(result) {
  const goal = state.settings.dailyGoal || 10, key = dayKey(Date.now()), before = (state.activity[key] || { q:0 }).q;
  addToActivity(state.activity, Date.now(), result.total, result.correct, result.durationSec);
  const day = state.activity[key], notes = [];
  if (before < goal && day.q >= goal) { day.goal = true; notes.push(`🎯 Daily goal reached (${goal} questions)!`); }
  if (result.mode !== "review" && autoCompletePlan(result)) notes.push("📆 Study-plan session ticked off");
  evaluateBadges(false).forEach(b => notes.push(`${b.icon} Badge unlocked: ${b.name}`));
  return notes.length > 3 ? notes.slice(0, 3).join(" · ") + ` · +${notes.length - 3} more in Progress` : notes.join(" · ");
}
function renderTodayCard() {
  const el = document.getElementById("todayCard"); if (!el) return;
  const st = streakInfo(), goal = state.settings.dailyGoal || 10, done = ((state.activity || {})[dayKey(Date.now())] || { q:0 }).q, pct = Math.min(100, Math.round(done / goal * 100));
  const msg = done >= goal ? "Daily goal reached. Nice work!" : st.atRisk ? `Answer ${goal - done} more question${goal - done === 1 ? "" : "s"} to keep your ${st.current}-day streak alive.` : st.current ? `${goal - done} more to hit today's goal.` : "Answer a question today to start a streak.";
  el.innerHTML = `<section class="panel today-card" aria-label="Daily goal and streak">
    <div class="streak-box"><span class="flame ${st.current ? "lit" : ""}" aria-hidden="true">🔥</span><div><strong class="streak-num">${st.current}</strong><small>day streak${st.best > st.current ? ` · best ${st.best}` : ""}</small></div></div>
    <div class="goal-box"><div class="goal-head"><strong>Today: ${done} / ${goal} questions</strong>
      <span class="goal-pick"><label for="dailyGoalSelect" class="sr-only">Daily goal</label><select id="dailyGoalSelect">${GOAL_OPTIONS.map(g => `<option value="${g}" ${g === goal ? "selected" : ""}>Goal: ${g}</option>`).join("")}</select></span></div>
      <div class="goal-bar" role="progressbar" aria-label="Daily goal progress" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.min(done, goal)}"><span style="width:${pct}%"></span></div>
      <p class="goal-msg">${msg}</p></div>
    ${done >= goal ? "" : `<button class="primary-btn" data-go="assessment">Practise now →</button>`}</section>`;
}
const GOAL_OPTIONS = [5, 10, 20, 30];
document.getElementById("todayCard").addEventListener("change", e => {
  if (e.target.id !== "dailyGoalSelect") return;
  state.settings.dailyGoal = Number(e.target.value); saveState(); renderTodayCard();
});

function topicNameById(id) { for (const sub of SUBJECTS) { const t = sub.topics.find(x => x.id === id); if (t) return t.name; } return id; }
function weekTotals(endKey) {
  const out = { q:0, c:0, s:0, days:0, perDay:[] };
  for (let i = 6; i >= 0; i--) {
    const k = addDays(endKey, -i), a = (state.activity || {})[k] || { q:0, c:0, s:0 };
    out.q += a.q; out.c += a.c; out.s += a.s; if (a.q > 0) out.days++; out.perDay.push({ key:k, q:a.q });
  }
  return out;
}
function topicMovers() {
  const cutoff = Date.now() - 7 * DAY_MS, byTopic = {};
  state.history.forEach(h => Object.entries(h.topicResults || {}).forEach(([t, r]) => { if (r.total) (byTopic[t] = byTopic[t] || []).push({ ts:new Date(h.date).getTime(), acc:r.correct / r.total * 100 }); }));   // history is newest first
  const up = [], down = [];
  Object.entries(byTopic).forEach(([t, list]) => {
    if (list.length < 2 || list[0].ts < cutoff) return;
    const d = Math.round(list[0].acc - list[1].acc);
    if (d >= 5) up.push({ t, d }); else if (d <= -5) down.push({ t, d });
  });
  return { up:up.sort((a, b) => b.d - a.d).slice(0, 3), down:down.sort((a, b) => a.d - b.d).slice(0, 3) };
}
function renderWeekly() {
  const el = document.getElementById("weeklyPanel"); if (!el) return;
  const today = dayKey(Date.now()), cur = weekTotals(today), prev = weekTotals(addDays(today, -7));
  if (!cur.q && !prev.q) { el.innerHTML = `<h2>This week</h2><div class="empty-state">Answer some questions and your weekly summary will appear here.</div>`; return; }
  const acc = cur.q ? Math.round(cur.c / cur.q * 100) : null, pacc = prev.q ? Math.round(prev.c / prev.q * 100) : null;
  const delta = (a, b, unit = "") => b === null || b === undefined ? "" : a === b ? `<small>same as last week</small>` : `<small class="${a > b ? "up" : "down"}">${a > b ? "↑ +" : "↓ "}${a - b}${unit} vs last week</small>`;
  const max = Math.max(1, ...cur.perDay.map(d => d.q)), mv = topicMovers();
  const dayName = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday:"short" }); };
  const list = (arr, cls, sign) => arr.length ? `<ul class="mover-list">${arr.map(x => `<li class="${cls}">${sign}${Math.abs(x.d)}% · ${escapeHTML(topicNameById(x.t))}</li>`).join("")}</ul>` : `<p class="mover-none">None this week</p>`;
  el.innerHTML = `<h2>This week</h2>
    <div class="week-tiles">
      <div class="week-tile"><small>Questions</small><strong>${cur.q}</strong>${delta(cur.q, prev.q)}</div>
      <div class="week-tile"><small>Accuracy</small><strong>${acc === null ? "—" : acc + "%"}</strong>${acc === null ? "" : delta(acc, pacc, "%")}</div>
      <div class="week-tile"><small>Study time</small><strong>${Math.round(cur.s / 60)} min</strong>${delta(Math.round(cur.s / 60), prev.s ? Math.round(prev.s / 60) : null, " min")}</div>
      <div class="week-tile"><small>Active days</small><strong>${cur.days} / 7</strong>${delta(cur.days, prev.days)}</div>
    </div>
    <div class="week-bars" role="list" aria-label="Questions answered per day, last 7 days">${cur.perDay.map(d => `<div class="week-bar" role="listitem" aria-label="${dayName(d.key)}: ${d.q} questions"><span class="wb-num">${d.q || ""}</span><span class="wb-col"><i style="height:${Math.round(d.q / max * 100)}%"></i></span><span class="wb-day">${dayName(d.key)}</span></div>`).join("")}</div>
    <div class="movers"><div><h3>Improving</h3>${list(mv.up, "up", "↑ +")}</div><div><h3>Needs attention</h3>${list(mv.down, "down", "↓ −")}</div></div>`;
}
function renderBadges() {
  const el = document.getElementById("badgePanel"); if (!el) return;
  const earned = BADGES.filter(b => state.badges && state.badges[b.id]).length;
  el.innerHTML = `<h2>Achievements <small>${earned} of ${BADGES.length}</small></h2><div class="badge-grid">${BADGES.map(b => {
    const at = state.badges && state.badges[b.id];
    return `<div class="badge-card ${at ? "earned" : "locked"}"><span class="badge-icon" aria-hidden="true">${b.icon}</span><div><strong>${b.name}</strong><small>${b.desc}</small><em>${at ? "Earned " + formatDate(at) : "Locked"}</em></div></div>`;
  }).join("")}</div>`;
}
