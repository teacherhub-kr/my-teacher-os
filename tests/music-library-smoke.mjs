import { chromium } from "playwright";
const origin=process.env.MUSIC_LIB_BASE_URL || "http://127.0.0.1:8765";
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on("pageerror",e=>{if(page.url().includes("/lessons/"))errors.push(e.message)});
function check(ok,message){if(!ok)throw Error(message)}
async function countText(v){return (await page.locator("#resultCount").textContent()).trim().includes(v)}
try{
 await page.goto(origin+"/lessons/",{waitUntil:"domcontentloaded"});
 await page.getByText("오케스트라 악기의 음색",{exact:true}).waitFor({timeout:10000});
 check(await countText("등록된 수업 1개"),"Catalog did not render exactly one published lesson");
 console.log("LIBRARY: 1 registered lesson rendered");
 await page.locator("#lessonSearch").fill("청음");
 check(await page.locator(".lessonCard, .card").count()===1,"Search positive filter failed");
 await page.locator("#lessonSearch").fill("존재하지않는수업검색");
 check(await page.locator("#lessonCards .card").count()===0,"Search negative filter failed");
 check(await page.locator("#emptyState").isVisible(),"No empty-state feedback");
 await page.locator("#lessonSearch").fill("");
 await page.locator('#gradeFilters [data-grade="3"]').click();
 check(await page.locator("#lessonCards .card").count()===0,"Grade 3 unexpectedly shows grade 2 lesson");
 await page.locator('#gradeFilters [data-grade="2"]').click();
 check(await page.locator("#lessonCards .card").count()===1,"Grade 2 filter missing");
 await page.locator("#categoryFilter").selectOption("창작");
 check(await page.locator("#lessonCards .card").count()===0,"Category negative filter failed");
 await page.locator("#categoryFilter").selectOption("감상");
 check(await page.locator("#lessonCards .card").count()===1,"Category positive filter failed");
 console.log("SEARCH_FILTERS: PASS");

 const imgs=page.locator(".mosaic img");
 check(await imgs.count()===3,"Featured orchestra image collage missing");
 for(let i=0;i<await imgs.count();i++){
  await imgs.nth(i).evaluate(async x=>{
   if(x.complete&&x.naturalWidth>200)return;
   await new Promise((done,fail)=>{
    x.addEventListener("load",done,{once:true});
    x.addEventListener("error",()=>fail(new Error("image failed "+x.src)),{once:true});
    setTimeout(()=>fail(new Error("image timeout "+x.src)),10000);
   });
  });
 }
 console.log("PHOTOS: PASS");
 await page.locator(".launch").click();
 await page.locator("#teacherToggle").waitFor();
 check(page.url().includes("/lessons/orchestra-timbre/"),"Lesson link broken");
 check(!(await page.locator("#teacherPanel").isVisible()),"Teacher explanation should be hidden initially");
 await page.locator("#teacherToggle").click();
 check(await page.locator("#teacherPanel").isVisible(),"Teacher explanation did not open");
 await page.evaluate(()=>gotoScene(3));
 check((await page.locator("#teacherPanel").textContent()).includes("목관악기"),"Teacher explanation did not update by scene");
 await page.locator("#teacherToggle").click();
 check(!(await page.locator("#teacherPanel").isVisible()),"Teacher explanation did not close");
 const audioSrc=await page.evaluate(()=>{gotoScene(2);return document.querySelector("#lesson audio")?.getAttribute("src")});
 check(audioSrc?.startsWith("assets/"),"Local audio path lost");
 await page.locator(".backToLibrary").click();
 check(new URL(page.url()).pathname.endsWith("/lessons/"),"Lesson return to library broken");
 console.log("LESSON: link, guide toggle, audio path, back link PASS");

 await page.goto(origin+"/",{waitUntil:"domcontentloaded",timeout:20000});
 await page.locator('.nav .musicLibraryLink').waitFor({timeout:16000});
 check(await page.locator(".musicLibraryFeaturedCTA").count()===1,"Dashboard music library shortcut missing");
 const navUrl=await page.locator(".musicLibraryLink").getAttribute("href");
 check(navUrl==="lessons/","OS library link incorrect");
 await page.locator(".musicLibraryLink").click();
 await page.getByText("오케스트라 악기의 음색",{exact:true}).waitFor({timeout:10000});
 check(new URL(page.url()).pathname.endsWith("/lessons/"),"Teacher OS sidebar library navigation broken");
 console.log("TEACHER_OS: sidebar entry, dashboard CTA, navigation PASS");

 check(errors.length===0,"Lesson JavaScript errors: "+JSON.stringify(errors));
 console.log(JSON.stringify({VERDICT:"PASS",catalog:1,search:"PASS",grade:"PASS",category:"PASS",images:3,teacherGuide:"PASS",lessonLink:"PASS",returnLink:"PASS",teacherOsMenu:"PASS",teacherOsDashboard:"PASS"}));
}catch(err){
 console.error("FAIL:",err.stack||String(err));
 await page.screenshot({path:"/tmp/music-library-smoke-fail.png",fullPage:true}).catch(()=>{});
 process.exitCode=1;
}finally{await browser.close()}
