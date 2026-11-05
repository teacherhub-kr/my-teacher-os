// Fictional-only regression for public Teacher OS evidence capture.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app-v21.js','utf8'),css=fs.readFileSync('app-v21.css','utf8');
for(const token of ['data-v21-open-capture','v21QuickSave','v21QuickConfirmed','QUICK_FOCUS21','SENSITIVE_RE21.test(fact)','linked.length!==evidenceIds.length']) {
 assert(source.includes(token),'Missing evidence guard: '+token);
}
assert(source.includes("if(e.target.closest('#srSaveRecord,[data-record-del]'))"),'Legacy save/delete must refresh');
assert(css.includes('.v21-quick-capture')&&css.includes('@media(max-width:680px)'),'Responsive capture missing');
const student={id:'fictional-001',name:'가상학생',grade:'2',classNo:'3',number:'1'};
const year={students:[student],studentRecords:[],studentDrafts:{},roleProfile:{roles:['homeroom','subject']}};
const nodes={
 '#srStudentList .sr-student.active':{dataset:{studentId:student.id}},
 '#v21QuickDate':{value:new Date(Date.now()+9*3600000).toISOString().slice(0,10)},
 '#v21QuickFact':{value:'가상 학급자치 시간에 학급 규칙을 제안하고 의견을 정리하여 발표함.'},
 '#v21QuickConfirmed':{checked:false},
 '#v21QuickStatus':{textContent:''},
 '#v21QuickFocus':{innerHTML:''},
 '#v21EvidenceList':{innerHTML:''},
 '#v21EvidenceCount':{textContent:''},
 '#v21Generate':{disabled:true}
};
const store={},state={version:20,years:{'2026':year}};
const ctx={document:{querySelector:s=>nodes[s]||null,querySelectorAll:()=>[],body:{addEventListener(){}}},
 state,KEY:'fictional-local-key',cur:()=>year,localStorage:{setItem(k,v){store[k]=v}},
 setTimeout(){},alert(message){throw Error('Unexpected alert: '+message)},console,Date,Math};
const instrumented=source.replace(/\}\)\(\);\s*$/,
 'globalThis.__evidenceTest21={makeVariants21,evidence21,saveQuickEvidence21,setFocus:(area,focus)=>{area21=area;selectedFocus21=focus}};})();');
assert.notEqual(instrumented,source,'Test instrumentation failed');
vm.runInNewContext(instrumented,ctx);
const API=ctx.__evidenceTest21,plain=x=>JSON.parse(JSON.stringify(x));
assert(API,'Evidence helpers absent');
// Draft never adds unsupported praise, temporal sequence or personality traits.
const versions=plain(API.makeVariants21([
 {text:'학급 회의에서 의견을 정리해 발표함'},
 {text:'학급 행사에서 준비물의 수량을 확인함'}],'behavior'));
assert.deepEqual(Object.keys(versions),['A','B','C']);
for(const draft of Object.values(versions)){
 assert(draft.includes('학급 회의에서 의견을 정리해 발표함'));
 assert(draft.includes('학급 행사에서 준비물의 수량을 확인함'));
 assert(!/최근에는|지속적으로 관찰됨|성장과 발전 가능성|뛰어남|우수함/.test(draft),'No unsupported claims');
}
// Explicit teacher confirmation is mandatory.
API.setFocus('behavior','협력·소통');
assert.equal(API.saveQuickEvidence21(),false);
assert.equal(year.studentRecords.length,0);
assert.match(nodes['#v21QuickStatus'].textContent,/직접 관찰/);
nodes['#v21QuickConfirmed'].checked=true;
assert.equal(API.saveQuickEvidence21(),true);
assert.equal(year.studentRecords.length,1);
const rec=year.studentRecords[0];
assert.equal(rec.studentId,student.id);
assert.equal(rec.eligible,true);assert.equal(rec.area,'behavior');
assert.equal(rec.kind,'담임관찰');assert.equal(rec.focus,'협력·소통');
assert.equal(rec.source,'교사 직접 관찰·확인');
assert.equal(plain(API.evidence21(student.id,'behavior')).length,1);
assert.equal(plain(API.evidence21('fictional-002','behavior')).length,0);
assert.equal(plain(API.evidence21(student.id,'career')).length,0);
assert.equal(nodes['#v21QuickConfirmed'].checked,false);
assert.equal(nodes['#v21QuickFact'].value,'');
assert.equal(JSON.parse(store['fictional-local-key']).years['2026'].studentRecords.length,1);
// Sensitive or insufficient content cannot be elevated.
API.setFocus('behavior','협력·소통');
nodes['#v21QuickConfirmed'].checked=true;
nodes['#v21QuickFact'].value='가정폭력 상황 때문에 학급 활동을 돕지 못했다고 말함.';
assert.equal(API.saveQuickEvidence21(),false);
nodes['#v21QuickFact'].value='참여함';
assert.equal(API.saveQuickEvidence21(),false);
assert.equal(year.studentRecords.length,1);
year.studentRecords.push({id:'old',studentId:student.id,kind:'담임관찰',area:'behavior',
 eligible:false,text:'과거 기록으로 직접 관찰이 확인되지 않은 참고 자료'});
year.studentRecords.push({id:'sensitive',studentId:student.id,kind:'담임관찰',area:'behavior',
 eligible:true,text:'정신 건강 상담에 관한 민감한 기록'});
assert.equal(plain(API.evidence21(student.id,'behavior')).length,1);
console.log('Evidence capture, student isolation, confirmation, sensitive-data and grounded drafting: PASS');
