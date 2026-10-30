import test from 'node:test';
import assert from 'node:assert/strict';
import { probeClassReader } from '../scripts/comcigan-class-probe.mjs';
test('only fixed status is returned, never class data',async()=>{
  class Reader {
    async init(){}
    setSchoolCode(n){assert.equal(n,12345)}
    async getTimetable(){return {'2':{'1':{name:'PRIVATE'}}}}
  }
  assert.equal(await probeClassReader(Reader,12345),'ok');
  assert.equal(await probeClassReader(null,12345),'unavailable');
});
test('invalid and error responses are isolated',async()=>{
  class Bad {
    async init(){}
    setSchoolCode(){}
    async getTimetable(){return {secret:'PRIVATE'}}
  }
  class Throws {
    async init(){throw new TypeError('PRIVATE RESPONSE')}
  }
  assert.equal(await probeClassReader(Bad,12345),'invalid-shape');
  assert.equal(await probeClassReader(Throws,12345),'error-exception-typeerror');
});
test('nonresponding class reader returns bounded timeout',async()=>{
  class Hang { async init(){return new Promise(()=>{})} }
  assert.equal(await probeClassReader(Hang,12345,5),'timeout');
});
