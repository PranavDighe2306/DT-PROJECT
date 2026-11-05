// StudySense / session.js: Auto-save and resume of an unfinished quiz.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

/* ---------- Auto-save & resume ---------- */
const QUIZ_KEY_BASE = "studysense-quiz-v1";
function quizKey() { const u = currentUser(); return u ? `${QUIZ_KEY_BASE}:u:${u}` : QUIZ_KEY_BASE; }
function quizActive() { return currentQuestions.length > 0 && !document.getElementById("quizPanel").classList.contains("hidden"); }
function saveQuiz() {
  if (!quizActive()) return;
  try {
    localStorage.setItem(quizKey(), JSON.stringify({ v:1, savedAt:Date.now(), sessionKind, currentIndex, answers, elapsed:elapsedSec(), mock,
      qs:currentQuestions.map(q => ({ id:q.id, options:q.options, answer:q.answer })),
      adaptive:adaptive ? { pool:adaptive.pool.map(q => q.id), level:adaptive.level, maxLevel:adaptive.maxLevel, used:Array.from(adaptive.used), topicCount:adaptive.topicCount, total:adaptive.total } : null }));
  } catch (e) { /* storage full or blocked: auto-save is best-effort */ }
}
function clearSavedQuiz() { try { localStorage.removeItem(quizKey()); } catch (e) { /* ignore */ } }
function readSavedQuiz() {
  try {
    const saved = JSON.parse(localStorage.getItem(quizKey()));
    if (!saved || !Array.isArray(saved.qs) || !saved.qs.length) return null;
    const questions = saved.qs.map(x => QUESTION_BY_ID[x.id] ? Object.assign({}, QUESTION_BY_ID[x.id], { options:x.options, answer:x.answer }) : null);
    if (questions.some(q => !q)) return null;
    saved.questions = questions; return saved;
  } catch (e) { return null; }
}
function renderResumeCards() {
  const saved = quizActive() ? null : readSavedQuiz();
  let html = "";
  if (saved) {
    const answered = saved.questions.filter(q => { const a = saved.answers && saved.answers[q.id]; return Array.isArray(a) ? a.length : a !== undefined; }).length;
    const total = saved.adaptive ? saved.adaptive.total : saved.questions.length;
    const kind = saved.sessionKind === "review" ? "spaced review" : saved.mock ? "mock test" : saved.adaptive ? "adaptive assessment" : "assessment";
    html = `<div class="next-banner due-banner"><span class="due-icon" aria-hidden="true">⏸️</span><div><strong>You have an unfinished ${kind}</strong><p>${answered} of ${total} answered${saved.mock ? " · the mock-test timer is paused" : ""}. Saved ${formatDate(saved.savedAt)}.</p></div><button class="primary-btn" data-action="resume-quiz">Resume →</button><button class="secondary-btn" data-action="discard-quiz">Discard</button></div>`;
  }
  document.querySelectorAll(".resume-slot").forEach(el => { el.innerHTML = html; });
}
function resumeQuiz() {
  const saved = readSavedQuiz();
  if (!saved) { showToast("Nothing to resume."); renderResumeCards(); return; }
  currentQuestions = saved.questions; currentIndex = Math.max(0, Math.min(saved.currentIndex || 0, saved.questions.length - 1));
  answers = saved.answers || {}; sessionKind = saved.sessionKind || "assessment"; mock = saved.mock || null; lastResult = null;
  adaptive = saved.adaptive ? { pool:saved.adaptive.pool.map(id => QUESTION_BY_ID[id]).filter(Boolean), level:saved.adaptive.level, maxLevel:saved.adaptive.maxLevel, used:new Set(saved.adaptive.used), topicCount:saved.adaptive.topicCount || {}, total:saved.adaptive.total } : null;
  navigate("assessment"); showSetup(false);
  document.getElementById("resultsPanel").classList.add("hidden");
  document.getElementById("quizPanel").classList.remove("hidden");
  startTimer(); quizStart = Date.now() - (saved.elapsed || 0) * 1000;   // time spent away doesn't count
  renderQuestion("#questionText"); renderResumeCards();
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-action]"); if (!b) return;
  if (b.dataset.action === "resume-quiz") resumeQuiz();
  else if (b.dataset.action === "discard-quiz" && confirm("Discard your unfinished assessment?")) { clearSavedQuiz(); renderResumeCards(); }
});
window.addEventListener("pagehide", saveQuiz);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveQuiz(); });
