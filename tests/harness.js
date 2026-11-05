// Loads index.html plus the app's scripts (in the order index.html lists them) into a jsdom window.
// Top-level `const`/`let` are rewritten to `var` so tests can reach app state and functions as window properties.
// Pass { realScoping: true } to keep const/let as written (used by the load smoke test to catch load-order bugs).
const fs = require("fs"), path = require("path"), vm = require("vm");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "..");

function load(opts = {}) {
  let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const scripts = Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g), m => m[1]);
  html = html.replace(/<script src="[^"]+"><\/script>/g, "");
  const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/", pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = () => ({ matches: true }); w.confirm = () => true; w.scrollTo = () => {};
  if (opts.beforeLoad) opts.beforeLoad(w);
  else w.localStorage.setItem("studysense-session-v1", "guest");
  scripts.forEach(src => {
    let code = fs.readFileSync(path.join(root, src), "utf8");
    if (opts.realScoping) new vm.Script(code, { filename:src }).runInContext(dom.getInternalVMContext());   // shares global const/let across files, like <script> tags
    else w.eval(code.replace(/^const /gm, "var ").replace(/^let /gm, "var "));
  });
  return w;
}
module.exports = { load, root };
