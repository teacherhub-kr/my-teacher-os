import test from 'node:test';
import assert from 'node:assert/strict';
import {digest,compareClass} from '../scripts/comcigan-shadow-compare-js.mjs';

const KEY='a'.repeat(64);
test('HMAC digest hides all teacher and class data',()=>{
  const output=digest('음악','가나*',KEY);
  assert.match(output,/^[0-9a-f]{64}$/);
  assert.doesNotMatch(output,/가나|음악/);
});
test('five day ordered content matches independently parsed digest',()=>{
  const input={timetable:Array.from({length:5},()=>({items:[{subject:'음악',teacher:'가나*'}]}))};
  const signed=Array.from({length:5},()=>[digest('음악','가나*',KEY)]);
  assert.equal(compareClass(input,signed,KEY),true);
  assert.equal(compareClass(input,[...signed.slice(0,4),[]],KEY),false);
});
