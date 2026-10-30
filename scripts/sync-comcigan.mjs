import fs from 'node:fs/promises';
import path from 'node:path';
import { failureKind } from './comcigan-diagnostics.mjs';
import { upstreamFailureFingerprint } from './comcigan-runtime-diag.mjs';
import {resolveTeacherIndex,selectTeacherDays,makePublicTimetable,scheduleFailureReason} from './comcigan-teacher-contract.mjs';
import { probeClassReader } from './comcigan-class-probe.mjs';

function normName(v){return String(v||'').replace(/\s+/g,'').replace(/\*/g,'').trim()}
function nameMatches(a,b){const x=normName(a),y=normName(b);if(!x||!y)return false;return x===y||x.startsWith(y)||y.startsWith(x)}
function kstNow(){return new Date(Date.now()+9*60*60*1000)}
function isoUTC(d){return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`}
function mondayKST(){const d=kstNow(),day=d.getUTCDay();d.setUTCDate(d.getUTCDate()-((day+6)%7));return isoUTC(d)}
function addDays(date,n){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return isoUTC(d)}
function targetFromCls(cls){const n=Number(cls);if(!Number.isFinite(n)||n<101)return'';return `${Math.floor(n/100)}-${n%100}`}
function fail(code){console.error(`TEACHER_OS_CODE=${code}`);process.exit(1)}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Failure categories are sanitized in a separately tested pure module.
async function retryCollector(code,fn){
  const delays=[0,1500,4000],causes=[],safeOrigins=[];
  for(let attempt=0;attempt<delays.length;attempt++){
    if(delays[attempt])await sleep(delays[attempt]);
    try{return await fn(attempt)}
    catch(error){causes.push(failureKind(error));safeOrigins.push(upstreamFailureFingerprint(error))}
  }
  console.error('TEACHER_OS_FAILURE_KINDS='+[...new Set(causes)].join(','));
  console.error('TEACHER_OS_FAILURE_ORIGINS='+[...new Set(safeOrigins)].join(','));
  if (code === 'collector-fetch') {
    const Reader = mod?.Comcigan || mod?.default?.Comcigan;
    const result = await probeClassReader(Reader, SCHOOL_CODE, 12000, TEACHER_NAME);
    console.error('TEACHER_OS_CLASS_PROBE=' + result);
  }
  fail(code);
}
function normalizeTeacherData(raw,weekStart){
  const days=['월','화','수','목','금'],slots=[];
  for(const [dayKey,periods] of Object.entries(raw||{})){
    const dayNum=Number(dayKey);if(dayNum<1||dayNum>5||!periods)continue;
    for(const [periodKey,item] of Object.entries(periods)){
      if(!item||typeof item!=='object'||!item.cls)continue;
      const period=Number(periodKey);if(!period)continue;
      const target=targetFromCls(item.cls);if(!target)continue;
      slots.push({date:addDays(weekStart,dayNum-1),day:days[dayNum-1],period,target,subject:String(item.subject||'수업'),label:`${target} ${String(item.subject||'수업')}`,changed:!!item.changed,source:'컴시간 자동동기화'});
    }
  }
  return slots.sort((a,b)=>a.date.localeCompare(b.date)||a.period-b.period||a.target.localeCompare(b.target));
}

const configPath=path.join(process.cwd(),'comcigan-config.json');
let config;
try{config=JSON.parse(await fs.readFile(configPath,'utf8'))}catch{console.log('Comcigan sync config unavailable; skipping.');process.exit(0)}
if(!config?.enabled){console.log('Comcigan sync disabled.');process.exit(0)}
const SCHOOL_CODE=Number(config.schoolCode||0),PREFERRED_INDEX=Number(config.teacherIndex||0),TEACHER_NAME=String(config.teacherName||'').trim();
if(!SCHOOL_CODE||(!PREFERRED_INDEX&&!TEACHER_NAME))fail('config-invalid');

let mod;
try{mod=await import('comcigan')}catch{fail('parser-import')}
const ComciganTeacher=mod.ComciganTeacher||mod.default?.ComciganTeacher;
if(!ComciganTeacher)fail('parser-export');
let client;
await retryCollector('collector-init',async()=>{client=new ComciganTeacher(SCHOOL_CODE);await client.init();return true});
// v3.0.4 stores teacher name indices on the instance after init(), and
// getTimetable(index) takes a REQUIRED index. The old zero-argument call caused
// a TypeError in dist/comcigan-teacher.js line 137.
const selected=resolveTeacherIndex(client.teacherIndices,PREFERRED_INDEX,TEACHER_NAME);
if(!selected.ok)fail(selected.code);
const selectedIndex=selected.index;
const result=await retryCollector('collector-fetch',async attempt=>{
  if(attempt>0){
    client=new ComciganTeacher(SCHOOL_CODE);
    await client.init();
    const rechecked=resolveTeacherIndex(client.teacherIndices,PREFERRED_INDEX,TEACHER_NAME);
    if(!rechecked.ok || rechecked.index!==selectedIndex)throw new Error('selected teacher changed between attempts');
  }
  return client.getTimetable(selectedIndex);
});
const teacherRaw=selectTeacherDays(result,selectedIndex);
if(!teacherRaw)fail('teacher-data-missing');
const weekStart=mondayKST(),slots=normalizeTeacherData(teacherRaw,weekStart);
if(!slots.length)fail('timetable-empty');
const reason=scheduleFailureReason(slots);
if(reason!=='ok')fail('timetable-'+reason);
const payload=makePublicTimetable(weekStart,new Date().toISOString(),slots);
if(!payload)fail('timetable-validation');
const out=path.join(process.cwd(),'live','comcigan.json');
await fs.mkdir(path.dirname(out),{recursive:true});
await fs.writeFile(out,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(`Comcigan timetable written with ${slots.length} slots.`);
