/* Teacher OS v53 — truthful, privacy-safe connection diagnostics.
   The public Pages shell never downloads private student scores or API secrets. */
(function(){
  'use strict';
  var KEY_YEAR='myTeacherOS.v01';
  var KEY_SHEET='myTeacherOS.teacher49.sheetUrl';
  var KEY_GOOGLE='myTeacherOS.google34.settings.v1',KEY_GOOGLE_STATUS='myTeacherOS.google34.state.v1';
  var KEY_NEIS='myTeacherOS.neis35.settings.v1',KEY_DESKTOP='myTeacherOS.desktop36.settings.v1',KEY_DESKTOP_STATUS='myTeacherOS.desktop36.state.v1';
  var $=function(s){return document.querySelector(s)};
  var lastStatus='',initialized=false;
  function read(key){try{var v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'?v:{}}catch(e){return {}}}
  function text(value){return String(value==null?'':value)}
  function safeSheetUrl(value){
    var s=text(value).trim();
    var m=/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})(?:\/(?:edit|view)?)?(?:[?#].*)?$/.exec(s);
    return m?'https://docs.google.com/spreadsheets/d/'+m[1]+'/edit':'';
  }
  function age(date){
    var t=Date.parse(date||'');
    return Number.isFinite(t)&&t<=Date.now()+120000?Math.max(0,Date.now()-t):Infinity;
  }
  function state(){
    var y=read(KEY_YEAR),current=y.currentYear&&y.years&&y.years[y.currentYear];
    var g=read(KEY_GOOGLE),gs=read(KEY_GOOGLE_STATUS),n=read(KEY_NEIS),d=read(KEY_DESKTOP),ds=read(KEY_DESKTOP_STATUS);
    var sheet=safeSheetUrl((function(){try{return localStorage.getItem(KEY_SHEET)}catch(e){return''}})());
    var ninfo=current&&current.neis35||{};
    var googleRecent=!!(g.gatewayUrl&&gs.connected&&age(gs.lastSyncAt)<20*60000&&!gs.lastError);
    var desktopRecent=!!(d.token&&ds.connected&&age(ds.lastSyncAt)<20*60000&&!ds.lastError);
    var neisRecent=!!(n.apiKey&&age(ninfo.lastSuccessAt)<24*3600000&&!ninfo.lastError);
    var rows=[
      {key:'year',name:'학년도·학교 설정',state:current?'ok':'missing',value:current?text(current.year)+'학년도 · '+text(current.schoolName||current.schoolLevel||'설정됨'):'학년도 없음',detail:current?'이 브라우저에 학년도 정보가 저장되어 있습니다.':'지금 보는 브라우저에 학년도 정보가 없습니다.',action:'학년도 설정',target:'year'},
      {key:'sheet',name:'음악 가변형 스케줄표',state:sheet?'partial':'missing',value:sheet?'원본 주소 등록됨':'원본 주소 미등록',detail:sheet?'Google Sheets 원본을 열 수 있는 링크입니다. 점수·진도가 자동으로 화면에 동기화되는 연결은 아닙니다.':'교사 계정으로 열 수 있는 비공개 원본 주소를 아래에 등록하세요.',action:sheet?'원본 열기':'원본 주소 입력',target:sheet?'sheet-open':'sheet-focus'},
      {key:'google',name:'Google Gmail·Drive·Calendar',state:googleRecent?'ok':g.gatewayUrl?'partial':'missing',value:googleRecent?'최근 동기화 기록 확인':g.gatewayUrl?'Gateway 주소 있음 · 현재 연결 미확인':'Apps Script Gateway 미설정',detail:gs.lastError?'최근 오류: '+text(gs.lastError).slice(0,160):g.gatewayUrl?'최근 기록 기준입니다. 실제 현재 접속 보장은 아닙니다.':'Google 자동화는 별도 Apps Script 승인과 Gateway 설정이 필요합니다.',action:'Google 설정',target:'google'},
      {key:'neis',name:'나이스 공식 일정',state:neisRecent?'ok':n.apiKey?'partial':'missing',value:neisRecent?'최근 동기화 기록 확인':n.apiKey?'인증키 저장됨 · 최신 동기화 미확인':'나이스 인증키 미등록',detail:ninfo.lastError?'최근 오류: '+text(ninfo.lastError).slice(0,160):'나이스 학교정보·학사일정은 인증키와 학년도 학교 설정이 모두 필요합니다.',action:'나이스 설정',target:'neis'},
      {key:'desktop',name:'PC 자료 동기화',state:desktopRecent?'ok':d.token?'partial':'missing',value:desktopRecent?'최근 PC 동기화 기록':d.token?'페어링 정보 있음 · 현재 접속 미확인':'PC 연결 미설정',detail:ds.lastError?'최근 오류: '+text(ds.lastError).slice(0,160):'Desktop Bridge 프로그램 실행 및 페어링이 필요합니다.',action:'PC 연결',target:'desktop'},
      {key:'live',name:'수행평가 원본 → 대시보드 실시간 집계',state:'missing',value:'인증된 자동 집계 경로 미구축',detail:'현재 화면은 Google Sheets의 학생별 성적을 읽지 않습니다. 공개 사이트에 개인정보·점수를 게시하거나 원본을 웹에 공개하지 마세요.',action:'안전한 연결 설명',target:'help'}
    ];
    return {rows:rows,current:!!current,hasSheet:!!sheet,sheet:sheet,ready:rows.filter(function(x){return x.state==='ok'}).length};
  }
  function el(tag,className){var e=document.createElement(tag);if(className)e.className=className;return e}
  function build(){
    if(!$('#t49Screen'))return false;
    var p=$('#t53Connections');
    if(!p){
      p=el('details','t53-connections');p.id='t53Connections';
      p.innerHTML='<summary class="t53-summary"><span class="t53-marker" aria-hidden="true">↔</span><span><b>시스템 연결 상태</b><small>학년도·Google Sheets·나이스·Google 자동화·PC 동기화의 실제 연결을 확인합니다.</small></span><span class="t53-main-status" id="t53Overall">연결 확인 중</span></summary>'+
       '<div class="t53-content"><div class="t53-grid" id="t53Rows"></div>'+
       '<div class="t53-sheet"><label for="t53SheetUrl"><b>비공개 음악 스케줄표 링크 등록</b><small>이 브라우저에 URL만 보관합니다. 학생 데이터는 읽거나 업로드하지 않습니다.</small></label>'+
       '<div class="t53-sheet-actions"><input id="t53SheetUrl" type="url" autocomplete="off" spellcheck="false" placeholder="https://docs.google.com/spreadsheets/d/.../edit"/>'+
       '<button type="button" data-t53-act="save-sheet">주소 저장</button><button type="button" class="t53-ghost" data-t53-act="open-sheet">원본 열기</button><button type="button" class="t53-ghost" data-t53-act="clear-sheet">연결 해제</button></div>'+
       '<p id="t53Feedback" role="status" aria-live="polite"></p></div>'+
       '<p class="t53-security">주의: 원본 주소 등록과 실시간 연동은 다른 기능입니다. 비공개 시트를 공개 게시하거나 학생 점수를 GitHub Pages·URL·콘솔에 전송하지 않습니다. 연결 상태는 현재 브라우저의 설정·마지막 동기화 기록을 기준으로 표시됩니다.</p></div>';
      var screen=$('#t49Screen');screen.appendChild(p);
    }
    var b=$('#t53HeaderButton');
    if(!b){
      var top=$('#t51Profile')||$('.top');
      if(top){
        b=el('button','t53-header-button');b.id='t53HeaderButton';b.type='button';
        b.innerHTML='<span class="t53-header-dot" aria-hidden="true"></span>연결 상태';
        if(top.id==='t51Profile')top.insertBefore(b,top.firstChild);
        else top.appendChild(b);
      }
    }
    initialized=true;
    return true;
  }
  function goto(target){
    if(target==='year'){var t=$('#firstYear')||$('#newYear');if(t)t.click();return}
    if(target==='sheet-open'){openSheet();return}
    if(target==='sheet-focus'){var i=$('#t53SheetUrl');if(i){i.focus();i.scrollIntoView({block:'center',behavior:'smooth'})}return}
    if(target==='help'){var h=$('#t53Connections .t53-security');if(h){h.scrollIntoView({block:'center',behavior:'smooth'})}return}
    var setting=$('#nav button[data-view="settings"]');if(setting)setting.click();
    var id=({google:'#googleSettings34',neis:'#neisSettings35',desktop:'#desktopSettings36'})[target];
    if(id)setTimeout(function(){
      var panel=$(id);if(panel){var ancestor=panel.closest('details');if(ancestor)ancestor.open=true;
      panel.scrollIntoView({block:'center',behavior:'smooth'})}
    },200);
  }
  function openSheet(){
    var link=state().sheet;
    if(!link){feedback('먼저 스케줄표 주소를 입력·저장하세요.',true);$('#t53SheetUrl')?.focus();return}
    window.open(link,'_blank','noopener,noreferrer');
  }
  function feedback(msg,bad){
    var e=$('#t53Feedback');if(e){e.textContent=text(msg);e.dataset.t53Error=bad?'true':'false'}
  }
  function render(force){
    if(!build())return;
    var s=state();
    var fingerprint=JSON.stringify(s.rows.map(function(x){return [x.state,x.value,x.detail]}))+s.sheet;
    if(!force&&fingerprint===lastStatus)return;
    lastStatus=fingerprint;
    var overall=$('#t53Overall');if(overall)overall.textContent=s.ready+'/6 최근 확인 · 나머지는 설정/검증 필요';
    var head=$('#t53HeaderButton');if(head){
      var dot=head.querySelector('.t53-header-dot');if(dot)dot.className='t53-header-dot '+(s.ready>=5?'good':'attention');
      head.title='연결 상태 확인 ('+s.ready+'/6 최근 확인)';
    }
    var rows=$('#t53Rows');
    if(rows){
      rows.replaceChildren();
      s.rows.forEach(function(x){
        var card=el('div','t53-connection-row');
        var top=el('div','t53-row-top'),name=el('strong'),badge=el('span','t53-badge '+x.state);
        name.textContent=x.name;
        badge.textContent=x.state==='ok'?'최근 확인':x.state==='partial'?'설정 있음':'연결 필요';
        top.append(name,badge);
        var status=el('p','t53-row-status'),desc=el('p','t53-row-desc'),btn=el('button','t53-row-button');
        status.textContent=x.value;desc.textContent=x.detail;btn.type='button';btn.textContent=x.action;btn.dataset.t53Target=x.target;
        card.append(top,status,desc,btn);rows.appendChild(card);
      });
    }
    var input=$('#t53SheetUrl');
    if(input&&document.activeElement!==input)input.value=s.sheet;
    var oldInput=$('#t49-records .t49SheetUrl');if(oldInput&&document.activeElement!==oldInput)oldInput.value=s.sheet;
  }
  document.addEventListener('click',function(e){
    var head=e.target.closest('#t53HeaderButton');if(head){
      var nav=$('#nav button[data-view="dashboard"]');if(nav&&!nav.classList.contains('active'))nav.click();
      setTimeout(function(){var p=$('#t53Connections');if(p){p.open=true;render(true);p.scrollIntoView({block:'start',behavior:'smooth'})}},80);
      return;
    }
    var go=e.target.closest('[data-t53-target]');
    if(go){goto(go.dataset.t53Target);return}
    var action=e.target.closest('[data-t53-act]');if(!action)return;
    if(action.dataset.t53Act==='open-sheet'){openSheet();return}
    if(action.dataset.t53Act==='save-sheet'){
      var input=$('#t53SheetUrl'),url=safeSheetUrl(input&&input.value);
      if(!url){feedback('올바른 Google Sheets 주소만 저장할 수 있습니다.',true);input?.focus();return}
      try{localStorage.setItem(KEY_SHEET,url);feedback('원본 주소가 이 브라우저에 저장됐습니다. 점수 자동 동기화는 별도 연결이 필요합니다.',false);render(true)}
      catch(err){feedback('브라우저 보안 설정으로 저장되지 않았습니다.',true)}
      return;
    }
    if(action.dataset.t53Act==='clear-sheet'){
      try{localStorage.removeItem(KEY_SHEET);feedback('이 브라우저에서 원본 연결 주소를 해제했습니다. Google Sheets 원본은 변경하지 않았습니다.',false);render(true)}
      catch(err){feedback('브라우저 보안 설정으로 해제되지 않았습니다.',true)}
    }
  });
  window.addEventListener('storage',function(e){if([KEY_YEAR,KEY_SHEET,KEY_GOOGLE,KEY_GOOGLE_STATUS,KEY_NEIS,KEY_DESKTOP,KEY_DESKTOP_STATUS].indexOf(e.key)>=0)render(true)});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)render(true)});
  setTimeout(function(){render(true)},400);
  setTimeout(function(){render(true)},1600);
  setTimeout(function(){render(true)},4600);
  setInterval(function(){render(false)},8000);
  globalThis.TeacherOSConnections53={state:state,render:render,safeSheetUrl:safeSheetUrl};
})();