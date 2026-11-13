/* v67: owner-only music 교과세특 workroom — evidence-only drafts, NEIS byte checks,
   per-student session isolation, discoverable entry, and no persistence or leaks.
   Uses fictional evidence only. */
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ui=read('apps-script/music-dashboard/Index.html');
const source=ui.match(/\/\/ BEGIN OWNER_ONLY_HOME_CORE[^\n]*\n([\s\S]*?)\/\/ END OWNER_ONLY_HOME_CORE/);
assert(source,'Owner-only pure logic block must remain testable');
const ctx={};vm.runInNewContext(source[1],ctx);
const plain=x=>JSON.parse(JSON.stringify(x));

// 1. Draft joins only teacher evidence, in order, with no embellishment.
const d=plain(ctx.buildRecordDraft_('가상 감상문 쓰기','두 곡의 빠르기 차이를 듣고 구별하여 설명함',
  '연습 후 셈여림 기호를 사용해 다시 설명함','감상문에서 악기 음색 차이를 근거로 분위기를 비교함'));
assert.equal(d.error,'');
assert.equal(d.text,'가상 감상문 쓰기 활동에서 두 곡의 빠르기 차이를 듣고 구별하여 설명함. 감상문에서 악기 음색 차이를 근거로 분위기를 비교함. 연습 후 셈여림 기호를 사용해 다시 설명함.');
assert(!/우수|성실|뛰어|성장함|점/.test(d.text),'No inferred traits or scores');
assert(ctx.buildRecordDraft_('가상 활동','참여함','', '').error,'Insufficient evidence fails closed');
assert(ctx.buildRecordDraft_('가상 활동','x'.repeat(20),'', 'y'.repeat(801)).error,'Work summary length bounded');
// Backward compatible 3-argument call used by v62.
assert.equal(ctx.buildRecordDraft_('우쿨렐레 합주','자신이 맡은 리듬을 일정하게 연주함','').text,'우쿨렐레 합주 활동에서 자신이 맡은 리듬을 일정하게 연주함.');

// 2. Official 2026 중학교 기재요령 p.162: 세특 500자; 한글 3Byte, 영문·숫자 1Byte, 엔터 1Byte.
assert.equal(ctx.neisBytes_('가'),3);
assert.equal(ctx.neisBytes_('가a1 '),6);
assert.equal(ctx.neisBytes_('가\n나'),7,'Enter counts 1 Byte');
assert.equal(ctx.neisBytes_('가\r\n나'),7,'CRLF is one Enter');
assert.equal(ctx.neisBytes_(''),0);
assert.equal(ctx.RECORD_BYTE_LIMIT_,1500);assert.equal(ctx.RECORD_CHAR_LIMIT_,500);
const B=t=>plain(ctx.checkRecordText_(t,[],1500));
assert.equal(B('가'.repeat(500)).bytes,1500);assert(!B('가'.repeat(500)).over,'500 Korean chars = exactly 1500 Byte allowed');
assert(B('가'.repeat(501)).over&&B('가'.repeat(501)).blocked,'501 Korean chars blocked');
assert(!B('가'.repeat(499)+'ab1').over,'Mixed 1497+3 = 1500 allowed');
assert(B('가'.repeat(499)+'ab1c').over,'Mixed 1501 blocked');
assert(!B('가'.repeat(499)+'\n가'.slice(0,1)+'ab').over,'line break counted as 1 Byte at boundary');
assert.equal(B('가'.repeat(400)+'\n'+'가'.repeat(99)).bytes,1498);
assert(B('가'.repeat(250)+'\n'+'가'.repeat(250)).over,'1501 with newline is over');
assert(B('가나다라마바사아자차카.\n타파하').issues.some(i=>/줄바꿈/.test(i.message)),'newline is surfaced for NEIS check');
// Teacher can lower but never raise the official ceiling.
assert.equal(ctx.clampLimit_(1200),1200);assert.equal(ctx.clampLimit_(3000),1500);assert.equal(ctx.clampLimit_('abc'),1500);assert.equal(ctx.clampLimit_(10),1500);
assert(B('가'.repeat(501)).limit===1500&&plain(ctx.checkRecordText_('가'.repeat(501),[],9999)).over,'Raised limit is clamped');

