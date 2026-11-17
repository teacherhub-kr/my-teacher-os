import fs from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {makePublicTimetable,publicConfigFingerprint,scheduleFailureReason} from './comcigan-teacher-contract.mjs';

const expectedClasses=[
  ...Array.from({length:9},(_,i)=>[2,i+1]),
  ...Array.from({length:6},(_,i)=>[3,i+4])
];
const compact=v=>String(v||'').replace(/\s+/g,'').replace(/\*/g,'');
const subject=v=>compact(v).replace(/^[A-Z]_/,'');

export function digest(subjectName,teacherName,key){
  return createHmac('sha256',Buffer.from(key,'hex')).update(subject(subjectName)+'\0'+compact(teacherName),'utf8').digest('hex');
}
export function compareClass(response,reference,key){
  if(!response||!Array.isArray(response.timetable)||response.timetable.length!==5||!Array.isArray(reference)||reference.length!==5)return false;
  for(let day=0;day<5;day++){
    const data=response.timetable[day]?.items;
    if(!Array.isArray(data)||!Array.isArray(reference[day]))return false;
    const actual=[];
    for(const item of data){
      if(typeof item?.subject!=='string'||typeof item?.teacher!=='string')return false;
      if(subject(item.subject))actual.push(digest(item.subject,item.teacher,key));
    }
    if(actual.length!==reference[day].length||actual.some((x,i)=>x!==reference[day][i]))return false;
  }
  return true;
}
function expectedMonday(){
  const now=new Date(Date.now()+9*3600000);
  now.setUTCDate(now.getUTCDate()-(now.getUTCDay()+6)%7);
  return now.toISOString().slice(0,10);
}
async function main(){
  let outcome='unavailable',numberOfSlots=0;
  try{
    const key=process.env.COMCIGAN_SHADOW_KEY||'';
    if(!/^[0-9a-f]{64}$/.test(key))throw new Error('invalid transient key');
    const config=JSON.parse(await fs.readFile('comcigan-config.json','utf8'));
    const candidate=JSON.parse(await fs.readFile('/tmp/comcigan-dual-candidate.json','utf8'));
    const refs=JSON.parse(await fs.readFile('/tmp/comcigan-dual-hashes.json','utf8'));
    if(candidate.weekStart!==expectedMonday()||!Array.isArray(refs)||refs.length!==15)outcome='invalid-candidate';
    else if(scheduleFailureReason(candidate.slots)!=='ok')outcome='invalid-candidate';
    else{
      const mod=await import('parse-comcigan');
      const Reader=mod.default;
      const code=Number(config.schoolCode);
      const schools=await Reader.search('와부중학교');
      const matches=schools.filter(x=>compact(x.name)==='와부중학교');
      if(matches.length!==1||Number(matches[0].code)!==code)outcome='school-mismatch';
      else{
        const client=new Reader(code);
        let same=true;
        for(let i=0;i<expectedClasses.length;i++){
          const [grade,classNum]=expectedClasses[i];
          const row=refs[i];
          if(row.grade!==grade||row.room!==classNum){same=false;break;}
          const response=await client.timetable({grade,classNum,week:1});
          if(!compareClass(response,row.days,key)){same=false;break;}
        }
        if(!same)outcome='source-mismatch';
        else{
          const fingerprint=publicConfigFingerprint(code,Number(config.teacherIndex),String(config.teacherName||''));
          const valid=makePublicTimetable(candidate.weekStart,new Date().toISOString(),candidate.slots,'match',fingerprint);
          if(!valid)outcome='invalid-candidate';
          else{
            numberOfSlots=valid.slots.length;
            await fs.writeFile('/tmp/comcigan-dual-verified-preview.json',JSON.stringify(valid),{mode:0o600});
            outcome='verified';
          }
        }
      }
    }
  }catch{outcome='unavailable'}
  const allowed=new Set(['verified','source-mismatch','invalid-candidate','school-mismatch','unavailable']);
  process.stdout.write('DUAL_SOURCE_STATUS='+(allowed.has(outcome)?outcome:'unavailable')+'\n');
  if(outcome==='verified')process.stdout.write('DUAL_SOURCE_SLOT_COUNT='+numberOfSlots+'\n');
  process.stdout.write('DUAL_SOURCE_PUBLICATION=blocked\n');
  process.exit(0);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
