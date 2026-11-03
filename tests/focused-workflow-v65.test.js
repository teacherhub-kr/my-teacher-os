/* v65: fewer entry points, no deleted functionality, real-data-only home. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html');
const app=read('teacher-focused-v65.js');
const css=read('teacher-focused-v65.css');
const base=read('teacher-dashboard-v49.js');
const html=read('app-v05.html');
assert(index.includes('teacher-focused-v65.css?v=65.0-focused-home'));
assert(index.includes('teacher-focused-v65.js?v=65.0-focused-home'));
assert(index.indexOf('teacher-focused-v65.css')>index.indexOf('teacher-unified-v64.css'));
assert(index.indexOf('teacher-focused-v65.js')>index.indexOf('teacher-private-music-v56.js'));
assert(index.includes('body:not(.teacher65-mode):not(.teacher-os-fallback) .shell'));
assert(index.includes('document.body.classList.contains("teacher65-mode")'));
assert(base.includes("if(nav.dataset.os65Grouped!=='1')NAV.forEach"));
for(const label of ["홈","수업","평가·기록","학교업무","자료·설정"])
  assert(app.includes("label:'"+label+"'"),'Missing primary group '+label);
assert((app.match(/\{id:'(home|lesson|record|work|tools)'/g)||[]).length===5,'Exactly five groups');
const views=['dashboard','os65-detail','calendar','timetable','assessment','t49-classes','t49-exceptions','t49-records','clubs','projects','memory','importer','documents','policy','settings'];
for(const view of views){
  assert(app.includes("'"+view+"'"),'Focused navigation cannot lose a workflow '+view);
  if(!view.startsWith('os65-')&&!view.startsWith('t49-'))
    assert(html.includes('id="'+view+'"'),'Original screen removed '+view);
}
assert(app.includes("detail.appendChild(body)"),'Must move original live DOM into detailed view without rebuilding');
assert(app.includes("main.appendChild(detail)"),'Detailed view must be an ordinary accessible screen');
for(const element of ['t49Screen','t49Workspace','t49WorkspaceOverview','t49WorkspaceTeaching','t49WorkspaceTasks'])
  assert(base.includes(element),'Existing detailed tools removed '+element);
assert(app.includes('if(!q("#os65Home"))')||app.includes("if(!q('#os65Home'))"));
assert(app.includes('id="os65PendingItems"')&&app.includes('id="os65UpcomingItems"'));
assert(app.includes('id="os65LessonValue"')&&app.includes('id="os65AssessmentValue"'));
assert(app.includes('id="os65PendingValue"')&&app.includes('id="os65TaskForm"'));
assert(app.includes('id="os65-detail"')||app.includes("detail.id='os65-detail'"));
assert(app.includes('data-teacher56="open"'),'Private original must remain separately protected');
assert((app.match(/data-teacher56="open"/g)||[]).length===1,'Focused home must not repeat protected links');
assert(app.includes("verifiedSlots(y)")&&app.includes("slots?slots.length+'개':'연결 확인'"),'Never invent timetable counts');
assert(app.includes("y&&Array.isArray(y.assessments)"),'Evaluate local records rather than faking grades');
assert(app.includes("tasks.filter(function(t){return !t.done})"),'Pending tasks must exclude completed entries');
assert(app.includes("original.value=value;add.click()"),'New task control must reuse old storage/save handler');
assert(app.includes("original.click();lastSnapshot=''"),'Complete task must reuse existing action');
assert(!/sheets\.googleapis\.com|getStudentDetail|IMPORTRANGE|studentCache|students\.map/.test(app),'Public home cannot fetch private grades');
assert(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),'Four clearly ranked quick tasks required');
assert(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'),'Mobile navigation must expose five top-level groups');
assert(css.includes('.os65-group-items[hidden]{display:none!important}'),'Collapse groups only, never remove their actions');
console.log('v65 simplified home, five groups, source-honest counts, original data engine and privacy PASS');