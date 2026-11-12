/* Protected Apps Script page test with fictional Google responses only. */
const {test,expect}=require('@playwright/test');
test.use({baseURL:'http://127.0.0.1:4173',serviceWorkers:'block'});
const sizes=[{width:1440,height:900},{width:1920,height:1080},{width:1024,height:768},{width:390,height:844}];
async function fakeGoogle(page){
 await page.addInitScript(()=>{
  const classes=[];
  for(let i=1;i<=9;i++)classes.push({grade:2,room:i,missing:[i%3,0,1,0],notice:i===3?'확인 필요':'없음'});
  for(let i=4;i<=9;i++)classes.push({grade:3,room:i,missing:[1,0,1,0],notice:'없음'});
  const summary={classes,readAt:'가상 시각',readAtType:'가상 데이터',semesterNotes:{grade2:'가상 2학년',grade3:'가상 3학년'},caution:'가상 데이터이며 실제 성적이 아닙니다.'};
  let ok=null,fail=null;
  const run={withSuccessHandler(cb){ok=cb;return this},withFailureHandler(cb){fail=cb;return this},getDashboardData(){try{ok(summary)}catch(e){fail?.(e)}},getStudentDetail(grade,room){ok({grade,room,classId:`${grade}-${room}`,studentCount:1,readAt:'가상 시각',students:[{number:1,name:'가상학생',scores:[null,null,null,null],statuses:['','','','']}]})}};
  window.google={script:{run,url:{getLocation(cb){cb({parameter:{}})}}}};
 });
}
for(const size of sizes){
 test(`${size.width}x${size.height}: private redesign retains live aggregate and separate student/record functions`,async({page})=>{
  await page.setViewportSize(size);await fakeGoogle(page);const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto('/apps-script/music-dashboard/Index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('body')).toHaveClass(/th72-private/,{timeout:15000});
  await expect(page.locator('#th72Side')).toBeVisible();
  await expect(page.locator('.cards>.card')).toHaveCount(4);
  await expect(page.locator('#missing')).toContainText('건');
  await expect(page.locator('#classes')).toContainText('개 반');
  await expect(page.locator('#th72Notices #attentionList')).toBeVisible();
  await expect(page.locator('#studentsPanel')).toHaveCount(1);
  await expect(page.locator('#recordPanel')).toHaveCount(1);
  await expect(page.locator('#loadStudents')).toHaveCount(1);
  await expect(page.locator('#makeRecord')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
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