// StudySense / calendar.js: Study calendar: plan generator and agenda.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

/* ---------- Study calendar ---------- */
const TASK_TYPES = {
  diagnostic:{ label:"Diagnostic", min:20, hint:"Answer 10 questions so we know where you stand." },
  revise:{ label:"Revise", min:40, hint:"Read the revision tip, then practise 10 questions." },
  practice:{ label:"Practice", min:25, hint:"Answer 10 questions and review every explanation." },
  retest:{ label:"Retest", min:20, hint:"Retest the topic. Aim for 80% or more." },
  recap:{ label:"Quick recap", min:15, hint:"A short refresher on a topic you already know well." },
  notebook:{ label:"Final review", min:30, hint:"Clear your Mistake Notebook and skim your weakest topics." }
};
function fromKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function daysBetween(a, b) { return Math.round((fromKey(b) - fromKey(a)) / DAY_MS); }
function fmtDay(k) { return fromKey(k).toLocaleDateString(undefined, { weekday:"short", day:"numeric", month:"short" }); }
function weekStartKey(k) { return addDays(k, -((fromKey(k).getDay() + 6) % 7)); }

// Builds a schedule from today until the day before the exam: weakest topics first, three rounds (revise, practise, retest),
// spread evenly over the available days, with the last day kept for a final review.
function buildPlan(examKey, perDay, subjectIds, prevDone) {
  const today = dayKey(Date.now()), span = daysBetween(today, examKey);
  if (span < 1) return null;
  const study = Array.from({ length:span }, (_, i) => addDays(today, i));
  const reviewDay = span >= 3 ? study.pop() : null;
  const rounds = [[], [], []], recap = [];
  SUBJECTS.filter(sub => subjectIds.includes(sub.id)).forEach(sub => sub.topics.forEach(t => {
    const r = state.topicResults[t.id], acc = r ? r.accuracy : null;
    const base = { topic:t.id, subject:sub.id };
    if (acc === null) { rounds[0].push(Object.assign({ type:"diagnostic", pri:55 }, base)); rounds[1].push(Object.assign({ type:"revise", pri:55 }, base)); }
    else if (acc < 50) { const p = 100 - acc + (confidenceFor(r).key === "low" ? 5 : 0); rounds[0].push(Object.assign({ type:"revise", pri:p }, base)); rounds[1].push(Object.assign({ type:"practice", pri:p }, base)); rounds[2].push(Object.assign({ type:"retest", pri:p }, base)); }
    else if (acc < 70) { const p = 100 - acc; rounds[0].push(Object.assign({ type:"revise", pri:p }, base)); rounds[2].push(Object.assign({ type:"retest", pri:p }, base)); }
    else if (acc < 80) rounds[1].push(Object.assign({ type:"practice", pri:100 - acc }, base));
    else recap.push(Object.assign({ type:"recap", pri:100 - acc }, base));
  }));
  const byPri = (a, b) => b.pri - a.pri;
  let tasks = rounds.flatMap(r => r.sort(byPri)).concat(span >= 5 ? recap.sort(byPri) : []);
  const capacity = study.length * perDay, dropped = Math.max(0, tasks.length - capacity);
  tasks = tasks.slice(0, capacity).map(t => ({ id:`${t.topic}:${t.type}`, topic:t.topic, subject:t.subject, type:t.type }));
  const days = study.map(date => ({ date, tasks:[] }));
  tasks.forEach((t, i) => days[Math.min(days.length - 1, Math.floor(i * days.length / tasks.length))].tasks.push(t));
  if (reviewDay) days.push({ date:reviewDay, tasks:[{ id:"final:notebook", topic:null, subject:null, type:"notebook" }] });
  const ids = new Set(days.flatMap(d => d.tasks.map(t => t.id)));
  const done = {}; Object.keys(prevDone || {}).forEach(id => { if (ids.has(id)) done[id] = prevDone[id]; });
  return { exam:examKey, perDay, subjects:subjectIds, built:today, days, done, dropped };
}
function planTasks(plan) { return plan.days.flatMap(d => d.tasks.map(t => Object.assign({ date:d.date }, t))); }
function planStats(plan) {
  const today = dayKey(Date.now()), all = planTasks(plan), done = all.filter(t => plan.done[t.id]).length;
  return { total:all.length, done, overdue:all.filter(t => !plan.done[t.id] && t.date < today).length, today:all.filter(t => t.date === today), daysLeft:daysBetween(today, plan.exam) };
}
// When you finish an assessment on a topic, tick the earliest pending (due or overdue) session for it.
function autoCompletePlan(result) {
  const plan = state.plan; if (!plan) return false;
  const today = dayKey(Date.now()), tasks = planTasks(plan).filter(t => t.topic && !plan.done[t.id] && t.date <= today);
  let changed = false;
  Object.entries(result.topicResults || {}).forEach(([topicId, r]) => {
    if (r.total < 5) return;
    const t = tasks.find(x => x.topic === topicId && !plan.done[x.id]);
    if (t) { plan.done[t.id] = Date.now(); changed = true; }
  });
  return changed;
}
function startPlanSession(subjectId, topicId) {
  navigate("assessment"); resetAssessment();
  document.getElementById("questionCount").value = "10"; document.getElementById("quizMode").value = "standard";
  beginAssessment(subjectId, topicId);
}
function renderPlanCard() {
  const el = document.getElementById("planCard"); if (!el) return;
  const plan = state.plan; if (!plan) { el.innerHTML = ""; return; }
  const st = planStats(plan);
  if (st.daysLeft < 0) { el.innerHTML = `<div class="next-banner due-banner"><span class="due-icon" aria-hidden="true">📆</span><div><strong>Your exam date has passed</strong><p>Build a new plan whenever you have another exam coming up.</p></div><button class="secondary-btn" data-go="calendar">Open calendar</button></div>`; return; }
  const todayDone = st.today.filter(t => plan.done[t.id]).length;
  const line = st.today.length ? `Today: ${todayDone} of ${st.today.length} planned session${st.today.length === 1 ? "" : "s"} done.` : "No sessions planned today.";
  el.innerHTML = `<div class="next-banner due-banner"><span class="due-icon" aria-hidden="true">📆</span><div><strong>${st.daysLeft === 0 ? "Your exam is today. Good luck!" : `Exam in ${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"}`}</strong><p>${line}${st.overdue ? ` ${st.overdue} earlier session${st.overdue === 1 ? " is" : "s are"} still pending.` : ""}</p></div><button class="${todayDone < st.today.length ? "primary-btn" : "secondary-btn"}" data-go="calendar">Open study calendar →</button></div>`;
}
let planDraft = null;   // form values kept while the page re-renders
function renderCalendar() {
  const body = document.getElementById("calendarBody"), plan = state.plan, today = dayKey(Date.now());
  const draft = planDraft || { exam:plan ? plan.exam : "", perDay:plan ? plan.perDay : 2, subjects:plan ? plan.subjects : visibleSubjects().map(x => x.id) };
  const minDate = addDays(today, 1);
  const form = `<section class="panel plan-form">
    <div class="plan-fields">
      <div><label for="planExam">Exam date</label><input type="date" id="planExam" min="${minDate}" max="${addDays(today, 365)}" value="${draft.exam}"></div>
      <div><label for="planPerDay">Study sessions per day</label><select id="planPerDay">${[1, 2, 3].map(n => `<option value="${n}" ${draft.perDay === n ? "selected" : ""}>${n} (about ${n * 25}–${n * 40} min)</option>`).join("")}</select></div>
    </div>
    <fieldset class="plan-subjects"><legend>Subjects in this exam</legend>
      <div class="plan-quick"><button class="text-btn" data-plan-sem="all">All</button><button class="text-btn" data-plan-sem="I">Semester I</button><button class="text-btn" data-plan-sem="II">Semester II</button></div>
      <div class="plan-subject-list">${SUBJECTS.map(sub => `<label class="check-row"><input type="checkbox" name="planSubject" value="${sub.id}" ${draft.subjects.includes(sub.id) ? "checked" : ""}> ${escapeHTML(sub.name)}</label>`).join("")}</div>
    </fieldset>
    <div class="plan-actions"><button class="primary-btn" data-plan-build>${plan ? "Rebuild plan" : "Build my plan"}</button>${plan ? `<button class="secondary-btn" data-plan-clear>Clear plan</button>` : ""}</div>
    <p class="subheading plan-note">Weakest topics come first, each with revise → practise → retest sessions spread across your days. The day before the exam is kept for a final review. Topics you haven't assessed get a diagnostic. Rebuilding keeps the sessions you've already ticked off.</p>
  </section>`;
  if (!plan) { body.innerHTML = form + `<div class="empty-state">Pick your exam date and subjects, then build a plan.</div>`; return; }
  const st = planStats(plan), pct = st.total ? Math.round(st.done / st.total * 100) : 0;
  const summary = `<section class="panel plan-summary" aria-label="Plan summary">
    <div class="week-tiles">
      <div class="week-tile"><small>Exam</small><strong>${st.daysLeft < 0 ? "Passed" : st.daysLeft === 0 ? "Today" : st.daysLeft + " days"}</strong><small>${fmtDay(plan.exam)}</small></div>
      <div class="week-tile"><small>Sessions done</small><strong>${st.done} / ${st.total}</strong></div>
      <div class="week-tile"><small>Today</small><strong>${st.today.filter(t => plan.done[t.id]).length} / ${st.today.length}</strong></div>
      <div class="week-tile"><small>Overdue</small><strong>${st.overdue}</strong>${st.overdue ? `<small class="down">Rebuild to reschedule</small>` : ""}</div>
    </div>
    <div class="goal-bar" role="progressbar" aria-label="Plan progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
    ${plan.dropped ? `<p class="conf-note">${plan.dropped} lower-priority session${plan.dropped === 1 ? " doesn't" : "s don't"} fit before your exam. Add more sessions per day to include ${plan.dropped === 1 ? "it" : "them"}.</p>` : ""}
  </section>`;
  const weeks = {};
  plan.days.forEach(d => { (weeks[weekStartKey(d.date)] = weeks[weekStartKey(d.date)] || []).push(d); });
  const agenda = Object.keys(weeks).sort().map(wk => `<h3 class="week-head">Week of ${fromKey(wk).toLocaleDateString(undefined, { day:"numeric", month:"short" })}</h3>` + weeks[wk].map(d => {
    const isToday = d.date === today, mins = d.tasks.reduce((n, t) => n + TASK_TYPES[t.type].min, 0);
    const rows = d.tasks.length ? d.tasks.map(t => {
      const topic = t.topic ? getTopic(t.subject, t.topic) : null, subj = t.subject ? getSubject(t.subject) : null, isDone = !!plan.done[t.id], late = !isDone && d.date < today, type = TASK_TYPES[t.type];
      const tip = t.type === "revise" && topic && topic.revision ? `<small class="task-tip">${escapeHTML(topic.revision)}</small>` : `<small class="task-tip">${type.hint}</small>`;
      const action = isDone ? "" : t.type === "notebook" ? `<button class="secondary-btn mini-btn" data-go="mistakes">Open notebook</button>` : `<button class="secondary-btn mini-btn" data-plan-start="${t.subject}|${t.topic}">Start</button>`;
      return `<div class="plan-task ${isDone ? "done" : ""} ${late ? "late" : ""}"><input type="checkbox" data-plan-done="${escapeHTML(t.id)}" ${isDone ? "checked" : ""} aria-label="Mark ${escapeHTML(topic ? topic.name : "final review")} (${type.label}) as done">
        <div class="task-main"><strong>${escapeHTML(topic ? topic.name : "Final review before the exam")}</strong><small>${subj ? escapeHTML(subj.name) + " · " : ""}${type.label} · ~${type.min} min${late ? " · overdue" : ""}</small>${tip}</div>${action}</div>`;
    }).join("") : `<p class="rest-day">Rest day</p>`;
    return `<article class="plan-day ${isToday ? "today" : ""}"><header><strong>${fmtDay(d.date)}</strong>${isToday ? `<span class="q-badge q-adapt">Today</span>` : ""}${mins ? `<small>~${mins} min</small>` : ""}</header>${rows}</article>`;
  }).join("")).join("");
  const examDay = `<article class="plan-day exam-day"><header><strong>${fmtDay(plan.exam)}</strong><span class="q-badge q-mock">Exam day</span></header><p class="rest-day">You've got this. Sleep well and read each question carefully.</p></article>`;
  body.innerHTML = form + summary + `<div class="plan-agenda">${agenda}${examDay}</div>`;
}
(function wireCalendar() {
  const body = document.getElementById("calendarBody");
  const readForm = () => ({ exam:document.getElementById("planExam").value, perDay:Number(document.getElementById("planPerDay").value), subjects:Array.from(body.querySelectorAll("[name=planSubject]:checked")).map(x => x.value) });
  body.addEventListener("click", e => {
    const sem = e.target.closest("[data-plan-sem]");
    if (sem) { const f = readForm(); f.subjects = SUBJECTS.filter(x => sem.dataset.planSem === "all" || semesterOf(x) === sem.dataset.planSem).map(x => x.id); planDraft = f; renderCalendar(); return; }
    if (e.target.closest("[data-plan-build]")) {
      const f = readForm(), today = dayKey(Date.now());
      if (!f.exam || f.exam <= today) { showToast("Pick an exam date after today."); return; }
      if (daysBetween(today, f.exam) > 365) { showToast("Pick an exam date within the next year."); return; }
      if (!f.subjects.length) { showToast("Choose at least one subject."); return; }
      const plan = buildPlan(f.exam, f.perDay, f.subjects, state.plan ? state.plan.done : {});
      if (!plan) { showToast("Couldn't build a plan for that date."); return; }
      state.plan = plan; planDraft = null; saveState(); renderCalendar(); renderPlanCard();
      showToast(`Plan built: ${planTasks(plan).length} sessions over ${plan.days.length} days.`); return;
    }
    if (e.target.closest("[data-plan-clear]")) { if (confirm("Clear your study plan?")) { state.plan = null; planDraft = null; saveState(); renderCalendar(); renderPlanCard(); } return; }
    const start = e.target.closest("[data-plan-start]");
    if (start) { const [sub, top] = start.dataset.planStart.split("|"); startPlanSession(sub, top); }
  });
  body.addEventListener("change", e => {
    const cb = e.target.closest("[data-plan-done]"); if (!cb || !state.plan) return;
    if (cb.checked) state.plan.done[cb.dataset.planDone] = Date.now(); else delete state.plan.done[cb.dataset.planDone];
    saveState(); renderCalendar(); renderPlanCard();
  });
})();