// 3. Restricted expressions and unsupported trait words are flagged, not silently passed.
// Official 2026 중학교 기재요령 p.18~19, p.104 items block; judgement items only warn.
const flagged=[
 ['교외 음악 대회에서 금상을 수상함.',true],
 ['교내 합창 대회에 참가하여 지휘를 맡음.',true],
 ['교내 작곡 공모전에 출품함.',true],
 ['피아노 콩쿠르 준비 과정을 소개함.',true],
 ['방과후학교 기타 강좌에서 코드를 익힘.',true],
 ['방과 후 수업에서 장구를 연습함.',true],
 ['K-MOOC 음악사 강좌를 수강함.',true],
 ['KOCW 강의를 듣고 정리함.',true],
 ['국악기 음색에 관한 소논문을 작성함.',true],
 ['연구 보고서로 음계를 비교함.',true],
 ['피아노 자격증을 취득하였음.',true],
 ['토익 시험 준비 경험을 소개함.',true],
 ['한자능력검정 급수를 언급함.',true],
 ['아버지가 의사인 환경에서 음악을 접함.',true],
 ['음악 관련 논문을 학회에 발표함.',true],
 ['해외 봉사 공연에 참여함.',true],
 ['장학금을 받은 경험을 소개함.',true],
 ['체육대회 응원가를 모둠과 편곡함.',false],
 ['가상대학교 교수의 특강을 들음.',false],
 ['수행평가에서 25점을 받아 전교 1등을 함.',false],
 ['성실한 태도로 우수한 연주를 함.',false]
];
flagged.forEach(([text,block])=>{
  const r=plain(ctx.checkRecordText_(text,[],1500));
  assert(r.issues.length>0,'Must flag: '+text);
  assert.equal(r.blocked,block,(block?'Must block: ':'Must warn only: ')+text);
});
// False-positive guards: ordinary music-class sentences must not be blocked.
['수업 시간에 모둠과 리듬 합주를 발표함.','셈여림 변화를 구별하여 자신의 파트 음량을 조절함.','감상문에서 두 곡의 빠르기를 비교하여 설명함.','학급 발표회 형식의 수업에서 가창 순서를 정리함.']
 .forEach(t=>assert(!plain(ctx.checkRecordText_(t,[],1500)).blocked,'Not blocked: '+t));
// No detection is never presented as 기재 가능.
assert(ui.includes('자동 탐지 결과 없음 — 기재 가능 판정이 아닙니다.'));
const clean=plain(ctx.checkRecordText_('가상 합주 활동에서 셈여림 변화를 구별하여 자신의 파트 음량을 조절함.',[],1500));
assert.equal(clean.issues.length,0,'Evidence-based sentence passes');

// 4. Duplicate sentences across students in the same session are detected.
const shared='가상 합주 활동에서 셈여림 변화를 구별하여 자신의 파트 음량을 조절함.';
const dup=plain(ctx.checkRecordText_(shared+' 가상 감상문에서 빠르기를 비교함.',[shared],1500));
assert(dup.issues.some(i=>i.level==='duplicate'));

// 5. Status flow: 근거 미등록 → 근거 등록 → 초안 → 검토 중 → 최종 확정; stale never final.
assert.equal(ctx.recordState_(undefined),'근거 미등록');
assert.equal(ctx.recordState_({observed:'짧음'}),'근거 미등록');
assert.equal(ctx.recordState_({observed:'박을 맞추어 합주함 확인'}),'근거 등록');
assert.equal(ctx.recordState_({work:'감상문에서 빠르기 차이를 설명함'}),'근거 등록','Confirmed work evidence counts');
assert.equal(ctx.recordState_({observed:'박을 맞추어 합주함 확인',draft:'초안'}),'초안');
assert.equal(ctx.recordState_({draft:'초안',edited:true}),'검토 중');
assert.equal(ctx.recordState_({draft:'초안',edited:true,confirmed:true}),'최종 확정');
assert.equal(ctx.recordState_({draft:'초안',confirmed:true,stale:true}),'검토 중','Changed evidence voids 최종 확정');
assert.equal(ctx.recordState_({draft:'  ',confirmed:true}),'근거 미등록','Cannot confirm an empty draft');

