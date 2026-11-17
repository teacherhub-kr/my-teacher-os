import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyClassResult,probeReader } from '../scripts/comcigan-shadow-v2.mjs';

function sample(teacher='PRIVATE_NAME',subject='음악') {
  return {times:['09:00'],timetable:Array.from({length:5},()=>({total:1,items:[{subject,teacher}]}))};
}
test('accepts only structurally valid five-day class read (never teacher timetable)',()=>{
  assert.equal(classifyClassResult(sample()),'readable');
  assert.equal(classifyClassResult({times:[],timetable:[]}), 'invalid-shape');
  assert.equal(classifyClassResult({times:[],timetable:Array.from({length:5},()=>({total:0,items:[]}))}), 'empty');
  assert.equal(classifyClassResult({times:[],timetable:Array.from({length:5},()=>({total:1,items:[]}))}), 'invalid-shape');
});
test('reads exactly two samples with no publication and returns code only',async()=>{
  const calls=[];
  class Reader {
    constructor(code){assert.equal(code,12345);}
    async timetable(args){calls.push(args);return sample();}
  }
  assert.equal(await probeReader(Reader,12345,100),'both-readable');
  assert.deepEqual(calls,[{grade:2,classNum:1,week:1},{grade:3,classNum:4,week:1}]);
});
test('fails closed without echoing private thrown error contents',async()=>{
  class Failing {
    async timetable(){throw new Error('PRIVATE teacher, grades, upstream response');}
  }
  const outcome=await probeReader(Failing,12345,100);
  assert.equal(outcome,'first-read-failed');
  assert.doesNotMatch(outcome,/PRIVATE|teacher|upstream|grade/);
  assert.equal(await probeReader(null,12345,100),'not-supported');
  assert.equal(await probeReader(Failing,0,100),'config-unavailable');
});
test('bounded first request cannot hang the test runner',async()=>{
  class Hang {async timetable(){return new Promise(()=>{});}}
  assert.equal(await probeReader(Hang,12345,5),'timeout');
});
