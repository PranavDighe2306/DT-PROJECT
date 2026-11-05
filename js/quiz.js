// StudySense / quiz.js: Assessment setup and the quiz: question helpers, shuffling, adaptive and mock modes, answering, finishing.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

/* ---------- Assessment setup & quiz ---------- */
function populateAssessmentOptions() {
  const subjectSelect = document.getElementById("subjectSelect");
  subjectSelect.innerHTML = SUBJECTS.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join("");
  updateTopicOptions(); subjectSelect.addEventListener("change", updateTopicOptions);
}
function updateTopicOptions() {
  const subject = getSubject(document.getElementById("subjectSelect").value);
  document.getElementById("topicSelect").innerHTML = `<option value="all">All topics in this subject</option>` + (subject ? subject.topics.map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join("") : "");
}
function showSetup(visible) {
  ["assessmentSetup"].forEach(id => document.getElementById(id).classList.toggle("hidden", !visible));
  document.querySelector(".assessment-preview").classList.toggle("hidden", !visible);
  document.getElementById("assessmentIntro").classList.toggle("hidden", !visible);
}
/* ---------- question helpers: review flag, shuffling, answer checking, adaptive picking ---------- */
const LEVELS = ["easy", "medium", "hard"], LEVEL_LABEL = { easy:"Easy", medium:"Medium", hard:"Hard" };
const TYPE_BADGE = { multi:"Select all that apply", assertion:"Assertion–Reason", numerical:"Numerical", application:"Application" };
// Options like "Both A and R…" or "All of the above" depend on their position, so those questions are never shuffled.
const PINNED_RE = /of the above|\bboth\s+(a|b|c|d|1|2|3|4)\b|\bneither\s+(a|b)\b|\ball\s+(a|b)\b/i;
function toggleBookmark(id) { if (state.bookmarks[id]) delete state.bookmarks[id]; else state.bookmarks[id] = true; saveState(); }
function isReviewed(q) { return q.reviewed === true || !!(state.reviewed && state.reviewed[q.id]); }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function prepareQuestion(q) {
  const order = q.options.map((_, i) => i);
  if (!q.options.some(o => PINNED_RE.test(o))) shuffle(order);
  const copy = Object.assign({}, q);
  copy.options = order.map(i => q.options[i]);
  copy.answer = Array.isArray(q.answer) ? q.answer.map(a => order.indexOf(a)).sort((a, b) => a - b) : order.indexOf(q.answer);
  return copy;
}
function isCorrect(q, a) {
  if (Array.isArray(q.answer)) return Array.isArray(a) && a.length === q.answer.length && q.answer.every(x => a.includes(x));
  return a === q.answer;
}
function hasAnswer(q) { const a = answers[q.id]; return Array.isArray(a) ? a.length > 0 : a !== undefined; }
function isChosen(q, i) { const a = answers[q.id]; return Array.isArray(a) ? a.includes(i) : a === i; }
function answerText(q, a) { if (Array.isArray(a)) return a.length ? a.slice().sort().map(i => q.options[i]).join("; ") : "No answer"; return a === undefined ? "No answer" : q.options[a]; }
function correctText(q) { return Array.isArray(q.answer) ? q.answer.map(i => q.options[i]).join("; ") : q.options[q.answer]; }
function quizTotal() { return adaptive ? adaptive.total : currentQuestions.length; }
function pickAdaptive() {
  const A = adaptive, unused = A.pool.filter(q => !A.used.has(q.id));
  if (!unused.length) return null;
  const rank = q => Math.max(0, LEVELS.indexOf(q.difficulty));
  const gap = Math.min(...unused.map(q => Math.abs(rank(q) - A.level)));
  let cands = unused.filter(q => Math.abs(rank(q) - A.level) === gap);
  const seen = t => A.topicCount[t] || 0, least = Math.min(...cands.map(q => seen(q.topic)));
  cands = cands.filter(q => seen(q.topic) === least);   // spread questions across topics
  const q = cands[Math.floor(Math.random() * cands.length)];
  A.used.add(q.id); A.topicCount[q.topic] = seen(q.topic) + 1;
  return prepareQuestion(q);
}

