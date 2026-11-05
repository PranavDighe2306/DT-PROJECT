const fs = require("fs"), vm = require("vm");
const { load, root } = require("./harness");
const dir = root + "/";
const w = load();
const $=id=>w.document.getElementById(id);
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log("FAIL",m);} else console.log("ok  ",m); };
function answer(i,right){ const q=w.currentQuestions[i]; w.currentIndex=i; w.renderQuestion(); const b=$("quizPanel").querySelectorAll("[data-answer]");
  if(Array.isArray(q.answer)){ if(right) q.answer.forEach(a=>b[a].click()); else b[[0,1,2,3].find(x=>!q.answer.includes(x))].click(); } else b[right?q.answer:(q.answer+1)%4].click(); }
const key="studysense-quiz-v1";
// ---- autosave / resume (standard)
$("subjectSelect").value="chemistry"; w.updateTopicOptions(); $("topicSelect").value="chem_water"; $("questionCount").value="10"; $("quizMode").value="standard";
w.beginAssessment();
ok(w.currentQuestions.every(q=>q.topic==="chem_water"),"topic choice respected");
answer(0,true); answer(1,false); answer(2,true); w.currentIndex=3; w.renderQuestion();
ok(!!w.localStorage.getItem(key),"quiz auto-saved");
const snap=JSON.stringify(w.currentQuestions.map(q=>[q.id,q.options,q.answer]));
$("quizBack").click();   // leave
ok($("assessmentSetup").classList.contains("hidden")===false && !!w.localStorage.getItem(key),"leaving keeps the save and shows setup");
ok(/unfinished assessment/.test(w.document.querySelector(".resume-slot").textContent) && /3 of 10 answered/.test(w.document.querySelector(".resume-slot").textContent),"resume card: 3 of 10 answered");
w.currentQuestions=[]; w.answers={};   // simulate reload losing memory
w.document.querySelector("[data-action='resume-quiz']").click();
ok(JSON.stringify(w.currentQuestions.map(q=>[q.id,q.options,q.answer]))===snap,"resume restores same questions & option order");
ok(w.currentIndex===3 && Object.keys(w.answers).length===3,"resume restores position and answers");
ok(!$("quizPanel").classList.contains("hidden"),"quiz panel visible after resume");
for(let i=3;i<10;i++) answer(i,true); w.currentIndex=9; w.renderQuestion(); $("nextQuestion").click();
ok(w.localStorage.getItem(key)===null,"finishing clears the save");
ok(w.state.history[0].correct===9,"resumed quiz scored correctly (9/10)");
// ---- mock resume keeps limit
w.resetAssessment(); $("quizMode").value="mock"; $("topicSelect").value="all"; w.beginAssessment(); w.quizStart=Date.now()-120000; answer(0,true);
const saved=JSON.parse(w.localStorage.getItem(key)); ok(saved.mock.limitSec===600 && saved.elapsed>=119,"mock save has limit and elapsed");
w.resetAssessment(true); w.resumeQuiz(); ok(w.mock && w.mock.limitSec===600 && w.remainingSec()<=481 && w.remainingSec()>470,"mock resumes with remaining ~8:00");
// ---- adaptive resume
w.resetAssessment(); $("quizMode").value="adaptive"; w.beginAssessment(); answer(0,true); $("nextQuestion").click();
ok(w.currentQuestions.length===2,"adaptive advanced");
w.resetAssessment(true); w.resumeQuiz(); ok(w.adaptive && w.adaptive.used.size===2 && w.currentQuestions.length===2,"adaptive state restored");
$("quizBack").click(); w.document.querySelector("[data-action='discard-quiz']").click();
ok(w.localStorage.getItem(key)===null,"discard clears save");
// ---- bookmarks
w.resetAssessment(); $("quizMode").value="standard"; w.beginAssessment();
const qid=w.currentQuestions[0].id; w.currentIndex=0; w.renderQuestion(); $("toggleFlag").click();
ok(w.state.bookmarks[qid]===true && /Flagged/.test($("toggleFlag").textContent),"flag toggled on in quiz");
w.navigate("mistakes"); $("mfStatus").value="bookmarked"; $("mfStatus").dispatchEvent(new w.Event("change",{bubbles:true}));
ok($("mistakeBody").querySelectorAll(".mistake-card").length===1 && /Bookmarked/.test($("mistakeBody").textContent),"bookmark listed in notebook (no mistake needed)");
$("mistakeBody").querySelector("[data-flag]").click();
ok(!w.state.bookmarks[qid],"bookmark removed from notebook");
// ---- export / import
w.state.history=[{id:1,topicResults:{chem_water:{correct:5,total:10}},accuracy:50}]; w.state.topicResults={chem_water:{accuracy:50,correct:5,total:10,samples:10,updatedAt:1}}; w.state.mistakes={}; w.state.bookmarks={x:true};
let captured=null; w.Blob=function(parts){captured=parts.join("");}; w.URL.createObjectURL=()=> "blob:x"; w.URL.revokeObjectURL=()=>{};
w.HTMLAnchorElement.prototype.click=function(){ captured=captured; };
w.exportProgress(); const exported=captured; const obj=JSON.parse(exported);
ok(obj.app==="studysense" && obj.data.history.length===1,"export payload has app tag and data");
w.state={history:[],topicResults:{},reviewed:{},mistakes:{},bookmarks:{},reviewLog:[],settings:w.state.settings};
w.importProgress(exported);
ok(w.state.history.length===1 && w.state.topicResults.chem_water.accuracy===50,"import restores data");
const before=JSON.stringify(w.state); w.importProgress("not json"); w.importProgress('{"foo":1}'); w.importProgress('{"history":"x","topicResults":{}}');
ok(JSON.stringify(w.state)===before,"bad files are rejected, state untouched");
w.importProgress(JSON.stringify({history:[],topicResults:{}})); ok(w.state.history.length===0 && Array.isArray(w.state.reviewLog),"raw legacy state imports with defaults filled");
// ---- semester filter
w.renderDashboard(); const all=$("dashboardSubjects").children.length;
w.state.settings.semester="I"; w.renderDashboard(); const s1=$("dashboardSubjects").children.length;
w.state.settings.semester="II"; w.renderSubjects(); const s2=$("allSubjects").children.length;
ok(all===14 && s1===7 && s2===7,"semester filter: 14 → 7 / 7");
w.document.querySelector("[data-sem='all']").click(); ok($("dashboardSubjects").children.length===14 && w.state.settings.semester==="all","semester buttons switch back to all");
console.log(fails?`${fails} FAILED`:"ALL PASSED"); process.exit(fails?1:0);
