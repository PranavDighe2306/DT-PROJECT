// StudySense / home.js: Icons and SVG art, the Home dashboard and the My Subjects page.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

/* ---------- icons & small SVG helpers ---------- */
const ICON_PATHS = {
  atom: `<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>`,
  code: `<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 5l-4 14"/>`,
  math: `<path d="M5 7h14M9 7v10M15 7v7a3 3 0 0 0 3 3"/>`,
  integral: `<path d="M14 4c-2 0-3 1-3 3v10c0 2-1 3-3 3"/><path d="M8 12h6"/>`,
  chip: `<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>`,
  flask: `<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/>`,
  cube: `<path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>`,
  graph: `<circle cx="6" cy="7" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8 7h8M7 9l4 7M17 9l-4 7"/>`,
  scale: `<path d="M12 4v16M6 20h12M5 8h14"/><path d="m5 8-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/>`,
  chat: `<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>`,
  heart: `<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>`,
  people: `<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 6 1.7 6 5"/>`,
  leaf: `<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19c3-5 6-8 10-10"/>`,
  book: `<path d="M4 5.5C4 5.5 7 4 12 6c5-2 8-.5 8-.5V18s-3-1.5-8 .5c-5-2-8-.5-8-.5z"/><path d="M12 6v12.5"/>`,
  bolt: `<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>`
};
const SUBJECT_ICON_KEY = { math1:"math", physics:"atom", ctps:"code", digital:"chip", constitution:"scale", english:"chat", lifeskills1:"heart",
  math2:"integral", chemistry:"flask", oop:"cube", discrete:"graph", uhv:"people", iks:"leaf", lifeskills2:"heart" };
