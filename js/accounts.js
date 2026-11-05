// StudySense / accounts.js: Local accounts (login, sign-up, account menu).
// Plain script (no modules) so the app still works when index.html is opened straight from disk. Load order is set in index.html.

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
