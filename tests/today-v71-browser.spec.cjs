/* Public Teacher OS v71 smoke, using fictional local-only data.
 * Never accesses a live Google Apps Script endpoint or student records. */
const {test, expect} = require('@playwright/test');
test.use({baseURL:'http://127.0.0.1:4173', serviceWorkers:'block'});
const sizes=[{width:1440,height:900},{width:1920,height:1080},{width:1024,height:768},{width:390,height:844}];
const now=new Date('2026-11-12T01:00:00Z');
const seed=async(page)=>page.addInitScript(()=>{
  const y={year:2026,schoolLevel:'중학교',schoolName:'가상중학교',educationOffice:'경기도교육청',subjects:['음악'],projects:[],clubs:[],
  assessments:[{id:'test-assessment',name:'가상 음악평가',due:'2026-11-16'}],memories:[],tasks:[{id:'mock-task',text:'가상 업무',done:false,due:'2026-11-13'}],
  calendarEvents:[{id:'mock-event',title:'가상 학사일정',date:'2026-11-16'}],timetable:[],timetableExceptions:[],imports:[],periodTimes71:{}};
  localStorage.setItem('myTeacherOS.v01',JSON.stringify({version:21,currentYear:2026,profile:{major:'음악',minutes:45},years:{'2026':y}}));
});
for(const size of sizes){
 for(const scenario of ['first-run','fictional-data']){
  test(`${size.width}x${size.height} ${scenario}: four cards, five original nav items, no public student data or overflow`,async({page})=>{
   await page.setViewportSize(size);await page.clock.setFixedTime(now);
   await page.route(/cdn\.jsdelivr\.net/,route=>route.abort());
   const errors=[];page.on('pageerror',err=>errors.push(err.message));
   if(scenario==='fictional-data')await seed(page);
   await page.goto('/?mode=tools',{waitUntil:'domcontentloaded'});
   await expect(page.locator('body')).toHaveClass(/teacher71-mode/,{timeout:30000});
   await expect(page.locator('#os65Home .os65-quick-card')).toHaveCount(4);
   await expect(page.locator('#nav button[data-os66-category]')).toHaveCount(5);
   if(scenario==='first-run'){
     // v71.2: first run shows only the setup steps, never empty data panels.
     await expect(page.locator('#th71Workspace')).toBeHidden();
   }else{
     await expect(page.locator('#th71Progress')).toBeVisible();
     await expect(page.locator('#th71Today')).toBeVisible();
     await expect(page.locator('#th71Alerts')).toBeVisible();
     await expect(page.locator('#th71ProgressList')).toContainText('연결 필요');
   }
   await expect(page.locator('#th71Profile')).toHaveCount(1);
   await expect(page.locator('#os65LessonValue')).toHaveCount(1);
   await expect(page.locator('#os66SettingsButton')).toHaveCount(1);
   await expect(page.locator('#os65TaskForm')).toHaveCount(1);
   await expect(page.locator('#os70Today')).toHaveCount(1);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   expect(await page.locator('body').innerText()).not.toMatch(/홍길동|김철수|박영희|202601\d{3}/);
   if(scenario==='first-run') {
     await expect(page.locator('#os66Setup')).toBeVisible();
     await expect(page.locator('#os65Home .os65-quick')).toBeHidden();
   } else if(size.width===1440) {
     const y=(await page.locator('#os65Home .os65-quick').boundingBox()).y;
     expect(y).toBeLessThan(900);
   }
   await page.locator('#th71Profile summary').click();
   await expect(page.locator('#yearSelect')).toBeVisible();
   await expect(page.locator('#newYear')).toBeVisible();
   expect(errors).toEqual([]);
  });
 }
}
test('fictional-data: existing 5-section navigation and year controls remain functional',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.clock.setFixedTime(now);await page.route(/cdn\.jsdelivr\.net/,r=>r.abort());await seed(page);
  await page.goto('/?mode=tools',{waitUntil:'domcontentloaded'});
  await expect(page.locator('body')).toHaveClass(/teacher71-mode/,{timeout:30000});
  await page.locator('#nav button[data-os66-category="lesson"]').click();
  await expect(page.locator('#timetable')).toHaveClass(/active/);
  await page.locator('#nav button[data-os66-category="home"]').click();
  await expect(page.locator('#th71Today')).toBeVisible();
  await page.locator('#th71Profile summary').click();
  await page.locator('#th71PeriodButton').click();
  await expect(page.locator('#th71Periods')).toBeVisible();
  await page.locator('[data-th71-period="1"][data-th71-kind="start"]').fill('09:00');
  await page.locator('[data-th71-period="1"][data-th71-kind="end"]').fill('09:45');
  await page.locator('#th71PeriodsSave').click();
  expect(await page.evaluate(()=>cur().periodTimes71['1'])).toEqual({start:'09:00',end:'09:45'});
});
// v71.2: class-level assessment aggregate (no student identities) on the public home.
const seedSummary=async(page)=>page.addInitScript(()=>{
  if(sessionStorage.getItem('v712'))return;sessionStorage.setItem('v712','1');
  const classes=[];for(let i=1;i<=9;i++)classes.push({id:'2-'+i,grade:2,missing:[0,i===2?3:0,1,0],alertType:i===3?'긴급':''});
  for(let i=4;i<=9;i++)classes.push({id:'3-'+i,grade:3,missing:[0,0,0,2],alertType:''});
  const y={year:2026,schoolLevel:'중학교',schoolName:'가상중학교',educationOffice:'경기도교육청',subjects:['음악'],projects:[],clubs:[],
   assessments:[{id:'a2',name:'2차 리듬 창작',target:'2학년',due:'2026-11-17'}],memories:[],tasks:[],calendarEvents:[],timetable:[],timetableExceptions:[],imports:[],
   studentRecords:[{id:'r1',studentId:'s1',text:'가상 관찰'}],
   classSummary71:{classes,importedAt:'2026-11-12T00:30:00.000Z',source:'Google 집계표',savedAt:'2026-11-12T00:30:00.000Z'}};
  localStorage.setItem('myTeacherOS.v01',JSON.stringify({version:21,currentYear:2026,profile:{major:'음악',minutes:45},years:{'2026':y}}));
});
test('class aggregate: per-class, per-round unscored counts and totals, never student identities',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.clock.setFixedTime(now);await page.route(/cdn\.jsdelivr\.net/,r=>r.abort());
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await seedSummary(page);
  await page.goto('/?mode=tools',{waitUntil:'domcontentloaded'});
  await expect(page.locator('body')).toHaveClass(/teacher71-mode/,{timeout:30000});
  await expect(page.locator('#th71ProgressList tbody tr')).toHaveCount(9);
  await expect(page.locator('#th71ProgressList tbody tr').nth(1)).toContainText('미채점 3명');
  await expect(page.locator('#th71ProgressList tbody tr').nth(2)).toContainText('긴급');
  // total = grade 2: 9 (3rd round) + 3 (2nd round, 2-2) ; grade 3: 6 x 2 = 12 → 24
  await expect(page.locator('#os65Home .os65-quick-card').nth(1)).toContainText('24');
  await expect(page.locator('#th71AlertList')).toContainText('미채점 기록 24건 (학생 수 아님)');
  await expect(page.locator('#os65Home .os65-quick-card').nth(1)).toContainText('건');
  await expect(page.locator('#th71ProgressList tbody tr').first()).toContainText('미채점 0명');
  await expect(page.locator('#th71ProgressList')).not.toContainText('완료');
  await expect(page.locator('#th71RecentBody')).toContainText('미채점 3명');
  await page.locator('[data-th71-grade="3"]').click();
  await expect(page.locator('#th71ProgressList tbody tr')).toHaveCount(6);
  const cleaned=await page.evaluate(()=>JSON.stringify(TeacherOSHome71.cleanSummary({classes:[{id:'2-1',grade:2,missing:[1,0,0,0],alertType:'긴급',students:['가상학생'],name:'가상학생',scores:[90]},{id:'9-9',missing:[0,0,0,0]}],importedAt:'2026-11-12T00:00:00Z',source:'google'})));
  expect(cleaned).not.toContain('가상학생');
  expect(cleaned).not.toContain('scores');
  expect(cleaned).not.toContain('9-9');
  expect(errors).toEqual([]);
});
test('class aggregate from the v54 summary is kept for the school year, not lost on reload',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await page.clock.setFixedTime(now);await page.route(/cdn\.jsdelivr\.net/,r=>r.abort());
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('v712b'))return;sessionStorage.setItem('v712b','1');
    const y={year:2026,schoolLevel:'중학교',schoolName:'가상중학교',educationOffice:'경기도교육청',subjects:['음악'],projects:[],clubs:[],assessments:[],memories:[],tasks:[],calendarEvents:[],timetable:[],timetableExceptions:[],imports:[]};
    localStorage.setItem('myTeacherOS.v01',JSON.stringify({version:21,currentYear:2026,profile:{major:'음악',minutes:45},years:{'2026':y}}));
  });
  await page.goto('/?mode=tools',{waitUntil:'domcontentloaded'});
  await expect(page.locator('body')).toHaveClass(/teacher71-mode/,{timeout:30000});
  await page.evaluate(()=>{const classes=[];for(let i=1;i<=9;i++)classes.push({id:'2-'+i,grade:2,missing:[1,0,0,0],alertType:''});for(let i=4;i<=9;i++)classes.push({id:'3-'+i,grade:3,missing:[0,0,0,0],alertType:''});
    TeacherOSMusic54.summary=()=>({classes,importedAt:'2026-11-12T00:50:00.000Z',source:'csv'});TeacherOSHome71.refresh()});
  await expect(page.locator('#os65Home .os65-quick-card').nth(1)).toContainText('9');
  expect(await page.evaluate(()=>cur().classSummary71.classes.length)).toBe(15);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('body')).toHaveClass(/teacher71-mode/,{timeout:30000});
  await expect(page.locator('#th71ProgressFoot')).toContainText('CSV 집계 파일 기준');
});
