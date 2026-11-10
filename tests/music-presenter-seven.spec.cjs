const {test,expect}=require('@playwright/test');
const ids=['orchestra-timbre','rhythm-lab','dynamics-expression','gayageum-observation','vocal-breath-phrasing','bali-gamelan-archive','arirang-vocal'];
const base=process.env.MUSIC_HYBRID_BASE_URL||'http://127.0.0.1:4173';
for (const id of ids){
  test.describe('MY MUSIC CLASS full hybrid · '+id,()=>{
    test('11 real slides, exact 45 minutes, active learning and full navigation',async({page})=>{
      await page.setViewportSize({width:1440,height:900});
      await page.route(/https:\/\/(?:www\.youtube|www\.youtube-nocookie|upload\.wikimedia|oramics\.github)\./,r=>r.abort());
      const failures=[];page.on('pageerror',e=>failures.push(e.message));
      const resp=await page.goto(base+'/lessons/'+id+'/?mode=present',{waitUntil:'domcontentloaded'});
      expect(resp?.status()).toBe(200);
      const r=await page.request.get(base+'/lessons/'+id+'/deck.json');expect(r.ok()).toBeTruthy();
      const d=await r.json();expect(d.slides.length).toBe(11);
      expect(d.slides.reduce((n,x)=>n+x.min,0)).toBe(45);
      expect(d.slides.reduce((n,x)=>n+x.music,0)).toBeGreaterThanOrEqual(23);
      await expect(page.locator('body')).toHaveClass(/music-hybrid-open/);
      const deck=page.locator('#music-hybrid-deck');await expect(deck).toBeVisible();
      await expect(deck.locator('.hd-stage-info')).toContainText('0~'+d.slides[0].min+'분');
      for(let i=0;i<d.slides.length;i++){
        await expect(deck.locator('.hd-title')).toHaveText(d.slides[i].title);
        await expect(deck.locator('[data-hd=total]')).toContainText((i+1)+' / '+d.slides.length);
        await expect(deck.locator('.hd-slide')).toBeVisible();
        const b=await deck.locator('.hd-slide').boundingBox();expect(b).toBeTruthy();
        expect(b.x).toBeGreaterThanOrEqual(-1);
        expect(b.x+b.width).toBeLessThanOrEqual(1441);
        if(i<d.slides.length-1)await deck.locator('[data-hd=next]').click();
      }
      await expect(deck.locator('[data-hd=next]')).toBeDisabled();
      await page.keyboard.press('ArrowLeft');
      await expect(deck.locator('.hd-title')).toHaveText(d.slides[d.slides.length-2].title);
      await page.keyboard.press('n');await expect(deck.locator('.hd-teacher')).toBeVisible();
      await expect(deck.locator('.hd-teacher')).toContainText('교사용');
      await page.keyboard.press('n');await expect(deck.locator('.hd-teacher')).toBeHidden();
      expect(failures,'JavaScript errors').toEqual([]);
    });
    test('phone: full-screen presentation, mode switch preserves original media DOM',async({page})=>{
      await page.setViewportSize({width:390,height:844});
      await page.route(/https:\/\/(?:www\.youtube|www\.youtube-nocookie|upload\.wikimedia|oramics\.github)\./,r=>r.abort());
      const res=await page.goto(base+'/lessons/'+id+'/?mode=present',{waitUntil:'domcontentloaded'});
      expect(res?.status()).toBe(200);
      const deck=page.locator('#music-hybrid-deck');
      await expect(deck).toBeVisible();
      const slide=deck.locator('.hd-slide');const b=await slide.boundingBox();expect(b).toBeTruthy();
      expect(b.x).toBeGreaterThanOrEqual(-1);expect(b.x+b.width).toBeLessThanOrEqual(391);
      await page.evaluate(()=>{window.__oldMedia=document.querySelector('body > audio,body audio,body video')});
      await deck.locator('[data-hd=activity]').click();
      await expect(page.locator('body')).not.toHaveClass(/music-hybrid-open/);
      await expect(page.locator('#music-hybrid-open')).toBeVisible();
      const nav=page.locator('#nav,#steps,#tabs').first();await expect(nav).toBeVisible();
      await page.keyboard.press('m');
      await expect(page.locator('body')).toHaveClass(/music-hybrid-open/);
      await expect(deck).toBeVisible();
      const same=await page.evaluate(()=>!window.__oldMedia || document.contains(window.__oldMedia));
      expect(same,'Original audio/video node was removed').toBeTruthy();
      await deck.locator('[data-hd=next]').click();
      await expect(deck.locator('[data-hd=total]')).toContainText('2 / 11');
    });
    test('interactive quiz answers and embedded media survive a mode switch',async({page})=>{
      await page.route(/https:\/\/(?:www\.youtube|www\.youtube-nocookie|upload\.wikimedia|oramics\.github)\./,r=>r.abort());
      await page.goto(base+'/lessons/'+id+'/?mode=present',{waitUntil:'domcontentloaded'});
      const deck=page.locator('#music-hybrid-deck');
      const data=await (await page.request.get(base+'/lessons/'+id+'/deck.json')).json();
      const mediaIdx=data.slides.findIndex(s=>s.media?.youtube);
      if(mediaIdx>=0){
        await deck.locator('.hd-progress-step').nth(mediaIdx).click();
        const poster=deck.locator('.hd-play');await expect(poster).toBeVisible();await poster.click();
        const iframe=deck.locator('.hd-slide iframe');await expect(iframe).toHaveCount(1);
        await page.evaluate(()=>window.__deckVideo=document.querySelector('#music-hybrid-deck .hd-slide iframe'));
        await deck.locator('[data-hd=activity]').click();await page.keyboard.press('m');
        expect(await page.evaluate(()=>window.__deckVideo===document.querySelector('#music-hybrid-deck .hd-slide iframe'))).toBeTruthy();
      }
      const quizIdx=data.slides.findIndex(s=>s.type==='quiz');
      if(quizIdx>=0){
        await deck.locator('.hd-progress-step').nth(quizIdx).click();
        const choice=deck.locator('.hd-choice').first();await choice.click();
        await expect(choice).toHaveAttribute('data-selected','true');
        await deck.locator('.hd-quiz-actions button').click();
        await expect(deck.locator('.hd-feedback')).not.toBeEmpty();
        await deck.locator('[data-hd=activity]').click();await page.keyboard.press('m');
        await expect(deck.locator('.hd-choice').first()).toHaveAttribute('data-selected','true');
      }
    });
  });
}