function beginAssessment(subjectId, topicId) {
  const subjectSelect = document.getElementById("subjectSelect"), topicSelect = document.getElementById("topicSelect");
  const prevTopic = topicSelect.value;   // updateTopicOptions() rebuilds the list, so remember what the person picked
  if (subjectId) subjectSelect.value = subjectId;
  updateTopicOptions();
  const wantTopic = topicId || (subjectId ? "all" : prevTopic);
  topicSelect.value = wantTopic; if (topicSelect.value !== wantTopic) topicSelect.value = "all";
  const subject = getSubject(subjectSelect.value), selectedTopic = topicSelect.value;
  let pool = QUESTIONS.filter(q => q.subject === subject.id && (selectedTopic === "all" || q.topic === selectedTopic));
  if (state.settings.reviewedOnly) {
    pool = pool.filter(isReviewed);
    if (!pool.length) { showToast("No reviewed questions for that selection. Change this in Settings."); return; }
  }
  const setting = document.getElementById("questionCount").value;
  const count = setting === "all" ? pool.length : Number(setting);
  if (!pool.length) { showToast("No questions are available for that selection yet."); return; }
  if (document.getElementById("quizMode").value === "adaptive") {
    const maxLevel = Math.max(...pool.map(q => Math.max(0, LEVELS.indexOf(q.difficulty))));
    adaptive = { pool, level:Math.min(1, maxLevel), maxLevel, used:new Set(), topicCount:{}, total:Math.min(count, pool.length) };
    currentQuestions = [pickAdaptive()]; mock = null;
  } else {
    adaptive = null;
    currentQuestions = shuffle(pool.slice()).slice(0, count).map(prepareQuestion);
    mock = document.getElementById("quizMode").value === "mock" ? { limitSec:Math.min(currentQuestions.length, 90) * 60 } : null;   // 1 minute per question
  }
  sessionKind = "assessment"; launchQuiz();
}
function launchQuiz() {
  currentIndex = 0; answers = {}; lastResult = null;
  showSetup(false);
  document.getElementById("resultsPanel").classList.add("hidden");
  document.getElementById("quizPanel").classList.remove("hidden");
  startTimer(); renderQuestion("#questionText");
  window.scrollTo({ top:0, behavior:scrollMode() });
}
function startTimer() {
  stopTimer(); quizStart = Date.now();
  timerHandle = setInterval(() => {
    setText("quizTimer", timerText());
    const pill = document.getElementById("timerPill"); if (pill && mock) pill.classList.toggle("timer-low", remainingSec() <= 60);
    if (mock && remainingSec() <= 0) { stopTimer(); showToast("Time's up. Submitting your answers."); finishAssessment(); }
  }, 1000);
}
function elapsedSec() { return (Date.now() - quizStart) / 1000; }
function remainingSec() { return mock ? mock.limitSec - elapsedSec() : 0; }
function timerText() { return fmtTime(mock ? remainingSec() : elapsedSec()); }
function stopTimer() { if (timerHandle) { clearInterval(timerHandle); timerHandle = null; } }
function renderQuestion(focusSel) {
  const question = currentQuestions[currentIndex], subject = getSubject(question.subject), topic = getTopic(question.subject, question.topic);
  const total = quizTotal(), panel = document.getElementById("quizPanel"), multi = Array.isArray(question.answer);
  const badges = [];
  if (TYPE_BADGE[question.type]) badges.push(`<span class="q-badge">${TYPE_BADGE[question.type]}</span>`);
  if (mock) badges.push(`<span class="q-badge q-mock">Mock test · skip and return freely</span>`);
  if (adaptive) badges.push(`<span class="q-badge q-adapt">Adaptive · ${LEVEL_LABEL[LEVELS[adaptive.level]]}</span>`);
  badges.push(`<button class="q-badge q-flag" id="toggleFlag" aria-pressed="${!!state.bookmarks[question.id]}">${state.bookmarks[question.id] ? "★ Flagged" : "☆ Flag for later"}</button>`);
  if (state.settings.reviewerMode) badges.push(question.reviewed === true ? `<span class="q-badge q-ok">✓ Reviewed</span>` : `<button class="q-badge q-review" id="toggleReviewed">${state.reviewed[question.id] ? "✓ Reviewed (undo)" : "Mark as reviewed"}</button>`);
  panel.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-top"><button class="back-btn" id="quizBack" aria-label="Leave assessment">←</button>
        <div class="qt"><h2>${escapeHTML(subject.name)}</h2><div class="quiz-topic">${escapeHTML(topic.name)}</div></div>
        <span class="timer-pill ${mock && remainingSec() <= 60 ? "timer-low" : ""}" id="timerPill" role="timer" title="${mock ? "Time left" : "Time spent"}"><svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 3h6"/></svg><span id="quizTimer">${timerText()}</span></span></div>
      <div class="quiz-count">${currentIndex + 1} / ${total}</div>
      ${mock ? `<div class="q-nav" role="group" aria-label="Question navigator">${currentQuestions.map((q, i) => `<button class="q-nav-btn ${hasAnswer(q) ? "answered" : ""} ${i === currentIndex ? "current" : ""}" data-jump="${i}" aria-label="Question ${i + 1}, ${hasAnswer(q) ? "answered" : "not answered"}" ${i === currentIndex ? 'aria-current="true"' : ""}>${i + 1}</button>`).join("")}</div>` : ""}
      <div class="quiz-progress" role="progressbar" aria-label="Question progress" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${currentIndex + 1}"><span style="width:${((currentIndex + 1) / total) * 100}%"></span></div>
      <div class="question-card" data-tilt="soft">
        <div class="question-art" aria-hidden="true">${quizArt(question.subject)}</div>
        <div class="question-body">${badges.length ? `<div class="q-badges">${badges.join("")}</div>` : ""}<h2 class="question-text" id="questionText" tabindex="-1">${escapeHTML(question.text)}</h2>
          <div class="answer-options" role="group" aria-label="${multi ? "Select all that apply" : "Choose one answer"}">${question.options.map((o, i) => `<button class="answer-option ${isChosen(question, i) ? "selected" : ""}" data-answer="${i}" aria-pressed="${isChosen(question, i)}"><span class="option-letter">${String.fromCharCode(65 + i)}</span><span class="option-text">${escapeHTML(o)}</span></button>`).join("")}</div>
          <div class="quiz-controls"><button class="secondary-btn ${adaptive ? "hidden" : ""}" id="previousQuestion" ${currentIndex === 0 || adaptive ? "disabled" : ""}>← Previous</button><button class="dark-btn" id="nextQuestion">${currentIndex === total - 1 ? "Finish assessment" : mock && !hasAnswer(question) ? "Skip" : "Next"} →</button></div></div>
      </div>
      <div class="kbd-hint"><kbd>A</kbd>–<kbd>D</kbd> or <kbd>1</kbd>–<kbd>4</kbd> to ${multi ? "toggle" : "answer"} · <kbd>Enter</kbd> ${mock ? "next / skip" : "next"}${adaptive ? "" : " · <kbd>←</kbd> back"}</div>
    </div>
    <div class="quiz-deco" aria-hidden="true"><div class="notebook"></div><i class="pencil"></i><div class="sticky sticky-teal sticky-quiz">Think.<br>Apply.<br>Grow.</div></div>`;
  if (focusSel) { const f = panel.querySelector(focusSel); if (f) f.focus({ preventScroll:true }); }   // re-rendering replaces the DOM, so put keyboard focus back
  panel.querySelectorAll("[data-answer]").forEach(b => b.addEventListener("click", () => {
    const i = Number(b.dataset.answer);
    if (multi) { const cur = Array.isArray(answers[question.id]) ? answers[question.id].slice() : []; answers[question.id] = cur.includes(i) ? cur.filter(x => x !== i) : cur.concat(i); }
    else answers[question.id] = i;
    renderQuestion(`[data-answer="${i}"]`);
  }));
  saveQuiz();
  panel.querySelectorAll("[data-jump]").forEach(b => b.addEventListener("click", () => { currentIndex = Number(b.dataset.jump); renderQuestion("#questionText"); }));
  document.getElementById("toggleFlag").addEventListener("click", () => { toggleBookmark(question.id); renderQuestion("#toggleFlag"); });
  const rv = document.getElementById("toggleReviewed");
  if (rv) rv.addEventListener("click", () => { if (state.reviewed[question.id]) delete state.reviewed[question.id]; else state.reviewed[question.id] = true; saveState(); renderQuestion("#toggleReviewed"); });
  document.getElementById("quizBack").addEventListener("click", () => { saveQuiz(); resetAssessment(true); renderResumeCards(); showToast("Progress saved. Resume it any time from Home."); });
  document.getElementById("previousQuestion").addEventListener("click", () => { if (currentIndex > 0) { currentIndex--; renderQuestion("#questionText"); } });
  document.getElementById("nextQuestion").addEventListener("click", () => {
    if (mock) {
      if (currentIndex < total - 1) { currentIndex++; renderQuestion("#questionText"); return; }
      const left = currentQuestions.filter(q => !hasAnswer(q)).length;
      if (left && !confirm(`${left} question${left === 1 ? " is" : "s are"} unanswered and will count as wrong. Submit anyway?`)) return;
      finishAssessment(); return;
    }
    if (!hasAnswer(question)) { showToast(multi ? "Select at least one answer before continuing." : "Choose an answer before continuing."); return; }
    if (adaptive) {
      if (currentQuestions.length >= adaptive.total) { finishAssessment(); return; }
      // right answer -> a harder question next; wrong answer -> an easier one
      adaptive.level = isCorrect(question, answers[question.id]) ? Math.min(adaptive.maxLevel, adaptive.level + 1) : Math.max(0, adaptive.level - 1);
      const next = pickAdaptive();
      if (!next) { finishAssessment(); return; }
      currentQuestions.push(next); currentIndex++; renderQuestion("#questionText"); return;
    }
    if (currentIndex < total - 1) { currentIndex++; renderQuestion("#questionText"); } else finishAssessment();
  });
}
function finishAssessment() {
  stopTimer(); clearSavedQuiz();
  const durationSec = Math.round(mock ? Math.min(mock.limitSec, elapsedSec()) : elapsedSec());
  const subject = getSubject(currentQuestions[0].subject);
  let correct = 0; currentQuestions.forEach(q => { if (isCorrect(q, answers[q.id])) correct++; });
  const accuracy = Math.round(correct / currentQuestions.length * 100);
  const topicMap = {};
  currentQuestions.forEach(q => {
    if (!topicMap[q.topic]) topicMap[q.topic] = { total:0, correct:0 };
    topicMap[q.topic].total++; if (isCorrect(q, answers[q.id])) topicMap[q.topic].correct++;
  });
  const now = Date.now(), isReview = sessionKind === "review";
  updateMistakes(now);
  if (!isReview) Object.entries(topicMap).forEach(([topicId, d]) => { const dg = diagnoseTopic(topicId, d); state.topicResults[topicId] = { accuracy:dg.accuracy, correct:d.correct, total:d.total, samples:dg.samples, attempts:dg.attempts, updatedAt:now }; });
  const keys = Object.keys(topicMap);
  const scopeName = isReview ? "Spaced review" : keys.length === 1 ? getTopic(subject.id, keys[0]).name : "Mixed topics";
  const result = { id:now, date:new Date().toISOString(), subjectId:subject.id, subjectName:subject.name, scopeName, accuracy, correct, total:currentQuestions.length, durationSec, topicResults:topicMap, questionIds:currentQuestions.map(q => q.id), mode:isReview ? "review" : adaptive ? "adaptive" : mock ? "mock" : "standard", unanswered:currentQuestions.filter(q => !hasAnswer(q)).length };
  // Review sessions are small, targeted drills: log them separately so they don't skew topic results or history.
  if (isReview) { state.reviewLog.unshift({ date:result.date, subjectId:subject.id, correct, total:result.total }); state.reviewLog = state.reviewLog.slice(0, 50); }
  else state.history.unshift(result);
  const celebrate = trackProgress(result);
  saveState(); lastResult = result; updateMistakeBadge(); if (celebrate) showToast(celebrate);
  document.getElementById("quizPanel").classList.add("hidden");
  renderResults(result);
  document.getElementById("resultsPanel").classList.remove("hidden");
  if (accuracy >= 80 && !isReview) confetti();
  window.scrollTo({ top:0, behavior:scrollMode() });
}
