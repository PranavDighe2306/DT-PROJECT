// StudySense: topic-wise diagnostic learning app. Questions and progress live in this browser only.

// Subjects, topics and questions come from question_bank.js (generated from studysense_question_bank.json).
const SUBJECTS = QUESTION_BANK.subjects;
// question_bank_extra.js (optional) adds multi-select, assertion-reason and worked-numerical items.
const QUESTIONS = QUESTION_BANK.questions.concat(typeof QUESTION_BANK_EXTRA !== "undefined" ? QUESTION_BANK_EXTRA.questions : []);

const GUEST_KEY = "studysense-progress-v2";       // guest progress (unchanged, so existing progress is kept)
const ACCOUNTS_KEY = "studysense-accounts-v1";    // local accounts: { username: { salt, hash, displayName } }
const SESSION_KEY = "studysense-session-v1";      // "guest" or a username
function currentUser() { try { const s = localStorage.getItem(SESSION_KEY); return s && s !== "guest" ? s : null; } catch (e) { return null; } }
function hasSession() { try { return !!localStorage.getItem(SESSION_KEY); } catch (e) { return true; } }
function storageKey() { const u = currentUser(); return u ? `${GUEST_KEY}:u:${u}` : GUEST_KEY; }
function getAccounts() { try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {}; } catch (e) { return {}; } }
function defaultName() { const u = currentUser(); const acc = u && getAccounts()[u]; return (acc && acc.displayName) || (u ? u : "Pranav"); }
let state = loadState();
let currentQuestions = [], currentIndex = 0, answers = {}, lastResult = null, adaptive = null, mock = null, sessionKind = "assessment";
let toastTimer = null, quizStart = 0, timerHandle = null, revisionTab = "notes";

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()));
    if (saved && Array.isArray(saved.history) && saved.topicResults) {
      saved.settings = Object.assign({ name: defaultName(), theme: "light", reviewedOnly: false, reviewerMode: false, semester: "all" }, saved.settings || {});
      saved.reviewed = saved.reviewed || {};
      saved.mistakes = saved.mistakes || {};
      saved.bookmarks = saved.bookmarks || {};
      saved.reviewLog = saved.reviewLog || [];
      return saved;
    }
  } catch (error) { console.warn("Could not read saved progress.", error); }
  return { history: [], topicResults: {}, reviewed: {}, mistakes: {}, bookmarks: {}, reviewLog: [], settings: { name: defaultName(), theme: "light", reviewedOnly: false, reviewerMode: false, semester: "all" } };
}
function saveState() {
  try { localStorage.setItem(storageKey(), JSON.stringify(state)); }
  catch (error) { showToast("Could not save locally. Check browser storage settings."); }
}
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch])); }
function getSubject(id) { return SUBJECTS.find(subject => subject.id === id); }
function getTopic(subjectId, topicId) { const s = getSubject(subjectId); return s ? s.topics.find(t => t.id === topicId) : null; }
function latestTopicResult(topicId) { return state.topicResults[topicId] || null; }
// Weighted diagnosis: a topic's score blends its last few attempts, weighting recent and larger attempts more,
// so one short quick check can't swing the status on its own.
const DIAG_DECAY = 0.6, DIAG_MAX_ATTEMPTS = 5;
function diagnoseTopic(topicId, current) {
  const attempts = [current].concat(state.history.map(h => h.topicResults && h.topicResults[topicId]).filter(Boolean)).slice(0, DIAG_MAX_ATTEMPTS);
  let num = 0, den = 0, samples = 0;
  attempts.forEach((d, i) => { const w = d.total * Math.pow(DIAG_DECAY, i); num += w * (d.correct / d.total); den += w; samples += d.total; });
  return { accuracy:Math.round(num / den * 100), samples, attempts:attempts.length };
}
function confidenceFor(result) {
  const n = result ? (result.samples || result.total || 0) : 0;
  return n >= 30 ? { key:"high", label:"High confidence", n } : n >= 15 ? { key:"medium", label:"Medium confidence", n } : { key:"low", label:"Low confidence", n };
}
function statusFor(result) {
  if (!result) return { label:"Not assessed", className:"status-unassessed", key:"unassessed" };
  if (result.accuracy >= 80) return { label:"Strong", className:"status-strong", key:"strong" };
  if (result.accuracy >= 50) return { label:"Moderate", className:"status-moderate", key:"moderate" };
  return { label:"Needs review", className:"status-weak", key:"weak" };
}
function latestOverallAccuracy() {
  if (!state.history.length) return null;
  return Math.round(state.history.reduce((sum, item) => sum + item.accuracy, 0) / state.history.length);
}
function userName() { return ((state.settings && state.settings.name) || defaultName()).trim() || defaultName(); }
function reducedMotion() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function scrollMode() { return reducedMotion() ? "auto" : "smooth"; }
function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function closeMenu() { document.getElementById("sidebar").classList.remove("open"); }
function fmtTime(sec) { sec = Math.max(0, Math.round(sec || 0)); return `${String(Math.floor(sec / 60)).padStart(2,"0")}:${String(sec % 60).padStart(2,"0")}`; }
function formatDate(value) { return new Date(value).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}); }
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}
function applyTheme() {
  const theme = state.settings.theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = theme === "dark" ? "#081521" : "#0f2c47";
  document.getElementById("themeLight").setAttribute("aria-pressed", theme === "light");
  document.getElementById("themeDark").setAttribute("aria-pressed", theme === "dark");
}