for(const id of ids){
  test('storytelling + bright scenes + printable teacher guide · '+id, async ({page})=>{
    await page.setViewportSize({width:1366,height:768});
    await page.route(/https:\/\/(?:www\.youtube|www\.youtube-nocookie|upload\.wikimedia|oramics\.github|commons\.wikimedia)\./,r=>r.abort());
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/lessons/'+id+'/?mode=present',{waitUntil:'domcontentloaded'});
    const data=await(await page.request.get(base+'/lessons/'+id+'/deck.json')).json();
    const deck=page.locator('#music-hybrid-deck');
    await expect(deck.locator('.hd-mission-badge')).toContainText(data.story.role);
    await expect(deck.locator('.hd-story-question')).toHaveText(data.story.hook);
    await expect(deck.locator('.hd-student-cue')).toBeVisible();
    await expect(deck.locator('.hd-slide')).toHaveAttribute('data-story-tone','sun');
    await expect(deck.locator('.hd-slide')).toHaveAttribute('data-layout','quest');
    const tones=new Set(data.slides.map(s=>s.storyTone));expect(tones.size).toBeGreaterThanOrEqual(4);
    const imageIdx=data.slides.findIndex(s=>s.visual&&!s.media);
    expect(imageIdx).toBeGreaterThan(0);
    await deck.locator('.hd-progress-step').nth(imageIdx).click();
    await expect(deck.locator('.hd-hero-figure')).toBeVisible();
    await expect(deck.locator('.hd-hero-figure figcaption')).not.toBeEmpty();
    await expect(deck.locator('.hd-student-cue')).toContainText(data.slides[imageIdx].studentCue);
    await deck.locator('.hd-progress-step').last().click();
    await expect(deck.locator('.hd-story-resolution')).toContainText(data.story.payoff);
    await deck.locator('.hd-progress-step').nth(1).click();
    await page.keyboard.press('n');
    await expect(deck.locator('.hd-teacher a').filter({hasText:'이야기형'})).toBeVisible();
    await page.goto(base+'/lessons/hybrid-v2/teacher-guide.html?lesson='+id,{waitUntil:'domcontentloaded'});
    await expect(page.locator('table tbody tr')).toHaveCount(11);
    await expect(page.locator('.mission')).toContainText(data.story.hook);
    await expect(page.locator('.mission')).toContainText(data.story.payoff);
    expect(errors,'JavaScript errors').toEqual([]);
  });
}

for (const id of ids){
 test('projector readability: no slide content clipped at 1280×720 · '+id, async ({page})=>{
   await page.setViewportSize({width:1280,height:720});
   await page.route(/https:\/\/(?:www\.youtube|www\.youtube-nocookie|upload\.wikimedia|oramics\.github|commons\.wikimedia)\./,r=>r.abort());
   await page.goto(base+'/lessons/'+id+'/?mode=present',{waitUntil:'domcontentloaded'});
   const d=await(await page.request.get(base+'/lessons/'+id+'/deck.json')).json();
   const deck=page.locator('#music-hybrid-deck');
   for(let i=0;i<d.slides.length;i++){
     await expect(deck.locator('.hd-title')).toHaveText(d.slides[i].title);
     const clip=await deck.locator('.hd-slide').evaluate(el=>{
       const stage=el.getBoundingClientRect(),layout=el.querySelector('.hd-layout');
       return [...layout.querySelectorAll('.hd-lead,.hd-side')].filter(x=>{
          if(getComputedStyle(x).display==='none'||x.getClientRects().length===0)return false;
          const b=x.getBoundingClientRect();
          return b.bottom>stage.bottom+2||b.right>stage.right+2||b.left<stage.left-2;
       }).map(x=>({className:x.className,bottom:Math.round(x.getBoundingClientRect().bottom),stageBottom:Math.round(stage.bottom)}));
     });
     expect(clip,id+' slide '+(i+1)+' ('+d.slides[i].title+') clipped').toEqual([]);
     if(i<d.slides.length-1)await deck.locator('[data-hd=next]').click();
   }
 });
}
