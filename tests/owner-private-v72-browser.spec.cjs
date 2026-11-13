/* Protected Apps Script page test with fictional Google responses only. */
const {test,expect}=require('@playwright/test');
test.use({baseURL:'http://127.0.0.1:4173',serviceWorkers:'block'});
const sizes=[{width:1440,height:900},{width:1920,height:1080},{width:1024,height:768},{width:390,height:844}];
async function fakeGoogle(page){
 await page.addInitScript(()=>{
  const classes=[];
  for(let i=1;i<=9;i++)classes.push({id:'2-'+i,grade:2,room:i,missing:[i%3,0,1,0],notice:i===3?'확인 필요':'없음'});
  for(let i=4;i<=9;i++)classes.push({id:'3-'+i,grade:3,room:i,missing:[1,0,1,0],notice:'없음'});
  const counts=[0,1,2,3].map(k=>classes.reduce((v,c)=>v+c.missing[k],0));
  const total=counts.reduce((a,b)=>a+b,0);
  const summary={version:1,classes,totals:{all:total,grade2:classes.filter(c=>c.grade===2).reduce((s,c)=>s+c.missing.reduce((a,b)=>a+b,0),0),grade3:classes.filter(c=>c.grade===3).reduce((s,c)=>s+c.missing.reduce((a,b)=>a+b,0),0),byAssessment:counts,warningClasses:1,urgentClasses:0},readAt:'2026-11-13 09:00:00',readAtType:'조회 시각 (원본 최종 수정 시각 아님)',semesterNotes:{grade2:'2학년 2학기 1~4차 수행평가 · 미채점 현황',grade3:'3학년 1·2차는 1학기 참고 / 3·4차는 2학기 수행평가'},caution:'미채점 0명은 성적 확정을 뜻하지 않습니다.'};
  let ok=null,fail=null;
  const run={withSuccessHandler(cb){ok=cb;return this},withFailureHandler(cb){fail=cb;return this},getDashboardData(){try{ok(summary)}catch(e){fail?.(e)}},getStudentDetail(grade,room){ok({grade,room,classId:`${grade}-${room}`,studentCount:1,readAt:'가상 시각',students:[{number:1,name:'가상학생',scores:[null,null,null,null],statuses:['','','','']}]})}};
  window.google={script:{run,url:{getLocation(cb){cb({parameter:{}})}}}};
 });
}

async function publicScheduleStub(page,fail=false,statusBody={status:'error',category:'collector',detail:'collector-init'}){
 const origin='https://teacherhub-kr.github.io/my-teacher-os/live/';
 const headers={'access-control-allow-origin':'*'};
 await page.route(origin+'comcigan.json',route=>fail?route.abort():route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify({
  version:2,weekStart:'2026-11-02',fetchedAt:'2026-11-02T11:12:01.903Z',
  slots:[{date:'2026-11-06',day:'금',period:2,target:'2-3',subject:'음악'},{date:'2026-11-06',day:'금',period:5,target:'2-2',subject:'음악'}]
 })}));
 await page.route(origin+'comcigan-status.json',route=>fail?route.abort():route.fulfill({status:200,contentType:'application/json',headers,body:JSON.stringify(statusBody)}));
}

