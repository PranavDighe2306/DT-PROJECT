const fs = require("fs"), vm = require("vm");
const { load, root } = require("./harness");
const dir = root + "/";
const w = load();
const $=id=>w.document.getElementById(id);
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log("FAIL",m);} else console.log("ok  ",m); };
const DAY=864e5, key=n=>w.dayKey(Date.now()-n*DAY);
function runQuiz(right){ for(let i=0;i<w.currentQuestions.length;i++){ const q=w.currentQuestions[i]; w.currentIndex=i; w.renderQuestion(); const b=$("quizPanel").querySelectorAll("[data-answer]");
  if(Array.isArray(q.answer)){ if(right) q.answer.forEach(a=>b[a].click()); else b[[0,1,2,3].find(x=>!q.answer.includes(x))].click(); } else b[right?q.answer:(q.answer+1)%4].click(); }
  w.currentIndex=w.currentQuestions.length-1; w.renderQuestion(); $("nextQuestion").click(); }
// backfill
const bf=w.backfillActivity({history:[{date:new Date(Date.now()-2*DAY).toISOString(),total:10,correct:7,durationSec:300},{date:new Date(Date.now()-DAY).toISOString(),total:5,correct:5,durationSec:60}],reviewLog:[{date:new Date().toISOString(),total:3,correct:2}]});
ok(bf[key(2)].q===10 && bf[key(1)].q===5 && bf[key(0)].q===3,"backfill builds per-day log from history + review log");
// streak
w.state.activity=bf; let st=w.streakInfo(); ok(st.current===3 && st.best===3 && st.doneToday,"3-day streak incl. today");
w.state.activity={[key(1)]:{q:4,c:2,s:0},[key(2)]:{q:4,c:2,s:0},[key(5)]:{q:4,c:2,s:0},[key(6)]:{q:4,c:2,s:0},[key(7)]:{q:4,c:2,s:0}};
st=w.streakInfo(); ok(st.current===2 && st.atRisk && st.best===3,"yesterday-only: streak alive but at risk; best=3");
w.state.activity={[key(3)]:{q:1,c:1,s:0}}; ok(w.streakInfo().current===0,"gap of 2+ days breaks streak");
// finishing a quiz
w.resetProgress(); ok(Object.keys(w.state.activity).length===0 && Object.keys(w.state.badges).length===0,"reset clears activity & badges");
let toasts=[]; const origToast=w.showToast; w.showToast=m=>{toasts.push(m);};
$("subjectSelect").value="physics"; w.updateTopicOptions(); $("topicSelect").value="all"; $("questionCount").value="10"; $("quizMode").value="standard"; w.beginAssessment(); runQuiz(true);
const today=w.state.activity[key(0)];
ok(today && today.q===10 && today.c===10 && today.goal===true,"activity logged, goal flag set");
ok(toasts.some(t=>/Daily goal reached/.test(t)) && toasts.some(t=>/First Step/.test(t)) && /\+\d more/.test(toasts.join("")),"toast announces goal + badges: "+toasts.join(" | ").slice(0,160));
ok(w.state.badges.first && w.state.badges.sharp && w.state.badges.goal && !w.state.badges.century,"correct badges stored");
w.renderDashboard(); ok(/Today: 10 \/ 10/.test($("todayCard").textContent) && /Daily goal reached/.test($("todayCard").textContent) && !$("todayCard").querySelector("[data-go]"),"home card shows goal reached, no CTA");
ok($("todayCard").querySelector(".streak-num").textContent==="1","streak = 1");
// goal change
$("dailyGoalSelect").value="20"; $("dailyGoalSelect").dispatchEvent(new w.Event("change",{bubbles:true}));
ok(w.state.settings.dailyGoal===20 && /Today: 10 \/ 20/.test($("todayCard").textContent) && !!$("todayCard").querySelector("[data-go]"),"changing goal updates card and persists");
// goal only fires once per crossing
toasts=[]; w.resetAssessment(); $("quizMode").value="standard"; w.beginAssessment(); runQuiz(true);
ok(w.state.activity[key(0)].q===20 && toasts.some(t=>/Daily goal reached \(20/.test(t)),"crossing the new goal (20) fires again");
toasts=[]; w.resetAssessment(); w.beginAssessment(); runQuiz(true);
ok(!toasts.some(t=>/Daily goal/.test(t)),"no repeat goal toast once already past it");
// century badge via total
ok(!w.state.badges.century && w.totalAnswered()===30,"no Century badge at 30 questions");
w.state.activity[key(1)]={q:70,c:50,s:1,n:1}; toasts=[]; w.resetAssessment(); w.beginAssessment(); runQuiz(true); ok(w.state.badges.century && toasts.some(t=>/Century/.test(t)),"Century badge once 100+ answered");
// review session counts
const before=w.state.activity[key(0)].q; const qq=w.QUESTIONS[5]; w.state.mistakes[qq.id]={subject:qq.subject,topic:qq.topic,wrong:1,box:0,due:Date.now()-1,mastered:false};
w.beginReview(qq.subject); runQuiz(true); ok(w.state.activity[key(0)].q>before,"review sessions count toward activity");
// weekly
w.state.activity={}; for(let i=0;i<7;i++) w.state.activity[key(i)]={q:i+1,c:i,s:60*(i+1),n:1};
for(let i=7;i<14;i++) w.state.activity[key(i)]={q:1,c:1,s:60,n:1};
w.renderWeekly(); const t=$("weeklyPanel").textContent;
ok(/Questions\s*28/.test(t) && /Active days\s*7 \/ 7/.test(t) && /↑ \+21/.test(t),"weekly tiles: 28 questions, 7/7 days, +21 vs last week");
ok($("weeklyPanel").querySelectorAll(".week-bar").length===7,"7 daily bars");
w.state.activity={}; w.renderWeekly(); ok(/summary will appear/.test($("weeklyPanel").textContent),"empty weekly state");
// movers
w.state.history=[{date:new Date().toISOString(),topicResults:{phy_nano:{correct:9,total:10},phy_quantum:{correct:3,total:10}}},{date:new Date(Date.now()-3*DAY).toISOString(),topicResults:{phy_nano:{correct:5,total:10},phy_quantum:{correct:8,total:10}}}];
const mv=w.topicMovers(); ok(mv.up.length===1 && mv.up[0].t==="phy_nano" && mv.up[0].d===40 && mv.down[0].t==="phy_quantum" && mv.down[0].d===-50,"topic movers detect +40 / −50");
w.state.history[0].date=new Date(Date.now()-20*DAY).toISOString(); ok(w.topicMovers().up.length===0,"old attempts ignored for movers");
// badges panel
w.renderBadges(); ok($("badgePanel").querySelectorAll(".badge-card").length===11 && /Achievements/.test($("badgePanel").textContent),"badge panel lists all 11");
// export/import keeps activity; legacy import backfills
w.state.activity={[key(0)]:{q:9,c:9,s:1,n:1}}; w.state.badges={first:1};
let cap; w.Blob=function(p){cap=p.join("");}; w.URL.createObjectURL=()=>"b"; w.URL.revokeObjectURL=()=>{}; w.HTMLAnchorElement.prototype.click=function(){};
w.exportProgress(); const exp=cap; w.state.activity={}; w.state.badges={}; w.importProgress(exp);
ok(w.state.activity[key(0)].q===9 && w.state.badges.first===1,"import restores activity and badges");
w.importProgress(JSON.stringify({history:[{date:new Date().toISOString(),total:10,correct:5,topicResults:{a:{correct:5,total:10}}}],topicResults:{}}));
ok(w.state.activity[key(0)].q===10,"legacy import backfills activity");
console.log(fails?`${fails} FAILED`:"ALL PASSED"); process.exit(fails?1:0);
