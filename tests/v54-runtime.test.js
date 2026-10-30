const assert=require("assert"),fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(root,"music-summary-v54.js"),"utf8");
const css=fs.readFileSync(path.join(root,"music-summary-v54.css"),"utf8");
const idx=fs.readFileSync(path.join(root,"index.html"),"utf8");
const core=fs.readFileSync(path.join(root,"music-summary-core-v54.js"),"utf8");
assert(idx.includes("music-summary-v54.js?v=55.0-csv"));
assert(idx.includes("music-summary-core-v54.js?v=55.0-csv"));
assert(idx.includes("music-summary-v54.css?v=54.0-music"));
assert(!idx.includes("https://accounts.google.com/gsi/client"),"separate Google Cloud OAuth is no longer part of the default UI");
assert(idx.includes("teacher-private-music-v56.js?v=56.0-owner-only"));
assert(app.includes("https://www.googleapis.com/auth/spreadsheets.readonly"));
assert(app.includes('A3:K18'),"Read only the class aggregate area");
assert(app.includes("credentials:\"omit\""),"No cookies to Sheets API");
assert(app.includes("textContent=count?"),"No untrusted innerHTML of sheet cells");
assert(!app.includes("localStorage.setItem(KEY_SHEET"),"Do not mutate original source");
assert(!/localStorage\.setItem\([^,]+,\s*(token|snapshot|data)/.test(app));
assert(!/studentName|studentId|individualScore/.test(app+core));
assert(css.includes(".music54-table"),"Missing style");
const events={},store=new Map();
const globals={
  TeacherOSMusicCore54:{parseBatchGet(){throw Error("Do not fetch in unit test")},parseWorkbook(){}},
  document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(n,fn)=>events[n]=fn,hidden:false},
  window:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  setTimeout(){},setInterval(){},Date,JSON,Number,String,Math,console
};
globals.globalThis=globals;
vm.runInNewContext(app,globals,{filename:"music-summary-v54.js"});
const api=globals.TeacherOSMusic54;
assert(api&&typeof api.render==="function"&&typeof api.status==="function");
assert.deepEqual(JSON.parse(JSON.stringify(api.status())),{loaded:false,live:false,source:""});
assert(events.click&&events.change&&events.visibilitychange);
assert.equal(store.size,0,"No storage changes on import");
console.log("v54 PASS readonly OAuth scope / no persisted token / initial state / event wiring");
