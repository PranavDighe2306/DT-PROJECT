const fs = require("fs"), vm = require("vm");
const { load, root } = require("./harness");
const dir = root + "/";
const w = load();
const $=id=>w.document.getElementById(id), d=w.document;
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log("FAIL",m);} else console.log("ok  ",m); };
(async()=>{
// files
const man=JSON.parse(fs.readFileSync(dir+"manifest.webmanifest","utf8"));
ok(man.icons.every(i=>fs.existsSync(dir+i.src)) && man.start_url && man.display==="standalone","manifest valid, icons exist");
const idx=fs.readFileSync(dir+"index.html","utf8"); ok(/rel="manifest"/.test(idx) && /apple-touch-icon/.test(idx) && /skip-link/.test(idx),"index links manifest, icons, skip link");
const sw=fs.readFileSync(dir+"sw.js","utf8"); const ver=sw.match(/CACHE_VERSION = "([^"]+)"/)[1]; const shell=eval(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1]);
ok(shell.every(f=>f==="./"||fs.existsSync(dir+f)),"every precached file exists");
const scriptSrcs=[...idx.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]); ok(scriptSrcs.length>=14 && scriptSrcs.every(s=>shell.includes(s)),"every script in index.html is precached ("+scriptSrcs.length+")");
// bottom nav
ok(d.querySelectorAll(".bn-item[data-page]").length===4 && !!$("bottomMore"),"bottom nav has 4 pages + More");
w.navigate("progress"); ok(d.querySelector(".bn-item[data-page='progress']").classList.contains("active") && d.querySelector(".bn-item[data-page='dashboard']").getAttribute("aria-current")===null,"bottom nav highlights current page + aria-current");
ok(d.activeElement && d.activeElement.tagName==="H1","focus moves to page heading on navigate");
d.querySelector(".bn-item[data-page='mistakes']").click(); ok($("page-mistakes").classList.contains("active"),"bottom nav click navigates");
$("bottomMore").click(); ok($("sidebar").classList.contains("open") && $("bottomMore").getAttribute("aria-expanded")==="true" && $("mobileMenu").getAttribute("aria-expanded")==="true","More opens drawer, aria-expanded true");
w.closeMenu(); ok($("mobileMenu").getAttribute("aria-expanded")==="false","closing drawer resets aria-expanded");
// badge mirrors
w.state.mistakes={q1:{}}; 
const id=w.QUESTIONS[0].id; w.state.mistakes={[id]:{subject:w.QUESTIONS[0].subject,topic:w.QUESTIONS[0].topic,wrong:1,box:0,due:Date.now()-1,mastered:false}}; w.updateMistakeBadge();
ok($("bnBadge").textContent==="1" && !$("bnBadge").classList.contains("hidden") && $("mistakeBadge").textContent==="1","due badge shown in sidebar and bottom nav");
// focus retention in quiz
$("subjectSelect").value="physics"; w.updateTopicOptions(); $("topicSelect").value="all"; $("questionCount").value="10"; $("quizMode").value="mock"; w.beginAssessment();
ok(d.activeElement.id==="questionText","quiz start focuses the question");
d.querySelectorAll("[data-answer]")[2].click(); ok(d.activeElement.getAttribute("data-answer")==="2","focus stays on the chosen option after re-render");
$("toggleFlag").click(); ok(d.activeElement.id==="toggleFlag","focus stays on flag button");
$("nextQuestion").click(); ok(d.activeElement.id==="questionText" && w.currentIndex===1,"Next moves focus to the new question");
d.querySelectorAll("[data-jump]")[0].click(); ok(d.activeElement.id==="questionText" && w.currentIndex===0,"navigator jump focuses question");
ok($("quizTimer").closest("[role=timer]")!==null && d.querySelector(".quiz-progress").getAttribute("aria-label")==="Question progress","timer and progress have roles/labels");
w.resetAssessment();
// chart alternative
w.state.history=[{accuracy:70,subjectName:"Engineering Physics",topicResults:{}},{accuracy:85,subjectName:"Engineering Physics",topicResults:{}}];
w.renderProgress(); const tbl=d.querySelector("#accuracyChart table.sr-only"); ok(tbl && tbl.querySelectorAll("tbody tr").length===2 && /85%/.test(tbl.textContent),"chart has a screen-reader data table");
// install button visibility
ok($("installApp").classList.contains("hidden"),"install button hidden until browser offers it");
const ev=new w.Event("beforeinstallprompt"); ev.preventDefault=()=>{}; ev.prompt=()=>{ ev.prompted=true; }; w.dispatchEvent(ev);
ok(!$("installApp").classList.contains("hidden"),"install button appears on beforeinstallprompt"); $("installApp").click(); ok(ev.prompted===true,"install button triggers prompt");

// ---- service worker logic
const handlers={}, store={}; const mkCache=name=>store[name]=store[name]||{map:new Map(),
  async addAll(list){list.forEach(u=>this.map.set(new URL(u,"http://localhost/").href,{ok:true,body:u,clone(){return this}}));},
  async match(req){const u=typeof req==="string"?new URL(req,"http://localhost/").href:req.url;return this.map.get(u.split("?")[0])||this.map.get(u);},
  async put(req,res){this.map.set(req.url,res);} };
let online=true;
const ctx={URL, Response:{error:()=>({error:true})}, console, Promise,
  self:{location:{origin:"http://localhost"},addEventListener:(t,f)=>handlers[t]=f,skipWaiting:async()=>{ctx.skipped=true;},clients:{claim:async()=>{ctx.claimed=true;}}},
  caches:{open:async n=>mkCache(n),keys:async()=>Object.keys(store),delete:async k=>{delete store[k];return true;}},
  fetch:async req=>{ if(!online) throw new Error("offline"); return {ok:true,body:"net:"+req.url,clone(){return this}}; }};
vm.createContext(ctx); vm.runInContext(sw,ctx);
store["studysense-v1"]={map:new Map()};
let p; handlers.install({waitUntil:x=>p=x}); await p; ok(store["studysense-"+ver].map.size===shell.length && ctx.skipped,"install precaches shell and skips waiting");
handlers.activate({waitUntil:x=>p=x}); await p; ok(!store["studysense-v1"] && !!store["studysense-"+ver] && ctx.claimed,"activate removes old caches and claims clients");
online=false; let res; const fe=(url,mode)=>{ res=null; handlers.fetch({request:{method:"GET",url,mode:mode||"no-cors"},respondWith:x=>res=x,waitUntil:()=>{}}); return res; };
let r1=await fe("http://localhost/js/core.js"); ok(r1 && r1.body==="js/core.js","offline: cached script served");
let r2=await fe("http://localhost/some/deep/route","navigate"); ok(r2 && r2.body==="index.html","offline: unknown navigation falls back to index.html");
ok(fe("http://localhost/x",null)!==undefined,"fetch handler responds for same-origin");
res=null; handlers.fetch({request:{method:"POST",url:"http://localhost/js/core.js"},respondWith:x=>res=x}); ok(res===null,"non-GET ignored");
res=null; handlers.fetch({request:{method:"GET",url:"https://example.com/x"},respondWith:x=>res=x}); ok(res===null,"unrelated cross-origin ignored");
console.log(fails?`${fails} FAILED`:"ALL PASSED"); process.exit(fails?1:0);
})();
