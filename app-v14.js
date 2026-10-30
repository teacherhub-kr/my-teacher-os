(function(){
  const q=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const LOCAL_CFG_KEY='myTeacherOS.comciganConfig';
  let loading=false,config=null,lastPayload=null;
  function ensureYearSync(y){if(!y)return;y.liveTimetableWeeks=y.liveTimetableWeeks&&typeof y.liveTimetableWeeks==='object'?y.liveTimetableWeeks:{};y.comciganSync=y.comciganSync&&typeof y.comciganSync==='object'?y.comciganSync:{}}
  function readLocalConfig(){try{const x=JSON.parse(localStorage.getItem(LOCAL_CFG_KEY)||'null');return x&&typeof x==='object'?x:null}catch{return null}}
  function completeConfig(c){return !!(c&&Number(c.schoolCode)>0&&Number(c.teacherIndex)>0&&String(c.teacherName||'').trim())}
  function blankConfig(){return{enabled:false,schoolCode:'',teacherIndex:'',teacherName:'',syncHourKST:9}}
  function saveLocalConfig(next){localStorage.setItem(LOCAL_CFG_KEY,JSON.stringify(next));config={...next};return config}
  async function loadConfig(){if(config)return config;config=readLocalConfig()||blankConfig();return config}
  async function sameConfig(p,c){
    if(!p||!completeConfig(c)||!/^[0-9a-f]{64}$/.test(String(p.configFingerprint||'')))return false;
    if(!globalThis.crypto?.subtle||typeof TextEncoder==='undefined')return false;
    const name=String(c.teacherName||'').replace(/\s+/g,'').replace(/\*+$/g,'').slice(0,2);
    if(name.length!==2)return false;
    const source='teacher-os-config-v1|'+Number(c.schoolCode)+'|'+Number(c.teacherIndex)+'|'+name;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
    const expected=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
    return expected===p.configFingerprint;
  }
  function currentWeekStartKST(){
    const d=new Date(Date.now()+9*60*60*1000),offset=(d.getUTCDay()+6)%7;
    d.setUTCDate(d.getUTCDate()-offset);
    return [d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,'0'),String(d.getUTCDate()).padStart(2,'0')].join('-');
  }
  function currentTimetableFeed(p){
    const fetched=Date.parse(p?.fetchedAt||'');
    return p?.weekStart===currentWeekStartKST()&&Number.isFinite(fetched)&&fetched<=Date.now()+2*60*1000&&Date.now()-fetched<30*60*60*1000;
  }
  function ensureConfigDialog(){
    if(q('#comciganConfigDlg'))return;
    document.body.insertAdjacentHTML('beforeend',`<dialog id="comciganConfigDlg"><form class="modal" id="comciganConfigForm"><div class="modal-head"><div><span class="kicker">COMCIGAN</span><h2>컴시간 설정</h2><p class="muted">이 설정은 이 브라우저에만 저장됩니다. 다른 선생님이 같은 사이트를 열어도 서로의 설정은 바뀌지 않습니다.</p></div><button type="button" class="close" id="comciganConfigClose">×</button></div><div class="stack spaced"><label>학교코드<input class="field" id="comciganSchoolCode" inputmode="numeric" required placeholder="학교코드"></label><label>교사번호<input class="field" id="comciganTeacherIndex" inputmode="numeric" required placeholder="교사번호"></label><label>교사명<input class="field" id="comciganTeacherName" required placeholder="교사명"></label></div><div class="notice warning spaced"><b>개인 브라우저 설정.</b> 저장 전에는 어떤 공용 시간표도 자동 적용하지 않습니다. 저장한 학교·교사와 수집 결과가 정확히 일치할 때만 적용합니다.</div><div class="modal-actions"><button type="button" class="btn secondary" id="comciganConfigCancel">취소</button><button class="btn primary">설정 저장</button></div></form></dialog>`);
    q('#comciganConfigClose').onclick=()=>q('#comciganConfigDlg').close();
    q('#comciganConfigCancel').onclick=()=>q('#comciganConfigDlg').close();
    q('#comciganConfigForm').onsubmit=ev=>{
      ev.preventDefault();
      const schoolCode=Number(q('#comciganSchoolCode').value||0),teacherIndex=Number(q('#comciganTeacherIndex').value||0),teacherName=q('#comciganTeacherName').value.trim();
      if(!schoolCode||!teacherIndex||!teacherName)return alert('학교코드, 교사번호, 교사명을 모두 입력하세요.');
      saveLocalConfig({enabled:true,schoolCode,teacherIndex,teacherName,syncHourKST:9});
      const y=typeof cur==='function'?cur():null;if(y){ensureYearSync(y);y.comciganSync.status='waiting';localStorage.setItem(KEY,JSON.stringify(state))}
      q('#comciganConfigDlg').close();renderPlainSyncCard();pullComcigan(true);
    };
  }
  function openConfigDialog(){ensureConfigDialog();const c=config||blankConfig();q('#comciganSchoolCode').value=c.schoolCode||'';q('#comciganTeacherIndex').value=c.teacherIndex||'';q('#comciganTeacherName').value=c.teacherName||'';q('#comciganConfigDlg').showModal()}
  async function pullComcigan(manual=false){
    if(loading)return false;const y=typeof cur==='function'?cur():null;if(!y)return false;ensureYearSync(y);
    if(!completeConfig(config)){
      y.comciganSync.status='unconfigured';y.comciganSync.lastChecked=null;localStorage.setItem(KEY,JSON.stringify(state));renderPlainSyncCard();lockTimetableReadOnly();if(manual)openConfigDialog();return false;
    }
    loading=true;
    try{
      const healthResponse=await fetch('./live/comcigan-status.json?v='+Date.now(),{cache:'no-store'});
      if(!healthResponse.ok)throw Object.assign(new Error('컴시간 수집 상태를 확인할 수 없습니다.'),{code:'COLLECTOR_UNAVAILABLE'});
      const health=await healthResponse.json();
      if(health?.status!=='ok'||health?.verification!=='teacher-class-match')throw Object.assign(new Error('최신 컴시간 자동수집이 실패한 상태입니다.'),{code:'COLLECTOR_UNAVAILABLE'});
      const r=await fetch('./live/comcigan.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('아직 자동동기화 결과가 없습니다.');
      const p=await r.json();if(!p||!p.weekStart||!Array.isArray(p.slots))throw new Error('컴시간 파일 형식이 올바르지 않습니다.');
      if(!currentTimetableFeed(p))throw Object.assign(new Error('컴시간 자동수집 파일이 이번 주의 최신 자료가 아닙니다.'),{code:'STALE_FEED'});
      lastPayload=p;
      if(!(await sameConfig(p,config))){const e=new Error('저장한 학교·교사 설정과 현재 자동수집 결과가 다릅니다. 잘못된 시간표 적용을 막았습니다.');e.code='CONFIG_MISMATCH';throw e}
      y.liveTimetableWeeks[p.weekStart]={weekStart:p.weekStart,source:'컴시간 자동동기화',updatedAt:p.fetchedAt||new Date().toISOString(),slots:p.slots};
      y.comciganSync.lastChecked=new Date().toISOString();y.comciganSync.lastApplied=p.fetchedAt||new Date().toISOString();y.comciganSync.status='ok';
      localStorage.setItem(KEY,JSON.stringify(state));
      if(manual&&typeof render==='function')render();
      return true;
    }catch(err){
      y.comciganSync.lastChecked=new Date().toISOString();y.comciganSync.status=err?.code==='CONFIG_MISMATCH'?'mismatch':err?.code==='STALE_FEED'?'stale':err?.code==='COLLECTOR_UNAVAILABLE'?'error':'waiting';localStorage.setItem(KEY,JSON.stringify(state));
      if(manual)alert('컴시간 최신표 확인: '+err.message);
      return false;
    }finally{loading=false;renderPlainSyncCard();lockTimetableReadOnly();globalThis.TeacherOSPremiumDashboard49?.apply?.()}
  }
  // No local timetable overwrite: verified current-week data is a read-only view.
  function verifiedLiveSlots(y){
    if(!y||y.comciganSync?.status!=='ok'||!completeConfig(config))return null;
    const week=currentWeekStartKST(),feed=y.liveTimetableWeeks?.[week];
    const fetched=Date.parse(feed?.updatedAt||'');
    if(feed?.weekStart!==week||feed?.source!=='컴시간 자동동기화'||
       !Number.isFinite(fetched)||fetched>Date.now()+120000||Date.now()-fetched>=30*3600000||
       !Array.isArray(feed.slots)||feed.slots.length<1||feed.slots.length>40)return null;
    const days=['월','화','수','목','금'],seen=new Set();
    const monday=Date.parse(week+'T00:00:00Z');
    for(const s of feed.slots){
      const idx=days.indexOf(s?.day);
      const target=String(s?.target||''),subject=String(s?.subject||'');
      const when=String(s?.date||'')+'|'+String(s?.period||'');
      if(idx<0||!Number.isInteger(s?.period)||s.period<1||s.period>8||
         !/^[23]-\d{1,2}$/.test(target)||subject.length<1||subject.length>32||
         s.label!==target+' '+subject||s.source!=='컴시간 자동동기화'||
         s.date!==new Date(monday+idx*86400000).toISOString().slice(0,10)||
         seen.has(when))return null;
      seen.add(when);
    }
    return feed.slots;
  }
  function renderVerifiedTimetable(){
    const y=typeof cur==='function'?cur():null,slots=verifiedLiveSlots(y);
    const table=q('#timetableTable'),today=q('#todayTimetable');
    const todayDay=['일','월','화','수','목','금','토'][new Date(Date.now()+9*3600000).getUTCDay()];
    if(!slots){
      const message='검증된 이번 주 컴시간 시간표가 없습니다. 내 컴시간 설정과 최신 수집 상태를 확인하세요.';
      if(table)table.innerHTML='<tbody><tr><td class="empty">'+esc(message)+'</td></tr></tbody>';
      if(today)today.innerHTML='<span class="muted">'+esc(message)+'</span>';
      return;
    }
    const days=['월','화','수','목','금'];
    if(table){
      let html='<thead><tr><th>교시</th>'+days.map(d=>'<th>'+d+'</th>').join('')+'</tr></thead><tbody>';
      for(let p=1;p<=8;p++){
        html+='<tr><td><b>'+p+'</b></td>';
        for(const day of days){
          const lessons=slots.filter(s=>s.day===day&&s.period===p);
          html+='<td>'+lessons.map(s=>'<div class="slot">'+esc(s.label)+'</div>').join('')+'</td>';
        }
        html+='</tr>';
      }
      table.innerHTML=html+'</tbody>';
    }
    if(today){
      const lessons=slots.filter(s=>s.day===todayDay).sort((a,b)=>a.period-b.period);
      today.innerHTML=lessons.length
        ?lessons.map(s=>'<span>'+s.period+'교시 · '+esc(s.label)+'</span>').join('')
        :'<span class="muted">오늘 배정된 수업이 없습니다. (컴시간 검증 기준)</span>';
    }
  }
  function lockTimetableReadOnly(){
    const tt=q('#timetable');if(!tt)return;
    q('#ttAdd')?.remove();q('#ttExceptionAdd')?.remove();q('#ttExceptionList')?.closest('article')?.remove();q('#ttDlg')?.remove();q('#ttExceptionDlg')?.remove();
    const desc=tt.querySelector('.section-intro .muted');if(desc)desc.textContent='시간표는 컴시간에서 자동으로 가져옵니다. Teacher OS에서는 직접 수정하지 않습니다.';
    const notice=tt.querySelector('.notice');if(notice)notice.innerHTML='<b>자동 운영:</b> 이 브라우저에 저장한 컴시간 설정과 수집 결과가 정확히 일치할 때만 실제 주간표를 적용합니다.';
    const table=q('#timetableTable');if(table){table.classList.add('readonly-timetable');table.querySelectorAll('.cell-add').forEach(x=>x.remove());if(!table.dataset.readonlyGuard){table.dataset.readonlyGuard='1';table.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation()},true)}}
    renderVerifiedTimetable();
  }
  // Coverage is an advisory comparison against the teacher's 15 class targets.
  // A missing class does NOT by itself prove a collector failure or justify
  // overwriting a confirmed teacher/class-match feed.
  function teacherClassCoverage(slots){
    if(!Array.isArray(slots))return null;
    const expected=[];
    for(let room=1;room<=9;room++)expected.push('2-'+room);
    for(let room=4;room<=9;room++)expected.push('3-'+room);
    const assigned=new Set(slots.map(s=>String(s?.target||'')));
    const absent=expected.filter(cls=>!assigned.has(cls));
    return {present:expected.length-absent.length,expected:expected.length,absent};
  }
  function renderPlainSyncCard(){
    const y=typeof cur==='function'?cur():null,box=q('#liveSyncCard');if(!box||!y)return;ensureYearSync(y);ensureConfigDialog();
    const c=config||blankConfig(),configured=completeConfig(c),status=y.comciganSync.status||'unconfigured',ok=configured&&status==='ok',mismatch=configured&&status==='mismatch',stale=configured&&status==='stale',failed=configured&&status==='error';
    const last=configured?(lastPayload?.fetchedAt||y.comciganSync?.lastApplied):null,when=last?new Date(last).toLocaleString('ko-KR'):'-';
    const coverage=teacherClassCoverage(verifiedLiveSlots(y));
    const coverageNotice=coverage&&coverage.absent.length
      ? '<div class="notice warning" role="status" style="margin-top:10px"><b>수업 편성 대조 필요:</b> 검증된 이번 주 시간표에 담당 15개 반 중 '+coverage.present+
        '개 반만 표시됩니다. 미표시: '+esc(coverage.absent.join(', '))+
        '. 시간표 변경·행사·휴업 등의 영향일 수 있으므로 컴시간 원본과 확인하세요. 미표시가 곧 수집 오류라는 뜻은 아닙니다.</div>'
      : '';
    box.innerHTML=`<div class="sync-auto"><div class="sync-auto-icon">↻</div><div class="sync-auto-meta"><b>컴시간 개인 설정</b><span>학교·교사 설정은 이 브라우저에만 저장되고 다른 사용자와 공유되지 않습니다.</span></div><div class="sync-auto-time">기기별</div></div><div class="sync-config"><span>학교코드 ${esc(configured?c.schoolCode:'미설정')}</span><span>교사번호 ${esc(configured?c.teacherIndex:'미설정')}</span><span>교사 ${esc(configured?c.teacherName:'미설정')}</span><span>최근 적용 ${esc(when)}</span></div><div class="sync-row spaced"><span class="pill ${ok?'':'warn'}">${ok?'자동 적용 중':mismatch?'설정 불일치':stale?'시간표 최신성 만료':failed?'컴시간 수집 실패':configured?'수집 결과 확인 중':'개인 설정 필요'}</span><span class="live-source">${!configured?'처음 사용하는 브라우저입니다. 내 학교·교사 설정을 먼저 저장하세요.':mismatch?'현재 수집 결과가 내 설정과 달라 적용하지 않았습니다.':stale?'오래된 파일을 최신 시간표로 적용하지 않았습니다.':failed?'컴시간 자동수집 실패. 최신 시간표가 아니므로 원본에서 확인하세요.':'설정과 수집 결과가 일치할 때만 시간표를 적용합니다.'}</span><span style="flex:1"></span><button class="btn secondary tiny" id="comciganConfigEdit" type="button">${configured?'컴시간 설정 변경':'내 컴시간 설정'}</button><button class="btn secondary tiny" id="plainSyncNow" type="button" ${configured?'':'disabled'}>최신표 다시 불러오기</button></div>`;
    if(coverageNotice)box.insertAdjacentHTML('beforeend',coverageNotice);
    q('#comciganConfigEdit').onclick=openConfigDialog;q('#plainSyncNow').onclick=()=>pullComcigan(true);const old=q('#syncDlg');if(old)old.remove();lockTimetableReadOnly();
  }
  async function boot(){await loadConfig();ensureConfigDialog();lockTimetableReadOnly();const ok=await pullComcigan(false);if(ok&&typeof render==='function')render();renderPlainSyncCard();lockTimetableReadOnly();const foot=q('.side-foot');if(foot)foot.textContent='v0.14 · per-browser Comcigan config'}
  const previousRender=globalThis.render;if(typeof previousRender==='function'){globalThis.render=function(){const r=previousRender.apply(this,arguments);setTimeout(()=>{renderPlainSyncCard();lockTimetableReadOnly()},0);return r}}
  globalThis.TeacherOSComcigan14={verifiedSlots:verifiedLiveSlots,classCoverage:teacherClassCoverage};
  boot();
})();
