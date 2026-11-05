// StudySense / events.js: Visual effects (tilt, confetti) and global event wiring.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

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
document.getElementById("mobileMenu").addEventListener("click", toggleMenu);
document.getElementById("bottomMore").addEventListener("click", toggleMenu);
document.getElementById("clearHistory").addEventListener("click", resetProgress);
document.getElementById("resetProgress").addEventListener("click", resetProgress);
document.getElementById("saveName").addEventListener("click", () => {
  const value = document.getElementById("displayName").value.trim();
  if (!value) { showToast("Enter a name first."); return; }
  state.settings.name = value; saveState(); renderDashboard(); showToast("Name saved.");
});
document.getElementById("displayName").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("saveName").click(); });
