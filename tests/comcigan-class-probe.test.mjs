import test from 'node:test';
import assert from 'node:assert/strict';
import { probeClassReader, classifyMusicTeacherCoverage } from '../scripts/comcigan-class-probe.mjs';
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

test('matches teacher prefix only with 15 individually validated music classes',()=>{
  const book={2:{},3:{}};
  const ids=[...Array.from({length:9},(_,i)=>[2,i+1]),...Array.from({length:6},(_,i)=>[3,i+4])];
  ids.forEach(([grade,room],i)=>{
    book[grade][room]={'1':{[String(i+1)]:{grd:grade,cls:room,teacher:'가나',subject:'음악'}}};
  });
  // Each teacher period must be 1..9, so overflow must fail closed.
  assert.equal(classifyMusicTeacherCoverage(book,'가나*'),'partial');
  ids.forEach(([grade,room],i)=>{
    book[grade][room]={'1':{[String((i%8)+1)]:{grd:grade,cls:room,teacher:'가나',subject:'음악'}}};
  });
  assert.equal(classifyMusicTeacherCoverage(book,'가나*'),'ambiguous');
  assert.equal(classifyMusicTeacherCoverage({2:{}},'가나*'),'none');
  assert.equal(classifyMusicTeacherCoverage(book,'가나다'),'invalid-identity');
});
