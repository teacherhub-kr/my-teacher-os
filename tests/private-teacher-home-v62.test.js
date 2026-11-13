/* v62: private teacher home provides real class counts and evidence-only draft, no fake data. */
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'apps-script/music-dashboard/Index.html'),'utf8');
const source=ui.match(/\/\/ BEGIN OWNER_ONLY_HOME_CORE[^\n]*\n([\s\S]*?)\/\/ END OWNER_ONLY_HOME_CORE/);
assert(source,'Private home pure logic must be testable');
const ctx={};
vm.runInNewContext(source[1],ctx);
const classes=[
 ...Array.from({length:9},(_,i)=>({id:'2-'+(i+1),grade:2,missing:[i===0?0:2,0,5,1],notice:i===0?'없음':'확인 필요'})),
 ...Array.from({length:6},(_,i)=>({id:'3-'+(i+4),grade:3,missing:[0,0,3,i===0?0:1],notice:i===0?'긴급':'없음'}))
];
const two=JSON.parse(JSON.stringify(ctx.summarizePrivateHome_(classes,2)));
assert.equal(two.grade,2);
assert.equal(two.classCount,9);
assert.equal(two.assessments.length,4);
assert.equal(two.assessments[0].missing,16);
assert.equal(two.assessments[2].missing,45);
assert.equal(two.assessments[2].classes,9);
assert.equal(two.missing,70);
assert(two.attention.length<=7&&two.attention.every(x=>/^2-\d$/.test(x.id)));
const three=JSON.parse(JSON.stringify(ctx.summarizePrivateHome_(classes,3)));
assert.equal(three.grade,3);
assert.equal(three.classCount,6);
assert.equal(three.assessments[0].semester,'1학기 참고');
assert.equal(three.assessments[2].semester,'2학기');
assert.equal(three.assessments[2].missing,18);
assert.equal(three.attention[0].id,'3-4');
assert.throws(()=>ctx.summarizePrivateHome_(classes.slice(0,14),3),/학급 수/);
const safe=JSON.parse(JSON.stringify(ctx.buildRecordDraft_('우쿨렐레 합주','자신이 맡은 리듬을 일정하게 연주함','연습 후 다른 연주자와 박을 맞추어 합주함')));
assert(safe.text.includes('우쿨렐레 합주 활동에서'));
assert(safe.text.includes('리듬을 일정하게 연주함.'));
assert(safe.text.includes('박을 맞추어 합주함.'));
assert(!safe.text.includes('성적')&&!safe.text.includes('우수')&&!safe.text.includes('성장함'));
assert.equal(ctx.buildRecordDraft_('음악 감상','',null).text,'');
assert(ctx.buildRecordDraft_('','활동에 참여하여 발표 자료를 구성함','').error);
assert(ctx.buildRecordDraft_('음악','참여함','').error,'Insufficient observational evidence fails closed');
assert(!ctx.buildRecordDraft_('기악','선율의 흐름을 비교하여 자신이 판단한 근거를 설명함','').error);
for(const marker of ['id="assessmentSummary"','id="attentionList"','id="recordPanel"','id="recordStudent"','id="recordObserved"','id="recordDraft"','renderActions();','populateRecordStudents(result)','copyRecordDraft']){
  assert(ui.includes(marker),'Missing owner-only UI marker '+marker);
}
assert(!ui.includes('localStorage')&&!ui.includes('sessionStorage'),'No persistence of student observations or drafts');
// Exactly two credential-free GET reads of class-only public timetable JSON are allowed.
// Do not relax protection against arbitrary endpoints or private student-record transfer.
assert(!/XMLHttpRequest|postMessage/.test(ui),'Owner-only notes cannot be sent via legacy transport');
assert(ui.includes("var PUBLIC_TIMETABLE='https://teacherhub-kr.github.io/my-teacher-os/live/';"),
  'Public timetable source must be a fixed official project path');
const publicReads=Array.from(ui.matchAll(/\bfetch\(([^)]*)\)/g),m=>m[1].trim());
assert.equal(publicReads.length,2,'No other outgoing fetch is allowed in the owner-only page');
assert.deepEqual(publicReads.sort(),[
 "PUBLIC_TIMETABLE+'comcigan-status.json',{cache:'no-store',credentials:'omit'}",
 "PUBLIC_TIMETABLE+'comcigan.json',{cache:'no-store',credentials:'omit'}"
].sort(),'Only credential-free public timetable GETs are allowed');
const publicHome=fs.readFileSync(path.join(root,'teacher-dashboard-v49.js'),'utf8');
assert(!publicHome.includes('getStudentDetail'),'Public home must not read private student sources');
assert(!publicHome.includes('getDashboardData'),'Public home cannot proxy authenticated summaries');
const privateLink=(publicHome.match(/data-teacher56="open"/g)||[]);
assert.equal(privateLink.length,1,'Exactly one private CTA belongs on public home');
console.log('v62 protected class progress, true alerts, evidence-only record drafts, no data leaks PASS');
