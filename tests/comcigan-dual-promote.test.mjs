import test from 'node:test';
import assert from 'node:assert/strict';
import {publicConfigFingerprint} from '../scripts/comcigan-teacher-contract.mjs';
import {validatePromotableCandidate} from '../scripts/comcigan-dual-promote.mjs';

const now=new Date('2026-11-17T09:00:00Z');
const config={enabled:true,schoolCode:12345,teacherIndex:2,teacherName:'가나*'};
function valid() {
  const slots=[{date:'2026-11-16',day:'월',period:2,target:'2-1',subject:'음악',label:'2-1 음악',changed:false,source:'컴시간 자동동기화'},
               {date:'2026-11-17',day:'화',period:3,target:'3-4',subject:'음악',label:'3-4 음악',changed:true,source:'컴시간 자동동기화'}];
  return {version:2,weekStart:'2026-11-16',fetchedAt:'2026-11-17T08:59:00.000Z',
    configFingerprint:publicConfigFingerprint(config.schoolCode,config.teacherIndex,config.teacherName),slots};
}
test('accepts recent KST-current-week public-only teacher timetable',()=>{
  assert.equal(validatePromotableCandidate(valid(),config,now),'ok');
});
test('rejects stale or wrong week snapshots and invalid fingerprint',()=>{
  const old=valid();old.weekStart='2026-11-02';
  assert.equal(validatePromotableCandidate(old,config,now),'wrong-week');
  const stale=valid();stale.fetchedAt='2026-11-16T05:00:00Z';
  assert.equal(validatePromotableCandidate(stale,config,now),'stale-preview');
  const foreign=valid();foreign.configFingerprint='f'.repeat(64);
  assert.equal(validatePromotableCandidate(foreign,config,now),'identity-mismatch');
});
test('refuses student data, non-music lessons, invalid days and simultaneous classes',()=>{
  const pii=valid();pii.slots[0].studentName='PRIVATE STUDENT';
  assert.equal(validatePromotableCandidate(pii,config,now),'invalid-preview');
  const bad=valid();bad.slots[0].subject='국어';bad.slots[0].label='2-1 국어';
  assert.equal(validatePromotableCandidate(bad,config,now),'invalid-preview');
  const mislabeled=valid();mislabeled.slots[0].day='금';
  assert.equal(validatePromotableCandidate(mislabeled,config,now),'invalid-preview');
  const conflict=valid();conflict.slots[1].date='2026-11-16';conflict.slots[1].day='월';conflict.slots[1].period=2;
  assert.equal(validatePromotableCandidate(conflict,config,now),'invalid-preview');
});
