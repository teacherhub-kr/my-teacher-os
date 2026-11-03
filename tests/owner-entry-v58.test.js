/* v58: owner-first navigation is a Google-enforced auth redirect, never a credential check. */
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'teacher-owner-entry-v58.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const secretFreeUrl='https://script.google.com/macros/s/AKfycbxIDabcdefghijklmnopqrstuvwxyz0123456789/exec';
function setup(stored,search,fail){
  const navigation=[],span={textContent:''};
  const sandbox={
    URLSearchParams,
    window:{
      location:{search:search||'',replace:function(url){if(fail)throw Error('blocked');navigation.push(url)}},
      localStorage:{getItem:()=>stored}
    },
    document:{querySelector:()=>span},
    globalThis:null
  };
  sandbox.globalThis=sandbox;
  vm.runInNewContext(src,sandbox,{filename:'teacher-owner-entry-v58.js'});
  return {api:sandbox.TeacherOSEntry58,navigation,span};
}
let t=setup(secretFreeUrl+'?utm_source=other','?utm_source=chatgpt.com');
assert.equal(t.api.canonicalLink(secretFreeUrl+'#fragment'),secretFreeUrl);
assert.equal(t.api.start(),false,'Home must remain usable even if owner link was saved');
assert.deepStrictEqual(t.navigation,[],'No forced redirection of public teacher tools');
t=setup(secretFreeUrl+'?utm_source=other','?mode=private');
assert.equal(t.api.start(),true,'Explicit private access must enter Google authentication');
assert.deepStrictEqual(t.navigation,[secretFreeUrl],'Private redirect must strip query and fragment');
assert(t.span.textContent.includes('Google 인증'));
for(const bad of [
  'javascript:alert(1)','https://script.google.com.evil.example/macros/s/AKfycbxIDabcdefghijklmnopqrstuvwxyz0123456789/exec',
  'https://evil.example/login','https://script.google.com/macros/s/SHORT/exec',
  'http://script.google.com/macros/s/AKfycbxIDabcdefghijklmnopqrstuvwxyz0123456789/exec',
  secretFreeUrl.replace('/exec','/dev')
]){
  t=setup(bad,'');
  assert.equal(t.api.start(),false,'Invalid provider or path must never redirect: '+bad);
  assert.equal(t.navigation.length,0);
}
t=setup(secretFreeUrl,'?mode=tools');
assert.equal(t.api.start(),false,'Explicit public-tool route stays on existing Teacher OS');
assert.equal(t.navigation.length,0);
t=setup(null,'');
assert.equal(t.api.start(),false,'Fresh browser must preserve prior registration flow');
t=setup(secretFreeUrl,'?mode=private',true);
assert.equal(t.api.start(),false,'Blocked explicit private navigation must fail back to existing tools');
assert(t.span.textContent.includes('실패'));
assert(index.includes('teacher-owner-entry-v58.js?v=59.0-explicit-private'));
assert(index.includes('TeacherOSEntry58?.start?.()===true'));
assert(index.includes('teacher-private-music-v56.js'));
assert(!index.includes(secretFreeUrl),'No private deployment URL in public index');
assert(!src.includes(secretFreeUrl),'Never hardcode an actual /exec URL in published JS');
assert(!src.includes('getStudentDetail')&&!src.includes('getDashboardData'),'No private data APIs in public entry');
assert(!src.includes('fetch(')&&!src.includes('postMessage'),'No data/URL beacon from entry script');
console.log('v59 explicit owner-authenticated access, honest default home, URL safety and fallback PASS');
