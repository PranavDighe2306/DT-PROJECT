// StudySense / results.js: Results screen and detailed analysis.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

/* ---------- Results ---------- */
function renderResults(result) {
  const subject = getSubject(result.subjectId), entries = Object.entries(result.topicResults);
  const rows = entries.map(([topicId, d]) => ({ topic:getTopic(subject.id, topicId), accuracy:Math.round(d.correct / d.total * 100), d })).sort((a, b) => a.accuracy - b.accuracy);
  const weak = rows[0];
  const perfHTML = rows.map(r => {
    const s = statusFor({ accuracy:r.accuracy }), glyph = s.key === "strong" ? "✓" : s.key === "moderate" ? "~" : "!";
    return `<div class="perf-row"><span class="perf-icon pi-${s.key}" aria-hidden="true">${glyph}</span><div class="perf-name">${escapeHTML(r.topic.name)}<small>${r.d.correct}/${r.d.total} correct</small></div><div class="bar ${barClass(r.accuracy)}" aria-hidden="true"><span style="width:${r.accuracy}%"></span></div><div class="perf-pct">${r.accuracy}%</div><span class="status-label ${s.className}">${s.label}</span></div>`;
  }).join("");
  const name = escapeHTML(userName());
  const fb = result.accuracy >= 80 ? [`Excellent work, ${name}!`, "You have a strong grip on this material. Keep it fresh with a later retest."]
    : result.accuracy >= 50 ? [`Good effort, ${name}!`, `You have a solid understanding of the basics. Let's focus on your weak topics${weak && weak.accuracy < 80 ? `, starting with ${escapeHTML(weak.topic.name)}` : ""}.`]
    : [`Good start, ${name}!`, `This is your baseline. Review the explanations, then retest ${weak ? escapeHTML(weak.topic.name) : "the weak topics"}.`];
  const detail = currentQuestions.map((q, i) => {
    const ok = isCorrect(q, answers[q.id]);
    const steps = q.steps && q.steps.length ? `<p><strong>Worked steps:</strong></p><ol class="steps-list">${q.steps.map(st => `<li>${escapeHTML(st)}</li>`).join("")}</ol>` : "";
    const flag = `<button class="secondary-btn mini-btn" data-flag="${escapeHTML(q.id)}">${state.bookmarks[q.id] ? "★ Flagged (remove)" : "☆ Flag for later"}</button>`;
    const review = state.settings.reviewerMode && q.reviewed !== true ? `<button class="secondary-btn mini-btn" data-review="${escapeHTML(q.id)}">${state.reviewed[q.id] ? "✓ Reviewed (undo)" : "Mark as reviewed"}</button>` : "";
    return `<div class="feedback-item"><h3>${i + 1}. ${escapeHTML(q.text)}</h3><p class="${ok ? "correct-text" : "incorrect-text"}">${ok ? "✓ Correct" : "✕ Needs review"} · Your answer: ${escapeHTML(answerText(q, answers[q.id]))}</p><p><strong>Correct answer:</strong> ${escapeHTML(correctText(q))}</p><p><strong>Why:</strong> ${escapeHTML(q.explanation)}</p>${steps}${flag} ${review}</div>`;
  }).join("");
  document.getElementById("resultsPanel").innerHTML = `
    <div class="page-bar"><button class="back-btn" id="resultsBack" aria-label="Back to Take Assessment">←</button><h1>Assessment Results</h1></div>
    <div class="results-top">
      <div class="result-card score-card" data-tilt="soft"><div><small>Overall Score</small><div class="big-score">${result.accuracy}%</div><small>(${result.correct}/${result.total}) · ${fmtTime(result.durationSec)}${result.mode === "adaptive" ? " · Adaptive" : result.mode === "review" ? " · Spaced review" : result.mode === "mock" ? " · Mock test" : ""}${result.unanswered ? ` · ${result.unanswered} unanswered` : ""}</small></div>${donutSVG(result.accuracy, 84, 11)}</div>
      <div class="result-card feedback-card" data-tilt="soft"><span class="fb-icon" aria-hidden="true">★</span><div><h3>${fb[0]}</h3><p>${fb[1]}</p></div></div>
      ${SVG_TROPHY}
    </div>
    <h2>Topic-wise Performance</h2>
    <div class="perf-list">${perfHTML}</div>
    ${result.mode !== "review" && result.total < 15 ? `<p class="conf-note">This attempt covers only ${result.total} questions, so treat it as an estimate. Each topic's status blends your recent attempts (newer ones count more), and its confidence grows as you answer more questions.</p>` : ""}
    <div class="results-actions"><button class="dark-btn" id="toggleDetail">View Detailed Analysis →</button><button class="primary-btn" id="retestWeak">Retest ${weak ? escapeHTML(weak.topic.name) : "weak topic"}</button><button class="secondary-btn" id="newAssessment">New assessment</button><button class="secondary-btn" id="viewProgress">View progress</button></div>
    <div class="feedback-list hidden" id="detailedAnalysis">${detail}</div>`;
  document.getElementById("toggleDetail").addEventListener("click", e => {
    const box = document.getElementById("detailedAnalysis"); box.classList.toggle("hidden");
    e.currentTarget.textContent = box.classList.contains("hidden") ? "View Detailed Analysis →" : "Hide Detailed Analysis ↑";
    if (!box.classList.contains("hidden")) box.scrollIntoView({ behavior:scrollMode(), block:"start" });
  });
  document.getElementById("retestWeak").addEventListener("click", () => { document.getElementById("resultsPanel").classList.add("hidden"); beginAssessment(subject.id, weak.topic.id); });
  document.getElementById("newAssessment").addEventListener("click", resetAssessment);
  document.getElementById("resultsBack").addEventListener("click", resetAssessment);
  document.getElementById("viewProgress").addEventListener("click", () => navigate("progress"));
  document.getElementById("detailedAnalysis").addEventListener("click", e => {
    const fb = e.target.closest("[data-flag]");
    if (fb) { toggleBookmark(fb.dataset.flag); fb.textContent = state.bookmarks[fb.dataset.flag] ? "★ Flagged (remove)" : "☆ Flag for later"; return; }
    const b = e.target.closest("[data-review]"); if (!b) return;
    const id = b.dataset.review;
    if (state.reviewed[id]) delete state.reviewed[id]; else state.reviewed[id] = true;
    saveState(); b.textContent = state.reviewed[id] ? "✓ Reviewed (undo)" : "Mark as reviewed";
  });
}
function resetAssessment(keepSaved) {
  stopTimer(); adaptive = null; mock = null; if (keepSaved !== true) clearSavedQuiz(); showSetup(true);
  document.getElementById("quizPanel").classList.add("hidden"); document.getElementById("resultsPanel").classList.add("hidden");
  window.scrollTo({ top:0, behavior:scrollMode() });
}