// 5-1. Confirmation gate: evidence required, every sentence tied to evidence, no stale/over/block.
const ev={activity:'가상 합주',observed:'셈여림 변화를 구별하여 자신의 파트 음량을 조절함',work:'',change:''};
const good=Object.assign({},ev,{draft:ctx.buildRecordDraft_(ev.activity,ev.observed,'','').text});
const okCheck=plain(ctx.checkRecordText_(good.draft,[],1500));
const g0=plain(ctx.confirmGate_(good,okCheck));
assert(!g0.ok&&g0.reasons.some(r=>/사실관계를 직접 확인하지 않은/.test(r)),'Lexical link alone never confirms: teacher fact check required');
const checkAll=e=>{const c={};ctx.evidenceLinks_(e.draft,e).forEach(l=>c[ctx.textFingerprint_(l.sentence)]=true);return Object.assign({target:'대상'},e,{factChecks:c})};
assert(plain(ctx.confirmGate_(checkAll(good),okCheck)).ok,'Evidence-backed + teacher fact-checked draft can be confirmed');
// Counterexample (audit P0-3): reuses two evidence words but adds an unobserved activity.
const invent2=Object.assign({},ev,{draft:good.draft+' 셈여림 변화를 활용해 파트 반주를 직접 작곡하여 학급에 발표함.'});
const fakeLinks=plain(ctx.evidenceLinks_(invent2.draft,invent2));
assert(fakeLinks[1].linked,'Lexical link passes the invented sentence (this is why it is not fact verification)');
const fakeGate=plain(ctx.confirmGate_(invent2,plain(ctx.checkRecordText_(invent2.draft,[],1500))));
assert(!fakeGate.ok&&fakeGate.reasons.some(r=>/사실관계/.test(r)),'Invented sentence blocked until the teacher fact-checks it');
const partial=checkAll(good);partial.draft=invent2.draft;
assert(!plain(ctx.confirmGate_(partial,plain(ctx.checkRecordText_(invent2.draft,[],1500)))).ok,'A new sentence needs its own fact check');
assert(!/사실\s*검증\s*완료/.test(ui),'UI never claims 사실 검증 완료');
const noEvidence={activity:'',observed:'',work:'',change:'',draft:'가상 합주에서 훌륭한 연주 실력을 보여 줌.'};
assert(!plain(ctx.confirmGate_(noEvidence,plain(ctx.checkRecordText_(noEvidence.draft,[],1500)))).ok,'No evidence → blocked');
const invented=Object.assign({},ev,{draft:good.draft+' 리코더 독주에서 화려한 꾸밈음을 즉흥으로 연주함.'});
const g1=plain(ctx.confirmGate_(invented,plain(ctx.checkRecordText_(invented.draft,[],1500))));
assert(!g1.ok&&g1.reasons.some(r=>/연결되지 않는 문장/.test(r)),'Sentence not in evidence → blocked');
assert(!plain(ctx.confirmGate_(Object.assign(checkAll(good),{stale:true}),okCheck)).ok,'Stale → blocked');
assert(!plain(ctx.confirmGate_(Object.assign(checkAll(good),{target:'제외'}),okCheck)).ok,'입력 대상 아님 → not confirmable');
// v67.3 P0: only 대상 can be confirmed; 확인 필요, 제외, missing or unknown values block.
for(const t of ['확인 필요','제외',undefined,'','대상아님']){
  const g=plain(ctx.confirmGate_(Object.assign(checkAll(good),{target:t}),okCheck));
  assert(!g.ok&&g.reasons.some(r=>/입력 대상/.test(r)),'Target '+t+' must block');
}
assert(plain(ctx.confirmGate_(Object.assign(checkAll(good),{target:'대상'}),okCheck)).ok,'대상 + all checks → confirmable');
// P1-1: per-field change history; essay original counts only when a 산출물 summary is used.
const based=Object.assign({},good,{source:'가상 원문 v1'});based.basisFields=ctx.evidenceBasis_(based);
assert.deepEqual(plain(ctx.changedEvidence_(Object.assign({},based,{source:'가상 원문 v2'}))),[],'Essay not used as evidence → no invalidation');
const withWork=Object.assign({},based,{work:'감상문에서 빠르기 차이를 근거로 분위기를 비교함'});withWork.basisFields=ctx.evidenceBasis_(withWork);
assert.deepEqual(plain(ctx.changedEvidence_(Object.assign({},withWork,{source:'가상 원문 v2'}))),['논술 원문'],'Essay change voids essay-based evidence');
assert.deepEqual(plain(ctx.changedEvidence_(Object.assign({},withWork,{observed:'다른 관찰 내용 입력함',change:'변화'}))),['관찰 내용','변화 기록']);
assert.deepEqual(plain(ctx.changedEvidence_(Object.assign({},withWork,{observed:' '+withWork.observed+'  '}))),[],'Whitespace is not a change');
const banned=Object.assign({},ev,{draft:good.draft+' 셈여림 조절로 교외 대회에서 수상함.'});
assert(!plain(ctx.confirmGate_(banned,plain(ctx.checkRecordText_(banned.draft,[],1500)))).ok,'기재 불가 → blocked');
const warnOnly=Object.assign({},ev,{draft:good.draft+' 셈여림 변화를 성실하게 조절함.'});
assert(plain(ctx.confirmGate_(checkAll(warnOnly),plain(ctx.checkRecordText_(warnOnly.draft,[],1500)))).ok,'확인 필요 warning alone does not block');
assert.notEqual(ctx.evidenceSignature_(ev),ctx.evidenceSignature_(Object.assign({},ev,{observed:ev.observed+' 다시'})));
assert.equal(ctx.evidenceSignature_(ev),ctx.evidenceSignature_(Object.assign({},ev,{observed:'  '+ev.observed+' '})),'Whitespace is not a change');

