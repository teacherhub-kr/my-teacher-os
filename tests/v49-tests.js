/* Teacher OS v49 UI regression guard — no student data in public shell. */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const base = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(base, 'teacher-dashboard-v49.js'), 'utf8');
const css = fs.readFileSync(path.join(base, 'teacher-dashboard-v49.css'), 'utf8');
assert(index.includes('teacher-dashboard-v49.css?v=50.0-layout-fix'), 'premium stylesheet missing from loader');
assert(index.includes('teacher-dashboard-v49.js?v=50.0-layout-fix'), 'premium JS missing from loader');
assert(css.includes('prefers-reduced-motion'), 'reduced-motion support missing');
assert(css.includes('@media(max-width:820px)'), 'tablet layout missing');
assert(css.includes('@media(max-width:480px)'), 'mobile layout missing');
assert(app.includes('학생 이름, 성적, 예외사항'), 'privacy notice missing');
assert(app.includes('원본 확인'), 'non-fabricated progress state missing');
assert(!app.includes('최윤우') && !app.includes('이우주'), 'student names must never enter public code');
assert(!app.includes('IMPORTRANGE'), 'public app must not fetch private grade sheets');
const handlers = [];
const storage = new Map();
const sandbox = {
  globalThis: {},
  document: {addEventListener(type,fn){handlers.push(type)}},
  window: {open(){}},
  localStorage: {getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)},removeItem(k){storage.delete(k)}},
  setTimeout(){}, setInterval(){},
  location: {href:''},
};
vm.runInNewContext(app, sandbox, {filename:'teacher-dashboard-v49.js'});
const runtime = sandbox.globalThis.TeacherOSPremiumDashboard49;
assert(runtime && typeof runtime.safeSheetUrl === 'function', 'public runtime not loaded');
const sheetId = '1XapLQCPqLzK0d6yASJZ_uIHFb_QjQ2zYzNnt9aVbNMs';
assert.strictEqual(runtime.safeSheetUrl('https://docs.google.com/spreadsheets/d/'+sheetId+'/edit#gid=123'), 'https://docs.google.com/spreadsheets/d/'+sheetId+'/edit');
for(const bad of ['https://evil.example/sheet','javascript:alert(1)','https://docs.google.com.evil.example/spreadsheets/d/'+sheetId+'/edit','https://docs.google.com/spreadsheets/d/too-short/edit']){
  assert.strictEqual(runtime.safeSheetUrl(bad),'','unsafe private sheet link accepted');
}
assert(handlers.includes('click'), 'interaction handler missing');
assert(handlers.includes('visibilitychange'), 'refresh-on-visible handler missing');
console.log('v49 premium dashboard safety and loader tests passed');
