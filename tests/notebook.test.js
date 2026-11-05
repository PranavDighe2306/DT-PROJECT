const fs = require("fs"), vm = require("vm");
const { load, root } = require("./harness");
const dir = root + "/";
const w = load();
const $=id=>w.document.getElementById(id);
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log("FAIL",m);} else console.log("ok  ",m); };
const DAY=864e5;
function runQuiz(rightFn){ const n=w.currentQuestions.length; for(let i=0;i<n;i++){ const q=w.currentQuestions[i]; const b=$("quizPanel").querySelectorAll("[data-answer]");
  const right=rightFn(i,q); if(Array.isArray(q.answer)){ if(right) q.answer.forEach(a=>b[a].click()); else b[[0,1,2,3].find(x=>!q.answer.includes(x))].click(); } else b[right?q.answer:(q.answer+1)%4].click(); $("nextQuestion").click(); } }
// 1. assessment with 3 wrong
$("subjectSelect").value="math1"; w.updateTopicOptions(); $("topicSelect").value="m1_matrices"; $("questionCount").value="10"; $("quizMode").value="standard";
w.beginAssessment(); runQuiz(i=>i>=3);
ok(Object.keys(w.state.mistakes).length===3,"3 wrong answers saved to notebook");
ok(w.state.history.length===1,"assessment saved in history");
ok(w.dueEntries().length===0,"nothing due immediately (due in 1 day)");
const ids=Object.keys(w.state.mistakes); ok(w.state.mistakes[ids[0]].due-Date.now()>DAY-5000,"first review due in ~1 day");
// notebook renders
w.navigate("mistakes"); ok($("mistakeBody").querySelectorAll(".mistake-card").length===3,"notebook lists 3 cards");
ok($("page-mistakes").classList.contains("active"),"notebook page active");
// 2. time travel: make all due
ids.forEach(id=>w.state.mistakes[id].due=Date.now()-1000); w.updateMistakeBadge();
ok(w.dueEntries().length===3 && $("mistakeBadge").textContent==="3","3 due; badge shows 3");
w.renderDashboard(); ok(/3 questions are due/.test($("dueCard").textContent),"home due banner");
w.renderMistakes(); $("mistakeBody").querySelector("[data-review-subject]").click();
ok(w.sessionKind==="review" && w.currentQuestions.length===3,"review session of 3 started");
const histBefore=w.state.history.length, topicBefore=JSON.stringify(w.state.topicResults);
runQuiz(i=>true);
ok(w.state.history.length===histBefore && JSON.stringify(w.state.topicResults)===topicBefore,"review doesn't touch history/topic results");
ok(ids.every(id=>w.state.mistakes[id].box===1),"correct reviews advance to box 1 (3 days)");
ok(Math.abs(w.state.mistakes[ids[0]].due-Date.now()-3*DAY)<5000,"next due in 3 days");
ok(w.state.reviewLog.length===1,"review logged");
// 3. wrong in review resets
ids.forEach(id=>w.state.mistakes[id].due=Date.now()-1000);
w.beginReview("math1"); runQuiz(i=>i!==0);
const resets=ids.filter(id=>w.state.mistakes[id].box===0).length; ok(resets===1,"one wrong in review resets to box 0");
// 4. graduate: box 2 correct -> mastered
const id0=ids.find(id=>w.state.mistakes[id].box===2); w.state.mistakes[id0].due=Date.now()-1;
ids.forEach(id=>{if(id!==id0)w.state.mistakes[id].due=Date.now()+9*DAY;}); w.beginReview("math1"); runQuiz(()=>true);
ok(w.state.mistakes[id0].mastered===true,"3rd successful review → mastered");
w.navigate("mistakes"); $("mfStatus").value="mastered"; $("mfStatus").dispatchEvent(new w.Event("change",{bubbles:true}));
ok($("mistakeBody").querySelectorAll(".mistake-card").length>=1,"mastered filter works");
// 5. not-yet-due correct answer doesn't advance
const q2=Object.keys(w.state.mistakes).find(id=>!w.state.mistakes[id].mastered); w.state.mistakes[q2].due=Date.now()+5*DAY; const boxBefore=w.state.mistakes[q2].box;
w.currentQuestions=[w.prepareQuestion(w.QUESTION_BY_ID[q2])]; w.answers={}; w.answers[q2]=w.currentQuestions[0].answer; w.updateMistakes(Date.now());
ok(w.state.mistakes[q2].box===boxBefore,"correct before due date doesn't advance");
// 6. reset clears notebook
w.confirm=()=>true; w.resetProgress(); ok(Object.keys(w.state.mistakes).length===0,"reset clears notebook");
console.log(fails?`${fails} FAILED`:"ALL PASSED"); process.exit(fails?1:0);
