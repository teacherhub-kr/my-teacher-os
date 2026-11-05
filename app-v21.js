(function(){
  const q21=s=>document.querySelector(s),qa21=s=>[...document.querySelectorAll(s)];
  const esc21=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const EVIDENCE_KINDS21=new Set(['담임관찰','교과관찰','자율자치활동','진로활동','동아리·창체','수업·평가관찰']);
  const SENSITIVE_RE21=/(질병|진단|약물|정신|우울|자해|가정폭력|이혼|경제사정|기초생활|성폭력|성적지향|종교|장애|주민등록|전화번호)/;
  const AREA_LABEL21={behavior:'행동특성 및 종합의견',autonomy:'자율·자치활동',career:'진로활동',subject:'과목별 세부능력 및 특기사항'};
  const VARIANT_LABEL21={A:'A · 성장 흐름형',B:'B · 참여·과정형',C:'C · 간결 종합형'};
  let area21='',selectedVariant21='',selectedFocus21='';
  const QUICK_FOCUS21={
    behavior:['협력·소통','맡은 역할·책임','배려·공동체','문제해결·변화','기타 직접 관찰'],
    autonomy:['학급자치·의견 수렴','학급 행사·역할 수행','공동체 활동','안전·규칙 실천','기타 직접 관찰'],
    career:['직업 정보 탐색','진로 체험·활동','탐색 결과 발표','진로 성찰·계획','기타 직접 관찰'],
    subject:['음악 감상·비교','가창·기악 수행','음악 창작·표현','수업 중 피드백 적용','기타 직접 관찰']
  };
  const QUICK_KIND21={behavior:'담임관찰',autonomy:'자율자치활동',career:'진로활동',subject:'교과관찰'};
  function koreanToday21(){return new Date(Date.now()+9*3600000).toISOString().slice(0,10)}

  function y21(){return typeof cur==='function'?cur():null}
  function save21(){localStorage.setItem(KEY,JSON.stringify(state))}
  function selectedStudentId21(){return q21('#srStudentList .sr-student.active')?.dataset?.studentId||''}
  function roles21(y=y21()){return new Set(y?.roleProfile?.roles||[])}
  function availableAreas21(y=y21()){
    const r=roles21(y),out=[];
    if(r.has('homeroom'))out.push('behavior','autonomy','career');
    if(r.has('subject'))out.push('subject');
    return out;
  }
  function ensureState21(){
    state.version=Math.max(Number(state.version)||0,21);
    Object.values(state.years||{}).forEach(y=>{y.studentDrafts=y.studentDrafts&&typeof y.studentDrafts==='object'?y.studentDrafts:{}});
    save21();
  }
  function evidence21(studentId,area,y=y21()){
    return (y?.studentRecords||[])
      .filter(r=>r.studentId===studentId&&r.eligible===true&&r.area===area&&EVIDENCE_KINDS21.has(r.kind)&&!SENSITIVE_RE21.test(r.text||''))
      .sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
  }
  function cleanFact21(v){return String(v||'').replace(/\s+/g,' ').replace(/[.!?]+$/,'').trim()}
  function punct21(v){const s=cleanFact21(v);return s?`${s}.`:''}
  // No blanket claims such as sustained growth or responsibility without evidence.
  // Variants only reorder, combine or shorten the teacher's observed facts.
  function makeVariants21(rows,area){
    const facts=rows.map(r=>cleanFact21(r.text)).filter(Boolean).slice(-10);if(!facts.length)return null;
    // Do not infer a sequence ("이후", "최근") or lasting trait from undated facts.
    const a=facts.map(punct21).join(' ');
    const process=[...facts].sort((x,y)=>{
      const score=s=>(/(협력|도움|소통|모둠|참여|역할|책임|주도|준비|연습|탐색|발표)/.test(s)?1:0);return score(y)-score(x)
    });
    const b=process.map(punct21).join(' ');
    const compact=facts.length<=4?facts:[facts[0],facts[Math.floor((facts.length-1)/2)],facts[facts.length-1]];
    const c=compact.map(punct21).join(' ');
    return {A:a.replace(/\s+/g,' ').trim().slice(0,1600),B:b.replace(/\s+/g,' ').trim().slice(0,1600),C:c.replace(/\s+/g,' ').trim().slice(0,1600)};
  }
  function currentDraft21(sid,area,y=y21()){return y?.studentDrafts?.[sid]?.[area]||null}
  function ensureStudio21(){
    const old=q21('#srDraftButtons'),article=old?.closest('article');if(!article)return false;
    old.hidden=true;q21('#srDraftText')&&(q21('#srDraftText').hidden=true);q21('#srDraftEvidence')&&(q21('#srDraftEvidence').hidden=true);
    if(!q21('#srDraftStudio'))article.insertAdjacentHTML('beforeend',`<div id="srDraftStudio" class="v21-draft-studio">
      <div class="v21-tabs" id="v21AreaTabs"></div>
      <div class="v21-evidence-head"><div><b>이번 초안에 사용할 근거</b><small>직접 관찰로 표시된 기록만 나타납니다. 상담·학폭·생활지도·민감정보는 자동 제외됩니다.</small></div><span class="pill" id="v21EvidenceCount">0개 선택</span></div>
      <div id="v21EvidenceList" class="v21-evidence-list"></div>
      <section id="v21QuickCapture" class="v21-quick-capture" aria-label="직접 관찰 근거 등록">
        <button type="button" class="btn secondary" id="v21ToggleCapture" aria-expanded="false">+ 이 학생의 관찰 근거 추가</button>
        <div id="v21CaptureBody" hidden>
          <p class="v21-quick-note">① 실제로 확인한 관찰 초점을 선택하세요. 선택만으로 학생의 행동을 기록하거나 초안을 만들지 않습니다.</p>
          <div id="v21QuickFocus" class="v21-quick-focus" role="group" aria-label="관찰 초점 선택"></div>
          <label class="v21-quick-label">② 관찰 날짜 <input type="date" class="field" id="v21QuickDate"></label>
          <label class="v21-quick-label">③ 직접 본 구체적인 행동·학생의 결과물
            <textarea id="v21QuickFact" class="field" rows="4" placeholder="언제·어떤 학교활동에서·학생이 실제로 무엇을 했는지 구체적으로 적으세요. 추정·평가점수·상담내용은 제외합니다."></textarea>
          </label>
          <label class="v21-quick-confirm"><input id="v21QuickConfirmed" type="checkbox">④ 해당 학년도 학교교육활동에서 직접 관찰·평가한 사실이며, 생활기록부 초안의 근거로 사용함을 확인합니다.</label>
          <div class="v21-quick-foot"><button type="button" class="btn primary" id="v21QuickSave">선택한 사실을 근거로 등록</button><span class="mini" id="v21QuickStatus" role="status" aria-live="polite"></span></div>
          <p class="v21-quick-warning">이전 학년 생기부·상담·생활지도·질병·가정형편 자료는 직접 관찰 근거로 자동 등록되지 않습니다. 기록은 현재 기기의 브라우저에만 저장됩니다.</p>
        </div>
      </section>
      <div class="v21-actions"><button type="button" class="btn primary" id="v21Generate">선택 근거로 초안 3개 만들기</button><span id="v21DraftStatus" class="mini"></span></div>
      <div id="v21DraftGrid" class="v21-draft-grid"></div>
      <div class="v21-savebar"><div><b id="v21SelectedLabel">초안을 선택하세요</b><small id="v21SavedAt">A/B/C를 비교한 뒤 하나를 선택하고 필요하면 문장을 수정하세요.</small></div><button type="button" class="btn primary" id="v21SaveDraft" disabled>선택 초안 저장</button></div>
    </div>`);
    return true;
  }
  function renderQuickCapture21(){
    const box=q21('#v21QuickFocus');if(!box)return;
    box.innerHTML=(QUICK_FOCUS21[area21]||[]).map(v=>`<button type="button" class="v21-focus-chip ${selectedFocus21===v?'selected':''}" data-v21-focus="${esc21(v)}" aria-pressed="${selectedFocus21===v?'true':'false'}">${esc21(v)}</button>`).join('');
    const date=q21('#v21QuickDate');if(date&&!date.value)date.value=koreanToday21();
  }
  function openQuickCapture21(){
    const body=q21('#v21CaptureBody'),toggle=q21('#v21ToggleCapture');
    if(!body||!toggle)return;
    body.hidden=false;toggle.setAttribute('aria-expanded','true');
    renderQuickCapture21();q21('#v21QuickFocus [data-v21-focus]')?.focus();
    body.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function saveQuickEvidence21(){
    const y=y21(),sid=selectedStudentId21(),date=q21('#v21QuickDate')?.value||'',
      raw=q21('#v21QuickFact')?.value||'',fact=raw.replace(/\s+/g,' ').trim(),
      confirmed=q21('#v21QuickConfirmed')?.checked,status=q21('#v21QuickStatus');
    const fail=message=>{if(status)status.textContent=message;return false};
    if(!y||!sid||!availableAreas21(y).includes(area21))return fail('먼저 학생과 작성 항목을 선택하세요.');
    if(!selectedFocus21)return fail('실제 관찰한 항목을 하나 선택하세요.');
    if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||date>koreanToday21())return fail('실제 관찰 날짜를 확인하세요.');
    if(fact.length<15)return fail('학생의 구체적 행동이나 결과를 15자 이상 기록하세요.');
    if(fact.length>700)return fail('근거가 너무 깁니다. 구체적 사실 700자 이내로 정리하세요.');
    if(SENSITIVE_RE21.test(fact))return fail('민감정보가 포함된 것으로 보입니다. 제외한 후 다시 확인하세요.');
    if(!confirmed)return fail('교사의 직접 관찰·평가 사실 확인을 체크하세요.');
    const kind=QUICK_KIND21[area21];
    if(!kind||!EVIDENCE_KINDS21.has(kind))return fail('허용되지 않는 기록 종류입니다.');
    const id=globalThis.crypto?.randomUUID?.()||('record-'+Date.now()+'-'+Math.random().toString(16).slice(2));
    y.studentRecords=Array.isArray(y.studentRecords)?y.studentRecords:[];
    y.studentRecords.push({id,studentId:sid,date,kind,text:fact,eligible:true,area:area21,
      focus:selectedFocus21,source:'교사 직접 관찰·확인',createdAt:new Date().toISOString()});
    save21();selectedFocus21='';
    q21('#v21QuickFact').value='';q21('#v21QuickConfirmed').checked=false;
    if(status)status.textContent='직접 관찰 근거를 등록했습니다. 아래에서 체크하고 초안을 만드세요.';
    renderQuickCapture21();renderEvidence21();
    // Legacy student timeline is rebuilt by the established render pipeline.
    const rerender=typeof globalThis.render==='function'?globalThis.render:null;
    if(rerender)setTimeout(()=>rerender(),0);
    return true;
  }
  function evidenceSelection21(){return new Set(qa21('[data-v21-evidence]:checked').map(x=>x.value))}
  function updateEvidenceCount21(){const checked=qa21('[data-v21-evidence]:checked').length,total=qa21('[data-v21-evidence]').length;const el=q21('#v21EvidenceCount');if(el)el.textContent=`${checked}/${total}개 선택`}
  function renderTabs21(){
    const areas=availableAreas21();if(!areas.includes(area21))area21=areas[0]||'';
    const box=q21('#v21AreaTabs');if(!box)return;
    box.innerHTML=areas.length?areas.map(a=>`<button type="button" class="v21-tab ${a===area21?'active':''}" data-v21-area="${a}">${esc21(a==='subject'?`${(y21()?.subjects||['교과'])[0]} 과세특`:AREA_LABEL21[a])}</button>`).join(''):'<div class="empty">현재 역할에는 생활기록부 서술형 초안 항목이 없습니다.</div>';
  }
  function renderEvidence21(){
    const sid=selectedStudentId21(),box=q21('#v21EvidenceList');if(!box)return;
    if(!sid||!area21){box.innerHTML='<div class="empty">학생과 작성 항목을 선택하세요.</div>';updateEvidenceCount21();return}
    const rows=evidence21(sid,area21);box.innerHTML=rows.length?rows.map(r=>`<label class="v21-evidence"><input type="checkbox" data-v21-evidence value="${esc21(r.id)}" checked><span><b>${esc21(r.date||'날짜 없음')} · ${esc21(r.kind||'관찰')}</b><small>${esc21(r.text||'')}</small></span></label>`).join(''):'<div class="empty v21-evidence-empty"><b>작성할 직접 관찰 근거가 아직 없습니다.</b><span>아래에서 활동을 선택하고 실제 관찰한 행동을 기록하면 이곳에 나타납니다.</span><button type="button" class="btn secondary" data-v21-open-capture>+ 관찰 근거 작성하기</button></div>';
    const generate=q21('#v21Generate');if(generate)generate.disabled=rows.length===0;
    updateEvidenceCount21();
  }
  function renderDraftCards21(variants,stored){
    const box=q21('#v21DraftGrid');if(!box)return;const data=variants||stored?.variants||null;
    box.dataset.evidenceIds=Array.isArray(stored?.evidenceIds)?stored.evidenceIds.join(','):'';
    if(!data){box.innerHTML='<div class="empty v21-wide">근거를 선택하고 초안 3개 만들기를 누르세요.</div>';selectedVariant21='';updateSavebar21(stored);return}
    if(!selectedVariant21)selectedVariant21=stored?.selectedVariant||'';
    box.innerHTML=['A','B','C'].map(k=>`<article class="v21-draft-card ${selectedVariant21===k?'selected':''}" data-v21-card="${k}"><div class="v21-draft-title"><b>${VARIANT_LABEL21[k]}</b><button type="button" class="btn secondary tiny" data-v21-select="${k}">${selectedVariant21===k?'선택됨':'이 초안 선택'}</button></div><textarea class="field v21-draft-text" data-v21-text="${k}" rows="9">${esc21(data[k]||'')}</textarea></article>`).join('');updateSavebar21(stored)
  }
  function updateSavebar21(stored=currentDraft21(selectedStudentId21(),area21)){
    const label=q21('#v21SelectedLabel'),meta=q21('#v21SavedAt'),save=q21('#v21SaveDraft');if(!label||!save)return;
    label.textContent=selectedVariant21?`${VARIANT_LABEL21[selectedVariant21]} 선택됨`:'초안을 선택하세요';save.disabled=!selectedVariant21;
    meta.textContent=stored?.updatedAt?`마지막 저장 ${new Date(stored.updatedAt).toLocaleString('ko-KR')} · 근거 ${stored.evidenceIds?.length||0}개`:'A/B/C를 비교한 뒤 하나를 선택하고 필요하면 문장을 수정하세요.';
  }
  function renderStudio21(){
    if(!ensureStudio21())return;renderTabs21();renderQuickCapture21();renderEvidence21();const sid=selectedStudentId21(),stored=sid&&area21?currentDraft21(sid,area21):null;selectedVariant21=stored?.selectedVariant||'';renderDraftCards21(null,stored);const chip=q21('#v17Chip');if(chip)chip.textContent='v0.21 · 근거 기반 3개 초안';const foot=q21('.side-foot');if(foot)foot.textContent='v0.21 · evidence draft studio';
  }
  function generate21(){
    const y=y21(),sid=selectedStudentId21();if(!y||!sid||!area21)return alert('학생과 작성 항목을 먼저 선택하세요.');
    const chosen=evidenceSelection21(),rows=evidence21(sid,area21).filter(r=>chosen.has(r.id));if(!rows.length)return alert('초안에 사용할 관찰 근거를 하나 이상 선택하세요.');
    const variants=makeVariants21(rows,area21);selectedVariant21='';renderDraftCards21(variants,null);q21('#v21DraftGrid').dataset.evidenceIds=rows.map(r=>r.id).join(',');q21('#v21DraftStatus').textContent=`직접 관찰 근거 ${rows.length}개로 3개 초안을 만들었습니다.`;
  }
  function selectVariant21(k){selectedVariant21=k;qa21('[data-v21-card]').forEach(c=>c.classList.toggle('selected',c.dataset.v21Card===k));qa21('[data-v21-select]').forEach(b=>b.textContent=b.dataset.v21Select===k?'선택됨':'이 초안 선택');updateSavebar21()}
  function saveDraft21(){
    const y=y21(),sid=selectedStudentId21();if(!y||!sid||!area21||!selectedVariant21)return;const ta=q21(`[data-v21-text="${selectedVariant21}"]`),text=ta?.value.trim();if(!text)return alert('저장할 초안 내용이 없습니다.');
    const variants={};['A','B','C'].forEach(k=>variants[k]=q21(`[data-v21-text="${k}"]`)?.value.trim()||'');
    const prev=currentDraft21(sid,area21,y)||{},gridIds=(q21('#v21DraftGrid')?.dataset.evidenceIds||'').split(',').filter(Boolean),evidenceIds=gridIds.length?gridIds:(Array.isArray(prev.evidenceIds)?prev.evidenceIds:[]),history=Array.isArray(prev.history)?prev.history.slice(-9):[];if(prev.text)history.push({text:prev.text,selectedVariant:prev.selectedVariant||'',evidenceIds:prev.evidenceIds||[],savedAt:prev.updatedAt||new Date().toISOString()});
    y.studentDrafts[sid]=y.studentDrafts[sid]||{};y.studentDrafts[sid][area21]={...prev,text,selectedVariant:selectedVariant21,variants,evidenceIds,updatedAt:new Date().toISOString(),history};save21();q21('#v21DraftStatus').textContent='선택한 초안을 저장했습니다. 원문 근거와 연결도 함께 보존됩니다.';updateSavebar21(y.studentDrafts[sid][area21]);
  }
  function bind21(){
    document.body.addEventListener('click',e=>{
      const area=e.target.closest('[data-v21-area]');if(area){area21=area.dataset.v21Area;selectedVariant21='';selectedFocus21='';renderStudio21();return}
      const sel=e.target.closest('[data-v21-select]');if(sel){selectVariant21(sel.dataset.v21Select);return}
      if(e.target.closest('#v21ToggleCapture,[data-v21-open-capture]')){openQuickCapture21();return}
      const focus=e.target.closest('[data-v21-focus]');if(focus){selectedFocus21=focus.dataset.v21Focus;renderQuickCapture21();return}
      if(e.target.closest('#v21QuickSave')){saveQuickEvidence21();return}
      if(e.target.closest('#srSaveRecord,[data-record-del]')){setTimeout(renderStudio21,0)}
      if(e.target.closest('#v21Generate')){generate21();return}
      if(e.target.closest('#v21SaveDraft')){saveDraft21();return}
      if(e.target.closest('[data-student-id]'))setTimeout(()=>{selectedVariant21='';selectedFocus21='';q21('#v21QuickFact')&&(q21('#v21QuickFact').value='');q21('#v21QuickConfirmed')&&(q21('#v21QuickConfirmed').checked=false);renderStudio21()},0);
    });
    document.body.addEventListener('change',e=>{if(e.target.matches('[data-v21-evidence]'))updateEvidenceCount21()});
  }
  ensureState21();bind21();setTimeout(renderStudio21,0);
  const prevRender21=globalThis.render;if(typeof prevRender21==='function')globalThis.render=function(){const r=prevRender21.apply(this,arguments);setTimeout(renderStudio21,0);return r};
  const prevSwitch21=globalThis.switchView;if(typeof prevSwitch21==='function')globalThis.switchView=function(id){const r=prevSwitch21.apply(this,arguments);if(id==='studentrecords')setTimeout(renderStudio21,0);return r};
})();
