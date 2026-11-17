import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {publicConfigFingerprint, scheduleFailureReason} from './comcigan-teacher-contract.mjs';

const DAYS=['월','화','수','목','금'];
const ROOT_KEYS=['version','weekStart','fetchedAt','configFingerprint','slots'];
const SLOT_KEYS=['date','day','period','target','subject','label','changed','source'];
const validKeys=(value,keys)=>value && typeof value==='object' && !Array.isArray(value) &&
  Object.keys(value).sort().join('|')===keys.slice().sort().join('|');

function todayMonday(now) {
  const kst=new Date(now.getTime()+9*3600000);
  const monday=new Date(Date.UTC(kst.getUTCFullYear(),kst.getUTCMonth(),kst.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
  return monday.toISOString().slice(0,10);
}
export function validatePromotableCandidate(preview,config,now=new Date()) {
  if(!validKeys(preview,ROOT_KEYS) || preview.version!==2 ||
    !config?.enabled || !Number.isSafeInteger(Number(config.schoolCode)) ||
    Number(config.schoolCode)<=0 || !Number.isSafeInteger(Number(config.teacherIndex)) ||
    Number(config.teacherIndex)<=0) return 'invalid-preview';
  const monday=todayMonday(now);
  if(preview.weekStart!==monday)return 'wrong-week';
  const produced=Date.parse(preview.fetchedAt);
  if(!Number.isFinite(produced)||produced>now.getTime()+60_000 || now.getTime()-produced>10*60_000)return 'stale-preview';
  const expectedFingerprint=publicConfigFingerprint(config.schoolCode,config.teacherIndex,config.teacherName);
  if(!expectedFingerprint || expectedFingerprint!==preview.configFingerprint)return 'identity-mismatch';
  if(scheduleFailureReason(preview.slots)!=='ok')return 'invalid-preview';
  for(const slot of preview.slots) {
    if(!validKeys(slot,SLOT_KEYS) || typeof slot.changed!=='boolean' || !slot.subject.includes('음악'))
      return 'invalid-preview';
    const d=new Date(slot.date+'T00:00:00Z');
    const week=new Date(monday+'T00:00:00Z');
    const dayIndex=DAYS.indexOf(slot.day);
    if(dayIndex<0 || !Number.isFinite(d.getTime()) ||
      (d.getTime()-week.getTime())!==dayIndex*86400000) return 'invalid-preview';
  }
  return 'ok';
}
export async function promote(previewPath='/tmp/comcigan-dual-verified-preview.json',
  configPath='comcigan-config.json',livePath='live/comcigan.json') {
  let targetTemporary=null;
  try{
    const [config,preview]=await Promise.all([
      fs.readFile(configPath,'utf8').then(JSON.parse),
      fs.readFile(previewPath,'utf8').then(JSON.parse)
    ]);
    const status=validatePromotableCandidate(preview,config);
    if(status!=='ok')return status;
    try {
      const existing=JSON.parse(await fs.readFile(livePath,'utf8'));
      if(Date.parse(existing?.fetchedAt)>Date.parse(preview.fetchedAt))return 'stale-preview';
    } catch(error) {
      if(error?.code!=='ENOENT')return 'invalid-existing';
    }
    const folder=livePath.slice(0,livePath.lastIndexOf('/'))||'.';
    await fs.mkdir(folder,{recursive:true});
    targetTemporary=livePath+'.verified-'+randomBytes(6).toString('hex')+'.tmp';
    await fs.writeFile(targetTemporary,JSON.stringify(preview,null,2)+'\n',{mode:0o600,flag:'wx'});
    await fs.rename(targetTemporary,livePath);
    targetTemporary=null;
    return 'ok';
  }catch{return 'error';}
  finally {
    if(targetTemporary)try{await fs.unlink(targetTemporary);}catch{}
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=await promote();
  process.stdout.write('DUAL_PROMOTION='+result+'\n');
  if(result!=='ok')process.exitCode=1;
}
