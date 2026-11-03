/* v63: existing teacher workflows remain live, visible and integrated. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html'),app=read('teacher-dashboard-v49.js'),css=read('teacher-dashboard-v49.css'),html=read('app-v05.html');
assert(index.includes('body:not(.teacher65-mode):not(.teacher-os-fallback) .shell{visibility:hidden!important}'),'The old UI must remain hidden until the focused current design is ready');
assert(index.includes('teacher-os-fallback'),'If modern style fails, app must remain usable');
assert(index.includes('teacher-dashboard-v49.js?v=61.0-live-view-honest-home-20261103-activity-private-home-integrated-v63'),'Versioned asset must force new code');
assert(index.includes('teacher-dashboard-v49.css?v=50.0-layout-fix-integrated-v63'),'Versioned asset must force new CSS');
assert(app.includes('workspace.id=\'t49Workspace\''),'Original home panels must be integrated, not discarded');
assert(app.includes('var original=Array.from(dash.children)'),'Original interactive DOM nodes must be moved, not rebuilt');
assert(app.includes('original=original.concat(Array.from(oldSlot.children))'),'Older collapsed panels must also be recovered');
assert(app.includes('home.appendChild(child)'),'Original event listeners, element ids and form fields must be preserved');
assert(app.includes('if(legacy)legacy.remove()'),'Obsolete collapsible UI must not remain');
assert(!app.includes('기존 Teacher OS 업무 도구 펼치기'),'Old collapsible interface must be eliminated');
assert(html.includes('class="musicLibraryFeatured"'),'Original music lesson library card must remain intact');
for(const id of ['policyBanner','mEnv','mCal','mTT','mAss','mClub','mProj','nextList','agentRun','todayTimetable','flowList','taskList','taskInput','taskAdd']){
  assert(html.includes('id="'+id+'"'),'Original DOM ID must still exist: '+id);
}
for(const slot of ['t49WorkspaceOverview','t49WorkspacePlans','t49WorkspaceTeaching','t49WorkspaceTasks','t49WorkspaceResources','t49WorkspaceOther']){
  assert(app.includes('id="'+slot+'"'),'Integrated area missing: '+slot);
}
for(const view of ['dashboard','importer','calendar','timetable','assessment','t49-classes','t49-exceptions','t49-records','clubs','projects','policy','documents','memory','settings']){
  assert(app.includes("view:'"+view+"'"),'Modern navigation is missing an original workflow: '+view);
}
assert(css.includes('body.teacher49-mode.premium-ui #nav button[data-view]{display:flex!important}'),'Original menus may not be hidden');
assert(css.includes('#nav a.musicLibraryLink{display:flex!important}'),'Music library shortcut must be visible');
assert(!css.includes('#nav button:not(:is([data-view="dashboard"]'),'Old hide-only-primary selector must be removed');
assert(!/getStudentDetail|IMPORTRANGE|sheets\.googleapis\.com/.test(app),'Public app must never fetch confidential grades');
console.log('v63 integrated live original widgets, 14 menus, no legacy fold, no old-design flash, privacy PASS');
