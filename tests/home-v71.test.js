/* v71.2 public home: class-level aggregates only, no network, scoped styles, cache versions. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const js=read('teacher-home-v71.js'),css=read('teacher-home-v71.css'),loader=read('index.html'),v54=read('music-summary-v54.js');
assert(loader.includes('teacher-home-v71.js?v=71.3-record-counts')&&loader.includes('teacher-home-v71.css?v=71.2-mockup-home'),'changed home busts cache');
assert(loader.includes('music-summary-v54.js?v=55.1-home-summary'),'changed v54 busts cache');
assert(loader.lastIndexOf('teacher-home-v71.js')>loader.lastIndexOf('teacher-today-v70.js'),'v71 runs after v70');
assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|script\.google|googleapis|IMPORTRANGE|getStudentDetail|studentCache/,'home makes no network calls and never reads private student data');
assert.doesNotMatch(js,/localStorage\.setItem/,'home stores nothing outside the existing app state');
assert.doesNotMatch(js,/\.name\s*\+|studentName|students\[|\.scores/,'home never renders student identities or scores');
assert.match(js,/function cleanSummary\(s\)/);
assert.doesNotMatch(js,/pill\('완료'|pill\('채점 완료'/,'zero unscored is shown as a count, never as completion');
assert.match(js,/1~4차 미채점 기록 '\+tot\.total\+'건 \(학생 수 아님\)/,'cross-round totals are records, not students');
assert.match(js,/setKpi\(1,String\(tot\.total\),'건'/,'KPI total is counted in records');
assert.match(js,/\/\^\[23\]-\[1-9\]\$\/\.test/,'only valid class ids survive');
assert.match(js,/n>=0&&n<=45/,'only plausible per-class counts survive');
assert.match(js,/return \{id:String\(c\.id\),grade:/,'aggregate keeps only id, grade, missing counts and alert type');
assert.match(v54,/function summary\(\)\{if\(!snapshot\|\|!Array\.isArray\(snapshot\.classes\)\)return null;return \{classes:snapshot\.classes\.map\(c=>\(\{id:c\.id,grade:c\.grade,missing:c\.missing\.slice\(\),alertType:c\.alertType\}\)\)/,'v54 exposes a class-level copy only');
assert.doesNotMatch(js,/자발적|미참여|결석|태도|(?<!작)성실/,'no attitude or attendance judgements on the home');
const flat=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@media[^{]*\{/g,'');
for(const rule of flat.split('}')){const sel=rule.split('{')[0].trim();if(!sel)continue;
  for(const one of sel.split(',').map(x=>x.trim()))assert(/^body\.teacher71-mode/.test(one),'style must be scoped to body.teacher71-mode: '+one);}
assert.doesNotMatch(css,/@import|url\(\s*['"]?https?:/,'no external fonts or images');
console.log('v71.3 home: class-level only, no network, scoped styles, cache versions PASS');
