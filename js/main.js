// StudySense / main.js: Start-up (runs last) and PWA registration.
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

evaluateBadges(true); applyTheme(); populateAssessmentOptions(); renderDashboard(); updateMistakeBadge();
renderAccountMenu(); if (!hasSession()) showAuth("login");

/* ---------- PWA: offline support & install ---------- */
let installPrompt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; const b = document.getElementById("installApp"); if (b) b.classList.remove("hidden"); });
window.addEventListener("appinstalled", () => { installPrompt = null; const b = document.getElementById("installApp"); if (b) b.classList.add("hidden"); showToast("StudySense installed."); });
document.getElementById("installApp").addEventListener("click", () => { if (!installPrompt) return; installPrompt.prompt(); installPrompt = null; document.getElementById("installApp").classList.add("hidden"); });
window.addEventListener("offline", () => showToast("You're offline. StudySense keeps working and saves progress on this device."));
window.addEventListener("online", () => showToast("Back online."));
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  const hadController = !!navigator.serviceWorker.controller;
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service worker not registered.", err)));
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) showToast("StudySense was updated. Reload to use the latest version."); });
}
