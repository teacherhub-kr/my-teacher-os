import { chromium } from "playwright";

const base = "https://teacherhub-kr.github.io/my-teacher-os/lessons/orchestra-timbre/";
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{width:1480,height:950} });
const bad=[];
page.on("pageerror",e=>bad.push("JS: "+e.message));

async function retry(fn,n=5) {
 let ex;
 for(let i=0;i<n;i++){try{return await fn()}catch(e){ex=e;await page.waitForTimeout(2200)}}
 throw ex;
}
try{
 await retry(()=>page.goto(base+"?v=media-20261023&smoketest="+Date.now(),{waitUntil:"domcontentloaded",timeout:25000}));
 await retry(()=>page.locator("#lesson h1").waitFor({timeout:9000}));
 console.log("FIRST_SCENE:",await page.locator("#lesson h1").textContent());

 let photo=0,sounds=0,playing=0;
 for(let scene=0;scene<9;scene++){
   await page.evaluate(x=>gotoScene(x),scene);
   await page.locator("#lesson h1").waitFor();
   const heading=await page.locator("#lesson h1").textContent();
   console.log("SCENE",scene,heading);
   if(scene>=2&&scene<=5){
     const imgs=page.locator("#lesson .card img");
     const count=await imgs.count();
     if([2,3,4,5][scene-2]===5?count!==2:count!==4){ // explicit case below
     }
     for(let k=0;k<count;k++){
       const im=imgs.nth(k);
       await im.scrollIntoViewIfNeeded();
       await retry(async()=>{
         const state=await im.evaluate(x=>({ready:x.complete,width:x.naturalWidth,url:x.currentSrc}));
         if(!state.ready||state.width<350)throw Error("Image failed: "+JSON.stringify(state));
       });
       photo++;
     }
     const audios=page.locator("#lesson .card audio");
     for(let k=0;k<await audios.count();k++){
       const el=audios.nth(k);
       await retry(async()=>{
         const state=await el.evaluate(async a=>{
           if(a.readyState<1){
             a.preload="auto";a.load();
             await new Promise((yes,no)=>{
               const tid=setTimeout(()=>no(new Error("audio load timeout")),15000);
               a.addEventListener("loadedmetadata",()=>{clearTimeout(tid);yes()}, {once:true});
               a.addEventListener("error",()=>{clearTimeout(tid);no(new Error("audio load error: "+a.currentSrc))},{once:true});
             });
           }
           return {duration:a.duration,currentSrc:a.currentSrc,ready:a.readyState};
         });
         if(!state.ready||state.duration<=0)throw Error("Audio duration bad: "+JSON.stringify(state));
       });
       sounds++;
       try{
         await el.evaluate(async a=>{a.muted=true;await a.play();await new Promise(r=>setTimeout(r,150));a.pause();});
         playing++;
       }catch(e){throw Error("Cannot play audio for scene "+scene+" card "+k+": "+e.message);}
     }
   }
 }
 await page.evaluate(()=>gotoScene(6));
 await page.locator("#lesson button.qbtn").first().click();
 if(!await page.locator("#lesson .note").count())throw Error("Quiz didn't respond");

 // Teacher explanation is intentionally hidden from students by default.
 await page.evaluate(()=>gotoScene(0));
 const guide=page.locator("#teacherPanel");
 const toggle=page.locator("#teacherToggle");
 if(!await toggle.isVisible())throw Error("Teacher guide toggle missing");
 if(await guide.isVisible())throw Error("Teacher guide must start hidden");
 await toggle.click();
 if(!await guide.isVisible())throw Error("Teacher guide failed to open");
 if(!await guide.getByText("교사 발문").count())throw Error("Teacher prompting guidance missing");
 for(let i=0;i<9;i++){
   await page.evaluate(n=>gotoScene(n),i);
   if(!await guide.isVisible())throw Error("Teacher guide hidden unexpectedly on scene "+i);
   const text=(await guide.textContent())||"";
   if(!text.includes("교사 발문")||!text.includes("예상 답변")||!text.includes("지도 유의사항")){
     throw Error("Teacher guide content missing on scene "+i);
   }
 }
 await toggle.click();
 if(await guide.isVisible())throw Error("Teacher guide did not hide on second click");
 if(await toggle.getAttribute("aria-expanded")!=="false")throw Error("Teacher toggle aria-expanded not false");
 console.log("TEACHER_GUIDE: PASS (9 scenes, open/close, default hidden)");

 await page.evaluate(()=>{gotoScene(0);openVideo("Instrument test","zgaQFLUdUL0")});
 const embedded=await page.locator("#videoFrame iframe").getAttribute("src");
 if(!embedded?.includes("youtube.com/embed/"))throw Error("No embedded player");
 if(bad.length)throw Error("Page JavaScript errors: "+JSON.stringify(bad));

 console.log(JSON.stringify({VERDICT:"PASS",photo,sounds,playing,quiz:"pass",videoEmbed:"iframe located",caveat:"YouTube playback restrictions cannot be overridden"}));
 if(photo!==14||sounds!==14||playing!==14)throw Error("Counts incorrect "+JSON.stringify({photo,sounds,playing}));
}catch(e){
 console.error("FAIL:",e.message);
 await page.screenshot({path:"/tmp/orchestra-live-failure.png",fullPage:true}).catch(()=>{});
 process.exitCode=1;
}finally{await browser.close()}
