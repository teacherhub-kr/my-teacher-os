import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPECTED_CLASSES, inspectCoverage } from '../scripts/comcigan-shadow-coverage.mjs';

function result(teacher='가나*',subject='음악'){
  return {times:['09:00'],timetable:Array.from({length:5},(_,i)=>({total:i===0?1:0,items:i===0?[{teacher,subject}]:[]}))};
}
test('exactly 15 target classes: 2-1 through 2-9, 3-4 through 3-9',()=>{
  assert.equal(EXPECTED_CLASSES.length,15);
  assert.equal(new Set(EXPECTED_CLASSES.map(x=>x.join('-'))).size,15);
  assert.deepEqual(EXPECTED_CLASSES[0],[2,1]);
  assert.deepEqual(EXPECTED_CLASSES[14],[3,9]);
});
test('full shadow class coverage has no period/publication claim',async()=>{
  const reads=[];
  class Reader {
    constructor(code){assert.equal(code,12345)}
    async timetable(arg){reads.push(arg);return result();}
  }
  assert.equal(await inspectCoverage(Reader,12345,'가나*',100),'coverage-15');
  assert.equal(reads.length,15);
  assert.ok(reads.every(x=>x.week===1));
});
test('missing or duplicate teacher music sessions fail closed',async()=>{
  class Missing {async timetable(){return result('다라*');}}
  class Duplicate {async timetable(){const r=result();r.timetable[1]={total:1,items:[{teacher:'가나*',subject:'음악'}]};return r;}}
  assert.equal(await inspectCoverage(Missing,12345,'가나*',100),'missing-class');
  assert.equal(await inspectCoverage(Duplicate,12345,'가나*',100),'ambiguous-class');
});
test('identifying errors are never returned',async()=>{
  class Throw {async timetable(){throw new Error('PRIVATE school, teacher, response');}}
  assert.equal(await inspectCoverage(Throw,12345,'가나*',100),'reader-error');
  assert.equal(await inspectCoverage(Throw,12345,'가나다',100),'config-invalid');
});
