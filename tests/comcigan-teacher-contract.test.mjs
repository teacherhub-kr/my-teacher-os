import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTeacherIndex,selectTeacherDays,validateMusicSchedule,makePublicTimetable} from '../scripts/comcigan-teacher-contract.mjs';
test('requires an unambiguous teacher name; uses current index, not stale config',()=>{
  assert.deepEqual(resolveTeacherIndex(['*','가나*','김다*'],1,'가나*'),{ok:true,index:1});
  assert.deepEqual(resolveTeacherIndex(['*','김다*','가나*'],1,'가나*'),{ok:true,index:2});
  assert.equal(resolveTeacherIndex(['*','가나*','가나*'],1,'가나*').code,'teacher-name-multiple');
  assert.equal(resolveTeacherIndex(['*','김다*'],1,'가나*').code,'teacher-name-not-found');
  assert.equal(resolveTeacherIndex(null,1,'가나*').code,'teacher-indices-missing');
  assert.equal(resolveTeacherIndex(['*','가나*'],1,'가').code,'config-invalid');
});
test('reads indexed API shape, not invented data/teacherIndex envelope',()=>{
  const response={2:{1:{1:{cls:201,subject:'음악'}}}};
  assert.deepEqual(selectTeacherDays(response,2),response[2]);
  assert.equal(selectTeacherDays({data:response,teacherIndex:['*','가나*']},2),null);
  assert.equal(selectTeacherDays({2:{}},2),null);
});
function validSlots(){
  const classes=[...Array.from({length:9},(_,i)=>'2-'+(i+1)),...Array.from({length:6},(_,i)=>'3-'+(i+4))];
  return classes.map((target,i)=>({
    date:'2026-10-'+String(26+Math.floor(i/8)).padStart(2,'0'),
    day:i<8?'월':'화',period:(i%8)+1,target,subject:'음악',label:target+' 음악',
    changed:false,source:'컴시간 자동동기화'
  }));
}
test('validates 15 expected classes and rejects partial/duplicates/collisions',()=>{
  const slots=validSlots();
  assert.equal(validateMusicSchedule(slots),true);
  assert.equal(validateMusicSchedule(slots.slice(1)),false);
  const duplicate=structuredClone(slots);duplicate[1].target=duplicate[0].target;
  assert.equal(validateMusicSchedule(duplicate),false);
  const conflict=structuredClone(slots);conflict[1].period=conflict[0].period;
  assert.equal(validateMusicSchedule(conflict),false);
  const wrong=structuredClone(slots);wrong[0].subject='수학';
  assert.equal(validateMusicSchedule(wrong),false);
});
test('public payload is strict and contains no identifying metadata',()=>{
  const slots=validSlots();
  const published=makePublicTimetable('2026-10-26','2026-10-30T10:45:00Z',slots);
  assert.deepEqual(Object.keys(published).sort(),['fetchedAt','slots','version','weekStart']);
  assert.equal('teacherName' in published,false);
  assert.equal('teacherIndex' in published,false);
  assert.equal('schoolCode' in published,false);
  assert.equal(makePublicTimetable('2026-10-26','2026-10-30T10:45:00Z',slots.slice(1)),null);
});
