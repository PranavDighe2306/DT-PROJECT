const fs = require("fs"), vm = require("vm");
const { load, root } = require("./harness");
const dir = root + "/";
const w = load();
const $=id=>w.document.getElementById(id);
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log("FAIL",m);} else console.log("ok  ",m); };
const DAY=864e5, key=n=>w.dayKey(Date.now()+n*DAY);
const R=(acc,total=10)=>({accuracy:acc,correct:Math.round(acc*total/100),total,samples:total,updatedAt:1});
w.state.topicResults={phy_nano:R(30),phy_quantum:R(60),phy_super:R(75),phy_semiconductor:R(90)};
let toasts=[]; w.showToast=m=>toasts.push(m);
// ---- generator
let p=w.buildPlan(key(10),2,["physics"],{}); const tasks=w.planTasks(p);
ok(p.days.length===10 && p.days[0].date===key(0) && p.days[9].date===key(9),"10 days: today .. day before exam");
ok(p.days[9].tasks.length===1 && p.days[9].tasks[0].type==="notebook","last day is a final-review day");
ok(!p.days.some(d=>d.date===key(10)),"exam day not scheduled");
ok(p.days.every(d=>d.tasks.length<=2),"never more than 2 sessions a day");
ok(new Set(tasks.map(t=>t.id)).size===tasks.length,"task ids unique");
const first=tasks[0]; ok(first.topic==="phy_nano" && first.type==="revise","highest-priority (30%) revise comes first");
const order=tasks.filter(t=>t.type==="revise").map(t=>t.topic); ok(order.indexOf("phy_nano")<order.indexOf("phy_quantum"),"weaker topic revised before stronger");
ok(tasks.some(t=>t.topic==="phy_nano"&&t.type==="practice") && tasks.some(t=>t.topic==="phy_nano"&&t.type==="retest"),"<50% topic gets revise+practice+retest");
ok(tasks.some(t=>t.topic==="phy_quantum"&&t.type==="retest") && !tasks.some(t=>t.topic==="phy_quantum"&&t.type==="practice"),"50–69% gets revise+retest");
ok(tasks.filter(t=>t.topic==="phy_super").length===1 && tasks.find(t=>t.topic==="phy_super").type==="practice","70–79% gets one practice");
ok(tasks.some(t=>t.topic==="phy_semiconductor"&&t.type==="recap"),"strong topic gets a recap when ≥5 days");
ok(tasks.some(t=>t.topic==="phy_laserfiber"&&t.type==="diagnostic") && tasks.some(t=>t.topic==="phy_laserfiber"&&t.type==="revise"),"unassessed topic: diagnostic + revise");
ok(p.dropped===0,"everything fits");
// even spread: tasks are not all on day 1
ok(p.days.filter(d=>d.tasks.length).length>=6,"sessions spread across days");
// tight
let t1=w.buildPlan(key(1),1,["physics"],{}); ok(t1.days.length===1 && t1.days[0].tasks.length===1 && t1.dropped>0 && !t1.days.some(d=>d.tasks.some(t=>t.type==="notebook")),"exam tomorrow: 1 day, no review day, lowest-priority dropped");
ok(w.buildPlan(key(0),1,["physics"],{})===null,"exam today → no plan");
let t2=w.buildPlan(key(2),2,["physics"],{}); ok(t2.days.length===2 && !t2.days.some(d=>d.tasks.some(t=>t.type==="notebook")),"2 days: no final-review day");
ok(!w.planTasks(w.buildPlan(key(4),3,["physics"],{})).some(t=>t.type==="recap"),"no recaps when <5 days");
// rebuild keeps done
p.done[first.id]=123; p.done["bogus:x"]=1; let p2=w.buildPlan(key(12),2,["physics"],p.done); ok(p2.done[first.id]===123 && !p2.done["bogus:x"],"rebuild keeps done sessions, drops unknown ids");
// ---- UI
w.navigate("calendar"); ok(!!$("planExam") && /Pick your exam date/.test($("calendarBody").textContent),"calendar page renders form, empty state");
$("planExam").value=key(6); $("planPerDay").value="2"; $("calendarBody").querySelectorAll("[name=planSubject]").forEach(c=>c.checked=(c.value==="physics"));
w.document.querySelector("[data-plan-build]").click();
ok(w.state.plan && w.state.plan.exam===key(6) && JSON.stringify(w.state.plan.subjects)==='["physics"]',"build button creates plan from form");
ok($("calendarBody").querySelectorAll(".plan-day").length===7 && !!$("calendarBody").querySelector(".exam-day") && $("calendarBody").querySelector(".plan-day.today"),"agenda: 6 study days + exam day, today highlighted");
const cb=$("calendarBody").querySelector("[data-plan-done]"); cb.checked=true; cb.dispatchEvent(new w.Event("change",{bubbles:true}));
ok(Object.keys(w.state.plan.done).length===1 && /1 \/ \d+/.test($("calendarBody").querySelector(".plan-summary").textContent),"ticking a session saves and updates summary");
w.renderDashboard(); ok(/Exam in 6 days/.test($("planCard").textContent),"home banner shows days to exam");
// semester shortcut
w.document.querySelector("[data-plan-sem='II']").click(); const checked=[...$("calendarBody").querySelectorAll("[name=planSubject]:checked")].length; ok(checked===7,"Semester II shortcut selects 7 subjects");
// validation
toasts=[]; $("planExam").value=key(0); w.document.querySelector("[data-plan-build]").click(); ok(toasts.some(t=>/after today/.test(t)),"rejects today/past date");
$("planExam").value=key(400); w.document.querySelector("[data-plan-build]").click(); ok(toasts.some(t=>/within the next year/.test(t)),"rejects >1 year");
$("planExam").value=key(5); $("calendarBody").querySelectorAll("[name=planSubject]").forEach(c=>c.checked=false); w.document.querySelector("[data-plan-build]").click(); ok(toasts.some(t=>/at least one subject/.test(t)),"requires a subject");
// auto-complete via assessment
w.state.plan=w.buildPlan(key(8),2,["physics"],{}); const nano=w.planTasks(w.state.plan).find(t=>t.topic==="phy_nano"&&t.type==="revise"); w.state.plan.done={};
ok(nano.date===key(0),"first nano session is today");
w.startPlanSession("physics","phy_nano"); ok(w.currentQuestions.length===10 && w.currentQuestions.every(q=>q.topic==="phy_nano"),"Start launches 10-question topic quiz");
for(let i=0;i<10;i++){ const q=w.currentQuestions[i]; w.currentIndex=i; w.renderQuestion(); const b=$("quizPanel").querySelectorAll("[data-answer]"); if(Array.isArray(q.answer)) q.answer.forEach(a=>b[a].click()); else b[q.answer].click(); }
toasts=[]; w.currentIndex=9; w.renderQuestion(); $("nextQuestion").click();
ok(w.state.plan.done[nano.id] && toasts.some(t=>/Study-plan session ticked off/.test(t)),"finishing a topic quiz auto-ticks its pending session");
ok(Object.keys(w.state.plan.done).length===1,"only one session ticked");
// future sessions not auto-ticked
const retest=w.planTasks(w.state.plan).find(t=>t.topic==="phy_nano"&&t.type==="retest"); ok(!w.state.plan.done[retest.id],"future retest not ticked early");
// overdue
w.state.plan.days[0].tasks.push({id:"phy_super:practice2",topic:"phy_super",subject:"physics",type:"practice"}); w.state.plan.days[0].date=key(-2); w.renderCalendar();
ok(w.planStats(w.state.plan).overdue>=1 && $("calendarBody").querySelector(".plan-task.late"),"overdue sessions flagged");
// export/import & reset
let cap; w.Blob=function(p){cap=p.join("");}; w.URL.createObjectURL=()=>"b"; w.URL.revokeObjectURL=()=>{}; w.HTMLAnchorElement.prototype.click=function(){};
w.exportProgress(); const exp=cap, planBefore=JSON.stringify(w.state.plan); w.state.plan=null; w.importProgress(exp); ok(JSON.stringify(w.state.plan)===planBefore,"plan survives export/import");
w.importProgress(JSON.stringify({history:[],topicResults:{},plan:{exam:5,days:"x"}})); ok(w.state.plan===null,"malformed plan ignored on import");
w.state.plan=w.buildPlan(key(5),2,["physics"],{}); w.resetProgress(); ok(w.state.plan===null,"reset clears plan");
// passed exam banner
w.state.plan={exam:key(-1),perDay:1,subjects:["physics"],days:[],done:{}}; w.renderPlanCard(); ok(/exam date has passed/.test($("planCard").textContent),"passed-exam banner");
// clear
w.state.plan=w.buildPlan(key(5),2,["physics"],{}); w.renderCalendar(); w.document.querySelector("[data-plan-clear]").click(); ok(w.state.plan===null,"clear plan button");
console.log(fails?`${fails} FAILED`:"ALL PASSED"); process.exit(fails?1:0);
