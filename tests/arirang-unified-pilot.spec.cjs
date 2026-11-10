const {test,expect}=require('@playwright/test');
const base=process.env.MUSIC_HYBRID_BASE_URL||'http://127.0.0.1:4173';
const path='/lessons/arirang-vocal/unified-pilot.html';
const titles=['같은 아리랑인데 왜 다르게 들릴까?','아리랑, 아리랑, 아라리요','네 조각을 하나의 노래로','박은 멈추지 않는다','숨 쉬는 곳을 바꾸면?','연주자의 숨을 찾아라','이번엔 우리가 아리랑의 주인공','같은 아리랑, 나만의 표현'];
test.beforeEach(async({page})=>{
 await page.route(/https:\/\/(?:www\.youtube|www\.youtube-nocookie|i\.ytimg)\./,r=>r.abort());
});
test('45-minute story arc, no mode switches, teacher notes, and JS safety',async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(base+path,{waitUntil:'domcontentloaded'});expect(response.status()).toBe(200);
 for(let i=0;i<titles.length;i++){
  await expect(page.locator('#title')).toHaveText(titles[i]);
  await expect(page.locator('#progress')).toContainText((i+1)+' / 8');
  await expect(page.locator('#activity')).toBeVisible();
  if(i<titles.length-1)await page.locator('#next').click();
 }
 await expect(page.locator('#timing')).toContainText('38–45분');
 await expect(page.locator('#next')).toBeDisabled();
 await page.keyboard.press('n');await expect(page.locator('#teacher')).toBeVisible();
 await page.keyboard.press('n');await expect(page.locator('#teacher')).toBeHidden();
 await page.keyboard.press('ArrowLeft');await expect(page.locator('#title')).toHaveText(titles[6]);
 expect(errors).toEqual([]);
});
test('inline official video and original source remain available',async({page})=>{
 await page.goto(base+path);await expect(page.locator('.video button')).toBeVisible();
 await page.locator('.video button').click();
 await expect(page.locator('.video iframe')).toHaveAttribute('src',/youtube-nocookie\.com\/embed\/Cf-fe9N7f-k/);
 await expect(page.locator('a[href="https://www.youtube.com/watch?v=Cf-fe9N7f-k"]')).toBeVisible();
 await page.locator('#next').click();await expect(page.locator('.video iframe')).toHaveCount(0);
});
test('inline practice interactions and progress persist',async({page})=>{
 await page.goto(base+path);
 await page.locator('#next').click();await page.locator('#next').click();
 await page.locator('.stage button').last().click();await expect(page.locator('.stage button[aria-pressed=true]')).toContainText('4 ·');
 await page.locator('#next').click();await page.locator('.stage button').click();await expect(page.locator('.beat span.on')).toHaveCount(1);
 await page.locator('#next').click();await page.getByRole('button',{name:/B · 문장 중간/}).click();
 await expect(page.locator('.stage button[aria-pressed=true]')).toContainText('B ·');
 await page.reload();await expect(page.locator('#title')).toHaveText(titles[4]);await expect(page.locator('.stage button[aria-pressed=true]')).toContainText('B ·');
 await page.locator('#next').click();await page.locator('#next').click();await page.locator('#next').click();
 await expect(page.locator('.stage .large')).toContainText('B');
});
for(const viewport of [{width:1280,height:720},{width:1366,height:768},{width:390,height:844}]){
 test('visible layout fits viewport '+viewport.width+'×'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);await page.goto(base+path);
  for(let i=0;i<titles.length;i++){
   const bad=await page.locator('#scene').evaluate(el=>{
    const bounds=el.getBoundingClientRect();
    const selectors=['#title','#sub','#action','#hint','#activity'];
    return selectors.filter(sel=>{
      const x=el.querySelector(sel);if(!x||getComputedStyle(x).display==='none')return false;
      const b=x.getBoundingClientRect();
      return b.left<bounds.left-3||b.right>bounds.right+3||(innerWidth>=1000&&b.bottom>bounds.bottom+3);
    });
   });
   expect(bad,'slide '+(i+1)).toEqual([]);
   if(i<titles.length-1)await page.locator('#next').click();
  }
 });
}