function navigate(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === `page-${page}`));
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  const labels = { dashboard:"Home", assessment:"Take Assessment", subjects:"My Subjects", revision:"Revision Plan", mistakes:"Mistake Notebook", progress:"Progress", settings:"Settings" };
  document.getElementById("pageCrumb").textContent = labels[page] || "Home";
  closeMenu();
  if (page === "dashboard") renderDashboard();
  if (page === "subjects") renderSubjects();
  if (page === "revision") renderRevision();
  if (page === "mistakes") renderMistakes();
  if (page === "assessment") renderResumeCards();
  if (page === "progress") renderProgress();
  if (page === "settings") renderSettings();
  updateMistakeBadge();
  window.scrollTo({ top:0, behavior:scrollMode() });
}

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

  renderDueCard(); renderResumeCards();
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
  startTimer(); renderQuestion();
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
function renderQuestion() {
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
        <span class="timer-pill ${mock && remainingSec() <= 60 ? "timer-low" : ""}" id="timerPill" title="${mock ? "Time left" : "Time spent"}"><svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 3h6"/></svg><span id="quizTimer">${timerText()}</span></span></div>
      <div class="quiz-count">${currentIndex + 1} / ${total}</div>
      ${mock ? `<div class="q-nav" role="group" aria-label="Question navigator">${currentQuestions.map((q, i) => `<button class="q-nav-btn ${hasAnswer(q) ? "answered" : ""} ${i === currentIndex ? "current" : ""}" data-jump="${i}" aria-label="Question ${i + 1}, ${hasAnswer(q) ? "answered" : "not answered"}" ${i === currentIndex ? 'aria-current="true"' : ""}>${i + 1}</button>`).join("")}</div>` : ""}
      <div class="quiz-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${currentIndex + 1}"><span style="width:${((currentIndex + 1) / total) * 100}%"></span></div>
      <div class="question-card" data-tilt="soft">
        <div class="question-art" aria-hidden="true">${quizArt(question.subject)}</div>
        <div class="question-body">${badges.length ? `<div class="q-badges">${badges.join("")}</div>` : ""}<h2 class="question-text">${escapeHTML(question.text)}</h2>
          <div class="answer-options" role="group" aria-label="${multi ? "Select all that apply" : "Choose one answer"}">${question.options.map((o, i) => `<button class="answer-option ${isChosen(question, i) ? "selected" : ""}" data-answer="${i}" aria-pressed="${isChosen(question, i)}"><span class="option-letter">${String.fromCharCode(65 + i)}</span><span class="option-text">${escapeHTML(o)}</span></button>`).join("")}</div>
          <div class="quiz-controls"><button class="secondary-btn ${adaptive ? "hidden" : ""}" id="previousQuestion" ${currentIndex === 0 || adaptive ? "disabled" : ""}>← Previous</button><button class="dark-btn" id="nextQuestion">${currentIndex === total - 1 ? "Finish assessment" : mock && !hasAnswer(question) ? "Skip" : "Next"} →</button></div></div>
      </div>
      <div class="kbd-hint"><kbd>A</kbd>–<kbd>D</kbd> or <kbd>1</kbd>–<kbd>4</kbd> to ${multi ? "toggle" : "answer"} · <kbd>Enter</kbd> ${mock ? "next / skip" : "next"}${adaptive ? "" : " · <kbd>←</kbd> back"}</div>
    </div>
    <div class="quiz-deco" aria-hidden="true"><div class="notebook"></div><i class="pencil"></i><div class="sticky sticky-teal sticky-quiz">Think.<br>Apply.<br>Grow.</div></div>`;
  panel.querySelectorAll("[data-answer]").forEach(b => b.addEventListener("click", () => {
    const i = Number(b.dataset.answer);
    if (multi) { const cur = Array.isArray(answers[question.id]) ? answers[question.id].slice() : []; answers[question.id] = cur.includes(i) ? cur.filter(x => x !== i) : cur.concat(i); }
    else answers[question.id] = i;
    renderQuestion();
  }));
  saveQuiz();
  panel.querySelectorAll("[data-jump]").forEach(b => b.addEventListener("click", () => { currentIndex = Number(b.dataset.jump); renderQuestion(); }));
  document.getElementById("toggleFlag").addEventListener("click", () => { toggleBookmark(question.id); renderQuestion(); });
  const rv = document.getElementById("toggleReviewed");
  if (rv) rv.addEventListener("click", () => { if (state.reviewed[question.id]) delete state.reviewed[question.id]; else state.reviewed[question.id] = true; saveState(); renderQuestion(); });
  document.getElementById("quizBack").addEventListener("click", () => { saveQuiz(); resetAssessment(true); renderResumeCards(); showToast("Progress saved. Resume it any time from Home."); });
  document.getElementById("previousQuestion").addEventListener("click", () => { if (currentIndex > 0) { currentIndex--; renderQuestion(); } });
  document.getElementById("nextQuestion").addEventListener("click", () => {
    if (mock) {
      if (currentIndex < total - 1) { currentIndex++; renderQuestion(); return; }
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
      currentQuestions.push(next); currentIndex++; renderQuestion(); return;
    }
    if (currentIndex < total - 1) { currentIndex++; renderQuestion(); } else finishAssessment();
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
  saveState(); lastResult = result; updateMistakeBadge();
  document.getElementById("quizPanel").classList.add("hidden");
  renderResults(result);
  document.getElementById("resultsPanel").classList.remove("hidden");
  if (accuracy >= 80 && !isReview) confetti();
  window.scrollTo({ top:0, behavior:scrollMode() });
}

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
  if (el) { el.textContent = n > 99 ? "99+" : n; el.classList.toggle("hidden", !n); }
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
  renderQuestion(); renderResumeCards();
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-action]"); if (!b) return;
  if (b.dataset.action === "resume-quiz") resumeQuiz();
  else if (b.dataset.action === "discard-quiz" && confirm("Discard your unfinished assessment?")) { clearSavedQuiz(); renderResumeCards(); }
});
window.addEventListener("pagehide", saveQuiz);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveQuiz(); });

/* ---------- Export / import progress ---------- */
function exportProgress() {
  const payload = { app:"studysense", version:1, exportedAt:new Date().toISOString(), account:currentUser() || "guest", data:state };
  const blob = new Blob([JSON.stringify(payload, null, 1)], { type:"application/json" });
  const a = document.createElement("a"), day = new Date().toISOString().slice(0, 10);
  a.href = URL.createObjectURL(blob); a.download = `studysense-progress-${day}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast("Progress exported.");
}
function parseImported(text) {
  let obj; try { obj = JSON.parse(text); } catch (e) { return { error:"That file isn't valid JSON." }; }
  const data = obj && obj.app === "studysense" && obj.data ? obj.data : obj;
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  if (!data || !Array.isArray(data.history) || !isObj(data.topicResults)) return { error:"That doesn't look like a StudySense progress file." };
  const imported = {
    history:data.history.filter(h => isObj(h) && isObj(h.topicResults)),
    topicResults:data.topicResults,
    reviewed:isObj(data.reviewed) ? data.reviewed : {},
    mistakes:isObj(data.mistakes) ? data.mistakes : {},
    bookmarks:isObj(data.bookmarks) ? data.bookmarks : {},
    reviewLog:Array.isArray(data.reviewLog) ? data.reviewLog : [],
    settings:Object.assign({}, state.settings, isObj(data.settings) ? data.settings : {})
  };
  return { imported };
}
function importProgress(text) {
  const r = parseImported(text);
  if (r.error) { showToast(r.error); return; }
  const n = r.imported.history.length;
  if (!confirm(`Replace the progress on this ${currentUser() ? "account" : "guest profile"} with the file (${n} assessment${n === 1 ? "" : "s"})? This can't be undone.`)) return;
  state = r.imported; saveState(); clearSavedQuiz(); applyTheme();
  renderDashboard(); renderSubjects(); renderProgress(); renderRevision(); renderMistakes(); renderSettings(); updateMistakeBadge(); renderResumeCards();
  showToast("Progress imported.");
}
document.getElementById("exportProgress").addEventListener("click", exportProgress);
document.getElementById("importProgress").addEventListener("click", () => document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", e => {
  const file = e.target.files && e.target.files[0]; e.target.value = ""; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast("That file is too large to be a progress export."); return; }
  const reader = new FileReader(); reader.onload = () => importProgress(String(reader.result)); reader.onerror = () => showToast("Couldn't read that file."); reader.readAsText(file);
});
document.addEventListener("click", e => {
  const b = e.target.closest("[data-sem]"); if (!b) return;
  state.settings.semester = b.dataset.sem; saveState(); renderDashboard(); renderSubjects();
});

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
    ${area}<path d="${line}" fill="none" stroke="#1a6fe8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}</svg>`;
}
function renderProgress() {
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
    state = { history:[], topicResults:{}, reviewed:state.reviewed || {}, bookmarks:state.bookmarks || {}, mistakes:{}, reviewLog:[], settings:state.settings }; saveState();
    renderDashboard(); renderSubjects(); renderProgress(); renderRevision(); renderMistakes(); updateMistakeBadge(); showToast("Local progress reset.");
  }
}

