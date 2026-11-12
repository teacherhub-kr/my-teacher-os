/* v70: today-first timetable — the timetable must never go blank because the
   Comcigan collector failed, teacher edits are per-day and revertible, and the
   change set stays free of network calls and student data. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const T = require('../teacher-today-v70.js');
const V6 = require('../core-v06.js');

/* ---- dates ---- */
assert.equal(T.mondayOf('2026-11-12'), '2026-11-09');
assert.equal(T.mondayOf('2026-11-09'), '2026-11-09');
assert.equal(T.mondayOf('2026-11-15'), '2026-11-09');
assert.equal(T.weekdayIndex('2026-11-12'), 3);
assert.equal(T.kstToday(Date.parse('2026-11-11T15:30:00Z')), '2026-11-12', 'KST date rolls over at 15:00 UTC');
assert.equal(T.normalizeTarget('2학년 7반'), '2-7');
assert.equal(T.normalizeTarget(' 3 - 1 '), '3-1');
assert.equal(T.normalizeTarget('동아리'), '동아리');

/* ---- synthetic, student-free fixtures ---- */
function week(start, list) {
  const days = ['월', '화', '수', '목', '금'];
  return {weekStart: start, source: '컴시간 자동동기화', updatedAt: start + 'T02:00:00.000Z',
    slots: list.map(([d, p, t]) => ({date: T.isoAddDays(start, d), day: days[d], period: p, target: t,
      subject: '음악', label: t + ' 음악', changed: false, source: '컴시간 자동동기화'}))};
}
const lastWeek = week('2026-11-02', [[0, 1, '2-1'], [3, 1, '3-2'], [3, 5, '2-4']]);
const thisWeek = week('2026-11-09', [[3, 2, '2-6']]);
const base = [{day: '목', period: 3, target: '2-5', subject: '음악'}, {day: '월', period: 2, target: '2-1', subject: '음악'}];

/* ---- source priority ---- */
let r = T.resolveDay({verified: thisWeek.slots, verifiedWeek: '2026-11-09', liveWeeks: {'2026-11-09': thisWeek}, base}, '2026-11-12');
assert.equal(r.kind, 'live');
assert.deepEqual(r.slots.map(s => s.period + ':' + s.target), ['2:2-6']);
assert.match(T.sourceText(r), /이번 주 확인됨/);

r = T.resolveDay({liveWeeks: {'2026-11-09': thisWeek, '2026-11-02': lastWeek}, base}, '2026-11-12');
assert.equal(r.kind, 'synced', 'This week collected earlier but not re-verified: show it, labelled as unconfirmed');
assert.match(T.sourceText(r), /수집본 · 이후 변경은 미확인/);

r = T.resolveDay({liveWeeks: {'2026-11-02': lastWeek}, base}, '2026-11-12');
assert.equal(r.kind, 'pattern', 'Collector failing: fall back to the latest collected week instead of a blank table');
assert.equal(r.fromWeek, '2026-11-02');
assert.deepEqual(r.slots.map(s => s.period + ':' + s.label), ['1:3-2 음악', '5:2-4 음악']);
assert.match(T.sourceText(r), /11월 2일 주 컴시간 기준 · 이번 주 변경 확인 필요/);
assert.equal(T.resolveDay({liveWeeks: {'2026-11-02': lastWeek}}, '2026-11-11').kind, 'pattern',
  'A weekday without lessons in the pattern week is still that source, not "no timetable"');

r = T.resolveDay({liveWeeks: {'2026-09-21': week('2026-09-21', [[3, 1, '2-9']])}, base}, '2026-11-12');
assert.equal(r.kind, 'base', 'A collected week older than 6 weeks is not presented as this week');
assert.deepEqual(r.slots.map(s => s.target), ['2-5']);
assert.equal(T.resolveDay({base}, '2026-11-11').kind, 'base', 'Partial base timetable is one source for the whole week');
assert.equal(T.resolveDay({base}, '2026-11-11').slots.length, 0);
assert.equal(T.resolveDay({}, '2026-11-12').kind, 'none');
assert.equal(T.resolveDay({base}, '2026-11-14').kind, 'weekend');
assert.equal(T.resolveWeek({base}, '2026-11-12').days.length, 5);

/* ---- per-day edits (v06 exception model) ---- */
const empty = [];
let ex = T.editCell(empty, '2026-11-12', 3, {type: 'replace', original: '2-5', target: '2학년 7반'});
assert.equal(empty.length, 0, 'editCell must not mutate its input');
assert.deepEqual(ex.map(x => [x.period, x.action, x.target, x.source]),
  [[3, 'cancel', '2-5', '교사 수정'], [3, 'add', '2-7', '교사 수정']]);
assert.equal(ex[0].group, ex[1].group, 'A change is stored as one cancel+add pair');
r = T.resolveDay({base, exceptions: ex}, '2026-11-12');
assert.deepEqual(r.slots.map(s => s.period + ':' + s.target + ':' + s.origin), ['3:2-7:teacher']);
assert.equal(r.editedPeriods[3], true);
assert.equal(T.resolveDay({base, exceptions: ex}, '2026-11-19').slots[0].target, '2-5', 'Edits apply to that date only');

