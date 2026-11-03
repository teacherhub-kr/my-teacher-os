/* v66: five direct workflow destinations, old data moved not replaced. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('app-v05.html'),loader=read('index.html'),js=read('teacher-workflow-v66.js');
const css=read('teacher-focused-v65.css'),legacy=read('teacher-focused-v65.js'),v49=read('teacher-dashboard-v49.js');
assert(loader.includes('teacher-workflow-v66.js?v=66.1-seteuk-entry'),'Missing v66 runtime');
assert(loader.includes('body:not(.teacher66-mode):not(.teacher-os-fallback) .shell'),'Must suppress old home until v66 ready');
assert(loader.includes('teacher-focused-v65.css?v=65.0-focused-home-v66-workflow'),'v66 style must bust cache');
assert(loader.lastIndexOf('teacher-workflow-v66.js')>loader.lastIndexOf('teacher-focused-v65.js'),'v66 must initialize after retained v65 model helpers');
assert(legacy.includes('if(globalThis.TeacherOSV66Active)return'),'Obsolete v65 menu must never mount');
assert(legacy.includes('homeMarkup:homeMarkup'),'Original compact home markup reused without cloning data engine');
assert(v49.includes("document.body.classList.contains('teacher66-mode')"),'Original v49 cannot rebuild giant dashboard after migration');
const groups=[['home','홈'],['lesson','수업 관리'],['assessment','수행평가'],['student','학생·생활기록부'],['work','학교업무']];
for(const [id,label] of groups){
 assert(js.includes("id:'"+id+"',label:'"+label+"'"),'Missing or incorrect primary destination: '+label);
}
assert((js.match(/\{id:'(?:home|lesson|assessment|student|work)'/g)||[]).length===5,'Only five primary destinations');
for(const id of ['dashboard','calendar','timetable','lessonlog','policy','assessment','t49-classes','t49-exceptions','studentrecords','t49-records','projects','clubs','memory'])
 assert(js.includes("'"+id+"'"),'Task workflow unavailable: '+id);
for(const id of ['settings','documents','importer'])
 assert(js.includes("['"+id+"'"),'Utility access missing: '+id);
for(const marker of ['#os66SettingsButton','#os66Tabs','#os66LegacyNav','#os65TaskForm','#taskInput','#taskList','#t49Screen'])
 assert(js.includes(marker),'UI/data connection missing: '+marker);
assert(!js.includes("detail.appendChild(body)"),'No single giant detailed view should remain');
assert(!js.includes("detail.id='os65-detail'"),'All-in-one old work screen forbidden');
assert(js.includes('workspace.remove()'),'Legacy workspace container must disappear');
assert(js.includes("['policyBanner','policy',false]"),'Original curriculum banner must move with its reference to the policy task');
assert(js.includes('classes.appendChild(screen)'),'Existing class progress must be in the assessment task');
assert(js.includes('card=m[2]?node.closest'),'Original live card must be moved rather than rebuilt');
assert(js.includes('task.value=value;add.click()'),'Task creation must reuse previous save handler');
assert(js.includes('original.click();setTimeout(refreshHome,0)'),'Task completion must reuse previous save handler');
assert(js.includes("return 't49-records'"),'Student records need safe fallback if optional screen is absent');
assert(!/getStudentDetail|sheets\.googleapis\.com|IMPORTRANGE|rawGrades|studentCache/.test(js),'No private student data in public shell');
assert(css.includes('body.teacher66-mode.premium-ui #nav button.os66-category'),'Five primary menu buttons need consistent design');
assert(css.includes('body.teacher66-mode.premium-ui #os66Tabs .os66-tab'),'Detail choices must be contextual tabs');
assert(css.includes('body.teacher66-mode.premium-ui #dashboardBody{display:none!important}'),'Obsolete giant dashboard must be hidden');
assert(css.includes('body.teacher66-mode.premium-ui #os66SettingsButton'),'Backup and importer must be one top-level settings action');
assert(html.includes('id="taskInput"')&&html.includes('id="importFiles"'),'Existing data engine retained');
console.log('v66 five direct workspaces, contextual tabs, live card relocation, original handlers and privacy PASS');