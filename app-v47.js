(function(){
  'use strict';
  const H=globalThis.TeacherOSSetupHealth47,D=globalThis.TeacherOSDesktopCore36;if(!H||!D)return;
  const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const DESKTOP_KEY='myTeacherOS.desktop36.settings.v1',NEIS_KEY='myTeacherOS.neis35.settings.v1',GOOGLE_KEY='myTeacherOS.google34.settings.v1',GOOGLE_STATE='myTeacherOS.google34.state.v1';
  let lastHealth=null,busy=false,timer=null;
  function read(key,fallback={}){try{return Object.assign({},fallback,JSON.parse(localStorage.getItem(key)||'{}'))}catch{return Object.assign({},fallback)}}
  function settingsInput(){return{desktopSettings:read(DESKTOP_KEY),neisSettings:read(NEIS_KEY),googleSettings:read(GOOGLE_KEY),googleState:read(GOOGLE_STATE),desktopHealth:lastHealth||{}}}
  function currentNeisMeta(){try{const y=typeof cur==='function'?cur():null;return y?.neis35||{}}catch{return{}}}
  function ensureCss(){if(q('#setupHealthCss47'))return;const l=document.createElement('link');l.id='setupHealthCss47';l.rel='stylesheet';l.href='app-v47.css?v=47.0-zero-config';document.head.appendChild(l)}
  function patchLegacy(){
    const desktop=read(DESKTOP_KEY),paired=H.validToken(desktop.token),dcard=q('#desktopSettings36');
    if(dcard){
      const kicker=dcard.querySelector('.kicker');if(kicker)kicker.textContent='TEACHER OS DESKTOP BRIDGE · AUTO';
      const p=dcard.querySelector('.head .muted');if(p)p.textContent=paired?'자동 페어링이 완료되었습니다. 이후에는 토큰을 입력하거나 문서를 다시 업로드할 필요가 없습니다.':'한 번 설치하면 일회용 코드로 자동 페어링됩니다. 장기 토큰을 직접 복사할 필요가 없습니다.';
      const input=q('#desktopToken36'),label=input?.closest('label'),save=q('#desktopSave36');
      if(paired){if(label)label.hidden=true;if(save)save.hidden=true;if(!q('#desktopPaired47')){const n=document.createElement('div');n.id='desktopPaired47';n.className='setup47-inline-ok';n.textContent='자동 페어링 완료 · 토큰 재입력 불필요';dcard.querySelector('.desktop36-toggle')?.before(n)}}
      else{if(label)label.hidden=false;if(save)save.hidden=false;q('#desktopPaired47')?.remove()}
    }
    const dash=q('#desktopBridge36');if(dash){const k=dash.querySelector('.kicker');if(k)k.textContent='LOCAL BRIDGE · AUTO'}
    const neis=read(NEIS_KEY),ncard=q('#neisSettings35');
    if(ncard){const input=q('#neisKey35');if(input)input.placeholder=neis.apiKey?'인증키 교체 시에만 새 키 입력':'나이스 교육정보 개방포털에서 발급한 인증키';const save=q('#neisSave35');if(save)save.textContent=neis.apiKey?'인증키 교체 저장':'인증키 저장';if(neis.apiKey&&!q('#neisConfigured47')){const n=document.createElement('div');n.id='neisConfigured47';n.className='setup47-inline-ok';n.textContent='NEIS 인증키 설정 완료 · 새 키로 교체할 때만 아래 입력칸을 사용하세요.';ncard.querySelector('.neis35-label')?.before(n)}if(!neis.apiKey)q('#neisConfigured47')?.remove()}
  }
  function ensureUI(){
    ensureCss();patchLegacy();const view=q('#settings');if(!view||q('#setupHealth47'))return;
    const intro=view.querySelector('.section-intro');const html=`<article id="setupHealth47" class="card setup47 spaced"><div class="setup47-head"><div><span class="kicker">ZERO-CONFIG HEALTH · v0.47</span><h3>자동화 준비 상태</h3><p class="muted">이미 끝난 설정을 다시 요구하지 않습니다. Teacher OS가 연결 상태를 스스로 확인합니다.</p></div><button id="setupCheck47" class="btn secondary" type="button">상태 다시 확인</button></div><div id="setupHeadline47" class="setup47-banner">확인 중…</div><div id="setupGrid47" class="setup47-grid"></div><div id="setupGuide47" class="mini spaced"></div></article>`;
    if(intro)intro.insertAdjacentHTML('afterend',html);else view.insertAdjacentHTML('afterbegin',html);q('#setupCheck47')?.addEventListener('click',()=>refresh(true));
  }
  function fmt(v){if(!v)return'아직 없음';try{return new Date(v).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}catch{return String(v)}}
  function render(){ensureUI();patchLegacy();const r=H.evaluate(settingsInput()),meta=currentNeisMeta(),head=q('#setupHeadline47'),grid=q('#setupGrid47'),guide=q('#setupGuide47');
    if(head){head.className='setup47-banner '+(r.essentialReady?'ok':'warn');head.innerHTML=`<b>${esc(r.headline)}</b><span>${esc(r.guidance)}</span>`}
    if(grid){const neisDetail=meta.lastError&&!meta.lastSuccessAt?`최근 오류: ${meta.lastError}`:meta.lastSuccessAt?`최근 동기화 ${fmt(meta.lastSuccessAt)}`:'인증키 저장됨';grid.innerHTML=`<div class="setup47-item ${r.neis.configured?'ok':'warn'}"><span>NEIS 공식 API</span><b>${esc(r.neis.status)}</b><small>${esc(neisDetail)}</small></div><div class="setup47-item ${r.desktop.healthy&&r.desktop.paired?'ok':'warn'}"><span>Desktop Bridge</span><b>${esc(r.desktop.status)}</b><small>${r.desktop.version?'Bridge v'+esc(r.desktop.version):r.desktop.paired?'watchdog 자동복구 대기':'설치/페어링 확인 필요'}</small></div><div class="setup47-item ${r.google.connected?'ok':'optional'}"><span>Google 자동화 · 추가</span><b>${esc(r.google.status)}</b><small>${r.google.configured?'Gateway 설정됨':'Gmail·Drive·Calendar가 필요할 때 연결'}</small></div>`}
    if(guide)guide.innerHTML=r.essentialReady?'<b>지금 사용자에게 필요한 추가 설정은 없습니다.</b> NEIS·K-에듀파인 자료는 평소처럼 다운로드하면 Bridge가 자동 감지합니다.':'문제가 있는 연결만 위 상태에 표시합니다. 정상인 항목은 다시 입력할 필요가 없습니다.';
  }
  async function bridgeHealth(){try{const r=await fetch(D.ENDPOINT+'/v1/health',{cache:'no-store',referrerPolicy:'no-referrer'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}catch{return{ok:false,error:'bridge_unreachable'}}}
  function bridgePaired(){try{return H.validToken(read(DESKTOP_KEY).token)}catch{return false}}
  async function refresh(manual=false){if(busy)return;if(!manual&&!bridgePaired()){render();return}busy=true;const btn=q('#setupCheck47');if(btn)btn.disabled=true;try{lastHealth=await bridgeHealth();render();if(manual&&lastHealth?.ok===true&&H.validToken(read(DESKTOP_KEY).token)){q('#desktopSync36')?.click()} }finally{busy=false;if(btn)btn.disabled=false}}
  function schedule(){if(timer)clearInterval(timer);timer=setInterval(()=>refresh(false),30000)}
  const prev=globalThis.render;if(typeof prev==='function')globalThis.render=function(){const out=prev.apply(this,arguments);setTimeout(()=>{ensureUI();render()},0);return out};
  setTimeout(()=>{ensureUI();refresh(false);schedule()},1000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh(false)});window.addEventListener('online',()=>refresh(false));
  globalThis.TeacherOSSetupRuntime47={refresh};
})();

(function loadV48(){
  if(document.getElementById('teacherSimpleCore48')||document.getElementById('teacherSimpleApp48'))return;
  const core=document.createElement('script');core.id='teacherSimpleCore48';core.src='simple-ui-core-v48.js?v=48.0-simple';core.onload=()=>{const app=document.createElement('script');app.id='teacherSimpleApp48';app.src='app-v48.js?v=48.0-simple';document.body.appendChild(app)};document.body.appendChild(core);
})();
