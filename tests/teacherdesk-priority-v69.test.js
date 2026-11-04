/* Regression guard for the first TeacherDesk-inspired, minimal-change cleanup.
   Public UI never contains or requests student records. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

const html = read('app-v05.html');
const app = read('app-v05.js');
const home = read('teacher-focused-v65.js');
const loader = read('index.html');
const privatePortal = read('teacher-private-music-v56.js');
const workflow = read('teacher-workflow-v66.js');
const stylesheet = read('teacher-focused-v65.css');

assert.match(html, /<input id="carryPrev" type="checkbox">/, 'Prior-year record carryover must start unchecked');
assert.match(app, /\$\('#carryPrev'\)\.checked=false;openDlg\('#yearDlg'\)/, 'Reopening year setup must never preselect record copying');
assert.match(app, /if\(!exists&&\$\('#carryPrev'\)\.checked&&prev\)/, 'Explicit opt-in remains possible');
assert.equal((home.match(/class="os65-quick-card/g) || []).length, 4, 'Keep exactly four direct daily actions');
assert.match(home, /class="os65-quick-card os65-private-card" data-teacher56="open" data-teacher56-view="seteuk"/, 'Home record action must open the protected workroom');
assert.doesNotMatch(home, /data-os65-view="t49-records"/, 'Home must not mistake public records portal for the private workroom');
assert.equal((home.match(/data-teacher56="open"/g) || []).length, 1, 'Do not repeat the private shortcut on home');
assert.match(home, /id="os65PrivateState"/, 'Private shortcut has a grounded connection indicator');
assert.match(home, /privateLink:privateUrlSet/, 'Private connection status changes invalidate home cache');
assert.match(home, /privateUrlSet\?'주소 등록됨 · Google에서 열기':'웹앱 주소 등록 필요'/, 'Address registration must not be presented as verified Google access');
assert.match(privatePortal, /var LINK_KEY="myTeacherOS\.music56\.ownerOnlyWebAppUrl"/, 'Original owner-only destination remains browser private');
assert.match(privatePortal, /window\.open\(target,"_blank","noopener,noreferrer"\)/, 'Protected app stays on Google's origin');
assert.match(workflow, /s\.dataset\.teacher56View='seteuk'/, 'Existing contextual private navigation remains available');
assert.doesNotMatch(home, /getStudentDetail|sheets\.googleapis\.com|IMPORTRANGE|studentCache/, 'Public home must not request private student data');
for (const marker of ['teacher-focused-v65.js?v=65.1-private-shortcut','teacher-focused-v65.css?v=65.1-private-shortcut','app-v05.js?v=46.1-safe-year-carry']) {
  assert(loader.includes(marker), 'Browser must refresh changed asset: ' + marker);
}
assert.match(stylesheet, /os65-private-card:focus-visible/, 'Main shortcut must remain keyboard accessible');
console.log('P0/P1 privacy, opt-in annual rollover, single-click protected record shortcut, cache and accessibility PASS');
