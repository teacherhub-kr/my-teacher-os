import { chromium } from "playwright";

// The published catalog is the source of truth. Never hardcode a one-lesson
// layout: the library intentionally grows each time a new lesson is shipped.
const origin=(process.env.MUSIC_LIB_BASE_URL || "http://127.0.0.1:8765").replace(/\/+$/,"");
const remote=!!process.env.MUSIC_LIB_BASE_URL;
const requireMedia=process.env.MUSIC_LIB_REQUIRE_MEDIA==="1";
const mustHave=[
  "orchestra-timbre","rhythm-lab","dynamics-expression",
  "gayageum-observation","vocal-breath-phrasing","bali-gamelan-archive","arirang-vocal"
];
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1366,height:900},acceptDownloads:false});
const errors=[];
page.on("pageerror",e=>{if(page.url().includes("/lessons/"))errors.push(e.message)});
const externalMediaErrors=[];
page.on("requestfailed",req=>{if(req.url().includes("upload.wikimedia.org"))externalMediaErrors.push({url:req.url(),failure:req.failure()})});
page.on("response",response=>{if(response.url().includes("upload.wikimedia.org") && response.status()>=400)externalMediaErrors.push({url:response.url(),status:response.status()})});
function check(ok,message){if(!ok)throw new Error(message)}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function go(path){
 const res=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:35000});
 check(res && res.ok(),"HTTP fail "+path+" status="+res?.status());
 return res;
}
async function waitForDeployedLesson(){
 // Pages deploy runs independently from this smoke workflow on the same push.
 // Wait until the NEW teacher guide exists on the public CDN before asserting.
 for(let attempt=0;attempt<(remote?30:1);attempt++){
  try{
   const res=await page.request.get(origin+"/lessons/arirang-vocal/teacher.html?verify="+Date.now(),{timeout:18000});
   if(res.ok() && (await res.text()).includes("아리랑"))return;
  }catch(e){console.log("WAIT_PAGES "+String(e).slice(0,90))}
  if(attempt<29){console.log("WAIT_PAGES: not published yet, attempt "+(attempt+1));await sleep(10000)}
 }
 throw Error("Pages CDN does not yet include Arirang teacher guide");
}
async function cardCount(){return page.locator("#lessonGroups .card").count()}
try{
 await waitForDeployedLesson();
 await go("/lessons/?smoke="+Date.now());
 await page.waitForFunction(()=>document.querySelector("#resultCount")?.textContent?.includes("전체 공개 수업"),null,{timeout:15000});
 const response=await page.request.get(origin+"/lessons/catalog.json?smoke="+Date.now(),{timeout:20000});
 check(response.ok(),"Catalog HTTP "+response.status());
 const data=await response.json();
 check(data.schemaVersion===1 && Array.isArray(data.lessons),"Catalog invalid");
 const published=data.lessons.filter(x=>x.status==="published");
 const ids=published.map(x=>x.id);
 check(published.length>=7,"Published lessons dropped below seven: "+published.length);
 check(new Set(ids).size===ids.length,"Duplicate lesson id in catalog");
 for(const id of mustHave)check(ids.includes(id),"Missing previously published lesson: "+id);
 await page.waitForFunction(
   n=>document.querySelector("#resultCount")?.textContent?.includes("전체 공개 수업 "+n+"개"),
   published.length,{timeout:15000}
 );
 check(await cardCount()===published.length,"Cards count mismatch: "+await cardCount()+" vs "+published.length);
 check(await page.locator("#sixCollections button[data-collection]").count()===6,"Six categories not available");
 check(await page.locator("#showAllLessons").isVisible(),"All lessons button is missing");
 check((await page.locator("#heroPublishedCount").textContent()).includes(String(published.length)),"Hero published count does not match catalog");
 console.log("CATALOG: "+published.length+" published lessons, 6 category buttons");

 await page.locator("#lessonSearch").fill("가믈란");
 check(await cardCount()===1,"Gamelan lesson not searchable");
 check((await page.locator("#lessonGroups .card h3").innerText()).includes("발리"),"Wrong Gamelan search result");
 await page.locator("#lessonSearch").fill("존재하지않는수업검색");
 check(await cardCount()===0 && await page.locator("#emptyState").isVisible(),"Empty search feedback missing");
 await page.locator("#lessonSearch").fill("");

 await page.locator('#gradeFilters [data-grade="3"]').click();
 check(await cardCount()===published.filter(x=>x.grade===3).length,"Grade 3 filter incorrect");
 await page.locator('#gradeFilters [data-grade="2"]').click();
 check(await cardCount()===published.filter(x=>x.grade===2).length,"Grade 2 filter incorrect");
 await page.locator('#gradeFilters [data-grade="all"]').click();
 await page.locator("#categoryFilter").selectOption("감상");
 check(await cardCount()===published.filter(x=>x.areas.includes("감상")).length,"Appreciation area filter incorrect");
 await page.locator("#categoryFilter").selectOption("all");
 await page.locator('#sixCollections [data-collection="world"]').click();
 check(await cardCount()===1,"World music collection should contain Bali lesson");
 check((await page.locator("#lessonGroups .card .launch").getAttribute("href"))==="bali-gamelan-archive/","World music card launch path");
 await page.locator("#lessonSearch").fill("발리");
 await page.locator("#showAllLessons").click();
 check(await cardCount()===published.length,"Show all button did not restore all lessons");
 check(await page.locator("#lessonSearch").inputValue()==="","Show all did not clear search");
 check(await page.locator("#categoryFilter").inputValue()==="all","Show all did not clear area filter");
 check((await page.locator("#resultCount").textContent()).includes("전체 공개 수업 "+published.length+"개"),"Visible total is incorrect");
 console.log("FILTERS: search, empty, grade, area, world and show-all reset PASS");

 const guideCount=published.filter(x=>x.teacherGuide===true).length;
 check(await page.locator("#lessonGroups .teacherLaunch").count()===guideCount,"Teacher-guide card links missing");
 for(const lesson of published){
  const card=page.locator("#lessonGroups .card").filter({has:page.locator("h3").getByText(lesson.title,{exact:true})});
  check(await card.count()===1,"Card missing/duplicate "+lesson.id);
  check(await card.locator("a.launch").getAttribute("href")===lesson.path,"Card link broken "+lesson.id);
  const lessonRes=await page.request.get(origin+"/lessons/"+lesson.path+"index.html",{timeout:22000});
  check(lessonRes.ok(),"Student lesson 404 "+lesson.id+" "+lessonRes.status());
  if(lesson.teacherGuide){
   check(await card.locator("a.teacherLaunch").getAttribute("href")===lesson.path+"teacher.html","Guide link wrong "+lesson.id);
   const teacherRes=await page.request.get(origin+"/lessons/"+lesson.path+"teacher.html",{timeout:22000});
   check(teacherRes.ok(),"Teacher guide 404 "+lesson.id+" "+teacherRes.status());
   check((await teacherRes.text()).includes("45분"),"Teacher guide content not found "+lesson.id);
  }
  if(["gayageum-observation","vocal-breath-phrasing","bali-gamelan-archive","arirang-vocal"].includes(lesson.id)){
   const worksheet=await page.request.get(origin+"/lessons/"+lesson.path+"worksheet.html",{timeout:22000});
   check(worksheet.ok(),"Printable worksheet 404 "+lesson.id);
   check((await worksheet.text()).includes("print()"),"Print command missing "+lesson.id);
  }
 }
 console.log("LINKS: all student pages, teacher guides, recent A4 worksheets return HTTP 200");

 // Quality design: the vocal pilot must show notation, licensed images,
 // a linked official orchestra performance, and four non-identical activities.
 await go("/lessons/vocal-breath-phrasing/");
 check(await page.locator("#steps button[data-stage]").count()===4,"Vocal lesson still shows old ten-scene checklist");
 check(await page.locator("#playOfficial").isVisible(),"Official professional orchestra opening is missing");
 check(await page.locator("#stage .photo img").count()===1,"Beethoven image missing from opening");
 await page.locator("#playOfficial").click();
 check((await page.locator("#frame iframe").getAttribute("src"))?.includes("TYE11oVhbmI"),"Official orchestra video URL broken");
 await page.locator('#steps button[data-stage="1"]').click();
 check(await page.locator("#sheet svg ellipse").count()>=25,"Eight-bar notation is not rendered");
 check(await page.locator("#measures button").count()===8,"Bar highlighting controls missing");
 await page.locator('#measures button[data-measure="3"]').click();
 check(await page.locator('#measures button[data-measure="3"]').getAttribute("class")?.includes("selected"),"Score measure highlighting failed");
 await page.locator('#steps button[data-stage="2"]').click();
 await page.locator('[data-breath="B"]').click();
 check((await page.locator("#breathLabel").textContent()).includes("2마디"),"Alternate breath phrasing control failed");
 await page.locator('#steps button[data-stage="3"]').click();
 check((await page.locator("#stage").textContent()).includes("합창"),"Vocal finale performance stage missing");
 console.log("VOCAL QUALITY: 4 meaningful stages, score 8 bars, official linked performance, visual score interaction, breath A/B PASS");

 await go("/lessons/gayageum-observation/");
 check(await page.locator("#tabs button[data-step]").count()===4,"Gayageum still split into ten writing prompts");
 check(await page.locator("#liveVideo").count()===1,"Gayageum performer video missing");
 check(await page.locator("#musicVisual figure img").count()===2,"Gayageum hand-position photographic references missing");
 await page.locator('#tabs button[data-step="1"]').click();
 check((await page.locator("#activity").textContent()).includes("뜯기"),"Gayageum hand gesture activity missing");
 await page.locator('#tabs button[data-step="2"]').click();
 check((await page.locator("#task").textContent()).includes("목소리"),"Gayageum vocal sigimsae imitation missing");
 console.log("GAYAGEUM QUALITY: 4 performing stages, 2 instrument photos, existing original live video PASS");

 for(const id of ["rhythm-lab","dynamics-expression","arirang-vocal"]){
  await go("/lessons/"+id+"/");
  check(await page.locator("#musicVisual figure img").count()===2,"Licensed visual gallery missing for "+id);
  check(await page.locator("#musicVisual .mvButtons button").count()>=1,"Fast sound access action missing for "+id);
 }
 console.log("VISUALS: rhythm, dynamics, arirang stage-photo galleries and fast audio access PASS");

 await go("/lessons/bali-gamelan-archive/");
 await page.locator("#heading").waitFor({timeout:12000});
 check((await page.locator("#heading").textContent()).includes("첫인상"),"Bali first scene failed");
 check(await page.locator("#nav [data-step]").count()===4,"Bali performance lesson should have four stages");
 check(await page.locator("audio").count()===2,"Bali has not 2 real recordings");
 for(const id of ["A","B"]){
  const source=await page.locator("#audio"+id+" source").getAttribute("src");
  check(source?.endsWith(".ogg")&&source.startsWith("https://upload.wikimedia.org/"),"Bali real audio URL missing "+id);
 }
 await page.locator("#next").click();
 check((await page.locator("#heading").textContent()).includes("맞물리는"),"Bali rhythm stage failed");
 check(await page.locator(".pulseGrid span").count()===8,"Bali interlocking 4-beat diagram missing");
 await page.locator('#nav [data-step="2"]').click();
 check(await page.locator('[data-label="fact"]').count()===1,"Museum editor missing");
 await page.locator('[data-label="fact"]').fill("1931년 발행된 음반 기록");
 await page.locator('[data-label="heard"]').fill("실제 소리에서 확인한 반복");
 check((await page.locator("#museum").textContent()).includes("1931년"),"Museum preview broken");
 await page.locator('#nav [data-step="3"]').click();
 await page.locator('[data-quiz="0"][data-choice="1"]').click();
 check((await page.locator("#activity").textContent()).includes("맞았습니다"),"Bali quiz feedback failed");
 await page.locator("#teacherBtn").click();
 check(await page.locator("#teacher").isVisible(),"Bali teacher explanation toggle failed");
 check(errors.length===0,"Lesson JavaScript errors: "+JSON.stringify(errors));
 console.log("BALI UI: 4 performance stages, real audio sources, 8-beat practice, editor, quiz, teacher guide PASS");

 if(requireMedia){
  const media=await page.evaluate(async()=>{
   const ids=["audioA","audioB"],out=[];
   for(const id of ids){
    const el=document.getElementById(id);
    const result=await new Promise(resolve=>{
     let done=false;
     const finish=(v)=>{if(done)return;done=true;clearTimeout(t);el.removeEventListener("loadedmetadata",onload);el.removeEventListener("error",onerr);resolve(v)};
     const onload=()=>finish({id,ok:true,duration:el.duration,readyState:el.readyState});
     const onerr=()=>finish({id,ok:false,errorCode:el.error?.code||null});
     const t=setTimeout(()=>finish({id,ok:false,reason:"30s metadata timeout",networkState:el.networkState}),30000);
     el.addEventListener("loadedmetadata",onload);
     el.addEventListener("error",onerr);
     el.preload="metadata";
     el.load();
     if(el.readyState>=1)onload();
    });
    out.push(result);
   }
   return out;
  });
  console.log("MEDIA: "+JSON.stringify(media));
  check(media.every(x=>x.ok&&x.duration>150),"Bali external audio not browser-playable: "+JSON.stringify(media));
 }
 await go("/lessons/arirang-vocal/");
 check(await page.locator(".scene").count()===10,"Arirang must contain ten stages");
 check(await page.locator("#menu button").count()===10,"Arirang navigation missing");
 check(await page.locator("#recording").count()===1,"Arirang actual vocal recording missing");
 check((await page.locator("#recording").getAttribute("src"))?.includes("Arirang.ogg"),"Arirang original recording link changed");
 await page.locator("#next").click();
 check((await page.locator("#where").textContent())==="2 / 10","Arirang next scene broken");
 if(requireMedia){
  const result=await page.evaluate(async()=>{
   const a=document.getElementById("recording");
   return await new Promise(resolve=>{
    let finished=false;
    const done=info=>{if(finished)return;finished=true;clearTimeout(t);a.removeEventListener("loadedmetadata",ok);a.removeEventListener("error",err);resolve(info)};
    const ok=()=>done({ok:true,duration:a.duration,readyState:a.readyState});
    const err=()=>done({ok:false,errorCode:a.error?.code||null,src:a.currentSrc});
    const t=setTimeout(()=>done({ok:false,reason:"Arirang 30s media timeout",src:a.currentSrc}),30000);
    a.addEventListener("loadedmetadata",ok);a.addEventListener("error",err);a.preload="metadata";a.load();if(a.readyState>=1)ok();
   });
  });
  console.log("ARIRANG MEDIA: "+JSON.stringify(result));
  check(result.ok&&result.duration>80&&result.duration<100,"Arirang vocal recording not playable: "+JSON.stringify(result));
 }
 check(errors.length===0,"Arirang page errors: "+JSON.stringify(errors));
 console.log("ARIRANG UI: 10 scenes, navigation, original real human vocal audio PASS");
 console.log(JSON.stringify({VERDICT:"PASS",origin,published:published.length,categories:6,links:"PASS",lessons:ids,guideLinks:guideCount,bali:"PASS",arirang:"PASS",audioMetadata:requireMedia?"PASS":"NOT_CHECKED_LOCAL"}));
}catch(err){
 console.error("FAIL: "+(err.stack||String(err)));
 console.error("EXTERNAL_MEDIA_DIAGNOSTICS: "+JSON.stringify(externalMediaErrors));
 await page.screenshot({path:"/tmp/music-library-smoke-fail.png",fullPage:true}).catch(()=>{});
 process.exitCode=1;
}finally{await browser.close()}
