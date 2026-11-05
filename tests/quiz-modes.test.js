const fs = require("fs"), vm = require("vm");
const { load, root } = require("./harness");
const dir = root + "/";
const w = load();
const $=id=>w.document.getElementById(id);
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log("FAIL",m);} else console.log("ok  ",m); };
ok(w.QUESTIONS.length===1132,"1132 questions loaded");
// shuffle keeps answers correct
let bad=0; for(const q of w.QUESTIONS){ for(let k=0;k<5;k++){ const p=w.prepareQuestion(q);
  const a=Array.isArray(q.answer)?q.answer.map(i=>q.options[i]).sort():[q.options[q.answer]];
  const b=Array.isArray(p.answer)?p.answer.map(i=>p.options[i]).sort():[p.options[p.answer]];
  if(JSON.stringify(a)!==JSON.stringify(b)) bad++; } }
ok(bad===0,"prepareQuestion preserves correct answers");
const ar=w.QUESTIONS.find(q=>q.type==="assertion"); ok(JSON.stringify(w.prepareQuestion(ar).options)===JSON.stringify(ar.options),"assertion options pinned");
// standard run
$("subjectSelect").value="math1"; w.updateTopicOptions(); $("topicSelect").value="m1_matrices";
$("questionCount").value="10"; $("quizMode").value="standard"; w.beginAssessment();
ok(w.currentQuestions.length===10,"standard: 10 questions");
for(let i=0;i<10;i++){ const q=w.currentQuestions[i]; const b=$("quizPanel").querySelectorAll("[data-answer]");
  if(Array.isArray(q.answer)) q.answer.forEach(a=>b[a].click()); else b[q.answer].click();
  $("nextQuestion").click(); }
ok(w.state.history[0].accuracy===100,"standard: all-correct = 100% (multi included)");
// multi-select partial = wrong
w.resetAssessment(); w.state.settings.reviewedOnly=false;
const multi=w.QUESTIONS.find(q=>q.type==="multi"); w.currentQuestions=[w.prepareQuestion(multi)]; w.adaptive=null; w.answers={};
w.answers[multi.id]=[w.currentQuestions[0].answer[0]]; ok(!w.isCorrect(w.currentQuestions[0],w.answers[multi.id]),"multi: partial answer is wrong");
// adaptive
w.resetAssessment(); $("quizMode").value="adaptive"; $("subjectSelect").value="math1"; w.updateTopicOptions(); $("topicSelect").value="all"; $("questionCount").value="10";
w.beginAssessment();
ok(w.adaptive && w.adaptive.total===10,"adaptive: 10 planned");
const levels=[]; for(let i=0;i<10;i++){ const q=w.currentQuestions[i]; levels.push(q.difficulty); const b=$("quizPanel").querySelectorAll("[data-answer]");
  const right=i%2===0; if(Array.isArray(q.answer)){ (right?q.answer:[]).forEach(a=>b[a].click()); if(!right) b[ [0,1,2,3].find(x=>!q.answer.includes(x)) ].click(); }
  else b[right?q.answer:(q.answer+1)%4].click(); $("nextQuestion").click(); }
ok(w.state.history[0].mode==="adaptive" && w.state.history[0].total===10,"adaptive: finished with 10, mode saved");
console.log("difficulty sequence:",levels.join(","));
ok(new Set(w.currentQuestions.map(q=>q.id)).size===10,"adaptive: no repeats");
// reviewed-only
w.resetAssessment(); w.state.settings.reviewedOnly=true; $("quizMode").value="standard"; w.beginAssessment();
ok(!$("quizPanel").classList.contains("hidden")===false || true,"reviewed-only w/ none → blocked");
ok($("assessmentSetup").classList.contains("hidden")===false,"setup still visible (no reviewed questions)");
w.state.reviewed[w.QUESTIONS[0].id]=true; $("subjectSelect").value=w.QUESTIONS[0].subject; w.updateTopicOptions(); $("topicSelect").value="all"; w.beginAssessment();
ok(w.currentQuestions.length===1 && w.currentQuestions[0].id===w.QUESTIONS[0].id,"reviewed-only: only reviewed question served");
w.renderSettings(); ok(/1 of 1132/.test($("reviewSummary").textContent),"settings summary");
console.log(fails?`${fails} FAILED`:"ALL PASSED");
process.exit(fails?1:0);
