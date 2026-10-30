'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {auditAudio,BASELINE}=require('../scripts/public-audio-privacy-guard.cjs');
const files=Object.keys(BASELINE);
const hashes={...BASELINE};
const credits={sounds:Object.fromEntries(files.map((path,i)=>[
  String(i),{url:path.slice('lessons/orchestra-timbre/'.length),source:'https://commons.wikimedia.org/wiki/File:Illustrative_Instrument'}
]))};
test('existing fixed classroom audio and source references pass',()=>{
  assert.deepEqual(auditAudio(files,hashes,credits),[]);
});
test('new private recording cannot be committed',()=>{
  assert.match(auditAudio([...files,'student-recording.wav'],hashes,credits).join(' '),/Unapproved audio/);
});
test('webm audio is covered as well',()=>{
  assert.match(auditAudio([...files,'private-voice.webm'],hashes,credits).join(' '),/Unapproved audio/);
});
test('replacement bytes cannot disguise as approved instrument audio',()=>{
  const changed={...hashes,[files[0]]:'0'.repeat(40)};
  assert.match(auditAudio(files,changed,credits).join(' '),/bytes changed/);
});
test('attribution or approved file cannot silently disappear',()=>{
  const missing={sounds:{...credits.sounds}};
  delete missing.sounds['0'];
  assert.match(auditAudio(files,hashes,missing).join(' '),/attribution missing/);
  assert.match(auditAudio(files.slice(1),hashes,credits).join(' '),/asset missing/);
});
test('new manifest entry cannot whitelist additional audio',()=>{
  const extra={sounds:{...credits.sounds,unexpected:{url:'assets/additional.mp3',source:'https://commons.wikimedia.org/wiki/File:Test'}}};
  assert.match(auditAudio(files,hashes,extra).join(' '),/Unapproved audio declared/);
});