const SUBJECT_ICONS = new Proxy({}, { get: (_, id) => `<svg class="ico" viewBox="0 0 24 24">${ICON_PATHS[SUBJECT_ICON_KEY[id]] || ICON_PATHS.book}</svg>` });
function subjectIcon(id) { return SUBJECT_ICONS[id]; }
const SVG_TARGET = `<svg width="66" height="66" viewBox="0 0 64 64" aria-hidden="true"><circle cx="30" cy="34" r="24" fill="#fff" stroke="#e5484d" stroke-width="4"/><circle cx="30" cy="34" r="16" fill="#fff" stroke="#e5484d" stroke-width="4"/><circle cx="30" cy="34" r="7" fill="#e5484d"/><path d="M32 32 55 9" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/><path d="M50 6h8v8l-5-3z" fill="#1a6fe8"/></svg>`;
const SVG_TROPHY = `<svg class="trophy" viewBox="0 0 110 120" aria-hidden="true"><defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe58a"/><stop offset=".55" stop-color="#f7b731"/><stop offset="1" stop-color="#d98a12"/></linearGradient><linearGradient id="tb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a8fe8"/><stop offset="1" stop-color="#1b4f9a"/></linearGradient></defs><rect x="26" y="96" width="58" height="18" rx="6" fill="url(#tb)"/><rect x="26" y="96" width="58" height="7" rx="4" fill="#fff" opacity=".25"/><rect x="45" y="78" width="20" height="20" rx="3" fill="url(#tg)"/><path d="M26 12h58v32c0 21-13 38-29 38S26 65 26 44z" fill="url(#tg)"/><path d="M26 22H10c0 21 9 31 21 33M84 22h16c0 21-9 31-21 33" fill="none" stroke="#e9a21c" stroke-width="7" stroke-linecap="round"/><path d="M38 20v26c0 12 6 23 15 28" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".55"/><path d="m55 28 4.5 9.5 10.5 1.2-7.8 7.2 2.2 10.3-9.4-5.3-9.4 5.3 2.2-10.3-7.8-7.2 10.5-1.2z" fill="#fff6d0"/></svg>`;
const CODE_ART = `<svg viewBox="0 0 100 90"><rect x="8" y="10" width="84" height="64" rx="10" fill="#0f2c47"/><circle cx="20" cy="22" r="3" fill="#ef4444"/><circle cx="30" cy="22" r="3" fill="#f59e0b"/><circle cx="40" cy="22" r="3" fill="#22b07d"/><path d="m32 44-9 9 9 9M68 44l9 9-9 9M56 40l-12 26" stroke="#5fd3c2" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const MATH_ART = `<svg viewBox="0 0 100 90"><rect x="8" y="10" width="84" height="64" rx="10" fill="#1a6fe8"/><path d="M20 62 40 40l14 12 26-26" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="62" y="68" font-size="22" font-weight="800" fill="#ffd36b" font-family="sans-serif">π</text></svg>`;
const BOOK_ART = `<svg viewBox="0 0 100 90"><rect x="8" y="14" width="40" height="58" rx="6" fill="#14a89a"/><rect x="52" y="14" width="40" height="58" rx="6" fill="#f59e0b"/><path d="M16 28h24M16 38h24M16 48h16M60 28h24M60 38h24M60 48h16" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/></svg>`;
function quizArt(subjectId) {
  if (["ctps", "oop"].includes(subjectId)) return CODE_ART;
  if (["math1", "math2", "discrete"].includes(subjectId)) return MATH_ART;
  if (["constitution", "english", "lifeskills1", "lifeskills2", "uhv", "iks"].includes(subjectId)) return BOOK_ART;
  return `<svg viewBox="0 0 120 100"><use href="#chip"/></svg>`;
}
function donutSVG(pct, size = 64, stroke = 9) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, value = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  const cx = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/><circle class="donut-arc" cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#14a89a" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - value / 100)).toFixed(1)}" style="--c:${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cx})"/></svg>`;
}
function barClass(pct) { return pct >= 80 ? "" : pct >= 50 ? "bar-warn" : "bar-bad"; }
function statusCounts(subject) {
  const counts = { strong:0, moderate:0, weak:0, assessed:0 };
  subject.topics.forEach(topic => { const r = latestTopicResult(topic.id); if (!r) return; counts.assessed++; counts[statusFor(r).key]++; });
  return counts;
}
function semesterOf(subject) { const m = /Semester\s+(I{1,2})\b/.exec(subject.description || ""); return m ? m[1] : "other"; }
function visibleSubjects() { const sem = (state.settings && state.settings.semester) || "all"; return sem === "all" ? SUBJECTS : SUBJECTS.filter(s => semesterOf(s) === sem); }
function renderSemFilter() {
  const sem = state.settings.semester || "all";
  const html = [["all", "All"], ["I", "Semester I"], ["II", "Semester II"]].map(([v, l]) => `<button class="seg-btn" data-sem="${v}" aria-pressed="${sem === v}">${l}</button>`).join("");
  document.querySelectorAll(".sem-filter").forEach(el => { el.innerHTML = html; });
}
function allTopicItems() { return SUBJECTS.flatMap(subject => subject.topics.map(topic => ({ subject, topic, result:latestTopicResult(topic.id) }))); }