ex = T.editCell(ex, '2026-11-12', 1, {type: 'add', target: '3-1'});
ex = T.editCell(ex, '2026-11-09', 2, {type: 'cancel', original: '2-1'});
r = T.resolveDay({base, exceptions: ex}, '2026-11-12');
assert.deepEqual(r.slots.map(s => s.period + ':' + s.target), ['1:3-1', '3:2-7']);
assert.equal(T.resolveDay({base, exceptions: ex}, '2026-11-09').slots.length, 0);

/* core-v06 lesson counting sees the same edits */
assert.equal(V6.teachingSlotsForDate(base, [], ex, '2-5', '2026-11-12').length, 0);
assert.equal(V6.teachingSlotsForDate(base, [], ex, '2-7', '2026-11-12').length, 1);
assert.equal(V6.teachingSlotsForDate(base, [], ex, '2-1', '2026-11-09').length, 0);

const reverted = T.editCell(ex, '2026-11-12', 3, {type: 'revert'});
assert.equal(reverted.length, ex.length - 2, 'Revert removes only that cell');
assert.equal(T.resolveDay({base, exceptions: reverted}, '2026-11-12').slots.find(s => s.period === 3).target, '2-5');
const replacedAgain = T.editCell(ex, '2026-11-12', 3, {type: 'replace', original: '2-5', target: '2-8'});
assert.equal(replacedAgain.filter(x => x.date === '2026-11-12' && x.period === 3).length, 2, 'Re-editing replaces, never stacks');
assert.deepEqual(T.editCell(ex, '2026-11-12', 3, {type: 'replace', original: '2-5', target: '2-5'}).filter(x => x.period === 3 && x.date === '2026-11-12'), []);
assert.throws(() => T.editCell([], '2026-11-12', 3, {type: 'replace', original: '2-5', target: ''}), /반을 입력/);
assert.throws(() => T.editCell([], '2026-11-12', 3, {type: 'cancel', original: ''}), /바꿀 수업이 없/);
assert.throws(() => T.editCell([], 'x', 3, {type: 'add', target: '2-1'}), /날짜/);
assert.throws(() => T.editCell([], '2026-11-12', 12, {type: 'add', target: '2-1'}), /교시/);

/* ---- home summary ---- */
assert.deepEqual(T.summary(T.resolveDay({base, exceptions: ex}, '2026-11-12')),
  {value: '1·3교시', note: '2개 · 기본 시간표 · 교사 수정 포함'});
assert.equal(T.summary(T.resolveDay({liveWeeks: {'2026-11-02': lastWeek}}, '2026-11-12')).note, '2개 · 11/02 주 기준 · 변경 확인 필요');
assert.equal(T.summary(T.resolveDay({}, '2026-11-12')).value, '시간표 없음');
assert.equal(T.summary(T.resolveDay({base}, '2026-11-14')).value, '주말');

/* ---- wiring, privacy and stability guards ---- */
const loader = read('index.html');
const js = read('teacher-today-v70.js');
const css = read('teacher-today-v70.css');
assert(loader.includes('teacher-today-v70.js?v=70.0-today-first'), 'v70 runtime must be wired with a cache version');
assert(loader.includes('teacher-today-v70.css?v=70.0-today-first'), 'v70 style must be wired with a cache version');
assert(loader.lastIndexOf('teacher-today-v70.js') > loader.lastIndexOf('teacher-workflow-v66.js'), 'v70 runs after v66 builds the shell');
assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|script\.google|sheets\.googleapis|IMPORTRANGE|studentCache|getStudentDetail/,
  'v70 must not make network calls or touch private student data');
assert.doesNotMatch(js, /localStorage\.(?:setItem|getItem)\(['"](?!myTeacherOS\.v01)/, 'v70 stores nothing outside the existing app state');
const flatCss = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{/g, '');
for (const rule of flatCss.split('}')) {
  const selectorGroup = rule.split('{')[0].trim();
  if (!selectorGroup) continue;
  for (const selector of selectorGroup.split(',').map(x => x.trim())) {
    assert(/body\.teacher70-mode/.test(selector) || /\.t70-/.test(selector),
      'Overrides of existing screens must be scoped to body.teacher70-mode: ' + selector);
  }
}
assert.match(read('app-v05.js'), /function renderHealth\(y\)\{\n if\(!y\|\|!\$\('#healthGrid'\)\)return;/,
  'First run (no school year) must not abort self-tests and policy loading');
const base5 = read('app-v05.html');
assert.doesNotMatch(base5, /<script src="https:\/\/cdn\.jsdelivr\.net/, 'External libraries must not block boot');
assert.equal((base5.match(/<script async src="https:\/\/cdn\.jsdelivr\.net/g) || []).length, 3);
assert.match(read('app-v36.js'), /if\(!D\.validToken\(settings\(\)\.token\)\)\{setStatus\(/, 'No 127.0.0.1 probe before pairing');
assert.match(read('app-v47.js'), /if\(!manual&&!bridgePaired\(\)\)\{render\(\);return\}/, 'Background bridge checks only after pairing');
assert(loader.includes('app-v36.js?v=46.1-paired-probe') && loader.includes('app-v44.js?v=46.1-paired-probe'), 'Changed bridge layers bust cache');
assert(read('app-v44.js').includes("app.src='app-v47.js?v=47.1-paired-probe'"), 'Changed health layer busts cache');
console.log('v70 today-first timetable, per-day edits, fallback sources, stability guards PASS');
