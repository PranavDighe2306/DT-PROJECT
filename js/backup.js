// StudySense / backup.js: Export and import of progress.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

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
    activity:isObj(data.activity) ? data.activity : backfillActivity(data),
    badges:isObj(data.badges) ? data.badges : {},
    plan:isObj(data.plan) && Array.isArray(data.plan.days) && typeof data.plan.exam === "string" ? data.plan : null,
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
  state = r.imported; evaluateBadges(true); saveState(); clearSavedQuiz(); applyTheme();
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
