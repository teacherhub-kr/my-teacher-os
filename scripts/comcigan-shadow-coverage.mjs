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

export async function inspectCoverageSummary(Reader, code, maskedTeacher, timeoutMs=25000) {
  const identity=norm(maskedTeacher);
  if(identity.length!==2 || !Number.isSafeInteger(code) || code<=0)return {status:'config-invalid',counts:null};
  if(typeof Reader!=='function')return {status:'library-error',counts:null};
  let client;
  try{client=new Reader(code);}catch{return {status:'library-error',counts:null};}
  const counts=[0,0,0];
  for(const [grade,classNum] of EXPECTED_CLASSES) {
    let value;
    try{value=await bounded(()=>client.timetable({grade,classNum,week:1}),timeoutMs);}
    catch(error){return {status:error instanceof Error && error.message==='deadline'?'timeout':'reader-error',counts:null};}
    if(classifyClassResult(value)!=='readable')return {status:'data-error',counts:null};
    let n=0;
    for(const day of value.timetable)for(const item of day.items)
      if(norm(item.teacher)===identity && item.subject.includes('음악'))n++;
    counts[n===0?0:n===1?1:2]++;
  }
  return {status:counts[2]?'ambiguous-class':counts[0]?'missing-class':'coverage-15',counts};
}
export async function verifySchoolCode(Reader, code, schoolName, timeoutMs=25000) {
  if(typeof Reader?.search!=='function' || typeof schoolName!=='string')return 'unsupported';
  try{
    const list=await bounded(()=>Reader.search(schoolName),timeoutMs);
    if(!Array.isArray(list))return 'lookup-error';
    const exact=list.filter(x=>typeof x?.name==='string' && norm(x.name)===norm(schoolName));
    if(exact.length!==1)return 'unconfirmed';
    return Number(exact[0].code)===code?'match':'mismatch';
  }catch{return 'lookup-error';}
}

async function main() {
  let result='unavailable',counts=null,school='unconfirmed';
  try{
    const config=JSON.parse(await fs.readFile('comcigan-config.json','utf8'));
    if(!config.enabled)result='config-invalid';
    else {
      const module=await import('parse-comcigan');
      const code=Number(config.schoolCode);
      const report=await inspectCoverageSummary(module.default,code,String(config.teacherName||''));
      result=report.status;counts=report.counts;
      // Verify code provenance without logging a school name, code or raw response.
      school=await verifySchoolCode(module.default,code,'와부중학교');
    }
  } catch {result='unavailable';}
  const allowed=new Set(['coverage-15','config-invalid','library-error','timeout','reader-error','data-error','missing-class','ambiguous-class','unavailable']);
  const allowedSchool=new Set(['match','mismatch','unconfirmed','unsupported','lookup-error']);
  process.stdout.write('SHADOW_COVERAGE='+(allowed.has(result)?result:'unavailable')+'\n');
  if(counts && counts.length===3 && counts.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=15) && counts.reduce((a,b)=>a+b,0)===15)
    process.stdout.write('SHADOW_MATCH_DISTRIBUTION='+counts.join(',')+'\n');
  process.stdout.write('SHADOW_SCHOOL_CODE='+(allowedSchool.has(school)?school:'unconfirmed')+'\n');
  process.stdout.write('SHADOW_PERIOD_VERIFIED=no\n');
  process.exit(0);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) await main();
