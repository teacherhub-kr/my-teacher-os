import fs from "node:fs";
import assert from "node:assert/strict";
const lessons=[
"orchestra-timbre","rhythm-lab","dynamics-expression",
"gayageum-observation","vocal-breath-phrasing","bali-gamelan-archive","arirang-vocal"
];
const tones=new Set(["sun","stage","sky","mint","peach","lavender","butter","final"]);
const allowedLayouts=new Set(["quest","cinema","soundlab","challenge","beat-grid","photo-essay","big-type","cards","payoff"]);
let totalScenes=0, images=0;
for(const id of lessons){
 const p="lessons/"+id+"/deck.json",d=JSON.parse(fs.readFileSync(p,"utf8"));
 assert.equal(d.id,id);
 assert.equal(d.schemaVersion,2);
 assert.equal(d.durationMinutes,45);
 assert.equal(d.slides.reduce((sum,s)=>sum+s.min,0),45,id+" minutes");
 assert(d.slides.reduce((sum,s)=>sum+s.music,0)>=23,id+" music activity minutes");
 assert(d.slides.length>=9&&d.slides.length<=16,id+" scenes");
 assert(d.story&&d.story.role&&d.story.mission&&d.story.hook&&d.story.payoff,id+" complete storyline");
 assert(d.slides[0].storyQuestion===d.story.hook,id+" opening mystery");
 assert(d.slides.at(-1).storyAnswer===d.story.payoff,id+" closing payoff");
 assert(d.slides[0].min<=3,id+" first sound must start quickly");
 assert(d.slides[0].media||d.slides[0].tasks.some(t=>/듣|부르|실연/.test(t)),id+" first auditory task");
 let lastBeat="";
 const colors=new Set();
 for(const [i,s] of d.slides.entries()){
   for(const field of ["phase","title","prompt","teacher","storyBeat","studentCue","storyTone","layout"]){
     assert.equal(typeof s[field],"string",id+" scene "+i+" "+field);
     assert(s[field].trim().length>0,id+" scene "+i+" empty "+field);
   }
   assert(tones.has(s.storyTone),id+" invalid color");
   assert(allowedLayouts.has(s.layout),id+" invalid layout");
   assert(s.min>0&&s.music>=0&&s.music<=s.min,id+" scene minutes");
   assert(Array.isArray(s.tasks)&&s.tasks.length>=1,id+" no student actions");
   assert.notEqual(s.storyBeat,lastBeat,id+" repeated story beat");
   lastBeat=s.storyBeat;colors.add(s.storyTone);
   assert(s.studentCue.length<=75,id+" student cue overlong");
   if(s.visual){
     assert(s.visual.alt&&s.visual.credit,id+" uncredited image");
     assert(s.visual.url.startsWith("assets/")||s.visual.url.startsWith("https://commons.wikimedia.org/wiki/Special:FilePath/"),id+" unexpected photo URL");
     images++;
   }
 }
 assert(colors.size>=4,id+" repetitive slide palette");
 const html=fs.readFileSync("lessons/"+id+"/index.html","utf8");
 assert(html.includes('href="../hybrid-v2/story-theme.css"'),id+" missing story CSS");
 assert(html.includes('src="../hybrid-v2/engine.js"'),id+" missing hybrid engine");
 assert(fs.existsSync("lessons/"+id+"/teacher.html"),id+" missing original guide");
 totalScenes+=d.slides.length;
 console.log(id+": "+d.slides.length+" scenes / 45 min / "+colors.size+" palettes / story bookends PASS");
}
assert.equal(totalScenes,77);
assert(images>=12,"Not enough real, credited visual reference scenes");
assert(fs.existsSync("lessons/hybrid-v2/teacher-guide.html"));
console.log("STORY_QUALITY: "+lessons.length+" lessons, "+totalScenes+" scenes, "+images+" credited images, 45-min timing, narrative arcs PASS");
