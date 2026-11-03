/* v64: all preexisting Teacher OS screens must use one current design layer. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('teacher-unified-v64.css'),loader=read('index.html');
const html=read('app-v05.html'),app=read('teacher-dashboard-v49.js');
assert(loader.includes('teacher-unified-v64.css?v=64.0-complete-design'),'Unified CSS missing');
assert(loader.lastIndexOf('teacher-unified-v64.css')>loader.lastIndexOf('teacher-design-v51.css'),'Unified CSS must load after current reference theme');
assert(loader.lastIndexOf('teacher-unified-v64.css')>loader.lastIndexOf('teacher-dashboard-v49.css'),'Unified CSS must override original theme');
assert(!loader.includes('student.google.com/'),'Avoid untrusted private endpoints');
const modules=['dashboard','importer','calendar','timetable','assessment','clubs','projects','policy','documents','memory','settings','t49-classes','t49-exceptions','t49-records'];
for(const id of modules){
  assert(app.includes("view:'"+id+"'"),'Modern sidebar missing '+id);
  if(!id.startsWith('t49-'))assert(html.includes('id="'+id+'"'),'Existing page must remain intact '+id);
}
for(const feature of ['nextList','agentRun','todayTimetable','flowList','taskList','taskInput','taskAdd','assItems','timetableTable','clubGrid','projectGrid','policySummary','sourceList','memoryList','healthGrid','importFiles','importJSON','exportJSON']){
  assert(html.includes('id="'+feature+'"'),'Original functional element missing '+feature);
}
for(const selector of [
  '.view:not(#dashboard)>.section-intro',
  '.view:not(#dashboard) .card',
  '.view:not(#dashboard) .project-grid',
  '.view:not(#dashboard) .policy-grid',
  '.view:not(#dashboard) .health-grid',
  '.view:not(#dashboard) .timetable',
  '.view:not(#dashboard) .upload',
  '.view:not(#dashboard) .notice',
  '.view:not(#dashboard) .btn.primary',
  '.view:not(#dashboard) :is(.field,select,input',
  '.t49-workspace .agent',
  '.t49-workspace .musicLibraryFeatured',
  '.t49-workspace .summary',
  '.t49-workspace .today-slots',
  'dialog .modal',
  '#nav button[data-view]',
  '.top-actions',
  '.t51-sidebar-note',
  '@media(max-width:820px)',
]){
  assert(css.includes(selector),'Unified design lacks coverage: '+selector);
}
assert(css.includes('background:#fff!important')&&css.includes('--os-primary:#2468f3'),'Blue/white system must replace the old green theme');
assert(!css.includes('display:none!important;\n  body.teacher51-mode.premium-ui #nav button'),'All feature menus stay available');
assert(!/getStudentDetail|IMPORTRANGE|sheets\.googleapis\.com|student\.scores/.test(css),'CSS must never contain private records');
console.log('v64 unified current design covers all 14 menus, original tools, forms, tables, dialogs and mobile PASS');
