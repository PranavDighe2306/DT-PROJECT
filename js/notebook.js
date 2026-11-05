// StudySense / notebook.js: Mistake notebook and spaced repetition.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

/* ---------- Mistake notebook & spaced repetition ---------- */
const DAY_MS = 86400000, REVIEW_DAYS = [1, 3, 7];   // wrong -> review in 1 day, then 3, then 7, then mastered
const QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
function mistakeEntries() { return Object.entries(state.mistakes || {}).filter(([id]) => QUESTION_BY_ID[id]).map(([id, m]) => Object.assign({ id, q:QUESTION_BY_ID[id] }, m)); }
function bookmarkEntries() {
  return Object.keys(state.bookmarks || {}).filter(id => QUESTION_BY_ID[id]).map(id => Object.assign({ id, q:QUESTION_BY_ID[id], subject:QUESTION_BY_ID[id].subject, topic:QUESTION_BY_ID[id].topic, wrong:0, due:Infinity, mastered:false, bookmarkOnly:true }, state.mistakes[id] || {}, state.mistakes[id] ? { bookmarkOnly:false } : {}));
}
function isDue(m, now = Date.now()) { return !m.mastered && m.due <= now; }
function dueEntries(subjectId) { return mistakeEntries().filter(m => isDue(m) && (!subjectId || m.subject === subjectId)); }
function dueLabel(m) {
  if (m.bookmarkOnly) return "Bookmarked";
  if (m.mastered) return "Mastered";
  if (isDue(m)) return "Due now";
  const days = Math.ceil((m.due - Date.now()) / DAY_MS);
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}
// Called when an assessment finishes: wrong answers enter (or restart) the schedule; a correct answer to a due question moves it along.
function updateMistakes(now) {
  currentQuestions.forEach(q => {
    const m = state.mistakes[q.id];
    if (!isCorrect(q, answers[q.id])) {
      state.mistakes[q.id] = { subject:q.subject, topic:q.topic, wrong:(m ? m.wrong : 0) + 1, box:0, due:now + REVIEW_DAYS[0] * DAY_MS, last:now, mastered:false };
    } else if (m && !m.mastered && m.due <= now) {
      if (m.box >= REVIEW_DAYS.length - 1) { m.mastered = true; m.masteredAt = now; }
      else { m.box++; m.due = now + REVIEW_DAYS[m.box] * DAY_MS; }
    }
  });
}
function updateMistakeBadge() {
  const n = dueEntries().length, el = document.getElementById("mistakeBadge");
  [el, document.getElementById("bnBadge")].forEach(b => { if (b) { b.textContent = n > 99 ? "99+" : n; b.classList.toggle("hidden", !n); } });
}
function renderDueCard() {
  const el = document.getElementById("dueCard"); if (!el) return;
  const all = mistakeEntries(), due = dueEntries(), active = all.filter(m => !m.mastered);
  if (!all.length) { el.innerHTML = ""; return; }
  if (due.length) {
    el.innerHTML = `<div class="next-banner due-banner" data-tilt="soft"><span class="due-icon" aria-hidden="true">🔁</span>
      <div><strong>${due.length} question${due.length === 1 ? " is" : "s are"} due for review</strong><p>Questions you missed come back after 1, 3 and 7 days. Answering them correctly locks them in.</p></div>
      <button class="primary-btn" data-go="mistakes">Review now →</button></div>`;
  } else if (active.length) {
    const next = Math.min(...active.map(m => m.due)), days = Math.max(1, Math.ceil((next - Date.now()) / DAY_MS));
    el.innerHTML = `<div class="next-banner due-banner"><span class="due-icon" aria-hidden="true">✅</span><div><strong>Nothing due for review</strong><p>Your next review is in ${days} day${days === 1 ? "" : "s"}. ${active.length} question${active.length === 1 ? "" : "s"} still in your notebook.</p></div><button class="secondary-btn" data-go="mistakes">Open notebook</button></div>`;
  } else el.innerHTML = "";
}
function beginReview(subjectId) {
  const due = dueEntries(subjectId);
  if (!due.length) { showToast("Nothing is due for review in that subject."); return; }
  const picked = shuffle(due.slice()).slice(0, 20);
  currentQuestions = picked.map(m => prepareQuestion(m.q)); adaptive = null; mock = null; sessionKind = "review";
  navigate("assessment"); launchQuiz();
}
let mistakeFilter = { subject:"all", topic:"all", status:"active" };
function renderMistakes() {
  const all = mistakeEntries(), due = dueEntries(), bookmarked = bookmarkEntries();
  const base = mistakeFilter.status === "bookmarked" ? bookmarked : all;
  const subjectOpts = `<option value="all">All subjects</option>` + SUBJECTS.filter(s => base.some(m => m.subject === s.id)).map(s => `<option value="${s.id}" ${mistakeFilter.subject === s.id ? "selected" : ""}>${escapeHTML(s.name)}</option>`).join("");
  const subj = getSubject(mistakeFilter.subject);
  const topicOpts = `<option value="all">All topics</option>` + (subj ? subj.topics.filter(t => base.some(m => m.topic === t.id)).map(t => `<option value="${t.id}" ${mistakeFilter.topic === t.id ? "selected" : ""}>${escapeHTML(t.name)}</option>`).join("") : "");
  let list = base.filter(m => (mistakeFilter.subject === "all" || m.subject === mistakeFilter.subject) && (mistakeFilter.topic === "all" || m.topic === mistakeFilter.topic));
  if (mistakeFilter.status === "active") list = list.filter(m => !m.mastered);
  else if (mistakeFilter.status === "due") list = list.filter(m => isDue(m));
  else if (mistakeFilter.status === "mastered") list = list.filter(m => m.mastered);
  list.sort((a, b) => (a.mastered - b.mastered) || a.due - b.due);
  const dueBySubject = SUBJECTS.map(s => ({ s, n:due.filter(m => m.subject === s.id).length })).filter(x => x.n);
  const mastered = all.filter(m => m.mastered).length;
  const cards = list.map(m => {
    const q = m.q, topic = getTopic(q.subject, q.topic), tag = m.mastered ? "ok" : isDue(m) ? "due" : "wait";
    const steps = q.steps && q.steps.length ? `<p><strong>Worked steps:</strong></p><ol class="steps-list">${q.steps.map(st => `<li>${escapeHTML(st)}</li>`).join("")}</ol>` : "";
    return `<details class="mistake-card"><summary><span class="m-q">${escapeHTML(q.text)}</span><span class="m-meta">${state.bookmarks[q.id] ? "★ " : ""}${escapeHTML(topic ? topic.name : q.topic)}${m.wrong ? ` · missed ${m.wrong}×` : ""}</span><span class="m-tag m-${tag}">${dueLabel(m)}</span></summary>
      <div class="m-body"><p><strong>Correct answer:</strong> ${escapeHTML(correctText(q))}</p><p><strong>Why:</strong> ${escapeHTML(q.explanation)}</p>${steps}<button class="secondary-btn mini-btn" data-flag="${escapeHTML(q.id)}">${state.bookmarks[q.id] ? "★ Remove bookmark" : "☆ Bookmark"}</button></div></details>`;
  }).join("");
  document.getElementById("mistakeBody").innerHTML = `
    <div class="mistake-summary">
      <div class="result-card"><small>In notebook</small><div class="big-score">${all.length - mastered}</div></div>
      <div class="result-card"><small>Due now</small><div class="big-score">${due.length}</div></div>
      <div class="result-card"><small>Mastered</small><div class="big-score">${mastered}</div></div>
      <div class="result-card"><small>Bookmarked</small><div class="big-score">${bookmarked.length}</div></div>
    </div>
    ${dueBySubject.length ? `<div class="due-actions">${dueBySubject.map(x => `<button class="primary-btn" data-review-subject="${x.s.id}">Review ${escapeHTML(x.s.name)} (${x.n})</button>`).join("")}</div>` : ""}
    ${all.length || bookmarked.length ? `<div class="mistake-filters">
      <div><label for="mfSubject">Subject</label><select id="mfSubject">${subjectOpts}</select></div>
      <div><label for="mfTopic">Topic</label><select id="mfTopic">${topicOpts}</select></div>
      <div><label for="mfStatus">Show</label><select id="mfStatus">${[["active","In notebook"],["due","Due now"],["mastered","Mastered"],["bookmarked","Bookmarked"],["all","All mistakes"]].map(([v, l]) => `<option value="${v}" ${mistakeFilter.status === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    </div>
    <div class="mistake-list">${cards || `<div class="empty-state">No questions match this filter.</div>`}</div>`
    : `<div class="empty-state">Your notebook is empty. Questions you answer wrongly are saved here with their explanations and come back for review after 1, 3 and 7 days.</div>`}`;
}
document.getElementById("mistakeBody").addEventListener("change", e => {
  if (e.target.id === "mfSubject") { mistakeFilter.subject = e.target.value; mistakeFilter.topic = "all"; }
  else if (e.target.id === "mfTopic") mistakeFilter.topic = e.target.value;
  else if (e.target.id === "mfStatus") mistakeFilter.status = e.target.value;
  else return;
  renderMistakes();
});
document.getElementById("mistakeBody").addEventListener("click", e => {
  const f = e.target.closest("[data-flag]"); if (f) { toggleBookmark(f.dataset.flag); renderMistakes(); return; }
  const b = e.target.closest("[data-review-subject]"); if (b) beginReview(b.dataset.reviewSubject);
});
