// Loads the scripts exactly as a browser does (real const/let scoping, in index.html order) to catch load-order bugs:
// something at the top level of an early file using a const or function from a later file.
const fs = require("fs"), vm = require("vm"), path = require("path");
const { load, root } = require("./harness");
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else console.log("ok  ", m); };
const idx = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = Array.from(idx.matchAll(/<script src="([^"]+)"><\/script>/g), m => m[1]);

scripts.forEach(src => { try { new vm.Script(fs.readFileSync(path.join(root, src), "utf8"), { filename:src }); ok(true, `${src} parses`); } catch (e) { ok(false, `${src}: ${e.message}`); } });

let w;
try { w = load({ realScoping:true }); ok(true, "first visit: all scripts load with real const/let scoping"); }
catch (e) { ok(false, "load error: " + e.message); process.exit(1); }
ok(w.document.getElementById("dashboardSubjects").children.length === 14, "Home renders 14 subject tiles");
ok(w.eval("state.activity") && w.eval("state.badges") && w.eval("state.plan") === null, "fresh state has activity, badges and plan");

// An older save (before activity, badges, plan, bookmarks existed) must load and be backfilled while the scripts load.
const legacy = { history:[{ id:1, date:new Date().toISOString(), subjectId:"physics", subjectName:"Engineering Physics", scopeName:"Nano", accuracy:70, correct:7, total:10, durationSec:100, topicResults:{ phy_nano:{ accuracy:70, correct:7, total:10 } } }],
  topicResults:{ phy_nano:{ accuracy:70, correct:7, total:10, updatedAt:1 } }, settings:{ name:"Old", theme:"light" } };
w = load({ realScoping:true, beforeLoad: win => { win.localStorage.setItem("studysense-session-v1", "guest"); win.localStorage.setItem("studysense-progress-v2", JSON.stringify(legacy)); } });
ok(w.eval("Object.keys(state.activity).length") === 1 && w.eval("state.activity[Object.keys(state.activity)[0]].q") === 10, "legacy save: activity backfilled from history at load");
ok(w.eval("state.bookmarks && state.mistakes && state.reviewed && state.reviewLog") && w.eval("state.settings.dailyGoal") === 10, "legacy save: new fields filled with defaults");
ok(w.eval("streakInfo().current") === 1 && w.eval("topicResultsCount = Object.keys(state.topicResults).length") === 1, "legacy save: streak and topic results intact");

// No saved session at all: the login screen path must also run without errors.
try { load({ realScoping:true, beforeLoad: () => {} }); ok(true, "no session (login screen path) loads"); } catch (e) { ok(false, "login path: " + e.message); }

// Every script file that exists in js/ is actually loaded by index.html.
const onDisk = fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f).sort();
ok(JSON.stringify(onDisk) === JSON.stringify(scripts.filter(s => s.startsWith("js/")).sort()), "every file in js/ is loaded by index.html");
console.log(fails ? `${fails} FAILED` : "ALL PASSED"); process.exit(fails ? 1 : 0);
