/* v61: verified live Comcigan view must not fabricate or overwrite timetable. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('app-v14.js','utf8');
const home=fs.readFileSync('teacher-dashboard-v49.js','utf8');
assert(home.includes('TeacherOSComcigan14?.verifiedSlots'), 'home must consume the authenticated live view');
assert(!home.includes('y.timetable.filter'), 'home cannot render stale legacy timetable');
assert(home.includes('검증된 컴시간 시간표에서 오늘 배정된 음악수업이 없습니다'), 'valid zero lessons should say verified zero, not imply a missing connection');
assert(!home.includes('시간표 원본을 연결하거나 현재 학년도를 확인하세요.'), 'verified zero lessons must not imply disconnected timetable');
assert(script.includes('renderVerifiedTimetable()'), 'timetable table must use verified live view');

function weekKST(){
  const date=new Date(Date.now()+9*3600000);
  date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
  return [date.getUTCFullYear(),String(date.getUTCMonth()+1).padStart(2,'0'),
    String(date.getUTCDate()).padStart(2,'0')].join('-');
}
const week=weekKST();
const row={date:week,day:'월',period:1,target:'2-3',subject:'음악',label:'2-3 음악',source:'컴시간 자동동기화'};
const year={
  comciganSync:{status:'ok'},
  liveTimetableWeeks:{
    [week]:{weekStart:week,source:'컴시간 자동동기화',updatedAt:new Date().toISOString(),slots:[row]}
  },
  timetable:[{day:'월',period:1,label:'OLD/SHOULD-NOT-BE-USED'}]
};
const initialTimetable=JSON.stringify(year.timetable);
const stored=new Map([['myTeacherOS.comciganConfig',JSON.stringify({
  enabled:true,schoolCode:12345,teacherIndex:7,teacherName:'가나*'
})]]);
const box={
  document:{
    querySelector(query){return query==='#comciganConfigDlg'?{}:null;},
    body:{insertAdjacentHTML(){throw new Error('unnecessary dialog recreation')}}
  },
  localStorage:{getItem(k){return stored.get(k)||null;},setItem(k,v){stored.set(k,v)}},
  console,
  Date, TextEncoder,
};
box.globalThis=box;
vm.runInNewContext(script,box,{filename:'app-v14.js'});
(async()=>{
  await new Promise(resolve=>setImmediate(resolve)); // let async boot load local config
  const live=box.TeacherOSComcigan14?.verifiedSlots;
  assert.equal(typeof live,'function','v61 live accessor unavailable');
  assert.equal(live(year)?.length,1,'valid fresh live timetable must render');
  assert.equal(live(year)?.[0]?.label,'2-3 음악');
  const coverage=box.TeacherOSComcigan14?.classCoverage;
  assert.equal(typeof coverage,'function','advisory class coverage must exist');
  const expectedClasses=[
    ...Array.from({length:9},(_,i)=>'2-'+(i+1)),
    ...Array.from({length:6},(_,i)=>'3-'+(i+4))
  ];
  const partialTargets=expectedClasses.filter(x=>!['2-2','2-3','2-7'].includes(x));
  const partial=coverage(partialTargets.map(target=>({target})));
  assert.equal(partial.expected,15);
  assert.equal(partial.present,12);
  assert.deepEqual(Array.from(partial.absent),['2-2','2-3','2-7']);
  assert.equal(coverage(expectedClasses.map(target=>({target}))).absent.length,0);
  assert.equal(coverage(null),null,'unverified feed must never be interpreted as zero coverage');
  assert.equal(coverage([{target:'2-1'},{target:'2-1'}]).present,1,'repeat lessons count as one class');
  assert(script.includes('미표시가 곧 수집 오류라는 뜻은 아닙니다'), 'coverage is only advisory');
  assert.equal(JSON.stringify(year.timetable),initialTimetable,'never overwrite old saved timetable');
  year.comciganSync.status='error';
  assert.equal(live(year),null,'collector error must hide live schedule');
  year.comciganSync.status='ok';
  year.liveTimetableWeeks[week].updatedAt=new Date(Date.now()-31*3600000).toISOString();
  assert.equal(live(year),null,'stale timetable must not be presented as current');
  year.liveTimetableWeeks[week].updatedAt=new Date().toISOString();
  year.liveTimetableWeeks[week].slots=[{...row,date:'2020-01-01'}];
  assert.equal(live(year),null,'wrong week classroom dates must be rejected');
  year.liveTimetableWeeks[week].slots=[row,{...row,target:'2-4',label:'2-4 음악'}];
  assert.equal(live(year),null,'two classes in the same period must be rejected');
  year.liveTimetableWeeks[week].slots=[row];
  assert.equal(live(year)?.length,1,'recovery must be possible once corrected');
  console.log('v61 verified home/timetable read-only contract passed');
})().catch(e=>{console.error(e);process.exitCode=1});
