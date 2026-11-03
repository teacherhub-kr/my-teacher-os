const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'teacher-private-music-v56.js'),'utf8');
const css=fs.readFileSync(path.join(root,'teacher-private-music-v56.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const health=fs.readFileSync(path.join(root,'teacher-connections-v53.js'),'utf8');
const store=new Map(),events={};
const sandbox={
  document:{querySelector:()=>null,addEventListener:(t,cb)=>events[t]=cb,hidden:false},
  window:{addEventListener:(t,cb)=>events['window_'+t]=cb,open:()=>{}},
  localStorage:{setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)||null,removeItem:k=>store.delete(k)},
  setTimeout:()=>{},setInterval:()=>{},globalThis:null
};
sandbox.globalThis=sandbox;
vm.runInNewContext(ui,sandbox,{filename:'teacher-private-music-v56.js'});
const api=sandbox.TeacherOSPrivateMusic56;
assert.equal(typeof api.linkOK,'function');
const good='https://script.google.com/macros/s/AKfycbxIDabcdefghijklmnopqrstuvwxyz0123456789/exec';
assert.equal(api.linkOK(good+'?test=1'),good);
assert.equal(api.linkOK(good+'#frag'),good);
for(const bad of [
  'javascript:alert(1)',
  'https://evil.example/hack',
  'https://script.google.com.evil.example/macros/s/AKfycbxIDabcdefghijklmnopqrstuvwxyz0123456789/exec',
  'https://script.google.com/macros/s/SHORT/exec',
  'https://script.google.com/macros/s/AKfycbxIDabcdefghijklmnopqrstuvwxyz0123456789/dev',
  'http://script.google.com/macros/s/AKfycbxIDabcdefghijklmnopqrstuvwxyz0123456789/exec'
])assert.equal(api.linkOK(bad),'',bad);
store.set('myTeacherOS.music56.ownerOnlyWebAppUrl',good);
assert.equal(api.getLink(),good);
assert(events.click&&events.visibilitychange);
assert(index.includes('teacher-private-music-v56.js?v=56.1-link-state'));
assert(index.includes('teacher-private-music-v56.css?v=56.0-owner-only'));
assert(!index.includes('accounts.google.com/gsi/client'));
assert(ui.includes('이 브라우저에 웹앱 주소')&&ui.includes('접근 확인 필요'));
assert(ui.includes('나로 실행 · 나만 접근'));
assert(health.includes("target:'music56'"));
assert(css.includes('.teacher56-fallback .music54-fields'));
for(const content of [ui,css])assert(!content.includes('이우주'));
// Registration-state regression: a saved URL must never show the no-URL notice.
// This tests an isolated DOM model and does not open or access any private sheet.
const key='myTeacherOS.music56.ownerOnlyWebAppUrl';
let panel=null;
const badge={textContent:''};
const notice={textContent:'웹앱 연결 상태를 확인하고 있습니다.',dataset:{}};
const urlField={value:''};
const settings={appendChild:node=>{panel=node;}};
sandbox.document.createElement=()=>({setAttribute(){},className:'',innerHTML:'',id:''});
sandbox.document.activeElement=null;
sandbox.document.querySelector=sel=>({
  '#settings':settings,'#teacher56Panel':panel,
  '#teacher56Url':urlField,'#teacher56Badge':badge,
  '#teacher56Status':notice
})[sel]||null;
store.delete(key);
assert.equal(api.mount(),true);
assert.equal(badge.textContent,'설정 필요');
assert(notice.textContent.includes('웹앱 주소가 등록되지 않았습니다'));
assert.equal(notice.dataset.linkState,'missing');
store.set(key,good);
api.mount();
assert.equal(badge.textContent,'주소 등록됨 · 접근 확인 필요');
assert(notice.textContent.includes('웹앱 주소가 등록되어 있습니다'));
assert(!notice.textContent.includes('등록되지 않았습니다'));
assert.equal(notice.dataset.linkState,'registered');
// Periodic mount must not overwrite user-visible action feedback.
notice.textContent='교사 계정으로 웹앱 확인을 요청했습니다';
api.mount();
assert.equal(notice.textContent,'교사 계정으로 웹앱 확인을 요청했습니다');
store.delete(key);
api.mount();
assert.equal(badge.textContent,'설정 필요');
assert(notice.textContent.includes('등록되지 않았습니다'));
assert.equal(notice.dataset.linkState,'missing');
console.log('v56 portal URL safety, local-only storage, access disclosure and loader PASS');
