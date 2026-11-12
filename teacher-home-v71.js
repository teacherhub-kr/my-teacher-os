/* MY TEACHER OS v71 — public teacher home, presentation-only upgrade.
 * Preserves live v66/v70 nodes, links, event handlers and app state. No student
 * names, gradebook values, Google auth tokens, or remote data are read here.
 */
(function(root){
'use strict';
var doc=root.document;if(!doc)return;
var q=function(s){return doc.querySelector(s)};
var ready=false,activeGrade=2,lastAlertSignature='',lastClockSignature='';
function el(tag,cls,txt){var n=doc.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n}
function year(){try{return typeof root.cur==='function'?root.cur():null}catch(e){return null}}
function go(view){if(root.TeacherOSWorkflowV66&&typeof root.TeacherOSWorkflowV66.go==='function')root.TeacherOSWorkflowV66.go(view);else q('#nav button[data-view="'+view+'"]')?.click()}
function appendIfNeeded(parent,child){if(parent&&child&&child.parentNode!==parent)parent.appendChild(child)}
function link(label,view){var b=el('button','th71-link',label);b.type='button';b.dataset.os66View=view;return b}
function makePanel(id,title,desc,view){
 var p=el('section','th71-panel');p.id=id;
 var h=el('div','th71-panel-head');var copy=el('div');copy.appendChild(el('h3','',title));if(desc)copy.appendChild(el('p','th71-panel-sub',desc));
 h.appendChild(copy);if(view)h.appendChild(link('전체보기',view));p.appendChild(h);return p;
}
function sidebar(){
 var brand=q('.side .brand'),logo=q('.side .brand .logo'),small=q('.side .brand small');
 if(logo)logo.textContent='♫';if(small)small.textContent='중학교 음악 교사 통합 업무 플랫폼';
 if(!brand)return;
 var side=q('.side'),nav=q('#nav');
 if(side&&nav&&!q('#th71SidebarTools')){
  var tools=el('div','th71-sidebar-tools');tools.id='th71SidebarTools';
  var settings=el('button','','⚙  설정');settings.type='button';settings.addEventListener('click',function(){go('settings')});
  var help=el('details','th71-help');help.innerHTML='<summary>ⓘ  도움말</summary><p>수업·평가·학교업무는 왼쪽 메뉴에서 확인하세요. 학생 성적·세특은 Google 교사 전용 화면에서만 열립니다.</p>';
  tools.append(settings,help);nav.insertAdjacentElement('afterend',tools);
 }
 var note=q('#t51SidebarNote');if(note){var p=note.querySelector('p');if(p)p.textContent='좋은 음악수업이 좋은 아이들을 만듭니다.'}
}
function topbar(){
 var top=q('.top'),profile=q('#t51Profile');if(!top||!profile)return;
 var bell=profile.querySelector('.t51-bell');
 if(bell&&!bell.dataset.th71){
  bell.dataset.th71='1';bell.removeAttribute('data-t51-open');bell.setAttribute('aria-label','확인해야 할 알림으로 이동');
  bell.addEventListener('click',function(){go('dashboard');setTimeout(function(){q('#th71Alerts')?.scrollIntoView({behavior:'smooth',block:'center'})},130)});
 }
 if(!q('#th71Profile')){
  var details=el('details','th71-profile');details.id='th71Profile';
  var summary=el('summary','th71-profile-trigger');summary.innerHTML='<span class="th71-avatar" aria-hidden="true">교</span><span class="th71-profile-copy"><b>교사</b><small id="th71ProfileYear">음악과 · 학년도 설정 필요</small></span><span class="th71-chevron" aria-hidden="true">⌄</span>';
  var menu=el('div','th71-profile-menu');menu.id='th71ProfileMenu';
  menu.appendChild(el('p','th71-menu-caption','학년도 · 설정 · 계정'));
  details.append(summary,menu);profile.appendChild(details);
 }
 var menu=q('#th71ProfileMenu');
 ['yearSelect','editYear','newYear','os66SettingsButton'].forEach(function(id){appendIfNeeded(menu,q('#'+id))});
 var original=profile.querySelector('.t51-profile-settings');if(original)appendIfNeeded(menu,original);
 if(!q('#th71PeriodButton')){
  var btn=el('button','th71-period-setup','교시별 시작·끝 시각 설정');btn.id='th71PeriodButton';btn.type='button';btn.addEventListener('click',openPeriods);menu.appendChild(btn);
 }
 var search=q('#teacherGlobalSearch');if(search)search.setAttribute('aria-label','업무와 메뉴 검색 — 학생 개인정보는 입력하지 마세요');
}
function hero(){
 var h=q('#os65Home .os65-home-header');if(!h)return;
 var eyebrow=h.querySelector('.os65-eyebrow'),heading=h.querySelector('h2'),description=h.querySelector('.os65-home-desc');
 if(eyebrow)eyebrow.textContent='좋은 수업, 더 나은 기록';
 if(heading&&!heading.dataset.th71){heading.innerHTML='오늘, 음악수업과 평가를<br><span>한눈에</span> 관리합니다.';heading.dataset.th71='1'}
 if(description)description.textContent='수업 준비부터 수행평가, 생활기록부까지. 필요한 업무를 한 화면에서 빠르고 정확하게 확인하세요.';
 if(!q('#th71HeroArt')){
  var art=el('div','th71-art');art.id='th71HeroArt';art.setAttribute('aria-hidden','true');
  art.innerHTML='<div class="th71-art-halo"></div><div class="th71-art-bubble th71-art-bubble-a">♫</div><div class="th71-art-bubble th71-art-bubble-b">♪</div><div class="th71-art-paper"><span>MY MUSIC CLASS</span><i></i><i></i><i></i><div class="th71-art-circle">♫</div></div><div class="th71-art-card"><b>45 min</b><span>좋은 수업을 위한 오늘의 기록</span><div class="th71-art-wave">▂ ▅ ▃ ▇ ▄ ▆ ▃</div></div>';
  h.appendChild(art);
 }
 var date=q('#os65Date');if(date)date.setAttribute('aria-label','현재 날짜');
}
function cards(){
 var c=q('#os65Home .os65-quick');if(!c)return;
 c.querySelectorAll('.os65-quick-card').forEach(function(card,i){card.classList.add('th71-kpi','th71-kpi-'+(i+1));
  var icon=card.querySelector('.os65-quick-icon');if(icon)icon.textContent=['▦','✓','☑','✎'][i]||'•';
  var name=card.querySelector('.os65-quick-name');if(name)name.textContent=['오늘 수업','수행평가','처리할 업무','교과세특'][i]||name.textContent;
 });
}
function createWorkspace(){
 var home=q('#os65Home');if(!home)return;
 if(!q('#th71Workspace')){
  var wrap=el('div','th71-columns');wrap.id='th71Workspace';
  var left=el('div','th71-column th71-left'),right=el('div','th71-column th71-right');
  var progress=makePanel('th71Progress','반별 수행평가 진행 현황','학생별 성적은 교사 전용 Google 원본에서만 확인','t49-classes');
  var grades=el('div','th71-grades');grades.setAttribute('role','tablist');grades.setAttribute('aria-label','학년 선택');
  [2,3].forEach(function(n){var b=el('button','th71-grade',n+'학년');b.type='button';b.dataset.th71Grade=n;b.setAttribute('role','tab');b.addEventListener('click',function(){activeGrade=n;renderProgress()});grades.appendChild(b)});
  progress.appendChild(grades);var table=el('div','th71-progress-list');table.id='th71ProgressList';table.setAttribute('aria-live','polite');progress.appendChild(table);
  var recent=makePanel('th71Recent','미채점·예외 반별 요약','원본 검증 없이 학생별 채점 상태를 만들지 않습니다.','t49-exceptions');
  recent.appendChild(el('div','th71-recent-body','Google 교사 전용 원본 연결 필요'));
  var today=makePanel('th71Today','오늘의 수업 일정','컴시간 출처와 교사 수정 여부를 함께 표시','timetable');
  var timeline=el('div','th71-timeline');timeline.id='th71Timeline';today.appendChild(timeline);
  var alerts=makePanel('th71Alerts','확인해야 할 알림','OS에 등록된 사실만 표시합니다.','projects');
  var alertList=el('div','th71-alert-list');alertList.id='th71AlertList';alertList.setAttribute('aria-live','polite');alerts.appendChild(alertList);
  var formSlot=el('div','th71-task-slot');formSlot.id='th71TaskSlot';alerts.appendChild(formSlot);
  left.append(progress,recent);right.append(today,alerts);wrap.append(left,right);home.appendChild(wrap);
 }
 // Move, never clone, original v70 today content and the existing task form.
 appendIfNeeded(q('#th71Timeline'),q('#os70Today'));
 appendIfNeeded(q('#th71TaskSlot'),q('#os65TaskForm'));
}
function safeToday(){try{return root.TeacherOSToday70?.kstToday?.()||''}catch(e){return ''}}
function resolved(){
 var y=year(),api=root.TeacherOSToday70;if(!y||!api?.resolveDay)return null;
 var today=safeToday(),v=null;
 try{v=root.TeacherOSComcigan14?.verifiedSlots?.(y);if(!Array.isArray(v))v=null}catch(e){v=null}
 try{return api.resolveDay({verified:v,verifiedWeek:v?api.mondayOf(today):'',liveWeeks:y.liveTimetableWeeks||{},base:Array.isArray(y.timetable)?y.timetable:[],exceptions:Array.isArray(y.timetableExceptions)?y.timetableExceptions:[]},today)}catch(e){return null}
}
function renderProgress(){
 var dest=q('#th71ProgressList');if(!dest)return;
 doc.querySelectorAll('[data-th71-grade]').forEach(function(b){var on=Number(b.dataset.th71Grade)===activeGrade;b.setAttribute('aria-selected',String(on));b.classList.toggle('th71-current',on)});
 dest.replaceChildren();var row=el('div','th71-connect');
 row.appendChild(el('span','th71-connect-icon','▥'));
 var content=el('div');content.append(el('b','',activeGrade+'학년 반별 진행 현황: 연결 필요'),el('p','', '공개 홈은 학생·점수 원본을 읽지 않습니다. 반별 완료율은 교사 전용 Google 화면에서 확인하세요.'));
 row.appendChild(content);dest.appendChild(row);
 var action=el('button','th71-inline-button','반별 현황 메뉴 열기');action.type='button';action.dataset.os66View='t49-classes';dest.appendChild(action);
}
function alertRecord(symbol,title,subtitle,number,tone){
 var row=el('div','th71-alert th71-alert-'+tone);row.appendChild(el('span','th71-alert-icon',symbol));
 var content=el('div','th71-alert-copy');content.append(el('b','',title),el('small','',subtitle));row.appendChild(content);
 if(number!==undefined)row.appendChild(el('strong','th71-alert-count',String(number)));return row;
}
function getDue(x){return typeof x?.due==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.due)?x.due:''}
function inSevenDays(d,today){if(!d||!today)return false;var a=new Date(today+'T00:00:00Z').getTime(),b=new Date(d+'T00:00:00Z').getTime();return b>=a&&b<=a+7*86400000}
function renderAlerts(){
 var dest=q('#th71AlertList');if(!dest)return;var y=year(),res=resolved(),today=safeToday();
 var tasks=y&&Array.isArray(y.tasks)?y.tasks.filter(function(x){return !x.done}):[];
 var assessment=y&&Array.isArray(y.assessments)?y.assessments.filter(function(x){return inSevenDays(getDue(x),today)}):[];
 var calendar=y&&Array.isArray(y.calendarEvents)?y.calendarEvents.filter(function(x){return inSevenDays(x?.date,today)}):[];
 var timeWarn=!!res&&['synced','pattern','none'].includes(res.kind);
 var sig=JSON.stringify([!!y,tasks.length,assessment.length,calendar.length,res&&res.kind,today]);if(sig===lastAlertSignature)return;lastAlertSignature=sig;
 dest.replaceChildren();
 if(!y){dest.appendChild(alertRecord('ⓘ','학년도 연결 필요','학년도를 설정한 뒤 실제 등록된 정보를 표시합니다.','—','blue'));return}
 if(assessment.length)dest.appendChild(alertRecord('◷','7일 이내 수행평가 마감','OS에 등록된 마감일 기준',assessment.length,'red'));
 if(timeWarn)dest.appendChild(alertRecord('▦','시간표 변경 확인 필요',res.kind==='none'?'시간표 자료 없음':'과거·수집 시간표는 이번 주 변경 미확인',1,'amber'));
 if(calendar.length)dest.appendChild(alertRecord('◴','다가오는 학사일정','OS에 등록된 앞으로 7일 일정',calendar.length,'purple'));
 if(tasks.length)dest.appendChild(alertRecord('☑','미완료 할 일','이 브라우저에 저장된 OS 할 일',tasks.length,'blue'));
 if(!dest.children.length)dest.appendChild(alertRecord('✓','확인 알림 없음','등록된 OS 자료 기준이며 학교 전체 업무 완료를 뜻하지 않습니다.',undefined,'green'));
 var dot=q('#t51Profile .t51-dot');if(dot)dot.hidden=dest.children.length===1&&dest.firstElementChild?.classList.contains('th71-alert-green');
}
function clockText(period,y){
 var map=y?.periodTimes71;if(!map||typeof map!=='object')return '';
 var x=map[String(period)];if(!x||!/^[0-2]\d:[0-5]\d$/.test(x.start)||!/^[0-2]\d:[0-5]\d$/.test(x.end))return '';
 return x.start+'–'+x.end;
}
function renderClock(){
 var y=year(),today=q('#os70Today');if(!today)return;
 var sig=JSON.stringify({map:y?.periodTimes71||null,html:today.querySelectorAll('.t70-lesson').length});
 if(sig===lastClockSignature&&today.querySelectorAll('.th71-time').length===today.querySelectorAll('.t70-lesson').length)return;
 lastClockSignature=sig;
 today.querySelectorAll('.t70-lesson').forEach(function(li){
  var label=li.querySelector('b'),num=Number(label?.textContent?.match(/\d+/)?.[0]),t=clockText(num,y),slot=li.querySelector('.th71-time');
  if(!slot){slot=el('time','th71-time');li.appendChild(slot)}slot.textContent=t||'시정 미설정';slot.hidden=!t;
 });
}
function openPeriods(){
 var y=year();if(!y){go('settings');return}
 var dlg=q('#th71Periods');if(!dlg){dlg=el('dialog','th71-period-dialog');dlg.id='th71Periods';dlg.innerHTML='<form method="dialog" class="th71-period-body"><h2>교시별 시각 설정</h2><p>학교 시정이 확인된 경우에만 입력하세요. 공개 시간표에는 입력한 시각만 표시합니다.</p><div id="th71PeriodRows"></div><div class="th71-period-actions"><button type="button" id="th71PeriodsSave">저장</button><button type="button" id="th71PeriodsCancel">취소</button></div><p id="th71PeriodsError" role="alert"></p></form>';doc.body.appendChild(dlg);q('#th71PeriodsCancel').addEventListener('click',function(){dlg.close()});q('#th71PeriodsSave').addEventListener('click',savePeriods)}
 var rows=q('#th71PeriodRows');rows.replaceChildren();
 for(var i=1;i<=9;i++){
  var row=el('label','th71-period-row');row.appendChild(el('span','',i+'교시'));
  ['start','end'].forEach(function(k){var inp=el('input');inp.type='time';inp.dataset.th71Period=i;inp.dataset.th71Kind=k;inp.setAttribute('aria-label',i+'교시 '+(k==='start'?'시작':'종료'));inp.value=y.periodTimes71?.[i]?.[k]||'';row.appendChild(inp)});rows.appendChild(row);
 }
 q('#th71PeriodsError').textContent='';dlg.showModal?.();
}
function savePeriods(){
 var y=year(),error=q('#th71PeriodsError');if(!y||!error)return;
 var map={};for(var i=1;i<=9;i++){
  var start=q('[data-th71-period="'+i+'"][data-th71-kind="start"]')?.value||'',end=q('[data-th71-period="'+i+'"][data-th71-kind="end"]')?.value||'';
  if(!start&&!end)continue;
  if(!start||!end||start>=end){error.textContent=i+'교시 시작·끝 시각을 확인하세요.';return}
  map[i]={start:start,end:end};
 }
 if(typeof root.save!=='function'){error.textContent='저장 연결을 확인할 수 없습니다. 설정은 저장되지 않았습니다.';return}
 var previous=y.periodTimes71;y.periodTimes71=map;
 try{root.save()}catch(e){y.periodTimes71=previous;error.textContent='저장에 실패했습니다. 기존 시정은 보존했습니다.';return}
 lastClockSignature='';renderClock();q('#th71Periods')?.close();
}
function renderProfile(){var y=year(),label=q('#th71ProfileYear');if(label)label.textContent='음악과 · '+(y&&y.year?String(y.year)+'학년도':'학년도 설정 필요')}
function tick(){
 if(!q('#os65Home')||!doc.body.classList.contains('teacher66-mode')||!doc.body.classList.contains('teacher70-mode'))return;
 if(!ready){ready=true;doc.body.classList.add('teacher71-mode');sidebar();topbar();hero();cards();createWorkspace();renderProgress()}
 // Existing layers may rerender parts; keep the original live nodes in their new places.
 appendIfNeeded(q('#th71Timeline'),q('#os70Today'));appendIfNeeded(q('#th71TaskSlot'),q('#os65TaskForm'));
 renderAlerts();renderClock();renderProfile();
}
setTimeout(tick,900);setTimeout(tick,1450);setInterval(tick,2600);
root.TeacherOSHome71={refresh:function(){lastAlertSignature='';lastClockSignature='';tick()}};
})(typeof globalThis!=='undefined'?globalThis:this);