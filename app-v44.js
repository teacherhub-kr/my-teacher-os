(function(){
  const P=globalThis.TeacherOSPairing44,D=globalThis.TeacherOSDesktopCore36;if(!P||!D)return;
  const SETTINGS_KEY='myTeacherOS.desktop36.settings.v1',STATE_KEY='myTeacherOS.desktop36.state.v1',AUDIT_KEY='myTeacherOS.desktop36.audit.v1';
  function audit(event,message,extra){let a=[];try{a=JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]');if(!Array.isArray(a))a=[]}catch{}a.push({at:new Date().toISOString(),event,message,extra:extra||{}});try{localStorage.setItem(AUDIT_KEY,JSON.stringify(a.slice(-200)))}catch{}}
  function clearPairHash(){try{if(location.hash)history.replaceState(null,'',location.pathname+location.search)}catch{}}
  function notice(text,kind){const id='pairNotice44';let el=document.getElementById(id);if(!el){el=document.createElement('div');el.id=id;el.style.cssText='position:fixed;z-index:99999;right:18px;bottom:18px;max-width:420px;padding:12px 14px;border-radius:12px;background:white;box-shadow:0 10px 30px rgba(0,0,0,.16);font:700 13px/1.5 -apple-system,BlinkMacSystemFont,"Noto Sans KR",sans-serif';document.body.appendChild(el)}el.textContent=text;el.dataset.kind=kind||'';setTimeout(()=>el.remove(),7000)}
  async function exchange(nonce){
    clearPairHash();
    if(!P.validNonce(nonce))return;
    try{
      const r=await fetch(D.ENDPOINT+'/v1/pair',{method:'POST',headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({nonce}),cache:'no-store',referrerPolicy:'no-referrer'});
      const body=await r.json().catch(()=>({}));
      if(!r.ok||!body.ok||!D.validToken(body.token))throw new Error(body.error||'pairing_failed');
      const next=P.mergeDesktopSettings(localStorage.getItem(SETTINGS_KEY)||'',body.token);next.endpoint=D.ENDPOINT;next.autoSync=true;
      localStorage.setItem(SETTINGS_KEY,JSON.stringify(next));
      let st={cursor:0,lastSyncAt:'',connected:false,lastError:''};try{st=Object.assign(st,JSON.parse(localStorage.getItem(STATE_KEY)||'{}'))}catch{}st.cursor=0;st.connected=false;st.lastError='';localStorage.setItem(STATE_KEY,JSON.stringify(st));
      audit('zero_copy_pair','Desktop Bridge를 일회용 코드로 자동 페어링했습니다. 장기 토큰은 URL에 노출하지 않았습니다.',{bridgeVersion:String(body.version||'')});
      notice('Desktop Bridge 자동 연결 완료 · 이제 토큰을 복사할 필요가 없습니다.','ok');
      setTimeout(()=>location.reload(),700);
    }catch(e){audit('zero_copy_pair_failure','자동 페어링에 실패했습니다.',{error:String(e?.message||e)});notice('자동 페어링 실패 · 설치 프로그램을 다시 실행하면 새 일회용 코드로 재시도합니다.','warn')}
  }
  const nonce=P.parseHash(location.hash);if(nonce)setTimeout(()=>exchange(nonce),0);
  globalThis.TeacherOSPairingRuntime44={exchange};
})();

(function loadV47(){
  if(document.getElementById('teacherSetupHealthCore47')||document.getElementById('teacherSetupApp47'))return;
  const core=document.createElement('script');core.id='teacherSetupHealthCore47';core.src='setup-health-core-v47.js?v=47.0-zero-config';core.onload=()=>{const app=document.createElement('script');app.id='teacherSetupApp47';app.src='app-v47.js?v=47.1-paired-probe';document.body.appendChild(app)};document.body.appendChild(core);
})();
