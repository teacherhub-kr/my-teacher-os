import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { bounded, classifyClassResult } from './comcigan-shadow-v2.mjs';

export const EXPECTED_CLASSES = Object.freeze([
  ...Array.from({length:9},(_,i)=>[2,i+1]),
  ...Array.from({length:6},(_,i)=>[3,i+4])
]);
function norm(value){return String(value||'').replace(/\*/g,'').replace(/\s+/g,'').trim();}
export async function inspectCoverage(Reader, code, maskedTeacher, timeoutMs=25000) {
  const identity=norm(maskedTeacher);
  if(identity.length!==2 || !Number.isSafeInteger(code) || code<=0)return 'config-invalid';
  if(typeof Reader!=='function')return 'library-error';
  let client;
  try{client=new Reader(code);}catch{return 'library-error';}
  for(const [grade,classNum] of EXPECTED_CLASSES) {
    let result;
    try {
      result=await bounded(()=>client.timetable({grade,classNum,week:1}),timeoutMs);
    } catch(error){
      if(error instanceof Error && error.message==='deadline')return 'timeout';
      return 'reader-error';
    }
    if(classifyClassResult(result)!=='readable')return 'data-error';
    let count=0;
    for(const day of result.timetable) {
      for(const item of day.items) {
        if(norm(item.teacher)===identity && item.subject.includes('음악'))count++;
      }
    }
    if(count===0)return 'missing-class';
    if(count!==1)return 'ambiguous-class';
  }
  // Class-level coverage ONLY. This parser compresses blank periods,
  // so period numbers and live publication are NOT verified here.
  return 'coverage-15';
}
async function main() {
  let result='unavailable';
  try{
    const config=JSON.parse(await fs.readFile('comcigan-config.json','utf8'));
    if(!config.enabled)result='config-invalid';
    else {
      const module=await import('parse-comcigan');
      result=await inspectCoverage(module.default,Number(config.schoolCode),String(config.teacherName||''));
    }
  } catch {result='unavailable';}
  const allowed=new Set(['coverage-15','config-invalid','library-error','timeout','reader-error','data-error','missing-class','ambiguous-class','unavailable']);
  process.stdout.write('SHADOW_COVERAGE='+ (allowed.has(result)?result:'unavailable')+'\n');
  process.stdout.write('SHADOW_PERIOD_VERIFIED=no\n');
  process.exit(0);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) await main();