/* ---------- effects ---------- */
function confetti() {
  if (reducedMotion()) return;
  const colors = ["#1a6fe8", "#14a89a", "#f59e0b", "#ef4444", "#22b07d", "#ffd36b"];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement("span"); p.className = "confetti-piece";
    p.style.left = Math.random() * 100 + "vw"; p.style.background = colors[i % colors.length];
    p.style.setProperty("--dx", (Math.random() * 240 - 120) + "px"); p.style.setProperty("--rot", (Math.random() * 900 - 450) + "deg");
    p.style.animationDuration = (1.8 + Math.random() * 1.8) + "s"; p.style.animationDelay = Math.random() * 0.5 + "s";
    document.body.appendChild(p); setTimeout(() => p.remove(), 4600);
  }
}
let tiltEl = null;
function resetTilt(el) { if (!el) return; el.style.transform = ""; el.classList.remove("tilting"); }
document.addEventListener("pointermove", event => {
  if (reducedMotion() || event.pointerType === "touch") return;
  const el = event.target.closest ? event.target.closest("[data-tilt]") : null;
  if (tiltEl && tiltEl !== el) resetTilt(tiltEl);
  tiltEl = el; if (!el) return;
  const r = el.getBoundingClientRect(), px = (event.clientX - r.left) / r.width, py = (event.clientY - r.top) / r.height;
  const strength = el.dataset.tilt === "soft" ? 3.5 : 8;
  el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * strength).toFixed(2)}deg) rotateY(${((px - 0.5) * strength * 1.3).toFixed(2)}deg) translateY(-3px)`;
  el.style.setProperty("--gx", (px * 100) + "%"); el.style.setProperty("--gy", (py * 100) + "%"); el.classList.add("tilting");
});
document.addEventListener("pointerleave", () => { resetTilt(tiltEl); tiltEl = null; }, true);
document.addEventListener("pointerout", event => { if (!event.relatedTarget) { resetTilt(tiltEl); tiltEl = null; } });

/* ---------- events ---------- */
document.addEventListener("click", event => {
  const t = event.target, nav = t.closest("[data-page]"), go = t.closest("[data-go]"), topicBtn = t.closest("[data-topic-assess]");
  const tab = t.closest("[data-rtab]"), theme = t.closest("[data-theme-set]"), toast = t.closest("[data-toast]");
  if (nav) navigate(nav.dataset.page);
  if (go) navigate(go.dataset.go);
  if (topicBtn) { navigate("assessment"); resetAssessment(); beginAssessment(topicBtn.dataset.topicAssess, topicBtn.dataset.topic); }
  if (tab) { revisionTab = tab.dataset.rtab; renderRevisionTab(); }
  if (theme) { state.settings.theme = theme.dataset.themeSet; saveState(); applyTheme(); }
  if (toast) showToast(toast.dataset.toast);
});
document.addEventListener("keydown", event => {
  if (!document.getElementById("page-assessment").classList.contains("active")) return;
  if (document.getElementById("quizPanel").classList.contains("hidden")) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const tag = (event.target.tagName || "").toLowerCase();
  if (tag === "select" || tag === "input" || tag === "textarea") return;
  const key = event.key.toLowerCase(), map = { a:0, b:1, c:2, d:3, "1":0, "2":1, "3":2, "4":3 };
  if (key in map) { const o = document.querySelectorAll("#quizPanel [data-answer]")[map[key]]; if (o) o.click(); }
  else if ((key === "enter" && tag !== "button") || key === "arrowright") { const n = document.getElementById("nextQuestion"); if (n) n.click(); }
  else if (key === "arrowleft") { const p = document.getElementById("previousQuestion"); if (p && !p.disabled) p.click(); }
});
document.getElementById("beginAssessment").addEventListener("click", () => beginAssessment());
document.getElementById("reviewedOnly").addEventListener("change", e => {
  if (e.target.checked && !QUESTIONS.some(isReviewed)) { e.target.checked = false; showToast("No questions are marked reviewed yet. Turn on Reviewer mode to start marking them."); return; }
  state.settings.reviewedOnly = e.target.checked; saveState();
});
document.getElementById("reviewerMode").addEventListener("change", e => { state.settings.reviewerMode = e.target.checked; saveState(); });
document.getElementById("copyReviewed").addEventListener("click", () => {
  const ids = QUESTIONS.filter(isReviewed).map(q => q.id), text = JSON.stringify(ids);
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => showToast(`Copied ${ids.length} reviewed IDs.`), () => window.prompt("Copy these IDs:", text));
  else window.prompt("Copy these IDs:", text);
});
document.getElementById("scrim").addEventListener("click", closeMenu);
document.getElementById("mobileMenu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("clearHistory").addEventListener("click", resetProgress);
document.getElementById("resetProgress").addEventListener("click", resetProgress);
document.getElementById("saveName").addEventListener("click", () => {
  const value = document.getElementById("displayName").value.trim();
  if (!value) { showToast("Enter a name first."); return; }
  state.settings.name = value; saveState(); renderDashboard(); showToast("Name saved.");
});
document.getElementById("displayName").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("saveName").click(); });

/* ---------- search ---------- */
const SEARCH_PAGES = [
  { id:"dashboard", label:"Home", kw:"home dashboard overview" }, { id:"assessment", label:"Take Assessment", kw:"assessment quiz test practice start" },
  { id:"subjects", label:"My Subjects", kw:"subjects topics" }, { id:"revision", label:"Revision Plan", kw:"revision plan notes weak" },
  { id:"progress", label:"Progress", kw:"progress chart performance history" }, { id:"settings", label:"Settings", kw:"settings theme dark light name account reset" }
];
function highlight(text, terms) {
  let out = escapeHTML(text);
  terms.forEach(t => { if (t.length > 1) out = out.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>"); });
  return out;
}
function runSearch() {
  const box = document.getElementById("searchResults"), q = document.getElementById("searchInput").value.trim().toLowerCase();
  if (q.length < 2) { box.innerHTML = `<div class="search-empty">Type at least 2 letters to search subjects, topics and questions.</div>`; return; }
  const terms = q.split(/\s+/), match = text => { const t = text.toLowerCase(); return terms.every(w => t.includes(w)); };
  const pages = SEARCH_PAGES.filter(p => match(p.label + " " + p.kw)).slice(0, 3);
  const subjects = SUBJECTS.filter(s => match(s.name + " " + s.description)).slice(0, 4);
  const topics = SUBJECTS.flatMap(s => s.topics.map(t => ({ s, t }))).filter(x => match(x.t.name + " " + x.t.revision + " " + x.s.name)).slice(0, 8);
  const allQ = QUESTIONS.filter(item => match(item.text)), questions = allQ.slice(0, 6);
  let html = "";
  if (pages.length) html += `<div class="search-group">Pages</div>` + pages.map(p => `<button class="search-item" data-s-page="${p.id}">${highlight(p.label, terms)}</button>`).join("");
  if (subjects.length) html += `<div class="search-group">Subjects</div>` + subjects.map(x => `<button class="search-item" data-s-subject="${x.id}">${highlight(x.name, terms)}<small>${escapeHTML(x.description)}</small></button>`).join("");
  if (topics.length) html += `<div class="search-group">Topics</div>` + topics.map(x => `<button class="search-item" data-s-subject="${x.s.id}" data-s-topic="${x.t.id}">${highlight(x.t.name, terms)}<small>${escapeHTML(x.s.name)}</small></button>`).join("");
  if (questions.length) html += `<div class="search-group">Questions${allQ.length > questions.length ? ` (showing ${questions.length} of ${allQ.length})` : ""}</div>` + questions.map(x => { const tp = getTopic(x.subject, x.topic); return `<button class="search-item" data-s-subject="${x.subject}" data-s-topic="${x.topic}">${highlight(x.text.length > 110 ? x.text.slice(0, 107) + "…" : x.text, terms)}<small>${escapeHTML(tp ? tp.name : "")}</small></button>`; }).join("");
  box.innerHTML = html || `<div class="search-empty">No matches for “${escapeHTML(q)}”.</div>`;
}
function setPopover(id, toggleId, open) {
  const el = document.getElementById(id), btn = document.getElementById(toggleId);
  el.classList.toggle("hidden", !open); btn.setAttribute("aria-expanded", String(open));
}
function closePopovers() { setPopover("searchPanel", "searchToggle", false); setPopover("accountMenu", "avatar", false); }
function openSearch() {
  setPopover("accountMenu", "avatar", false); setPopover("searchPanel", "searchToggle", true);
  const input = document.getElementById("searchInput"); input.focus(); input.select(); runSearch();
}
function goToSelection(subjectId, topicId) {
  navigate("assessment"); resetAssessment();
  document.getElementById("subjectSelect").value = subjectId; updateTopicOptions();
  if (topicId) document.getElementById("topicSelect").value = topicId;
  const t = topicId && getTopic(subjectId, topicId);
  showToast(t ? `Selected: ${t.name}. Press Begin when ready.` : `Selected: ${getSubject(subjectId).name}.`);
}
document.getElementById("searchToggle").addEventListener("click", () => {
  document.getElementById("searchPanel").classList.contains("hidden") ? openSearch() : closePopovers();
});
document.getElementById("searchInput").addEventListener("input", runSearch);
document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") { const first = document.querySelector("#searchResults .search-item"); if (first) first.click(); }
  if (e.key === "ArrowDown") { const first = document.querySelector("#searchResults .search-item"); if (first) { e.preventDefault(); first.focus(); } }
});
document.getElementById("searchResults").addEventListener("keydown", e => {
  const items = Array.from(document.querySelectorAll("#searchResults .search-item")), i = items.indexOf(document.activeElement);
  if (e.key === "ArrowDown" && items[i + 1]) { e.preventDefault(); items[i + 1].focus(); }
  if (e.key === "ArrowUp") { e.preventDefault(); (items[i - 1] || document.getElementById("searchInput")).focus(); }
});
document.getElementById("searchResults").addEventListener("click", e => {
  const b = e.target.closest(".search-item"); if (!b) return;
  closePopovers();
  if (b.dataset.sPage) navigate(b.dataset.sPage); else goToSelection(b.dataset.sSubject, b.dataset.sTopic);
});

/* ---------- accounts (local to this browser) ---------- */
function hex(buf) { return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join(""); }
function cyrb53(str) { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16); }
function randomSalt() { const a = new Uint8Array(16); if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else a.forEach((_, i) => { a[i] = Math.floor(Math.random() * 256); }); return hex(a); }
async function hashPassword(password, salt, scheme) {
  if (scheme !== "basic" && window.crypto && crypto.subtle) {
    const enc = new TextEncoder(), key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    return "pbkdf2:" + hex(await crypto.subtle.deriveBits({ name:"PBKDF2", salt:enc.encode(salt), iterations:100000, hash:"SHA-256" }, key, 256));
  }
  return "basic:" + cyrb53(salt + password);
}
let authMode = "login";
function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll("[data-auth-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.authMode === mode)));
  document.getElementById("authNameRow").classList.toggle("hidden", mode !== "signup");
  document.getElementById("authConfirmRow").classList.toggle("hidden", mode !== "signup");
  document.getElementById("authPass").autocomplete = mode === "signup" ? "new-password" : "current-password";
  setText("authTitle", mode === "signup" ? "Create your account" : "Welcome back");
  setText("authSub", mode === "signup" ? "Choose a username and password to keep your own progress." : "Log in to keep your progress under your own account.");
  setText("authSubmit", mode === "signup" ? "Create account" : "Log in");
  setText("authError", "");
}
function showAuth(mode) {
  closePopovers(); closeMenu(); setAuthMode(mode || "login");
  document.getElementById("authForm").reset();
  document.getElementById("authOverlay").classList.remove("hidden");
  setTimeout(() => document.getElementById("authUser").focus(), 30);
}
function hideAuth() { document.getElementById("authOverlay").classList.add("hidden"); }
function applySession() {
  stopTimer(); state = loadState(); applyTheme();
  resetAssessment(); renderDashboard(); renderSubjects(); renderProgress(); renderRevision(); renderSettings(); renderAccountMenu();
  navigate("dashboard");
}
function startSession(user) {
  try { localStorage.setItem(SESSION_KEY, user || "guest"); } catch (e) { showToast("Could not save the session. Check browser storage settings."); }
  hideAuth(); applySession();
}
function logOut() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  stopTimer(); state = loadState(); applyTheme(); renderAccountMenu();
  showAuth("login"); showToast("Logged out.");
}
async function submitAuth(event) {
  event.preventDefault();
  const err = msg => setText("authError", msg);
  const username = document.getElementById("authUser").value.trim().toLowerCase(), password = document.getElementById("authPass").value;
  if (!/^[a-z0-9_.]{3,20}$/.test(username)) return err("Username must be 3–20 characters: letters, numbers, dot or underscore.");
  if (!password) return err("Enter your password.");
  const accounts = getAccounts(), btn = document.getElementById("authSubmit"); btn.disabled = true;
  try {
    if (authMode === "signup") {
      const display = document.getElementById("authName").value.trim() || username;
      if (accounts[username]) return err("That username is already taken on this browser.");
      if (password.length < 6) return err("Password must be at least 6 characters.");
      if (password !== document.getElementById("authConfirm").value) return err("Passwords don't match.");
      const salt = randomSalt(), hash = await hashPassword(password, salt);
      accounts[username] = { salt, hash, displayName: display, created: Date.now() };
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      startSession(username); showToast(`Account created. Welcome, ${display}!`);
    } else {
      const acc = accounts[username];
      const ok = acc && (await hashPassword(password, acc.salt, acc.hash.split(":")[0])) === acc.hash;
      if (!ok) return err("Incorrect username or password.");
      startSession(username); showToast(`Welcome back, ${acc.displayName}!`);
    }
  } catch (e) { console.warn(e); err("Something went wrong. Check that browser storage is enabled."); }
  finally { btn.disabled = false; }
}
function renderAccountMenu() {
  const u = currentUser(), menu = document.getElementById("accountMenu");
  menu.innerHTML = `<div class="who"><strong>${escapeHTML(userName())}</strong><small>${u ? "@" + escapeHTML(u) : "Guest · saved on this browser only"}</small></div>
    <button class="search-item" data-acct="settings">Settings</button>
    <button class="search-item" data-acct="${u ? "logout" : "login"}">${u ? "Log out" : "Log in / Sign up"}</button>`;
}
document.getElementById("avatar").addEventListener("click", () => {
  const open = document.getElementById("accountMenu").classList.contains("hidden");
  closePopovers(); if (open) { renderAccountMenu(); setPopover("accountMenu", "avatar", true); }
});
document.getElementById("accountMenu").addEventListener("click", e => {
  const b = e.target.closest("[data-acct]"); if (!b) return; closePopovers();
  if (b.dataset.acct === "settings") navigate("settings"); else if (b.dataset.acct === "logout") logOut(); else showAuth("login");
});
document.getElementById("accountAction").addEventListener("click", () => currentUser() ? logOut() : showAuth("login"));
document.getElementById("authForm").addEventListener("submit", submitAuth);
document.getElementById("authGuest").addEventListener("click", () => startSession(null));
document.querySelectorAll("[data-auth-mode]").forEach(b => b.addEventListener("click", () => setAuthMode(b.dataset.authMode)));
document.addEventListener("click", e => { if (!e.target.closest("#searchWrap") && !e.target.closest("#accountWrap")) closePopovers(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closePopovers();
  const tag = (e.target.tagName || "").toLowerCase();
  if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && tag !== "input" && tag !== "textarea" && tag !== "select" && document.getElementById("authOverlay").classList.contains("hidden")) { e.preventDefault(); openSearch(); }
});

applyTheme(); populateAssessmentOptions(); renderDashboard(); updateMistakeBadge();
renderAccountMenu(); if (!hasSession()) showAuth("login");