// 5-2. Identity: class + number + name; renumbered roster is detected and never re-attached.
const idA=ctx.studentIdentity_('2-3',1,'가상 학생A');
assert.equal(idA,'2-3#1#가상학생A');
const work={};work[idA]={observed:'x'};work[ctx.studentIdentity_('2-3',2,'가상학생B')]={observed:'y'};
const mism=plain(ctx.rosterMismatches_(work,'2-3',[{number:1,name:'가상학생C'},{number:2,name:'가상학생B'}]));
assert.deepEqual(mism.map(m=>m.number),[1],'Same number, different name is flagged');

// 5-3. Save/restore DESIGN (fictional data only; not wired to any store).
const roster=[{number:1,name:'가상학생A'},{number:2,name:'가상학생B'}];
const w2={};w2[ctx.studentIdentity_('2-3',1,'가상학생A')]=Object.assign({},good,{source:'가상 논술 원문',confirmed:true,target:'대상',basisFields:ctx.evidenceBasis_(good)});
const exported=ctx.exportRecordWork_(w2,'2-3',roster);
assert(!exported.includes('가상 논술 원문'),'Essay originals are excluded from storage (data minimisation)');
const back=plain(ctx.restoreRecordWork_(exported,'2-3',roster));
const restored=back.restored['2-3#1#가상학생A'];
assert(restored&&restored.draft===good.draft&&restored.confirmed===false&&restored.stale===false&&restored.target==='대상'&&Object.keys(restored.factChecks).length===0,'Restored, but confirmation and fact checks must be re-done');
const renamed=plain(ctx.restoreRecordWork_(exported,'2-3',[{number:1,name:'가상학생Z'}]));
assert.equal(Object.keys(renamed.restored).length,0);assert.equal(renamed.rejected[0].reason,'이름 불일치');
assert.equal(plain(ctx.restoreRecordWork_(exported,'2-4',roster)).rejected[0].reason,'학급 불일치: 2-3');
assert.equal(plain(ctx.restoreRecordWork_('{bad','2-3',roster)).rejected[0].reason,'형식 오류');
assert(!/exportRecordWork_\(|restoreRecordWork_\(/.test(ui.split('// END OWNER_ONLY_HOME_CORE')[1]),'Storage design is not wired to the UI before school approval');

// 5-4. Grade-specific tabs must be accessible from the workroom, not only at the top of the dashboard.
assert(ui.includes('aria-label="교과세특 작성 학년 선택"'),'Grade selector must be inside the record workroom');
const recordPanel=ui.split('id="recordPanel"')[1].split('</section>')[0];
assert(recordPanel.includes('data-grade="2"')&&recordPanel.includes('data-grade="3"'),'Both grade switches visible in the record workroom');
assert(recordPanel.includes('2학년 · 1~9반')&&recordPanel.includes('3학년 · 4~9반'),'Grade-specific class ranges identified');

// 6. Discoverable workroom: named, reachable from an in-page nav and deep link.
for(const marker of ['id="recordPanel"','✎ 음악 교과세특 작성실','data-jump="recordPanel"','id="recordClass"','id="recordLoadClass"',
  'id="recordProgress"','id="recordWork"','id="recordSource"','id="recordBytes"','id="recordChecks"','id="confirmRecord"',
  'loc.parameter.view==="seteuk"','id="appBuild"','화면 버전 v67.3-seteuk','id="recordFacts"','id="recordTarget"','학업성적관리위원회','max="1500"','이 창의 임시 작업 현황 (저장 안 됨 · 누적 기록·완료율 아님)','파일 첨부: 지원하지 않음.','id="recordUnsaved"','id="recordMismatch"','id="recordGate"','id="recordRecheck"','id="recordLimit"'])
  assert(ui.includes(marker),'Missing workroom marker: '+marker);
// Per-student isolation fixes carrying one student's observation onto the next.
assert(ui.includes('function keyOf(s){return studentIdentity_(recordClassId,s.number,s.name)}'),'Workspace key includes the roster name');
assert(ui.includes('loadRecordFields();renderRecordProgress();'),'Selecting a student must load that student\'s own fields');
assert(!/<a[^>]+href="#/.test(ui),'base target=_top: in-page links must be buttons, not # anchors');

// 7. Privacy: no storage, network, or sending essay text to the server.
assert(!ui.includes('localStorage')&&!ui.includes('sessionStorage')&&!ui.includes('indexedDB'),'No persistence');
// Preserve the prohibition on record/essay exfiltration; allow only fixed public class timetable reads.
assert(!/XMLHttpRequest|postMessage|sendBeacon/.test(ui),'No private draft network transmission');
assert(ui.includes("var PUBLIC_TIMETABLE='https://teacherhub-kr.github.io/my-teacher-os/live/';"),'Only class-level public JSON source is allowed');
const approvedReads=Array.from(ui.matchAll(/\bfetch\(([^)]*)\)/g),m=>m[1].trim());
assert.deepEqual(approvedReads.sort(),[
 "PUBLIC_TIMETABLE+'comcigan-status.json',{cache:'no-store',credentials:'omit'}",
 "PUBLIC_TIMETABLE+'comcigan.json',{cache:'no-store',credentials:'omit'}"
].sort(),'No outgoing fetch except credential-free public class timetable reads');
const serverFns=new Set((ui.match(/\.(getDashboardData|getStudentDetail)\(/g)||[]).map(x=>x.slice(1,-1)));
assert.deepEqual([...serverFns].sort(),['getDashboardData','getStudentDetail'],'Only existing read-only server calls');
assert(!/withUserObject|recordSource[^\n]*google\.script/.test(ui),'Essay text never goes to Apps Script');
const server=read('apps-script/music-dashboard/Code.gs')+read('apps-script/music-dashboard/StudentDetails.gs');
assert(!/\.setValue|\.setValues|appendRow|insertSheet|deleteRow|clear\(|setFormula/.test(server),'Server stays read-only on sheets');

// 8. Public entry: a tab in 학생·생활기록부 opens the owner-only app with a fixed view hint only.
const wf=read('teacher-workflow-v66.js'),pm=read('teacher-private-music-v56.js');
assert(wf.includes("['seteuk','음악 교과세특 작성 ↗']"));
assert(wf.includes("s.dataset.teacher56='open';s.dataset.teacher56View='seteuk'"));
assert(pm.includes('var VIEWS={seteuk:"seteuk"}'));
assert(pm.includes('openPrivate(item.dataset.teacher56View)'));
assert(!/getStudentDetail|recordDraft|recordObserved/.test(wf+pm),'Public shell never touches private record data');
const fake='https://script.google.com/macros/s/AKfycbxFAKEabcdefghijklmnopqrstuvwxyz0123/exec';
const opened=[];
const vctx={window:{addEventListener(){},open:(u)=>{opened.push(u);return {}}},
  localStorage:{getItem:()=>fake},document:{addEventListener(){},querySelector:()=>null,hidden:false},
  setTimeout(){},setInterval(){}};
vctx.globalThis=vctx;vm.runInNewContext(pm,vctx);
vctx.TeacherOSPrivateMusic56.openPrivate('seteuk');
vctx.TeacherOSPrivateMusic56.openPrivate();
vctx.TeacherOSPrivateMusic56.openPrivate('javascript:alert(1)');
assert.deepEqual(opened,[fake+'?view=seteuk',fake,fake],'Only allow-listed view hints are appended');
console.log('v67 music 교과세특 workroom: evidence-only drafts, NEIS bytes, checks, session isolation, entry and privacy PASS');
