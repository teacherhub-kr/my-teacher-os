import test from 'node:test';
import assert from 'node:assert/strict';
import {withCollectorDeadline} from '../scripts/comcigan-deadline.mjs';
test('returns normal results before deadline',async()=>{
  assert.equal(await withCollectorDeadline(()=>Promise.resolve(42),50),42);
});
test('times out an unresponsive operation with sanitized code',async()=>{
  await assert.rejects(withCollectorDeadline(()=>new Promise(()=>{}),5),e=>e.code==='ETIMEDOUT'&& !String(e.message).includes('student'));
});
test('propagates genuine upstream errors',async()=>{
  await assert.rejects(withCollectorDeadline(()=>Promise.reject(Object.assign(new Error('test'),{code:'ECONNRESET'})),50),e=>e.code==='ECONNRESET');
});
