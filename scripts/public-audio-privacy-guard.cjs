/* Repository privacy guard: allow only exact existing public classroom audio.
 * Fingerprints are a privacy preservation baseline, NOT a copyright license grant.
 * New/changed audio (including .webm) is rejected until separately reviewed.
 */
'use strict';
const fs=require('node:fs');
const cp=require('node:child_process');
const BASELINE=Object.freeze({
  "lessons/orchestra-timbre/assets/bass.mp3": "7ede79cee89c20d9592cde7fb08855378246dc26",
  "lessons/orchestra-timbre/assets/bassoon.mp3": "cb5446aa7372c32d15f65b1eb8e255ec7fa7e027",
  "lessons/orchestra-timbre/assets/cello.mp3": "b4c9cf71e3242c87c52ee6175cf1809c82db0357",
  "lessons/orchestra-timbre/assets/clarinet.mp3": "8eb23048642def6b2a8ab8633001972ecd3216ba",
  "lessons/orchestra-timbre/assets/flute.mp3": "523a4d4a1028b777a0e5e7b40d8a2b7019a0767f",
  "lessons/orchestra-timbre/assets/horn.mp3": "1090f046c8caedcd31b10729ffe1e62c79626062",
  "lessons/orchestra-timbre/assets/oboe.mp3": "5473e9dbf6169b4a319dede5e97c1c97d9ca065f",
  "lessons/orchestra-timbre/assets/snare.ogg": "70131a7198dcd95c26adf656a66195c41b1e9af8",
  "lessons/orchestra-timbre/assets/timpani.wav": "e62ee0751254708c355a716680de8199b3fd9b2b",
  "lessons/orchestra-timbre/assets/trombone.mp3": "2b3247d03f2097124fd485a149d51c52979f6c9d",
  "lessons/orchestra-timbre/assets/trumpet.ogg": "26fc3e098920f722d7360b060ce591de8420d8b5",
  "lessons/orchestra-timbre/assets/tuba.webm": "f2197efe2f251cc3b13cd0b2325a2587a1b5e073",
  "lessons/orchestra-timbre/assets/viola.ogg": "5511673c6179a4c7ce446faeefdd00a0ada5f860",
  "lessons/orchestra-timbre/assets/violin.ogg": "d6e51a79b96405746347500565455b256d1e1c5d"
});
const AUDIO_RE=/\.(?:m4a|mp3|wav|aac|ogg|webm)$/i;
const PREFIX='lessons/orchestra-timbre/';
function auditAudio(files,hashes,credits){
  const failures=[];
  const soundEntries=Object.values((credits&&credits.sounds)||{});
  const byPath=new Map();
  for(const record of soundEntries){
    const path=PREFIX+String(record&&record.url||'');
    if(byPath.has(path))failures.push('Duplicate declared educational audio path');
    byPath.set(path,record);
  }
  for(const path of files.filter(f=>AUDIO_RE.test(f))){
    const expected=BASELINE[path];
    if(!expected){failures.push('Unapproved audio in public repo: '+path);continue;}
    if(hashes[path]!==expected){failures.push('Existing audio bytes changed: '+path);continue;}
    const credit=byPath.get(path);
    if(!credit || !/^https:\/\/(?:philharmonia\.co\.uk\/resources\/sound-samples\/|commons\.wikimedia\.org\/wiki\/File:)/.test(String(credit.source||''))){
      failures.push('Audio source attribution missing or unrecognized: '+path);
    }
  }
  for(const path of Object.keys(BASELINE)){
    if(!files.includes(path))failures.push('Approved classroom asset missing: '+path);
  }
  for(const path of byPath.keys()){
    if(!Object.hasOwn(BASELINE,path))failures.push('Unapproved audio declared in source manifest: '+path);
  }
  return failures;
}
if(require.main===module){
  try{
    const files=cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
    const audio=files.filter(f=>AUDIO_RE.test(f));
    const hashes={};
    for(const file of audio)hashes[file]=cp.execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim();
    const credits=JSON.parse(fs.readFileSync(PREFIX+'asset-credits.json','utf8'));
    const failures=auditAudio(files,hashes,credits);
    if(failures.length){for(const x of failures)console.error(x);process.exitCode=1;}
    else console.log('PASS: classroom audio bytes and provenance pinned; any new public audio blocked.');
  }catch(e){console.error('Privacy guard could not verify the repository audio baseline.');process.exitCode=1;}
}
module.exports={auditAudio,BASELINE};