for(const size of sizes){
 test(`${size.width}x${size.height}: private redesign retains live aggregate and separate student/record functions`,async({page})=>{
  await page.setViewportSize(size);await page.clock.setFixedTime(new Date('2026-11-13T00:00:00.000Z'));
  await fakeGoogle(page);await publicScheduleStub(page);const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto('/apps-script/music-dashboard/Index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('body')).toHaveClass(/th72-private/,{timeout:15000});
  await expect(page.locator('#th72Side')).toBeVisible();
  await expect(page.locator('.cards>.card')).toHaveCount(4);
  for(const name of ['대상 학급','미채점 합계','점검 알림','긴급 표시']){
    await expect(page.locator('.cards')).toContainText(name);
  }
  await expect(page.locator('#th72LegacyStats')).toHaveCount(0);
  await expect(page.locator('#missing')).toContainText('건');
  await expect(page.locator('#classes')).toContainText('9개 반');
  await expect(page.locator('#results tr')).toHaveCount(9);
  await expect(page.locator('#status')).not.toHaveClass(/error/);
  await expect(page.locator('#status')).not.toContainText(/집계를 읽지 못했습니다|localeCompare/);
  await expect(page.locator('#th72ScheduleStatus')).toContainText('11/02 주 기준');
  await expect(page.locator('#th72ScheduleStatus')).toContainText('변경 확인 필요');
  await expect(page.locator('#th72ScheduleStatus')).toContainText('수집 오류');
  await expect(page.locator('#th72ScheduleList')).toContainText('2교시');
  await expect(page.locator('#th72ScheduleList')).toContainText('2-3 음악');
  await expect(page.locator('#th72ScheduleNote')).toContainText('교사가 그날만 수정한 수업은');
  await expect(page.locator('#th72Notices #attentionList')).toBeVisible();
  await expect(page.locator('#studentsPanel')).toHaveCount(1);
  await expect(page.locator('#recordPanel')).toHaveCount(1);
  await expect(page.locator('#loadStudents')).toHaveCount(1);
  await expect(page.locator('#makeRecord')).toHaveCount(1);
  if(size.width>=1024){
    const g=await page.evaluate(()=>{
      const left=document.querySelector('#th72Columns .th72-left').getBoundingClientRect();
      const right=document.querySelector('#th72Columns .th72-right').getBoundingClientRect();
      const rects=[...document.querySelectorAll('#th72Columns .th72-left > .panel')].map(x=>x.getBoundingClientRect());
      return {left:{right:left.right,bottom:left.bottom},right:{left:right.left,top:right.top},
       within:rects.every(x=>x.right<=left.right+2)};
    });
    expect(g.within,'Left panels must fit their column').toBe(true);
    expect(g.right.left>=g.left.right-2 || g.right.top>=g.left.bottom-2,'No cross-column overlap: '+JSON.stringify(g)).toBe(true);
  }
  await page.locator('.toolbar .tabs button[data-grade="3"]').first().click();
  await expect(page.locator('#results tr')).toHaveCount(6);
  await expect(page.locator('#classes')).toContainText('6개 반');
  await expect(page.locator('#status')).not.toHaveClass(/error/);
  // 2학년 9개 + 3학년 6개 = 실 데이터 형식의 15개 반을 모두 조회한다.
  const overflow = await page.evaluate(() => ({width:innerWidth, scrollWidth:document.documentElement.scrollWidth, nodes:[...document.querySelectorAll('body *')].filter(n => { const r=n.getBoundingClientRect(); const st=getComputedStyle(n);return st.display!=='none' && r.width>0 && r.right>innerWidth+2; }).slice(0,12).map(n=>({tag:n.tagName,id:n.id,className:String(n.className).slice(0,80),right:Math.round(n.getBoundingClientRect().right),width:Math.round(n.getBoundingClientRect().width)}))}));
  expect(overflow.scrollWidth,JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
  expect(errors).toEqual([]);
 });
}
test('student detail is displayed only following authenticated-style explicit class query',async({page})=>{
 await fakeGoogle(page);await page.goto('/apps-script/music-dashboard/Index.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('body')).toHaveClass(/th72-private/);
 await expect(page.locator('#studentRows')).not.toContainText('가상학생');
 await page.locator('#loadStudents').click();
 await expect(page.locator('#studentRows')).toContainText('가상학생');
 await page.locator('#th72Side button[data-th72-target="th72PrivateHero"]').click();
 await expect(page.locator('#th72PrivateHero')).toBeVisible();
});

test('public timetable fetch failure keeps owner-only page working and shows the original public link',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-13T00:00:00.000Z'));
 await fakeGoogle(page);await publicScheduleStub(page,true);
 await page.goto('/apps-script/music-dashboard/Index.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('body')).toHaveClass(/th72-private/);
 await expect(page.locator('#th72ScheduleStatus')).toContainText('연결 실패');
 await expect(page.locator('#th72ScheduleList')).toContainText('공개 컴시간 자료에 접근하지 못했습니다');
 await expect(page.locator('#th72Schedule a[href*="mode=tools"]')).toBeVisible();
 await expect(page.locator('#results tr')).toHaveCount(9);
 await expect(page.locator('#status')).not.toHaveClass(/error/);
});

test('public timetable: the success value written by sync-comcigan.yml ("ok") is shown as healthy',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.clock.setFixedTime(new Date('2026-11-06T01:00:00Z'));
 await fakeGoogle(page);
 await publicScheduleStub(page,false,{status:'ok',category:'ok',detail:'ok',verification:'teacher-class-match'});
 await page.goto('/apps-script/music-dashboard/Index.html');
 await expect(page.locator('#th72ScheduleStatus')).toContainText('수집 정상');
 await expect(page.locator('#th72ScheduleStatus')).not.toContainText('수집 오류');
 const workflow=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','.github','workflows','sync-comcigan.yml'),'utf8');
 expect(workflow).toContain('{"status":"ok"');
});
