/* v53 connection diagnostics tests: no fake live sync, no private student data */
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const html=read('index.html'),app=read('teacher-connections-v53.js'),css=read('teacher-connections-v53.css');
assert(html.includes('teacher-connections-v53.js?v=55.0-health'));
assert(html.includes('teacher-connections-v53.css?v=53.0-connection-truth'));
assert(css.includes('.t53-grid'),'connection cards CSS missing');
assert(app.includes("원본 주소 등록됨"),'original link state missing');
assert(app.includes("교사용 Apps Script 배포 및 주소 연결 필요"),'unconfigured owner-only web app must remain explicit');
assert(!app.includes('IMPORTRANGE('),'public app cannot fetch private student marks');
assert(!app.includes('최윤우')&&!app.includes('이우주'),'student identifiers in public JS');
const ls=new Map();
const listeners={};
const context={
 document:{querySelector:()=>null,addEventListener:(n,f)=>{listeners[n]=f;},hidden:false},
 window:{addEventListener:(n,f)=>{listeners['window_'+n]=f;}},
 localStorage:{getItem:k=>ls.get(k)||null,setItem:(k,v)=>ls.set(k,v),removeItem:k=>ls.delete(k)},
 Date:Date,JSON:JSON,Number:Number,String:String,Math:Math,
 setTimeout:()=>{},setInterval:()=>{},console:console,globalThis:{}
};
vm.runInNewContext(app,context,{filename:'teacher-connections-v53.js'});
const t=context.globalThis.TeacherOSConnections53;
assert(t&&typeof t.state==='function');
const SHEET='1XapLQCPqLzK0d6yASJZ_uIHFb_QjQ2zYzNnt9aVbNMs';
const good='https://docs.google.com/spreadsheets/d/'+SHEET+'/edit';
assert.equal(t.safeSheetUrl(good+'#gid=4'),good);
for(const invalid of ['javascript:alert(1)','https://evil.example/a','https://docs.google.com.evil.example/spreadsheets/d/'+SHEET+'/edit','https://docs.google.com/spreadsheets/d/a/edit']){
 assert.equal(t.safeSheetUrl(invalid),'');
}
let st=t.state();
assert.equal(st.ready,0,'no settings must be not connected');
assert.equal(st.rows.find(x=>x.key==='live').state,'missing','score ingestion must never be declared connected');
ls.set('myTeacherOS.teacher49.sheetUrl',good);
st=t.state();
assert.equal(st.rows.find(x=>x.key==='sheet').state,'partial','saved URL is not an OAuth/live data connection');
assert.equal(st.rows.find(x=>x.key==='live').state,'missing');
ls.set('myTeacherOS.v01',JSON.stringify({currentYear:2026,years:{"2026":{year:2026,schoolName:'테스트학교',schoolLevel:'중학교'}}}));
st=t.state();
assert.equal(st.rows.find(x=>x.key==='year').state,'ok');
ls.set('myTeacherOS.google34.settings.v1',JSON.stringify({gatewayUrl:'https://script.google.com/macros/s/example/exec'}));
st=t.state();assert.equal(st.rows.find(x=>x.key==='google').state,'partial');
ls.set('myTeacherOS.google34.state.v1',JSON.stringify({connected:true,lastSyncAt:new Date().toISOString()}));
st=t.state();assert.equal(st.rows.find(x=>x.key==='google').state,'ok');
ls.set('myTeacherOS.google34.state.v1',JSON.stringify({connected:true,lastSyncAt:'2025-01-01T00:00:00Z'}));
st=t.state();assert.equal(st.rows.find(x=>x.key==='google').state,'partial','stale sync must not be green');
assert(listeners.click&&listeners.visibilitychange,'UI interactions not wired');

assert(app.includes("history.replaceState"),'one-click setup should clear private fragment from visible URL');
const secondStore=new Map();
let cleaned='';
const second={document:{querySelector:()=>null,addEventListener:()=>{},hidden:false},window:{addEventListener:()=>{}},
  localStorage:{getItem:k=>secondStore.get(k)||null,setItem:(k,v)=>secondStore.set(k,v),removeItem:k=>secondStore.delete(k)},
  location:{hash:'#connectSheet='+SHEET,pathname:'/my-teacher-os/',search:'?v=53'},
  history:{replaceState:(_s,_t,url)=>{cleaned=url}},
  Date:Date,JSON:JSON,Number:Number,String:String,Math:Math,setTimeout:()=>{},setInterval:()=>{},console:console,globalThis:{}};
vm.runInNewContext(app,second,{filename:'teacher-connections-v53.js'});
assert.equal(secondStore.get('myTeacherOS.teacher49.sheetUrl'),good);
assert.equal(cleaned,'/my-teacher-os/?v=53','private fragment must be erased');
assert.equal(second.globalThis.TeacherOSConnections53.state().rows.find(x=>x.key==='sheet').state,'partial');

console.log('v53 connection truth, stale status, private URL, browser-only configuration tests passed');