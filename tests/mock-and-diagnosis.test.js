const fs = require("fs"), vm = require("vm");
const { load, root } = require("./harness");
const dir = root + "/";
const w = load();
const $=id=>w.document.getElementById(id);
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log("FAIL",m);} else console.log("ok  ",m); };
function answer(i,right){ const q=w.currentQuestions[i]; w.currentIndex=i; w.renderQuestion(); const b=$("quizPanel").querySelectorAll("[data-answer]");
  if(Array.isArray(q.answer)){ if(right) q.answer.forEach(a=>b[a].click()); else b[[0,1,2,3].find(x=>!q.answer.includes(x))].click(); } else b[right?q.answer:(q.answer+1)%4].click(); }
(async()=>{
$("subjectSelect").value="physics"; w.updateTopicOptions(); $("topicSelect").value="all"; $("questionCount").value="10"; $("quizMode").value="mock";
w.beginAssessment();
ok(w.mock && w.mock.limitSec===600,"mock: 10 questions → 10 min limit");
ok($("quizTimer").textContent==="10:00","mock: countdown starts at 10:00");
ok($("quizPanel").querySelectorAll("[data-jump]").length===10,"mock: navigator has 10 buttons");
for(let i=0;i<10;i++) if(i!==2 && i!==5) answer(i,i<6);   // skip Q3 and Q6
w.currentIndex=9; w.renderQuestion();
ok($("quizPanel").querySelectorAll(".q-nav-btn.answered").length===8,"navigator marks 8 answered");
w.currentIndex=2; w.renderQuestion(); ok(/Skip/.test($("nextQuestion").textContent),"unanswered shows Skip, and Next works w/o answer");
$("nextQuestion").click(); ok(w.currentIndex===3,"skip moves on without toast-block");
w.currentIndex=9; w.renderQuestion(); $("nextQuestion").click();
const r=w.state.history[0];
ok(r.mode==="mock" && r.unanswered===2 && r.total===10,"mock finished; 2 unanswered recorded");
ok(r.correct<=6,"unanswered counted wrong");
// auto-submit on time-out
w.resetAssessment(); $("quizMode").value="mock"; w.beginAssessment(); w.quizStart=Date.now()-601000; answer(0,true);
await new Promise(res=>setTimeout(res,1300));
ok(w.state.history.length===2 && w.state.history[0].mode==="mock" && w.state.history[0].unanswered===9,"time-out auto-submits");
ok(w.state.history[0].durationSec<=600,"duration capped at limit");
// weighted diagnosis
w.resetProgress();
const topic="phy_semiconductor";
function fakeAttempt(correct,total){ w.state.history.unshift({topicResults:{[topic]:{correct,total}}}); }
let d=w.diagnoseTopic(topic,{correct:10,total:10}); ok(d.accuracy===100 && d.samples===10,"single attempt = its own accuracy");
fakeAttempt(10,10); d=w.diagnoseTopic(topic,{correct:5,total:10}); // current 50%, previous 100%: weights 10 and 6
ok(d.accuracy===Math.round((10*.5+6*1)/16*100),"recent attempt weighs more: "+d.accuracy);
w.state.history=[]; for(let i=0;i<8;i++) fakeAttempt(5,10); d=w.diagnoseTopic(topic,{correct:5,total:10}); ok(d.attempts===5 && d.samples===50,"caps at 5 attempts");
ok(w.confidenceFor({total:10}).key==="low" && w.confidenceFor({total:10,samples:20}).key==="medium" && w.confidenceFor({samples:30}).key==="high","confidence thresholds");
// quick check shows note & subject label
w.state.history=[]; $("subjectSelect").value="physics"; w.updateTopicOptions(); $("topicSelect").value=topic; $("questionCount").value="10"; $("quizMode").value="standard"; w.beginAssessment();
for(let i=0;i<10;i++){ answer(i,true); } w.currentIndex=9; w.renderQuestion(); $("nextQuestion").click();
ok(Object.keys(w.state.topicResults).length===1,"setup form topic selection is respected (1 topic only)");
ok(/treat it as an estimate/.test($("resultsPanel").textContent),"quick-check note shown");
w.renderSubjects(); console.log((w.document.getElementById("allSubjects").textContent.match(/Latest[^L]{0,80}[^.]{0,60}/)||[])[0], JSON.stringify(w.state.topicResults)); ok(/Low confidence \(10 questions\)/.test($("allSubjects").textContent),"subjects page shows 'Low confidence (10 questions)'");
console.log(fails?`${fails} FAILED`:"ALL PASSED"); process.exit(fails?1:0);
})();
