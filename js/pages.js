// StudySense / pages.js: Revision Plan, Progress and Settings pages.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

/* ---------- Revision plan ---------- */
function priorityFor(accuracy) { return accuracy <= 50 ? { key:"high", label:"High Priority" } : accuracy <= 69 ? { key:"medium", label:"Medium Priority" } : { key:"low", label:"Low Priority" }; }
function planItems() { return allTopicItems().filter(i => i.result && i.result.accuracy < 80).sort((a, b) => a.result.accuracy - b.result.accuracy || (b.result.updatedAt || 0) - (a.result.updatedAt || 0)); }
function renderRevision() {
  const items = planItems(), list = document.getElementById("revisionList");
  if (!items.length) {
    const any = Object.keys(state.topicResults).length;
    list.innerHTML = `<div class="empty-state">${any ? "Every assessed topic is currently Strong. Nice work — retest later to keep it that way." : "Take an assessment first. Your plan will list the topics that need work, in priority order."}</div>`;
  } else list.innerHTML = items.map((it, i) => {
    const p = priorityFor(it.result.accuracy), qn = QUESTIONS.filter(q => q.topic === it.topic.id).length;
    return `<article class="plan-card" data-tilt="soft"><span class="rank rank-${Math.min(i + 1, 3)}">${i + 1}</span><div class="subject-icon plan-tile ${it.subject.color}">${subjectIcon(it.subject.id)}</div>
      <div><div class="plan-title"><h3>${escapeHTML(it.topic.name)}</h3><span class="prio prio-${p.key}">${p.label}</span></div><div class="plan-meta">${escapeHTML(it.subject.name)} · Score: ${it.result.accuracy}% (${confidenceFor(it.result).label.toLowerCase()}) · ${qn} questions</div><p class="plan-tip">${escapeHTML(it.topic.revision)}</p></div>
      <button class="primary-btn" data-topic-assess="${it.subject.id}" data-topic="${it.topic.id}">Revise Now →</button></article>`;
  }).join("");
  renderRevisionTab(items);
}
function renderRevisionTab(items) {
  items = items || planItems();
  document.querySelectorAll("[data-rtab]").forEach(b => { const on = b.dataset.rtab === revisionTab; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
  const box = document.getElementById("revisionTab");
  if (revisionTab === "notes") {
    box.innerHTML = items.length ? `<h3>Key ideas to revise</h3>` + items.map(it => `<p><strong>${escapeHTML(it.topic.name)}</strong></p><ul>${QUESTIONS.filter(q => q.topic === it.topic.id).map(q => `<li>${escapeHTML(q.explanation)}</li>`).join("")}</ul>`).join("") : `<h3>Notes</h3><p class="subheading">Notes appear here for topics in your plan.</p>`;
  } else if (revisionTab === "practice") {
    const first = items[0];
    box.innerHTML = first ? `<h3>Practice your weakest topic</h3><p class="subheading" style="margin-bottom:14px">${escapeHTML(first.topic.name)} is first in your plan.</p><button class="primary-btn" data-topic-assess="${first.subject.id}" data-topic="${first.topic.id}">Start practice →</button>` : `<h3>Practice</h3><p class="subheading">Once you have topics to revise, you can start a focused retest here.</p>`;
  } else {
    box.innerHTML = `<div class="na-state"><div class="na-icon"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/></svg></div><h3>Videos</h3><span class="na-badge">Not available</span><p class="subheading">Video lessons aren't available yet. Use the Notes and Practice tabs for now.</p></div>`;
  }
}

/* ---------- Progress ---------- */
function lineChartSVG(history) {
  const pts = history.slice(0, 8).reverse(), W = 760, H = 270, L = 44, R = 20, T = 14, B = 34;
  const x = i => pts.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (pts.length - 1), y = v => T + (100 - v) / 100 * (H - T - B);
  let g = "";
  [0, 25, 50, 75, 100].forEach(v => { g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`; });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.accuracy).toFixed(1)}`).join(" ");
  const area = pts.length > 1 ? `<path d="${line} L${x(pts.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z" fill="url(#areaGrad)"/>` : "";
  const dots = pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.accuracy).toFixed(1)}" r="5.5" fill="#fff" stroke="#1a6fe8" stroke-width="3"><title>${p.accuracy}% — ${escapeHTML(p.subjectName)}</title></circle>`).join("");
  const offset = Math.max(0, history.length - 8);
  const labels = pts.map((p, i) => `<text x="${x(i).toFixed(1)}" y="${H - 10}" text-anchor="middle">Attempt ${offset + i + 1}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart of your assessment scores against an 80% target"><defs><linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#1a6fe8" stop-opacity=".28"/><stop offset="1" stop-color="#1a6fe8" stop-opacity="0"/></linearGradient></defs>${g}
    <line x1="${L}" x2="${W - R}" y1="${y(80)}" y2="${y(80)}" stroke="#e08a1a" stroke-width="2" stroke-dasharray="6 5"/><text x="${W - R}" y="${y(80) - 6}" text-anchor="end" style="fill:#b3690a;font-weight:700">Target (80%)</text>
    ${area}<path d="${line}" fill="none" stroke="#1a6fe8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}</svg>
    <table class="sr-only"><caption>Assessment scores for your latest attempts (target 80%)</caption><thead><tr><th>Attempt</th><th>Subject</th><th>Score</th></tr></thead><tbody>${pts.map((p, i) => `<tr><td>${offset + i + 1}</td><td>${escapeHTML(p.subjectName)}</td><td>${p.accuracy}%</td></tr>`).join("")}</tbody></table>`;
}
function renderProgress() {
  renderWeekly(); renderBadges();
  const chart = document.getElementById("accuracyChart");
  chart.innerHTML = state.history.length ? lineChartSVG(state.history) : `<div class="empty-state">Complete an assessment to see your performance over time.</div>`;
  document.getElementById("topicStatusList").innerHTML = allTopicItems().map(i => {
    const s = statusFor(i.result);
    return `<div class="topic-status-row"><div><strong>${escapeHTML(i.topic.name)}</strong><small>${escapeHTML(i.subject.name)}${i.result ? ` · ${i.result.accuracy}% estimate · ${confidenceFor(i.result).label.toLowerCase()}` : ""}</small></div><span class="status-label ${s.className}">${s.label}</span></div>`;
  }).join("");
  const hist = document.getElementById("historyTable");
  hist.innerHTML = state.history.length ? state.history.slice(0, 6).map((item, i) => {
    const prev = state.history[i + 1], diff = prev ? item.accuracy - prev.accuracy : null, sub = getSubject(item.subjectId);
    return `<div class="attempt-row"><div class="subject-icon ${sub ? sub.color : "tone-blue"}" style="width:38px;height:38px;transform:none">${subjectIcon(item.subjectId)}</div>
      <div><div class="subject-name">${escapeHTML(item.subjectName)}</div><div class="subject-meta">${escapeHTML(item.scopeName)} · ${formatDate(item.date)}${item.durationSec != null ? ` · ${fmtTime(item.durationSec)}` : ""}</div></div>
      <div class="attempt-score">${item.accuracy}%<small class="${diff !== null && diff < 0 ? "down" : ""}">${diff === null ? "First attempt" : `${diff > 0 ? "↑ +" : diff < 0 ? "↓ " : "→ "}${diff}%`}</small></div></div>`;
  }).join("") : `<div class="empty-state">Your completed assessments will appear here.</div>`;
  const enc = document.getElementById("encourage");
  if (!state.history.length) enc.innerHTML = `<div class="encourage"><span class="fb-icon" aria-hidden="true">★</span><div><h3>Ready when you are</h3><p>Complete your first assessment to start tracking progress.</p></div></div>`;
  else {
    const first = state.history[state.history.length - 1].accuracy, now = state.history[0].accuracy, gain = now - first;
    enc.innerHTML = `<div class="encourage"><span class="fb-icon" aria-hidden="true">★</span><div><h3>${gain > 0 ? "You're on the right track!" : "Keep going — retesting is how gaps close."}</h3><p>${state.history.length < 2 ? "Retake an assessment after revising to see how you improve." : gain > 0 ? `Your performance has improved by ${gain}% since your first attempt.` : gain === 0 ? "Your latest score matches your first attempt. Revise your weak topics, then retest." : `Your latest score is ${Math.abs(gain)}% below your first attempt. Use the revision plan to target the gaps.`}</p></div></div>`;
  }
}

/* ---------- Settings ---------- */
function renderSettings() {
  document.getElementById("displayName").value = userName(); applyTheme();
  const u = currentUser();
  setText("accountStatus", u ? `Signed in as @${u}. Your progress is saved to this account on this browser.` : "You're using StudySense as a guest. Log in or sign up to keep progress under your own account.");
  setText("accountAction", u ? "Log out" : "Log in / Sign up");
  const reviewedCount = QUESTIONS.filter(isReviewed).length;
  setText("reviewSummary", `${reviewedCount} of ${QUESTIONS.length} questions are marked reviewed. Unreviewed questions are drafts: check them against your notes and the official syllabus.`);
  document.getElementById("reviewedOnly").checked = !!state.settings.reviewedOnly;
  document.getElementById("reviewerMode").checked = !!state.settings.reviewerMode;
}
function resetProgress() {
  if (confirm("Reset all StudySense assessment history and topic results saved on this device?")) {
    state = { history:[], topicResults:{}, reviewed:state.reviewed || {}, bookmarks:state.bookmarks || {}, activity:{}, badges:{}, plan:null, mistakes:{}, reviewLog:[], settings:state.settings }; saveState();
    renderDashboard(); renderSubjects(); renderProgress(); renderRevision(); renderMistakes(); updateMistakeBadge(); showToast("Local progress reset.");
  }
}
