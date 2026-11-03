/* MY TEACHER OS v66 — five direct workspaces with contextual tabs.
   Preserve original elements/event handlers and keep gradebook private. */
(function(){
'use strict';
globalThis.TeacherOSV66Active=true; // Do not mount the obsolete v65 grouped dashboard.
var q=function(s){return document.querySelector(s)};
var CATEGORIES=[
 {id:'home',label:'홈',primary:'dashboard',views:[['dashboard','오늘의 업무']]},
 {id:'lesson',label:'수업 관리',primary:'timetable',views:[['timetable','시간표'],['calendar','학사일정'],['lessonlog','수업 기록'],['policy','교육과정·지침'],['lessons/','음악 수업자료실']]},
 {id:'assessment',label:'수행평가',primary:'assessment',views:[['assessment','평가계획'],['t49-classes','반별 현황'],['t49-exceptions','미채점·예외']]},
 {id:'student',label:'학생·생활기록부',primary:'studentrecords',views:[['studentrecords','학생 관찰 기록'],['t49-records','생활기록부 근거']]},
 {id:'work',label:'학교업무',primary:'projects',views:[['projects','행정업무'],['clubs','동아리'],['memory','업무기억']]}
];
var UTIL=[['settings','설정·백업'],['documents','자료함'],['importer','학교자료 자동세팅']];
var ready=false,selected='home',lastTab='',lastRender='';
function element(tag,cls,txt){
 var e=document.createElement(tag);if(cls)e.className=cls;
 if(txt!==undefined)e.textContent=String(txt);return e;
}
function group(view){
 if(['settings','documents','importer'].indexOf(view)>=0)return 'utility';
 for(var i=0;i<CATEGORIES.length;i++)
  if(CATEGORIES[i].views.some(function(v){return v[0]===view}))return CATEGORIES[i].id;
 // Preserve access to newly loaded plug-in screens rather than dropping them.
 return 'utility';
}
function primary(id){
 var cat=CATEGORIES.find(function(x){return x.id===id});
 if(!cat)return 'settings';
 if(id==='student'&&!q('#nav button[data-view="studentrecords"]'))return 't49-records';
 return cat.primary;
}
function collectHiddenNav(){
 var nav=q('#nav'),store=q('#os66LegacyNav');if(!nav||!store)return;
 Array.from(nav.children).forEach(function(child){
  if(child===store||child.classList.contains('os66-category')||child.matches('script,style'))return;
  store.appendChild(child);
 });
}
function buildNavigation(){
 var nav=q('#nav'),top=q('.top'),actions=q('.top-actions');if(!nav||!top||!actions)return;
 nav.dataset.os65Grouped='1'; // Existing v49 nav must not reorder the live buttons.
 if(!q('#os66LegacyNav')){
  var store=element('div','os66-nav-engine');store.id='os66LegacyNav';
  nav.appendChild(store);
  CATEGORIES.forEach(function(g,i){
    var b=element('button','os66-category',g.label);
    b.type='button';b.dataset.os66Category=g.id;
    b.setAttribute('aria-label',g.label+' 열기');
    b.innerHTML='<span class="os66-category-icon" aria-hidden="true">'+
      ['⌂','▣','▤','✎','☷'][i]+'</span><span class="os66-category-name">'+g.label+'</span>';
    nav.insertBefore(b,store);
  });
 }
 collectHiddenNav();
 if(!q('#os66SettingsButton')){
  var settings=element('button','os66-settings-button','설정 · 자료함');
  settings.id='os66SettingsButton';settings.type='button';
  settings.title='설정·자료함·자동세팅·백업';settings.setAttribute('aria-label','설정과 자료함 열기');
  actions.appendChild(settings);
 }
 if(!q('#os66Tabs')){
  var tabs=element('nav','os66-tabs');tabs.id='os66Tabs';
  tabs.setAttribute('aria-label','현재 업무의 세부 메뉴');tabs.hidden=true;
  top.insertAdjacentElement('afterend',tabs);
 }
}
function rehomeOldDashboard(){
 var body=q('#dashboardBody'),workspace=q('#t49Workspace');
 if(!body||!workspace)return false;
 // Move *original* nodes, never clone innerHTML or re-create form IDs.
 var moves=[
  ['policyBanner','policy',false],
  ['nextList','calendar',true],
  ['agentRun','policy',true],
  ['todayTimetable','timetable',true],
  ['flowList','assessment',true],
  ['taskList','projects',true]
 ];
 moves.forEach(function(m){
  var node=q('#'+m[0]),dest=q('#'+m[1]);if(!node||!dest)return;
  var card=m[2]?node.closest('article.card')||node:node;
  // A summary should be above the original content but below the page heading.
  var heading=dest.querySelector(':scope > .section-intro');
  if(heading)heading.insertAdjacentElement('afterend',card);
  else dest.appendChild(card);
 });
 var library=q('.musicLibraryFeatured');
 if(library&&q('#timetable')){
   var t=q('#timetable'),heading=t.querySelector(':scope > .section-intro');
   if(heading)heading.insertAdjacentElement('afterend',library);else t.appendChild(library);
 }
 var summary=workspace.querySelector('.summary');
 if(summary&&q('#settings'))q('#settings').appendChild(summary);
 // Some programmatic add-ons still inject nodes into the old workspace.
 // Retain those nodes in settings until they can be given an explicit task tab.
 var leftovers=Array.from(workspace.querySelectorAll('.t49-workspace-group'));
 var extra=q('#os66ExtraTools');
 if(!extra){
  extra=element('section','os66-extra-tools');
  extra.id='os66ExtraTools';
  extra.innerHTML='<h3>기타 연결된 도구</h3>';
  q('#settings').appendChild(extra);
 }
 leftovers.forEach(function(slot){
  Array.from(slot.children).forEach(function(child){
   if(child.matches('.grid2')&&!child.children.length){child.remove();return}
   if(child.matches('.grid2')){
    Array.from(child.children).forEach(function(n){extra.appendChild(n)});
    child.remove();
   }else extra.appendChild(child);
  });
 });
 if(!extra.querySelector('article,.card,.policy-banner,.summary'))extra.hidden=true;
 var screen=q('#t49Screen'),classes=q('#t49-classes');
 if(screen&&classes)classes.appendChild(screen);
 workspace.remove();
 // The parent used by the original app stays alive for old render() calls.
 // Its content is now in the correct functional screens.
 if(body&&body.children.length)Array.from(body.children).forEach(function(n){
   if(n.id==='t49Screen')return;
   if(!n.id&&!n.className)return;
   extra.appendChild(n);extra.hidden=false;
 });
 return true;
}
function createHome(){
 var dashboard=q('#dashboard');if(!dashboard)return;
 if(!q('#os65Home')&&globalThis.TeacherOSFocusedV65?.homeMarkup){
  var temp=element('div');
  var content=globalThis.TeacherOSFocusedV65.homeMarkup()
    .replace(/data-os65-view="os65-detail"/g,'data-os65-view="projects"')
    .replace('기존 업무도구와 세부 진행상황은 모두 보존했습니다.','기존 기능은 각각의 업무 메뉴에서 바로 사용할 수 있습니다.')
    .replace('상세 업무 현황 보기 →','학교업무 열기 →');
  temp.innerHTML=content;dashboard.appendChild(temp.firstElementChild);
 }
 if(!q('#os66Setup')&&q('#os65Home .os65-home-header')){
  var panel=element('div','os66-setup');panel.id='os66Setup';panel.hidden=true;
  panel.innerHTML='<div><b>학년도를 먼저 설정하세요.</b><p>개인 업무 데이터가 만들어지면 시간표·평가·할 일을 확인할 수 있습니다.</p></div>'+
    '<button type="button" data-os66-start>학년도 시작</button>';
  q('#os65Home .os65-home-header').insertAdjacentElement('afterend',panel);
 }
 var old=q('#os65-detail');
 if(old){
  var body=q('#dashboardBody'),dash=q('#dashboard');
  if(body&&dash)dash.appendChild(body);
  old.remove();
 }
}
function tabsFor(view){
 var tabs=q('#os66Tabs');if(!tabs)return;
 var id=group(view);selected=id;
 tabs.replaceChildren();
 if(id==='home'){tabs.hidden=true;return}
 var cat=CATEGORIES.find(function(x){return x.id===id});
 var list=cat?cat.views.slice():UTIL.slice();
 if(id==='utility'){
   Array.from(q('#os66LegacyNav').querySelectorAll('button[data-view]')).forEach(function(b){
    var v=b.dataset.view;if(group(v)==='utility'&&!list.some(function(t){return t[0]===v}))
     list.push([v,b.textContent.trim()||v]);
   });
 }
 var title=element('span','os66-tabs-title',cat?cat.label:'설정·자료');
 tabs.appendChild(title);
 list.forEach(function(x){
  if(x[0]==='lessons/'){
   var a=element('a','os66-tab','수업자료실');
   a.href='lessons/';a.setAttribute('aria-label','음악 수업자료실 열기');
   tabs.appendChild(a);return;
  }
  if(!q('#nav button[data-view="'+x[0]+'"]')||!q('#'+x[0]))return;
  var b=element('button','os66-tab',x[1]);b.type='button';
  b.dataset.os66View=x[0];
  if(view===x[0])b.setAttribute('aria-current','page');
  tabs.appendChild(b);
 });
 tabs.hidden=false;
}
function updateActive(){
 var current=q('#os66LegacyNav button.active[data-view]');
 var view=current&&current.dataset.view||'dashboard';
 if(!q('#'+view)?.classList.contains('active')){
  var actual=document.querySelector('.view.active');if(actual)view=actual.id;
 }
 if(!view)return;
 tabsFor(view);
 CATEGORIES.forEach(function(cat){
  var button=q('#nav [data-os66-category="'+cat.id+'"]');
  if(button){
   button.classList.toggle('os66-current',group(view)===cat.id);
   if(group(view)===cat.id)button.setAttribute('aria-current','page');
   else button.removeAttribute('aria-current');
  }
 });
 var settings=q('#os66SettingsButton');
 if(settings)settings.classList.toggle('os66-current',group(view)==='utility');
 var name=CATEGORIES.find(function(x){return x.id===group(view)});
 if(q('#title'))q('#title').textContent=name?name.label:'설정·자료';
}
function go(view){
 var button=q('#os66LegacyNav button[data-view="'+view+'"]');
 if(!button){
  if(view==='studentrecords')button=q('#os66LegacyNav button[data-view="t49-records"]');
  if(!button)return;
 }
 button.click();updateActive();
 if(typeof window.scrollTo==='function')window.scrollTo(0,0);
}
function getYear(){
 try{return typeof cur==='function'?cur():null}catch(e){return null}
}
function refreshHome(){
 if(!q('#os65Home'))return;
 if(globalThis.TeacherOSFocusedV65?.render)globalThis.TeacherOSFocusedV65.render();
 var setup=q('#os66Setup');if(setup)setup.hidden=!!getYear();
}
function completeTask(id){
 var original=Array.from(document.querySelectorAll('#taskList input[data-task]'))
   .find(function(x){return x.dataset.task===id});
 if(original){original.click();setTimeout(refreshHome,0)}
}
function bind(){
 q('#nav').addEventListener('click',function(e){
  var category=e.target.closest('[data-os66-category]');
  if(category){go(primary(category.dataset.os66Category));return}
  if(e.target.closest('button[data-view]'))setTimeout(updateActive,0);
 });
 document.addEventListener('click',function(e){
  var tab=e.target.closest('[data-os66-view]');
  if(tab){go(tab.dataset.os66View);return}
  var button=e.target.closest('[data-os65-view]');
  if(button){go(button.dataset.os65View);return}
  if(e.target.closest('#os66SettingsButton')){go('settings');return}
  if(e.target.closest('[data-os66-start]')){q('#firstYear')?.click();return}
  var box=e.target.closest('#os65PendingItems [data-os65-complete]');
  if(box){completeTask(box.dataset.os65Complete);return}
  if(e.target.closest('#yearSelect,#editYear,#newYear,#taskAdd,[data-task],[data-task-del]'))
    setTimeout(refreshHome,30);
 });
 var form=q('#os65TaskForm');
 if(form)form.addEventListener('submit',function(e){
  e.preventDefault();
  var input=q('#os65NewTask'),value=input&&input.value.trim();
  if(!value)return;
  if(!getYear()){q('#firstYear')?.click();return}
  var task=q('#taskInput'),add=q('#taskAdd');if(!task||!add)return;
  task.value=value;add.click();input.value='';
  setTimeout(refreshHome,0);
 });
 document.addEventListener('change',function(e){
  if(e.target?.id==='yearSelect')setTimeout(refreshHome,30);
 });
}
function mount(){
 if(ready)return;
 if(!q('.main')||!q('#t49Workspace')||!q('#t49Screen')||
   !q('#nav button[data-view="t49-records"]')||
   !document.body.classList.contains('teacher51-mode'))return;
 buildNavigation();
 createHome();
 rehomeOldDashboard();
 bind();
 ready=true;
 document.body.classList.add('teacher65-mode','teacher66-mode');
 collectHiddenNav();updateActive();refreshHome();
}
setTimeout(mount,250);
setTimeout(mount,450);
setTimeout(mount,900);
setTimeout(mount,1600);
setInterval(function(){
 mount();
 if(ready){collectHiddenNav();updateActive();refreshHome()}
},3500);
globalThis.TeacherOSWorkflowV66={mount:mount,go:go,refresh:refreshHome};
})();