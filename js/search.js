// StudySense / search.js: Global search.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

/* ---------- search ---------- */
const SEARCH_PAGES = [
  { id:"dashboard", label:"Home", kw:"home dashboard overview" }, { id:"assessment", label:"Take Assessment", kw:"assessment quiz test practice start" },
  { id:"subjects", label:"My Subjects", kw:"subjects topics" }, { id:"calendar", label:"Study Calendar", kw:"study calendar plan schedule exam date timetable" }, { id:"mistakes", label:"Mistake Notebook", kw:"mistakes notebook review bookmarks flagged spaced repetition" }, { id:"revision", label:"Revision Plan", kw:"revision plan notes weak" },
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