/* ---------- Home ---------- */
function renderDashboard() {
  const hour = new Date().getHours();
  setText("greeting", `${hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening"}, ${userName()} 👋`);
  setText("avatar", userName().charAt(0).toUpperCase());
  const items = allTopicItems(), assessed = items.filter(i => i.result);
  const mastered = assessed.filter(i => i.result.accuracy >= 80).length;
  setText("statSubjects", SUBJECTS.length); setText("statTopics", mastered); setText("statTopicsTotal", ` / ${items.length}`);
  document.getElementById("statTopicsBar").style.width = `${items.length ? Math.round(mastered / items.length * 100) : 0}%`;
  setText("statReview", assessed.filter(i => i.result.accuracy < 80).length);
  const average = latestOverallAccuracy();
  setText("statAccuracy", average === null ? "—" : `${average}%`);
  document.getElementById("accuracyDonut").innerHTML = donutSVG(average, 60, 8);
  const change = document.getElementById("statChange");
  if (state.history.length > 1) {
    const diff = state.history[0].accuracy - state.history[1].accuracy;
    change.className = `stat-change ${diff < 0 ? "down" : ""}`;
    change.innerHTML = `${diff > 0 ? "↑ +" : diff < 0 ? "↓ " : "→ "}${diff}% <small>vs last attempt</small>`;
  } else { change.className = "stat-change"; change.innerHTML = `<small>${state.history.length ? "Retake to see change" : "No attempts yet"}</small>`; }

  renderSemFilter();
  document.getElementById("dashboardSubjects").innerHTML = visibleSubjects().map(subject => {
    const c = statusCounts(subject), complete = Math.round(c.assessed / subject.topics.length * 100);
    return `<button class="subject-tile" data-tilt data-tone="${subject.color}" data-topic-assess="${subject.id}" data-topic="all" aria-label="Assess ${escapeHTML(subject.name)}">
      <div class="tile-top"><div class="subject-icon ${subject.color}">${subjectIcon(subject.id)}</div><div><div class="subject-name">${escapeHTML(subject.name)}</div><div class="subject-meta">${subject.topics.length} topics · ${complete}% complete</div></div><span class="chev" aria-hidden="true">›</span></div>
      <div class="subject-progress" aria-hidden="true"><span style="width:${complete}%"></span></div>
      <div class="chips"><span class="chip chip-strong">Strong ${c.strong}</span><span class="chip chip-moderate">Moderate ${c.moderate}</span><span class="chip chip-weak">Needs Review ${c.weak}</span></div></button>`;
  }).join("");

  renderDueCard(); renderResumeCards(); renderTodayCard(); renderPlanCard();
  const rec = getRecommendation();
  document.getElementById("recommendationCard").innerHTML = rec ? `
    <div class="next-banner" data-tilt="soft">${SVG_TARGET}
      <div><strong>Next up:</strong> ${rec.result ? "Revise" : "Start with"} ${escapeHTML(rec.topic.name)} (${escapeHTML(rec.subject.name)})
      <p>${rec.result ? `Your current estimate is ${rec.result.accuracy}% (${confidenceFor(rec.result).label.toLowerCase()}, ${confidenceFor(rec.result).n} questions). Let's strengthen this topic.` : "Take a short diagnostic to set your first topic baseline."}</p></div>
      <button class="primary-btn" data-topic-assess="${rec.subject.id}" data-topic="${rec.topic.id}">Start Assessment →</button></div>`
    : `<div class="empty-state">All available topics are marked strong. Keep practising to maintain your understanding.</div>`;
}
function getRecommendation() {
  const candidates = allTopicItems(), assessed = candidates.filter(i => i.result);
  if (!assessed.length) return candidates[0] || null;
  assessed.sort((a, b) => a.result.accuracy - b.result.accuracy || (a.result.updatedAt || 0) - (b.result.updatedAt || 0));
  const weakest = assessed[0];
  if (weakest.result.accuracy < 80) return weakest;
  return candidates.find(i => !i.result) || weakest;
}

/* ---------- Subjects ---------- */
function renderSubjects() {
  renderSemFilter();
  document.getElementById("allSubjects").innerHTML = visibleSubjects().map(subject => {
    const topicsHTML = subject.topics.map(topic => {
      const r = latestTopicResult(topic.id), s = statusFor(r);
      return `<div class="topic-item"><div><strong>${escapeHTML(topic.name)}</strong><small>${r ? `Latest ${r.correct}/${r.total} · estimate ${r.accuracy}% · ${confidenceFor(r).label} (${confidenceFor(r).n} questions)` : "Complete a diagnostic to establish a baseline"}</small></div><span class="status-label ${s.className}">${s.label}</span></div>`;
    }).join("");
    return `<article class="subject-card" data-tilt><div class="subject-card-top"><div class="subject-icon ${subject.color}">${subjectIcon(subject.id)}</div><div><h2>${escapeHTML(subject.name)}</h2><p>${escapeHTML(subject.description)}</p></div></div><div class="topic-list">${topicsHTML}</div><button class="primary-btn full-btn" data-topic-assess="${subject.id}" data-topic="all">Assess this subject <span>→</span></button></article>`;
  }).join("");
}
