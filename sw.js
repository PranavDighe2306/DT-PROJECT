// StudySense service worker: caches the app shell so it works offline and installs as an app.
// Bump CACHE_VERSION whenever you ship new files, so returning users get the update.
const CACHE_VERSION = "v9";
const CACHE = `studysense-${CACHE_VERSION}`;
const SHELL = ["./", "index.html", "styles.css", "js/core.js", "js/home.js", "js/quiz.js", "js/results.js", "js/notebook.js", "js/session.js", "js/backup.js", "js/motivation.js", "js/calendar.js", "js/pages.js", "js/events.js", "js/search.js", "js/accounts.js", "js/main.js", "question_bank.js", "question_bank_extra.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("studysense-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // Same-origin files: answer from the cache straight away and refresh it in the background.
    event.respondWith(caches.open(CACHE).then(cache => cache.match(req, { ignoreSearch:true }).then(hit => {
      const refresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { event.waitUntil(refresh); return hit; }
      return refresh.then(res => res || (req.mode === "navigate" ? cache.match("index.html") : Response.error()));
    })));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    // Google Fonts: cache after first use; offline falls back to system fonts.
    event.respondWith(caches.open(CACHE).then(cache => cache.match(req).then(hit => hit || fetch(req).then(res => { cache.put(req, res.clone()); return res; }))));
  }
});
