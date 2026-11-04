/* MY TEACHER OS v65 — focused home + five workflow groups.
   Reuses the original DOM and app-v05 state handlers; never copies private grades. */
(function(){
'use strict';
var q=function(s){return document.querySelector(s)};
var GROUPS=[
  {id:'home',label:'홈',views:['dashboard','os65-detail']},
  {id:'lesson',label:'수업',views:['calendar','timetable']},
  {id:'record',label:'평가·기록',views:['assessment','t49-classes','t49-exceptions','t49-records']},
  {id:'work',label:'학교업무',views:['clubs','projects','memory']},
  {id:'tools',label:'자료·설정',views:['importer','documents','policy','settings']}
];
var initialized=false,lastSnapshot='',opened='home';
function el(tag,cls,text){
  var node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
}
function groupFor(view){
  for(var i=0;i<GROUPS.length;i++)if(GROUPS[i].views.indexOf(view)>=0)return GROUPS[i].id;
  return 'tools';
}
function setOpen(id){
  opened=id;
  GROUPS.forEach(function(g){
    var wrap=q('#os65-group-'+g.id),head=q('#os65-toggle-'+g.id);
    if(!wrap||!head)return;
    var open=g.id===id;
    wrap.hidden=!open;
    head.setAttribute('aria-expanded',String(open));
    head.classList.toggle('os65-open',open);
  });
}
function syncActive(){
  var active=q('#nav button.active[data-view]'),view=active&&active.dataset.view;
  if(view){
    var id=groupFor(view);
    if(id!==opened)setOpen(id);
    var label=view==='os65-detail'?'전체 업무 현황':null;
    if(label&&q('#title'))q('#title').textContent=label;
    GROUPS.forEach(function(g){
      var h=q('#os65-toggle-'+g.id);
      if(h)h.classList.toggle('os65-current',g.id===id);
    });
  }
}
function attachExtras(){
  var nav=q('#nav'),fallback=q('#os65-group-tools');if(!nav||!fallback)return;
  Array.from(nav.children).forEach(function(child){
    if(child.classList.contains('os65-group')||child.classList.contains('os65-nav-label'))return;
    if(child.matches('button[data-view]')){
      var p=q('#os65-group-'+groupFor(child.dataset.view))||fallback;
      p.appendChild(child);
    }else if(child.matches('a.musicLibraryLink')){
      (q('#os65-group-lesson')||fallback).appendChild(child);
    }else if(!child.matches('style,script')){
      fallback.appendChild(child);
    }
  });
}
function createGroups(){
  var nav=q('#nav');if(!nav||nav.dataset.os65Grouped==='1')return;
  GROUPS.forEach(function(g){
    var section=el('section','os65-group');section.dataset.os65Group=g.id;
    var toggle=el('button','os65-group-toggle',g.label);
    toggle.type='button';toggle.id='os65-toggle-'+g.id;
    toggle.dataset.os65Group=g.id;
    toggle.setAttribute('aria-controls','os65-group-'+g.id);
    toggle.setAttribute('aria-expanded','false');
    var items=el('div','os65-group-items');items.id='os65-group-'+g.id;
    items.hidden=true;
    section.append(toggle,items);nav.appendChild(section);
  });
  var detailButton=el('button','os65-nav-detail');
  detailButton.type='button';detailButton.dataset.view='os65-detail';
  detailButton.innerHTML='<span>전체 업무 현황</span>';
  q('#os65-group-home').appendChild(detailButton);
  attachExtras();
  nav.dataset.os65Grouped='1';
  setOpen('home');
}
function homeMarkup(){
  return '<div id="os65Home" class="os65-home" aria-label="오늘의 업무">'+
    '<header class="os65-home-header">'+
      '<div><span class="os65-eyebrow">MY TEACHER OS · TODAY</span>'+
      '<p class="os65-today" id="os65Date"></p><h2>오늘 필요한 업무만</h2>'+
      '<p class="os65-home-desc">수업과 업무는 여기에서 확인하고, 상세 기능은 왼쪽 메뉴에서 바로 사용하세요.</p></div>'+
      '<span class="os65-privacy-note">학생 성적은 Google 교사 전용 화면에서만 열립니다.</span>'+
    '</header>'+
    '<div class="os65-quick" aria-label="자주 사용하는 업무">'+
      '<button type="button" class="os65-quick-card" data-os65-view="timetable"><span class="os65-quick-icon">▣</span>'+
        '<span class="os65-quick-name">오늘 수업</span><strong id="os65LessonValue">확인 중</strong><small id="os65LessonNote">실제 시간표 기준</small></button>'+
      '<button type="button" class="os65-quick-card" data-os65-view="assessment"><span class="os65-quick-icon">▤</span>'+
        '<span class="os65-quick-name">수행평가</span><strong id="os65AssessmentValue">확인 중</strong><small>이 브라우저의 OS 등록 평가</small></button>'+
      '<button type="button" class="os65-quick-card" data-os65-view="projects"><span class="os65-quick-icon">☑</span>'+
        '<span class="os65-quick-name">처리할 업무</span><strong id="os65PendingValue">확인 중</strong><small>OS에 등록된 미완료 할 일</small></button>'+
      '<button type="button" class="os65-quick-card os65-private-card" data-teacher56="open" data-teacher56-view="seteuk" aria-label="교사 전용 음악 교과세특 작성실 열기"><span class="os65-quick-icon">✎</span>'+
        '<span class="os65-quick-name">교과세특</span><strong>작성실 열기 ↗</strong><small id="os65PrivateState">연결 상태 확인 중</small></button>'+
    '</div>'+
    '<div class="os65-focus-grid">'+
      '<section class="os65-focus-panel" aria-labelledby="os65PendingHeading">'+
        '<div class="os65-focus-head"><h3 id="os65PendingHeading">우선 처리할 일</h3><button type="button" data-os65-view="os65-detail">전체 업무 →</button></div>'+
        '<p class="os65-source-note">OS에 직접 등록한 미완료 업무입니다. 실제 학교의 전체 업무를 자동 판정하지 않습니다.</p>'+
        '<div id="os65PendingItems" class="os65-rows" aria-live="polite"></div>'+
        '<form id="os65TaskForm" class="os65-task-entry"><label for="os65NewTask" class="os65-sr-only">새 할 일</label>'+
        '<input id="os65NewTask" maxlength="200" placeholder="새로운 할 일 바로 입력" autocomplete="off">'+
        '<button type="submit">추가</button></form>'+
      '</section>'+
      '<section class="os65-focus-panel" aria-labelledby="os65UpcomingHeading">'+
        '<div class="os65-focus-head"><h3 id="os65UpcomingHeading">다가오는 일정</h3><button type="button" data-os65-view="calendar">학사일정 →</button></div>'+
        '<p class="os65-source-note">OS 학사일정·수행평가·행정업무의 등록일 기준입니다.</p>'+
        '<div id="os65UpcomingItems" class="os65-rows"></div>'+
      '</section>'+
    '</div>'+
    '<div class="os65-secondary"><span>기존 업무도구와 세부 진행상황은 모두 보존했습니다.</span>'+
    '<button type="button" data-os65-view="os65-detail">상세 업무 현황 보기 →</button></div>'+
    '</div>';
}
function createHome(){
  var dash=q('#dashboard'),body=q('#dashboardBody'),main=q('.main');
  if(!dash||!body||!main)return;
  if(!q('#os65-detail')){
    var detail=el('section','view os65-detail');
    detail.id='os65-detail';
    var intro=el('header','os65-detail-head');
    intro.innerHTML='<span class="os65-eyebrow">WORKSPACE · DETAILS</span><h2>전체 업무 현황</h2>'+
      '<p>기존 수업·평가·일정·업무 입력 도구를 그대로 이용할 수 있습니다. 홈에는 핵심 정보만 표시합니다.</p>';
    detail.appendChild(intro);
    detail.appendChild(body);
    main.appendChild(detail);
  }
  if(!q('#os65Home')){
    var host=el('div');host.innerHTML=homeMarkup();
    dash.appendChild(host.firstElementChild);
  }
}
function fmtDate(date){
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'long'}).format(date);
}
function isoToday(){
  var parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  var v={};parts.forEach(function(p){v[p.type]=p.value});
  return v.year+'-'+v.month+'-'+v.day;
}
function dayName(){
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',weekday:'short'}).format(new Date()).slice(0,1);
}
function currentYear(){
  try{return typeof cur==='function'?cur():null}catch(e){return null}
}
function writeText(id,value){var n=q('#'+id);if(n&&n.textContent!==String(value))n.textContent=String(value)}
function empty(container,message){
  container.replaceChildren(el('p','os65-empty',message));
}
function renderTasks(y){
  var target=q('#os65PendingItems');if(!target)return;
  var tasks=y&&Array.isArray(y.tasks)?y.tasks.filter(function(t){return !t.done}):[];
  if(!y){empty(target,'먼저 학년도를 설정하면 업무를 등록할 수 있습니다.');return}
  if(!tasks.length){empty(target,'OS에 미완료로 등록된 할 일이 없습니다.');return}
  target.replaceChildren();
  tasks.slice(0,4).forEach(function(task){
    var label=el('label','os65-task-row');
    var checkbox=el('input');checkbox.type='checkbox';
    checkbox.dataset.os65Complete=String(task.id);
    checkbox.setAttribute('aria-label','완료 처리: '+String(task.text||'할 일'));
    label.append(checkbox,el('span','',task.text||'할 일'));
    target.appendChild(label);
  });
  if(tasks.length>4)target.appendChild(el('p','os65-remaining','그 외 '+(tasks.length-4)+'건은 전체 업무에서 확인하세요.'));
}
function renderUpcoming(y){
  var target=q('#os65UpcomingItems');if(!target)return;
  if(!y){empty(target,'학년도와 학교 일정을 설정하면 표시됩니다.');return}
  var today=isoToday(),events=[];
  (Array.isArray(y.calendarEvents)?y.calendarEvents:[]).forEach(function(x){
    if(x.date&&x.date>=today)events.push({date:x.date,label:x.title||'학교 일정',type:'학교'});
  });
  (Array.isArray(y.assessments)?y.assessments:[]).forEach(function(x){
    if(x.due&&x.due>=today)events.push({date:x.due,label:x.name||'수행평가',type:'평가'});
  });
  (Array.isArray(y.projects)?y.projects:[]).forEach(function(x){
    if(x.due&&x.due>=today)events.push({date:x.due,label:x.name||'행정업무',type:'업무'});
  });
  events.sort(function(a,b){return a.date.localeCompare(b.date)||a.label.localeCompare(b.label)});
  if(!events.length){empty(target,'등록된 다가오는 일정이 없습니다.');return}
  target.replaceChildren();
  events.slice(0,4).forEach(function(x){
    var row=el('div','os65-upcoming-row');
    var date=el('time','',x.date.slice(5));date.dateTime=x.date;
    var text=el('span','',x.label);
    var type=el('small','',x.type);
    row.append(date,text,type);target.appendChild(row);
  });
}
function renderHome(){
  if(!q('#os65Home'))return;
  var y=currentYear();
  var slots=null;
  try{
    var checked=globalThis.TeacherOSComcigan14&&globalThis.TeacherOSComcigan14.verifiedSlots&&
      globalThis.TeacherOSComcigan14.verifiedSlots(y);
    if(Array.isArray(checked))slots=checked.filter(function(x){return x.day===dayName()});
  }catch(e){}
  var a=y&&Array.isArray(y.assessments)?y.assessments:[];
  var tasks=y&&Array.isArray(y.tasks)?y.tasks.filter(function(t){return !t.done}):[];
  var privateUrlSet=!!globalThis.TeacherOSPrivateMusic56?.getLink?.();
   var signature=JSON.stringify({date:fmtDate(new Date()),year:y&&y.year||'none',privateLink:privateUrlSet,lesson:slots&&slots.length,
    assess:a.map(function(x){return x.id||x.name}),tasks:tasks.map(function(x){return [x.id,x.text,x.done]}),
    upcoming:y?[y.calendarEvents,y.assessments,y.projects]:null});
  if(signature===lastSnapshot)return;lastSnapshot=signature;
  writeText('os65Date',fmtDate(new Date()));
  writeText('os65LessonValue',!y?'미설정':slots?slots.length+'개':'연결 확인');
  writeText('os65LessonNote',slots?'검증된 컴시간 기준':'검증된 시간표 미연결');
  writeText('os65AssessmentValue',!y?'미설정':a.length+'개');
  writeText('os65PendingValue',!y?'미설정':tasks.length+'건');
  writeText('os65PrivateState',privateUrlSet?'주소 등록됨 · Google에서 열기':'웹앱 주소 등록 필요');
  renderTasks(y);renderUpcoming(y);
}
function goto(view){
  var target=q('#nav button[data-view="'+view+'"]');
  if(target){
    setOpen(groupFor(view));
    target.click();
    syncActive();
    if(view==='os65-detail'&&q('#title'))q('#title').textContent='전체 업무 현황';
    window.scrollTo(0,0);
  }
}
function bindEvents(){
  var nav=q('#nav');
  nav.addEventListener('click',function(e){
    var group=e.target.closest('button[data-os65-group]');
    if(group){
      var id=group.dataset.os65Group;
      if(id==='home'){setOpen('home');goto('dashboard')}
      else setOpen(opened===id?'':id);
      return;
    }
    if(e.target.closest('button[data-view]'))setTimeout(syncActive,0);
  });
  document.addEventListener('click',function(e){
    var button=e.target.closest('[data-os65-view]');
    if(button){e.preventDefault();goto(button.dataset.os65View)}
    var toggle=e.target.closest('[data-os65-complete]');
    if(toggle){
      var id=toggle.dataset.os65Complete;
      var original=Array.from(document.querySelectorAll('#taskList input[data-task]')).find(function(x){return x.dataset.task===id});
      if(original){original.click();lastSnapshot='';setTimeout(renderHome,0)}
    }
    if(e.target.closest('#yearSelect,#editYear,#newYear,#taskAdd,[data-task],[data-task-del]'))
      setTimeout(function(){lastSnapshot='';renderHome()},20);
  });
  var form=q('#os65TaskForm');
  if(form)form.addEventListener('submit',function(e){
    e.preventDefault();
    var input=q('#os65NewTask'),value=input&&input.value.trim();
    if(!value)return;
    if(!currentYear()){q('#firstYear')?.click();return}
    var original=q('#taskInput'),add=q('#taskAdd');
    if(!original||!add)return;
    original.value=value;add.click();input.value='';
    lastSnapshot='';setTimeout(renderHome,0);
  });
  document.addEventListener('change',function(e){
    if(e.target&&e.target.id==='yearSelect'){lastSnapshot='';setTimeout(renderHome,0)}
  });
}
function mount(){
  if(globalThis.TeacherOSV66Active)return;
  if(initialized)return;
  if(!q('.main')||!q('#dashboardBody')||!q('#nav button[data-view="t49-records"]')||
      !document.body.classList.contains('teacher51-mode'))return;
  createHome();createGroups();bindEvents();
  initialized=true;
  document.body.classList.add('teacher65-mode');
  var subtitle=q('.t51-profile-name small');
  if(subtitle)subtitle.textContent='개인 업무 도구 · 민감정보 별도 보호';
  renderHome();
  syncActive();
}
setTimeout(mount,400);
setTimeout(mount,750);
setTimeout(mount,1450);
setInterval(function(){mount();if(initialized){attachExtras();renderHome()}},3000);
globalThis.TeacherOSFocusedV65={mount:mount,render:renderHome,goto:goto,homeMarkup:homeMarkup};
})();