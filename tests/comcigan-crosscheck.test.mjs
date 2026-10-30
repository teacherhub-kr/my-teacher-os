import test from 'node:test';
import assert from 'node:assert/strict';
import {compareTimetableViews} from '../scripts/comcigan-crosscheck.mjs';
const slots=[
  {target:'2-1',day:'월',period:1,subject:'음악',date:'2026-10-26'},
  {target:'2-2',day:'화',period:2,subject:'음악',date:'2026-10-27'}
];
const classRaw={2:{1:{1:{1:{teacher:'가나*',subject:'음악',grd:2,cls:1}}},2:{2:{2:{teacher:'가나*',subject:'음악',grd:2,cls:2}}}}}};
test('two consistent views match even when class count is less than 15',()=>{
  assert.equal(compareTimetableViews(slots,classRaw,'가나*'),'match');
});
test('extra or missing class records fail closed',()=>{
  const missing=structuredClone(classRaw);delete missing[2][2];
  assert.equal(compareTimetableViews(slots,missing,'가나*'),'count-mismatch');
  assert.equal(compareTimetableViews(slots,{},'가나*'),'class-empty');
});
test('subject mismatch, class/period conflict and ambiguous identity are blocked',()=>{
  const changed=structuredClone(classRaw);changed[2][1][1][1].subject='수학';
  assert.equal(compareTimetableViews(slots,changed,'가나*'),'content-mismatch');
  const clash=structuredClone(slots);clash[1].day='월';clash[1].period=1;
  assert.equal(compareTimetableViews(clash,classRaw,'가나*'),'teacher-conflict');
  assert.equal(compareTimetableViews(slots,classRaw,'가'),'identity-invalid');
});
test('other teacher records do not create false positives',()=>{
  const add=structuredClone(classRaw);add[2][3]={3:{3:{teacher:'다라*',subject:'음악'}}};
  assert.equal(compareTimetableViews(slots,add,'가나*'),'match');
});
