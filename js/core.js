// StudySense / core.js: Core: question data, storage keys, saved state, navigation, shared helpers.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

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
      saved.settings = Object.assign({ name: defaultName(), theme: "light", reviewedOnly: false, reviewerMode: false, semester: "all", dailyGoal: 10 }, saved.settings || {});
      saved.reviewed = saved.reviewed || {};
      saved.mistakes = saved.mistakes || {};
      saved.bookmarks = saved.bookmarks || {};
      saved.activity = saved.activity || backfillActivity(saved);
      saved.badges = saved.badges || {};
      saved.plan = saved.plan || null;
      saved.reviewLog = saved.reviewLog || [];
      return saved;
    }
  } catch (error) { console.warn("Could not read saved progress.", error); }
  return { history: [], topicResults: {}, reviewed: {}, mistakes: {}, bookmarks: {}, activity: {}, badges: {}, plan: null, reviewLog: [], settings: { name: defaultName(), theme: "light", reviewedOnly: false, reviewerMode: false, semester: "all", dailyGoal: 10 } };
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
function syncMenuState() {
  const open = document.getElementById("sidebar").classList.contains("open");
  ["mobileMenu", "bottomMore"].forEach(id => { const b = document.getElementById(id); if (b) b.setAttribute("aria-expanded", open); });
}
function closeMenu() { document.getElementById("sidebar").classList.remove("open"); syncMenuState(); }
function toggleMenu() {
  const sb = document.getElementById("sidebar"); sb.classList.toggle("open"); syncMenuState();
  if (sb.classList.contains("open")) { const a = sb.querySelector(".nav-item.active") || sb.querySelector(".nav-item"); if (a) a.focus(); }
}
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
  document.querySelectorAll(".nav-item, .bn-item[data-page]").forEach(el => { const on = el.dataset.page === page; el.classList.toggle("active", on); if (on) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current"); });
  const labels = { dashboard:"Home", assessment:"Take Assessment", subjects:"My Subjects", revision:"Revision Plan", mistakes:"Mistake Notebook", calendar:"Study Calendar", progress:"Progress", settings:"Settings" };
  document.getElementById("pageCrumb").textContent = labels[page] || "Home";
  closeMenu();
  if (page === "dashboard") renderDashboard();
  if (page === "subjects") renderSubjects();
  if (page === "revision") renderRevision();
  if (page === "mistakes") renderMistakes();
  if (page === "calendar") renderCalendar();
  if (page === "assessment") renderResumeCards();
  if (page === "progress") renderProgress();
  if (page === "settings") renderSettings();
  updateMistakeBadge();
  const heading = document.querySelector(`#page-${page} h1`) || document.getElementById("greeting");   // move focus so screen-reader and keyboard users land on the new page
  if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll:true }); }
  window.scrollTo({ top:0, behavior:scrollMode() });
}


/* ---------- dates & activity log (used by loadState, so they live here) ---------- */
function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(key, n) { const [y, m, d] = key.split("-").map(Number); return dayKey(new Date(y, m - 1, d + n).getTime()); }
function addToActivity(map, ts, total, correct, sec) {
  const t = new Date(ts).getTime(); if (!isFinite(t) || !total) return;
  const a = map[dayKey(t)] || (map[dayKey(t)] = { q:0, c:0, s:0, n:0 });
  a.q += total; a.c += correct || 0; a.s += sec || 0; a.n += 1;
}
// Rebuild the per-day log from older saves (history + review log) so existing users keep their streak.
function backfillActivity(saved) {
  const map = {};
  (saved.history || []).forEach(h => addToActivity(map, h.date || h.id, h.total, h.correct, h.durationSec));
  (saved.reviewLog || []).forEach(h => addToActivity(map, h.date, h.total, h.correct, 0));
  return map;
}
