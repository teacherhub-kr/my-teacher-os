
/* Teacher OS premium dashboard v49 — UI only, student-safe public shell. */
(function(){
  'use strict';
  var VERSION='49.0-premium', KEY='myTeacherOS.teacher49.sheetUrl';
  var q=function(s){return document.querySelector(s)};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[m]})};
  var state={grade:2,ready:false};
  var NAV=[
    {view:'dashboard',title:'오늘 홈',icon:'⌂',number:'01'},
    {view:'calendar',title:'수업 일정',icon:'▣',number:'02'},
    {view:'assessment',title:'수행평가',icon:'▥',number:'03'},
    {view:'t49-classes',title:'반별 현황',icon:'▦',number:'04'},
    {view:'t49-exceptions',title:'예외학생',icon:'△',number:'05'},
    {view:'t49-records',title:'생활기록부',icon:'▤',number:'06'},
    {view:'documents',title:'자료·결과물',icon:'▱',number:'07'},
    {view:'timetable',title:'시간표',icon:'◫',number:'08'},
    {view:'projects',title:'행정업무',icon:'☷',number:'09'},
    {view:'settings',title:'설정',icon:'⚙',number:'10'}
  ];
  function current(){
    try{return typeof cur==='function'&&cur()?cur():null}catch(e){return null}
  }
  function sheetUrl(){
    try{return localStorage.getItem(KEY)||''}catch(e){return ''}
  }
  function safeSheetUrl(input){
    var m=String(input||'').trim().match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})\/?(?:edit)?(?:[?#].*)?$/);
    return m?'https://docs.google.com/spreadsheets/d/'+m[1]+'/edit':'';
  }
  function openSheet(){
    var url=safeSheetUrl(sheetUrl());
    if(!url){switchTo('t49-records');var el=q('#t49-records .t49SheetUrl');if(el)el.focus();return}
    window.open(url,'_blank','noopener,noreferrer');
  }
  function switchTo(view){
    var el=q('#nav button[data-view="'+view+'"]');
    if(el)el.click();
    else if(view==='lessons')location.href='lessons/';
    setTimeout(function(){var x=NAV.find(function(n){return n.view===view});if(x&&q('#title'))q('#title').textContent=x.title},0);
  }
  function addNav(){
    var nav=q('#nav');if(!nav)return;
    ['t49-classes','t49-exceptions','t49-records'].forEach(function(view){
      if(nav.querySelector('button[data-view="'+view+'"]'))return;
      var button=document.createElement('button');
      button.type='button';button.dataset.view=view;
      var name=NAV.find(function(x){return x.view===view});
      button.innerHTML='<span>'+esc(name.title)+'</span>';
      var anchor=nav.querySelector('button[data-view="documents"]');
      if(anchor)nav.insertBefore(button,anchor);else nav.appendChild(button);
    });
    NAV.forEach(function(item){
      var el=nav.querySelector('button[data-view="'+item.view+'"]');if(!el)return;
      if(!el.dataset.t49Clean){Array.from(el.childNodes).filter(function(n){return n.nodeType===3}).forEach(function(n){n.remove()});el.dataset.t49Clean='1'}
      var t=el.querySelector('span:not(.t49-nav-glyph):not(.t49-nav-number)');if(t)t.textContent=item.title;
      var glyph=el.querySelector('.t49-nav-glyph');
      if(!glyph){glyph=document.createElement('i');glyph.className='t49-nav-glyph';glyph.style.fontStyle='normal';glyph.setAttribute('aria-hidden','true');el.insertBefore(glyph,el.firstChild)}
      glyph.textContent=item.icon;
      var count=el.querySelector('.t49-nav-number');
      if(!count){count=document.createElement('span');count.className='t49-nav-number';count.setAttribute('aria-hidden','true');el.appendChild(count)}
      count.textContent=item.number;
      el.setAttribute('aria-label',item.title);
    });
    var brand=q('.brand .logo');if(brand)brand.textContent='♫';
    var tagline=q('.brand small');if(tagline)tagline.textContent='음악 교사의 스마트 업무 공간';
    var link=nav.querySelector('a.musicLibraryLink');if(link){link.style.display='flex';link.setAttribute('aria-label','MY MUSIC CLASS 음악 수업자료실 열기')}
    var foot=q('.side-foot');if(foot)foot.textContent='수업 · 평가 · 기록을 한곳에서';
    // Reorder the primary navigation to match the approved seven-section design.
    // Non-primary legacy views stay in the DOM for existing feature buttons.
    ['dashboard','calendar','assessment','t49-classes','t49-exceptions','t49-records','documents','settings'].forEach(function(view){
      var button=nav.querySelector('button[data-view="'+view+'"]');
      if(button)nav.appendChild(button);
    });
  }
  function addSearch(){
    var top=q('.top');if(!top||q('#t49Search'))return;
    var f=document.createElement('form');f.className='t49-search';
    f.setAttribute('role','search');
    f.innerHTML='<span aria-hidden="true">⌕</span><input id="t49Search" type="search" aria-label="Teacher OS 메뉴 검색" placeholder="수업, 평가, 기록 등 메뉴 검색"><small>Enter</small>';
    var actions=top.querySelector('.top-actions');
    top.insertBefore(f,actions);
    f.addEventListener('submit',function(e){
      e.preventDefault();var v=q('#t49Search').value.trim().toLowerCase();
      if(!v)return;
      var item=NAV.find(function(x){return x.title.toLowerCase().includes(v)||v.includes(x.title.toLowerCase())});
      if(!item&&/음악|자료실|콘텐츠/.test(v)){location.href='lessons/';return}
      if(item){switchTo(item.view);q('#t49Search').value=''}
      else {q('#t49Search').setCustomValidity('일치하는 메뉴가 없습니다.');q('#t49Search').reportValidity();setTimeout(function(){q('#t49Search').setCustomValidity('')},1600)}
    });
  }
  function mainMarkup(){
    return '<section class="t49-screen" id="t49Screen" aria-label="음악 교사 대시보드">'+
      '<div class="t49-hero"><div class="t49-hero-copy"><span class="t49-eyebrow">좋은 수업, 더 나은 기록</span>'+
      '<h2>오늘, 음악수업과 평가를<br><span>한눈에</span> 관리합니다.</h2>'+
      '<p>수업 준비부터 수행평가와 생활기록부까지. 기존 Teacher OS와 Google Sheets를 지키면서 필요한 업무를 명확하게 보여드립니다.</p>'+
      '<div class="t49-hero-actions"><button type="button" class="t49-action" data-t49-to="assessment">수행평가 열기 →</button>'+
      '<button type="button" class="t49-action alt" data-t49-to="t49-records">생활기록부 근거 →</button></div></div>'+
      '<div class="t49-art" aria-hidden="true"><div class="t49-halo"></div><div class="t49-float">오늘도, 좋은 음악수업! ♫</div>'+
      '<div class="t49-notes">♪ ♬</div><div class="t49-paper"><div class="t49-paper-head"><b>♫</b> MY MUSIC CLASS</div>'+
      '<div class="t49-line"></div><div class="t49-line short"></div><div class="t49-line"></div><div class="t49-line short"></div></div><div class="t49-pencil">✎</div></div></div>'+
      '<div id="t49Kpis" class="t49-kpis" aria-label="업무 요약"></div>'+
      '<div class="t49-panels">'+
      '<article class="t49-panel"><div class="t49-panel-head"><h3>▥ 반별 수행평가 진행 현황</h3><button class="t49-link" type="button" data-t49-to="t49-classes">전체보기 →</button></div>'+
      '<div class="t49-grade-switch" role="tablist" aria-label="학년 선택"><button type="button" data-t49-grade="2" role="tab" aria-selected="true">2학년</button><button type="button" data-t49-grade="3" role="tab" aria-selected="false">3학년</button></div>'+
      '<div id="t49Progress" class="t49-table-wrap"></div><p class="t49-muted">학생별 채점값과 평가 예외는 공개 화면에 표시하지 않습니다. 원본은 교사 계정에서 확인합니다.</p></article>'+
      '<article class="t49-panel"><div class="t49-panel-head"><h3>▣ 오늘의 수업 일정</h3><button type="button" class="t49-link" data-t49-to="timetable">시간표 →</button></div><div class="t49-list" id="t49TodayList"></div></article>'+
      '<article class="t49-panel"><div class="t49-panel-head"><h3>◫ 내 평가·업무 현황</h3><button type="button" class="t49-link" data-t49-to="assessment">평가 보기 →</button></div><div id="t49AssessList" class="t49-list"></div></article>'+
      '<article class="t49-panel"><div class="t49-panel-head"><h3>△ 확인해야 할 알림</h3><button type="button" class="t49-link" data-t49-to="t49-exceptions">확인하기 →</button></div><div id="t49Alerts" class="t49-list"></div></article></div></section>';
  }
  function portalMarkup(title,lead,icon){
    return '<div class="section-intro"><div><span class="kicker">TEACHER-ONLY WORKSPACE</span><h2>'+esc(title)+'</h2><p class="muted">'+esc(lead)+'</p></div></div>'+
      '<div class="t49-panel"><div class="t49-portal-grid">'+
      '<div class="t49-portal-box"><div class="t49-portal-icon">'+icon+'</div><h3>원본 Google Sheets</h3><p>성적과 교사 관찰 기록은 접근 권한을 가진 계정으로만 열어 확인합니다.</p><button type="button" class="t49-action" data-t49-sheet>원본 열기 ↗</button></div>'+
      '<div class="t49-portal-box"><div class="t49-portal-icon">▤</div><h3>교사만 확인할 정보</h3><p>학생 이름, 성적, 예외사항, 세특 초안은 공개 GitHub Pages에 저장하거나 노출하지 않습니다.</p></div>'+
      '<div class="t49-portal-box"><div class="t49-portal-icon">✓</div><h3>현재 관리 원칙</h3><p>기존 채점표가 원본입니다. 점수만으로 실제 응시나 생활기록부 내용을 자동 확정하지 않습니다.</p></div></div>'+
      '<div class="t49-settings"><input class="t49SheetUrl" aria-label="개인 Google Sheets URL" type="url" placeholder="교사용 통합 스케줄표 Google Sheets 주소" autocomplete="off"><button type="button" class="t49-action" data-t49-save>이 브라우저에 연결 저장</button><button type="button" class="t49-action alt" data-t49-clear>연결 주소 지우기</button></div>'+
      '<p class="t49-settings-note">주소만 이 브라우저에 저장합니다. 계정 비밀번호·API 키·학생정보는 입력하지 마세요. 다른 사람에게 이 사이트가 공개되어도 본인의 Google Sheets 열람 권한이 자동으로 부여되지는 않습니다. 공유 설정은 비공개로 유지하세요.</p></div>';
  }
  function addViews(){
    var main=q('.main');if(!main)return;
    [
      {id:'t49-classes',title:'반별 현황',lead:'2·3학년 수업과 평가 진행을 구분해서 확인합니다.',icon:'▦'},
      {id:'t49-exceptions',title:'예외학생 관리',lead:'자발적 미참여·장기결석·전출 등 민감한 정보는 보호된 원본에서 확인합니다.',icon:'△'},
      {id:'t49-records',title:'생활기록부 근거',lead:'2학기 1~4차 성적과 교사 관찰 기록을 분리하여 검토합니다.',icon:'▤'}
    ].forEach(function(x){
      if(q('#'+x.id))return;
      var section=document.createElement('section');section.id=x.id;section.className='view t49-view';
      section.innerHTML=portalMarkup(x.title,x.lead,x.icon);
      main.appendChild(section);
    });
  }
  function addDashboard(){
    var dash=q('#dashboardBody');if(!dash)return;
    if(!q('#t49Screen')){
      var container=document.createElement('div');
      container.innerHTML=mainMarkup();
      dash.insertBefore(container.firstElementChild,dash.firstChild);
    }
    var legacy=q('#t49Legacy');
    if(!legacy){
      legacy=document.createElement('details');legacy.id='t49Legacy';legacy.className='t49-legacy';
      legacy.innerHTML='<summary>기존 Teacher OS 업무 도구 펼치기</summary><div id="t49LegacyBody"></div>';
      dash.appendChild(legacy);
    }
    var slot=q('#t49LegacyBody');
    Array.from(dash.children).forEach(function(child){
      if(child.id==='t49Screen'||child.id==='t49Legacy'||child.id==='firstHero')return;
      slot.appendChild(child);
    });
  }
  function showMetric(label,value,foot,symbol,view){
    return '<button type="button" class="t49-kpi" data-t49-to="'+esc(view)+'" aria-label="'+esc(label)+' '+esc(value)+'">'+
      '<span class="t49-kpi-icon" aria-hidden="true">'+symbol+'</span><span><div class="t49-kpi-label">'+esc(label)+'</div>'+
      '<div class="t49-kpi-value">'+esc(value)+'</div><div class="t49-kpi-foot">'+esc(foot)+'</div></span></button>';
  }
  function renderKpis(y){
    var el=q('#t49Kpis');if(!el)return;
    var days=['일','월','화','수','목','금','토'],today=days[new Date().getDay()];
    var slots=y&&Array.isArray(y.timetable)?y.timetable.filter(function(x){return x.day===today}):[];
    var asses=y&&Array.isArray(y.assessments)?y.assessments:[];
    var tasks=y&&Array.isArray(y.tasks)?y.tasks.filter(function(x){return !x.done}):[];
    el.innerHTML=showMetric('오늘 수업',y?slots.length:'—','Teacher OS 시간표 기준','▣','timetable')+
      showMetric('등록 평가',y?asses.length:'—','현재 학년도에 등록된 평가','▥','assessment')+
      showMetric('확인할 일',y?tasks.length:'—','미완료로 기록한 업무','△','projects')+
      showMetric('미채점 현황','—','교사용 원본에서 확인','✎','t49-classes');
  }
  function renderProgress(){
    var el=q('#t49Progress');if(!el)return;
    var cl=state.grade===2?[1,2,3,4,5,6,7,8,9]:[4,5,6,7,8,9];
    var header='<table class="t49-table"><thead><tr><th>학급</th><th>1차</th><th>2차</th><th>3차</th><th>4차</th></tr></thead><tbody>';
    var rows=cl.map(function(n){return '<tr><td>'+state.grade+'학년 '+n+'반</td>'+[1,2,3,4].map(function(){return '<td><span class="t49-chip">원본 확인</span></td>'}).join('')+'</tr>'}).join('');
    el.innerHTML=header+rows+'</tbody></table>';
    document.querySelectorAll('[data-t49-grade]').forEach(function(b){b.setAttribute('aria-selected',String(Number(b.dataset.t49Grade)===state.grade))});
  }
  function renderToday(y){
    var el=q('#t49TodayList');if(!el)return;
    var day=['일','월','화','수','목','금','토'][new Date().getDay()];
    var slots=y&&Array.isArray(y.timetable)?y.timetable.filter(function(x){return x.day===day}).sort(function(a,b){return Number(a.period)-Number(b.period)}):[];
    if(!slots.length){el.innerHTML='<div class="t49-empty">오늘 수업 기록이 없습니다. 시간표 원본을 연결하거나 현재 학년도를 확인하세요.</div>';return}
    el.innerHTML=slots.slice(0,8).map(function(x){return '<div class="t49-list-item"><span class="t49-circle">'+esc(x.period||'•')+'</span><span><b>'+esc(x.label||'수업')+'</b><small>등록된 교사 시간표</small></span><span class="t49-when">'+esc(x.period||'')+'교시</span></div>'}).join('');
  }
  function renderAssessments(y){
    var el=q('#t49AssessList');if(!el)return;
    var a=y&&Array.isArray(y.assessments)?y.assessments.slice():[];
    if(!a.length){el.innerHTML='<div class="t49-empty">Teacher OS에 등록된 평가가 없습니다. 실제 성적은 별도 인증된 Google Sheets에서 관리합니다.</div>';return}
    a.sort(function(x,y){return String(x.due||'9999').localeCompare(String(y.due||'9999'))});
    el.innerHTML=a.slice(0,5).map(function(x){return '<div class="t49-list-item"><span class="t49-circle">♪</span><span><b>'+esc(x.name||'평가')+'</b><small>'+esc(x.target||'학급 확인')+'</small></span><span class="t49-when">'+esc(x.due||'일정 미정')+'</span></div>'}).join('');
  }
  function renderAlerts(y){
    var el=q('#t49Alerts');if(!el)return;var tasks=y&&Array.isArray(y.tasks)?y.tasks.filter(function(x){return !x.done}):[];
    var items=tasks.slice(0,3).map(function(x){return '<div class="t49-list-item"><span class="t49-circle">!</span><span><b>'+esc(x.text||'확인할 일')+'</b><small>현재 학년도 업무 기록</small></span></div>'});
    items.push('<div class="t49-list-item"><span class="t49-circle">✓</span><span><b>채점·예외 정보는 교사용 원본에서 확인</b><small>공개 페이지에서 학생명·점수·결석 사유를 조회하지 않습니다.</small></span></div>');
    el.innerHTML=items.join('');
  }
  function fillSavedSheet(){
    document.querySelectorAll('.t49SheetUrl').forEach(function(input){if(document.activeElement!==input)input.value=sheetUrl()});
  }
  function keepHomeVisible(){
    var body=q('#dashboardBody'),first=q('#firstHero'),y=current();
    // The legacy v05 renderer intentionally hides the entire dashboard until a year exists.
    // Our welcome dashboard must be visible before setup, with setup offered as a safe action.
    if(body)body.style.display='block';
    if(first)first.hidden=true;
    var screen=q('#t49Screen');if(!screen)return;
    var banner=q('#t49SetupBanner');
    if(!y){
      if(!banner){
        banner=document.createElement('div');
        banner.id='t49SetupBanner';
        banner.className='t49-onboarding';
        banner.setAttribute('role','status');
        banner.innerHTML='<span class="t49-onboarding-icon" aria-hidden="true">✦</span>'+
          '<span class="t49-onboarding-copy"><b>2026학년도 수업·평가를 연결해 주세요.</b><small>학년도를 설정하면 이 브라우저에 저장된 시간표와 평가정보가 대시보드에 표시됩니다. 성적은 교사용 Google Sheets에서만 확인합니다.</small></span>'+
          '<button type="button" class="t49-action" data-t49-start>학년도 시작 →</button>';
        var anchor=q('#t49Kpis');if(anchor)screen.insertBefore(banner,anchor);else screen.appendChild(banner);
      }
    }else if(banner)banner.remove();
  }
  function apply(){
    if(!q('.shell')||!q('#dashboardBody'))return;
    document.body.classList.add('teacher49-mode');
    addNav();addViews();addDashboard();keepHomeVisible();fillSavedSheet();
    var y=current();
    renderKpis(y);renderProgress();renderToday(y);renderAssessments(y);renderAlerts(y);
    var active=q('#nav button.active[data-view]');
    if(active&&q('#title')){var item=NAV.find(function(n){return n.view===active.dataset.view});if(item)q('#title').textContent=item.title}
    state.ready=true;
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-t49-to]');if(b){switchTo(b.dataset.t49To);return}
    var grade=e.target.closest('[data-t49-grade]');if(grade){state.grade=Number(grade.dataset.t49Grade);renderProgress();return}
    var start=e.target.closest('[data-t49-start]');if(start){q('#firstYear')?.click();return}
    var sheet=e.target.closest('[data-t49-sheet]');if(sheet){openSheet();return}
    var save=e.target.closest('[data-t49-save]');if(save){
      var input=save.closest('.t49-panel').querySelector('.t49SheetUrl');
      var url=safeSheetUrl(input&&input.value);
      if(!url){input.setCustomValidity('Google Sheets의 올바른 URL을 입력하세요.');input.reportValidity();setTimeout(function(){input.setCustomValidity('')},1600);return}
      try{localStorage.setItem(KEY,url);save.textContent='연결 주소 저장됨 ✓';setTimeout(function(){save.textContent='이 브라우저에 연결 저장'},1700)}catch(err){alert('이 브라우저에서 연결 주소를 저장할 수 없습니다.')}
      fillSavedSheet();return;
    }
    var clear=e.target.closest('[data-t49-clear]');if(clear){try{localStorage.removeItem(KEY)}catch(err){}fillSavedSheet();document.querySelectorAll('.t49SheetUrl').forEach(function(i){i.value=''})}
  });
  var old=globalThis.render;
  if(typeof old==='function'){globalThis.render=function(){var result=old.apply(this,arguments);setTimeout(apply,0);return result}}
  setTimeout(apply,200);setTimeout(apply,1400);setTimeout(apply,3500);setTimeout(apply,4400);
  setInterval(apply,30000);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')apply()});
  globalThis.TeacherOSPremiumDashboard49={apply:apply,openSheet:openSheet,safeSheetUrl:safeSheetUrl};
})();
