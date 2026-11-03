/* v61 regression: genuine local records and private-only evaluation link. */
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'teacher-dashboard-v49.js'),'utf8');
const layout=fs.readFileSync(path.join(root,'teacher-design-v51.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=app.indexOf('  function renderAssessments(y){');
const end=app.indexOf('  function fillSavedSheet(){',start);
assert(start>=0&&end>start,'Only exercise exact dashboard renderers');
const elements={'#t49AssessList':{innerHTML:''},'#t49Alerts':{innerHTML:''}};
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scope={q:id=>elements[id],esc};
vm.runInNewContext(app.slice(start,end),scope,{filename:'dashboard-renderers.js'});
scope.renderAssessments(null);
assert(elements['#t49AssessList'].innerHTML.includes('기록이 없습니다'));
assert(!elements['#t49AssessList'].innerHTML.includes('등록된 평가가 있습니다'));
scope.renderAlerts(null);
assert(elements['#t49Alerts'].innerHTML.includes('학년도 업무 미설정'));
assert(!elements['#t49Alerts'].innerHTML.includes('업무 완료'));
assert(!elements['#t49Alerts'].innerHTML.includes('data-teacher56="open"'),'Do not repeat the same private destination in alerts');
const state={
  assessments:[{name:'가상 수행평가',target:'3학년',due:'2026-11-04'}],
  projects:[{name:'가상 학교행사',due:'2026-11-06'}],
  tasks:[{text:'교구 준비',done:false},{text:'처리 완료',done:true}]
};
scope.renderAssessments(state);
const recent=elements['#t49AssessList'].innerHTML;
assert(recent.includes('가상 수행평가')&&recent.includes('가상 학교행사')&&recent.includes('교구 준비'),'Must include real local assessments/projects/open tasks');
assert(!recent.includes('처리 완료'),'Finished tasks do not count as pending');
assert(recent.includes('data-t49-record-status="미완료"'));
scope.renderAlerts(state);
let alerts=elements['#t49Alerts'].innerHTML;
assert(alerts.includes('교구 준비')&&!alerts.includes('처리 완료'));
assert(!alerts.includes('data-teacher56="open"'),'Actionable local alerts must remain local');
scope.renderAlerts({assessments:[],projects:[],tasks:[]});
alerts=elements['#t49Alerts'].innerHTML;
assert(alerts.includes('OS 미완료 할 일 기록 없음'));
assert(alerts.includes('실제 학교업무의 완료 여부를 뜻하지 않습니다.'));
assert(!alerts.includes('미채점 0'));
scope.renderAssessments({assessments:[{name:'<script>alert(1)</script>',due:'',target:'<img src=x>'}],projects:[],tasks:[]});
assert(!elements['#t49AssessList'].innerHTML.includes('<script>'),'Never render local title as HTML');
assert(!elements['#t49AssessList'].innerHTML.includes('<img'),'Never render local target as HTML');
assert(layout.includes('const status=el.dataset.t49RecordStatus'), 'Design layer must show actual pending state');
assert(app.includes('data-teacher56="open"'), 'Single protected entry remains in the assessment card');
assert(!layout.includes('<em>—</em>'), 'No synthetic alerts with dash values');
assert(!layout.includes('학생별 예외상태는 비공개</small><em>'), 'No fabricated missing-participant entries');
assert(index.includes('teacher-design-v51.js?v=51.0-reference-parity-activity'), 'Updated JS must avoid stale browser cache');
assert(index.includes('teacher-dashboard-v49.js?v=61.0-live-view-honest-home-20261103-activity'));
assert(!/getStudentDetail|IMPORTRANGE|sheets\.googleapis\.com/.test(app+layout),'Public home must not fetch private grades');
console.log('v61 local assessment/project/task display, no fabricated alerts, protected link, escaping PASS');
