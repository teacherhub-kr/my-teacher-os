/* MY TEACHER OS v71.2 — public teacher home in the approved mockup layout.
 * Shows class-level facts only (e.g. "2학년 1반 · 2차 미채점 3명"). Never a student's
 * name, number, score or record. Reuses live v65/v66/v70 nodes (moved, never cloned).
 * No network requests. The class aggregate comes from the existing v54 summary
 * (Google 집계표 or CSV) and is kept per school year so the home is not blank on reload.
 */
(function(root){
'use strict';
var doc=root.document;if(!doc)return;
var q=function(s){return doc.querySelector(s)};
var ready=false,activeGrade=2,sigs={};
var STALE_MS=24*3600*1000;

/* ---------- small helpers ---------- */
function el(tag,cls,txt){var n=doc.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n}
function year(){try{return typeof root.cur==='function'?root.cur():null}catch(e){return null}}
function appState(){try{/* global state */return typeof state==='object'&&state?state:null}catch(e){return null}}
function go(view){if(root.TeacherOSWorkflowV66&&typeof root.TeacherOSWorkflowV66.go==='function')root.TeacherOSWorkflowV66.go(view);else{var b=q('#nav button[data-view="'+view+'"]');if(b)b.click()}}
function appendIfNeeded(parent,child){if(parent&&child&&child.parentNode!==parent)parent.appendChild(child)}
function today(){try{return root.TeacherOSToday70&&root.TeacherOSToday70.kstToday?root.TeacherOSToday70.kstToday():new Date(Date.now()+9*3600000).toISOString().slice(0,10)}catch(e){return ''}}
function dayDiff(a,b){return Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000)}
function isoDate(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)}
function md(iso){return isoDate(iso)?Number(iso.slice(5,7))+'.'+Number(iso.slice(8,10)):''}
function stamp(v){var t=Date.parse(v||'');if(!Number.isFinite(t))return '';var d=new Date(t+9*3600000).toISOString();return Number(d.slice(5,7))+'/'+Number(d.slice(8,10))+' '+d.slice(11,16)}
function classLabel(id){var m=String(id||'').match(/^([1-3])-(\d{1,2})$/);return m?m[1]+'학년 '+Number(m[2])+'반':String(id||'')}
function gradeOf(id){var m=String(id||'').match(/^([1-3])-/);return m?Number(m[1]):0}
function changed(key,value){var s=JSON.stringify(value);if(sigs[key]===s)return false;sigs[key]=s;return true}
function setText(node,text){if(node&&node.textContent!==text)node.textContent=text}

/* ---------- line icons (static markup only) ---------- */
var ICONS={
 home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
 calendar:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M8 13h2M12 13h2M16 13h.5M8 16.5h2M12 16.5h2"/>',
 chart:'<path d="M4 20h16"/><path d="M6.5 16.5V11M10.5 16.5V7M14.5 16.5v-4M18.5 16.5V9"/>',
 users:'<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.8 14.2c2.4-.3 4.3 1.2 4.7 4.3"/>',
 doc:'<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12h7M9 15.5h7M9 19h4"/>',
 folder:'<path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v9.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"/>',
 help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.6a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1.1.9-1.1 1.7v.4"/><path d="M12 16.8h.01"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 bell:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
 file:'<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12.5h6M9 16h6"/>',
 warn:'<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17.2h.01"/>',
 edit:'<path d="M5 19.5h4l10-10-4-4-10 10z"/><path d="m13.5 7 4 4"/>',
 music:'<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 check:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
 chevron:'<path d="m10 7 5 5-5 5"/>',
 arrow:'<path d="M5 12h13M13 7l5 5-5 5"/>'
};
function svgIcon(name,cls){return '<svg class="th71-ico'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(ICONS[name]||'')+'</svg>'}

/* ---------- hero illustration (original, generic subjects) ---------- */
var HAND="font-family=\"'Nanum Pen Script','Gaegu','Comic Sans MS',cursive\"";
var ART='<svg class="th71-art-svg" viewBox="0 0 760 430" preserveAspectRatio="xMaxYMid meet" aria-hidden="true" focusable="false">'+
 '<defs><radialGradient id="th71Warm" cx="62%" cy="38%" r="62%"><stop offset="0" stop-color="#fff3e2"/><stop offset=".55" stop-color="#fdf6ee"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'+
 '<linearGradient id="th71Desk" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f6ebdd"/><stop offset="1" stop-color="#efe0cd"/></linearGradient>'+
 '<linearGradient id="th71Screen" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f4f8ff"/><stop offset="1" stop-color="#e3edff"/></linearGradient></defs>'+
 '<rect x="120" y="0" width="640" height="430" fill="url(#th71Warm)"/>'+
 '<circle cx="690" cy="62" r="40" fill="#e8f0ff"/><path d="M684 46v28" stroke="#9bb8f2" stroke-width="5" stroke-linecap="round"/><path d="M684 46l16-4v22" fill="none" stroke="#9bb8f2" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="678" cy="76" r="7" fill="#9bb8f2"/><circle cx="694" cy="66" r="7" fill="#9bb8f2"/>'+
 '<g><path d="M612 150c-6-30 4-58 22-74" stroke="#6aa877" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="636" cy="92" rx="11" ry="22" transform="rotate(32 636 92)" fill="#79b884"/><ellipse cx="610" cy="112" rx="10" ry="20" transform="rotate(-35 610 112)" fill="#5e9e6e"/><ellipse cx="642" cy="124" rx="10" ry="19" transform="rotate(50 642 124)" fill="#8cc596"/><path d="M594 150h44l-6 34h-32z" fill="#efe3d3"/><path d="M594 150h44" stroke="#e2d3bf" stroke-width="4"/></g>'+
 '<path d="M190 262 760 238v192H120z" fill="url(#th71Desk)"/>'+
 '<g transform="rotate(-7 300 300)"><rect x="210" y="262" width="210" height="96" rx="6" fill="#fff" stroke="#eee3d4"/>'+
 '<g stroke="#c9d3e3" stroke-width="1.4"><path d="M226 286h178M226 294h178M226 302h178M226 310h178M226 318h178"/><path d="M226 330h178M226 338h178M226 346h120"/></g>'+
 '<g fill="#5b6b86"><circle cx="252" cy="306" r="4.5"/><circle cx="276" cy="298" r="4.5"/><circle cx="300" cy="310" r="4.5"/><circle cx="326" cy="302" r="4.5"/></g>'+
 '<g stroke="#5b6b86" stroke-width="1.6"><path d="M256 306v-20M280 298v-20M304 310v-20M330 302v-20"/><path d="M256 286l24-8M304 290l26-8"/></g></g>'+
 '<g><rect x="300" y="112" width="5" height="96" rx="2" transform="rotate(-12 302 160)" fill="#f2b544"/><rect x="318" y="100" width="5" height="104" rx="2" transform="rotate(-3 320 150)" fill="#4a7bd8"/><rect x="334" y="110" width="5" height="98" rx="2" transform="rotate(9 336 160)" fill="#e86a5c"/><rect x="346" y="122" width="9" height="88" rx="2" transform="rotate(16 350 166)" fill="#c9d6ea"/>'+
 '<path d="M292 168h76l-6 70h-64z" fill="#fff" stroke="#e7ddd0" stroke-width="2"/><ellipse cx="330" cy="168" rx="38" ry="7" fill="#f7f2ea" stroke="#e7ddd0" stroke-width="2"/></g>'+
 '<g font-family="Pretendard,\'Apple SD Gothic Neo\',\'Malgun Gothic\',sans-serif" font-weight="700" font-size="14" fill="#fff">'+
 '<rect x="398" y="226" width="150" height="30" rx="4" fill="#3e6bc4"/><rect x="398" y="226" width="8" height="30" fill="#2f57a6"/><text x="428" y="246">아이들</text>'+
 '<rect x="404" y="196" width="146" height="30" rx="4" fill="#5c8be0"/><rect x="404" y="196" width="8" height="30" fill="#4774c8"/><text x="434" y="216">기록</text>'+
 '<rect x="396" y="166" width="150" height="30" rx="4" fill="#4a78d0"/><rect x="396" y="166" width="8" height="30" fill="#3963b4"/><text x="426" y="186">평가</text>'+
 '<rect x="402" y="136" width="146" height="30" rx="4" fill="#6c95e6"/><rect x="402" y="136" width="8" height="30" fill="#5580d4"/><text x="432" y="156">수업</text></g>'+
 '<g><path d="M552 98h168a10 10 0 0 1 10 10v116H542V108a10 10 0 0 1 10-10z" fill="#2c3e57"/><rect x="554" y="110" width="164" height="104" rx="4" fill="url(#th71Screen)"/>'+
 '<rect x="568" y="124" width="46" height="46" rx="11" fill="#3f73e0"/><path d="M584 160v-24l16-4v20" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="581" cy="160" r="4.2" fill="#fff"/><circle cx="597" cy="153" r="4.2" fill="#fff"/>'+
 '<rect x="624" y="128" width="76" height="7" rx="3.5" fill="#c3d4f5"/><rect x="624" y="142" width="58" height="7" rx="3.5" fill="#d6e2f8"/><rect x="624" y="156" width="66" height="7" rx="3.5" fill="#d6e2f8"/>'+
 '<rect x="568" y="186" width="136" height="6" rx="3" fill="#d2def6"/><rect x="568" y="186" width="54" height="6" rx="3" fill="#3f73e0"/><circle cx="622" cy="189" r="6" fill="#fff" stroke="#3f73e0" stroke-width="2"/>'+
 '<path d="M520 224h232l-14 18H534z" fill="#cfd8e6"/><path d="M612 224h52" stroke="#b5c1d4" stroke-width="3"/></g>'+
 '<g><path d="M728 146h12l13 90h-38z" fill="#a8744c"/><path d="M730 156h8l10 74h-28z" fill="#c48d60"/><path d="M734 226l8-62" stroke="#2c3e57" stroke-width="2.4" stroke-linecap="round"/><circle cx="738" cy="190" r="4" fill="#2c3e57"/></g>'+
 '<g '+HAND+' fill="#3e4a5e" font-size="22"><text x="236" y="70" transform="rotate(-8 236 70)">오늘도,</text><text x="232" y="98" transform="rotate(-8 232 98)">좋은 음악수업!</text></g>'+
 '<g stroke="#f2a33a" stroke-width="3" stroke-linecap="round"><path d="M206 52l-12-12M220 40l-2-16M188 72l-16-4"/></g>'+
 '<path d="M372 104v-20l12-3v15" fill="none" stroke="#5c8be0" stroke-width="2.6" stroke-linecap="round"/><circle cx="369" cy="105" r="4" fill="#5c8be0"/><circle cx="381" cy="97" r="4" fill="#5c8be0"/>'+
 '<g transform="rotate(-6 650 340)"><rect x="560" y="268" width="182" height="150" rx="8" fill="#fffdf8" stroke="#eadfcf" stroke-width="2"/>'+
 '<g stroke="#b9a68d" stroke-width="3" fill="none">'+[0,1,2,3,4,5,6,7].map(function(i){return '<path d="M'+(574+i*21)+' 262c0-8 10-8 10 0v14"/>'}).join('')+'</g>'+
 '<g stroke="#efe6d8" stroke-width="1.5"><path d="M576 310h150M576 336h150M576 362h150M576 388h150"/></g>'+
 '<g '+HAND+' fill="#4b5563" font-size="19"><text x="584" y="305">음악이,</text><text x="584" y="331">아이들의 오늘을</text><text x="584" y="357">더 특별하게 만들어요</text><text x="584" y="384">♪</text></g></g>'+
 '</svg>';
var PLANT='<svg class="th71-note-plant" viewBox="0 0 70 90" aria-hidden="true" focusable="false"><path d="M35 58c-2-14 2-30 12-40" stroke="#6aa877" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="47" cy="22" rx="7" ry="14" transform="rotate(35 47 22)" fill="#79b884"/><ellipse cx="28" cy="34" rx="7" ry="13" transform="rotate(-38 28 34)" fill="#5e9e6e"/><ellipse cx="45" cy="44" rx="6" ry="12" transform="rotate(55 45 44)" fill="#8cc596"/><path d="M20 58h30l-4 26H24z" fill="#f3e6d6"/><path d="M20 58h30" stroke="#e6d4bd" stroke-width="3"/></svg>';

/* ---------- class aggregate (v54) kept per year, class-level only ---------- */
function cleanSummary(s){
 if(!s||!Array.isArray(s.classes))return null;
 var classes=s.classes.filter(function(c){return c&&/^[23]-[1-9]$/.test(String(c.id))&&Array.isArray(c.missing)&&c.missing.length===4&&c.missing.every(function(n){return Number.isInteger(n)&&n>=0&&n<=45})})
  .map(function(c){return {id:String(c.id),grade:Number(String(c.id)[0]),missing:c.missing.slice(),alertType:['긴급','미채점','진도 확인'].indexOf(c.alertType)>=0?c.alertType:''}});
 if(!classes.length)return null;
 return {classes:classes,importedAt:typeof s.importedAt==='string'?s.importedAt:'',source:s.source==='google'?'Google 집계표':'CSV 집계 파일',savedAt:new Date().toISOString()};
}
function syncSummary(y){
 if(!y||!root.TeacherOSMusic54||typeof root.TeacherOSMusic54.summary!=='function')return;
 var live=null;try{live=cleanSummary(root.TeacherOSMusic54.summary())}catch(e){live=null}
 if(!live)return;
 var prev=y.classSummary71;
 if(prev&&prev.importedAt===live.importedAt)return;
 y.classSummary71=live;
 try{if(typeof root.save==='function')root.save()}catch(e){}
}
function summary(y){var s=y&&y.classSummary71;return s&&Array.isArray(s.classes)&&s.classes.length?s:null}
function summaryTotals(s){
 var total=0,classesWithMissing=0,urgent=0,byRound=[0,0,0,0];
 s.classes.forEach(function(c){var t=c.missing.reduce(function(a,b){return a+b},0);total+=t;if(t)classesWithMissing++;if(c.alertType==='긴급')urgent++;c.missing.forEach(function(n,i){byRound[i]+=n})});
 return {total:total,classesWithMissing:classesWithMissing,urgent:urgent,byRound:byRound};
}
function summaryAge(s){var t=Date.parse(s.importedAt||s.savedAt||'');return Number.isFinite(t)?Date.now()-t:Infinity}

/* ---------- timetable (v70) ---------- */
function resolvedToday(y){
 var api=root.TeacherOSToday70;if(!y||!api||!api.resolveDay)return null;
 var t=today(),v=null;
 try{v=root.TeacherOSComcigan14&&root.TeacherOSComcigan14.verifiedSlots?root.TeacherOSComcigan14.verifiedSlots(y):null;if(!Array.isArray(v))v=null}catch(e){v=null}
 try{return api.resolveDay({verified:v,verifiedWeek:v?api.mondayOf(t):'',liveWeeks:y.liveTimetableWeeks||{},base:Array.isArray(y.timetable)?y.timetable:[],exceptions:Array.isArray(y.timetableExceptions)?y.timetableExceptions:[]},t)}catch(e){return null}
}
function taughtClasses(y,grade){
 var set={};
 function add(t){var m=String(t||'').match(/^([1-3])-(\d{1,2})$/);if(m&&Number(m[1])===grade)set[t]=1}
 var weeks=y&&y.liveTimetableWeeks||{};Object.keys(weeks).forEach(function(k){(weeks[k].slots||[]).forEach(function(s){add(s.target)})});
 (y&&Array.isArray(y.timetable)?y.timetable:[]).forEach(function(s){add(s.target)});
 return Object.keys(set).sort(function(a,b){return Number(a.split('-')[1])-Number(b.split('-')[1])});
}
function clockText(period,y){
 var map=y&&y.periodTimes71;if(!map||typeof map!=='object')return '';
 var x=map[String(period)];if(!x||!/^[0-2]\d:[0-5]\d$/.test(x.start)||!/^[0-2]\d:[0-5]\d$/.test(x.end))return '';
 return x.start+' - '+x.end;
}

/* ---------- shell: sidebar, top bar ---------- */
var NAV_ICON={home:'home',lesson:'calendar',assessment:'chart',student:'users',work:'folder'};
function sidebar(){
 // v49 rewrites the original tagline on its own timer, so keep it and show our own beside it.
 var small=q('.side .brand small');
 if(small&&!q('#th71Tagline')){var tag=el('small','th71-tagline','중학교 음악 교사 통합 업무 플랫폼');tag.id='th71Tagline';small.insertAdjacentElement('afterend',tag)}
 if(small)small.style.setProperty('display','none','important');
 doc.querySelectorAll('#nav > button[data-os66-category]').forEach(function(b,i){
  var ic=b.querySelector('.os66-category-icon');
  if(ic&&!ic.dataset.th71){ic.dataset.th71='1';ic.innerHTML=svgIcon(NAV_ICON[b.dataset.os66Category]||'doc')}
  if(!b.querySelector('.th71-nav-num'))b.appendChild(el('span','th71-nav-num',String(i+1).padStart(2,'0')));
 });
 var nav=q('#nav');
 if(nav&&!q('#th71SidebarTools')){
  var tools=el('div','th71-sidebar-tools');tools.id='th71SidebarTools';
  var settings=el('button','th71-tool');settings.type='button';settings.innerHTML=svgIcon('gear')+'<span>설정</span>';settings.addEventListener('click',function(){go('settings')});
  var help=el('details','th71-help');help.innerHTML='<summary class="th71-tool">'+svgIcon('help')+'<span>도움말</span></summary><p>수업·평가·학교업무는 왼쪽 메뉴에서 엽니다. 홈에는 반 단위 숫자만 보이고, 학생 개인 성적·기록은 Google 교사 전용 화면에서만 열립니다.</p>';
  tools.append(settings,help);nav.insertAdjacentElement('afterend',tools);
 }
 var note=q('#t51SidebarNote');
 if(note&&!note.dataset.th71){note.dataset.th71='1';note.innerHTML='<p>좋은 음악수업이<br>좋은 아이들을 만듭니다.</p><small>오늘도 수고하셨어요! <span aria-hidden="true">♪</span></small>'+PLANT}
}
function teacherName(){var s=appState();var n=s&&s.profile&&typeof s.profile.teacherName71==='string'?s.profile.teacherName71.trim():'';return n.slice(0,12)}
function topbar(){
 var profile=q('#t51Profile');if(!profile)return;
 var search=q('#teacherGlobalSearch');
 if(search&&!search.dataset.th71){search.dataset.th71='1';var mark=search.querySelector('.search-mark');if(mark)mark.innerHTML=svgIcon('search');
  setText(search.querySelector('.search-placeholder'),'반, 평가명, 업무를 검색해보세요.');search.setAttribute('aria-label','반·평가·업무 검색 (학생 개인정보는 입력하지 마세요)')}
 var bell=profile.querySelector('.t51-bell');
 if(bell&&!bell.dataset.th71b){bell.dataset.th71b='1';bell.removeAttribute('data-t51-open');bell.setAttribute('aria-label','확인해야 할 알림으로 이동');
  var dot=bell.querySelector('.t51-dot');bell.innerHTML=svgIcon('bell');if(dot)bell.appendChild(dot);
  bell.addEventListener('click',function(){go('dashboard');setTimeout(function(){var a=q('#th71Alerts');if(a)a.scrollIntoView({behavior:'smooth',block:'center'})},150)})}
 if(!q('#th71Profile')){
  var details=el('details','th71-profile');details.id='th71Profile';
  var summaryEl=el('summary','th71-profile-trigger');
  summaryEl.innerHTML='<span class="th71-avatar" id="th71Avatar" aria-hidden="true">교</span><span class="th71-profile-copy"><b id="th71ProfileName">선생님</b><small id="th71ProfileYear">음악과</small></span><svg class="th71-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
  var menu=el('div','th71-profile-menu');menu.id='th71ProfileMenu';
  menu.appendChild(el('p','th71-menu-caption','학년도 · 설정 · 계정'));
  var nameRow=el('label','th71-name-row');nameRow.appendChild(el('span','','표시 이름'));
  var nameInput=el('input');nameInput.id='th71TeacherName';nameInput.maxLength=12;nameInput.placeholder='예: 박현진';nameInput.autocomplete='off';
  nameInput.addEventListener('change',function(){var s=appState();if(!s)return;s.profile=s.profile||{};s.profile.teacherName71=nameInput.value.trim().slice(0,12);try{root.save()}catch(e){}renderProfile()});
  nameRow.appendChild(nameInput);menu.appendChild(nameRow);
  details.append(summaryEl,menu);profile.appendChild(details);
 }
 var fab=q('#feedbackFab26');if(fab&&fab.parentNode!==profile){fab.classList.add('th71-report');fab.setAttribute('title','오류·불편 신고');profile.insertBefore(fab,bell||profile.firstChild)}
 var menuEl=q('#th71ProfileMenu');
 ['yearSelect','editYear','newYear','roleSetupBtn','t53HeaderButton','os66SettingsButton'].forEach(function(id){appendIfNeeded(menuEl,q('#'+id))});
 var original=profile.querySelector('.t51-profile-settings');if(original)appendIfNeeded(menuEl,original);
 if(!q('#th71PeriodButton')){var btn=el('button','th71-period-setup','교시별 시작·끝 시각 설정');btn.id='th71PeriodButton';btn.type='button';btn.addEventListener('click',openPeriods);menuEl.appendChild(btn)}
}
function renderProfile(){
 var y=year(),name=teacherName();
 setText(q('#th71ProfileName'),name?name+' 선생님':'선생님');
 setText(q('#th71Avatar'),name?name.charAt(0):'교');
 setText(q('#th71ProfileYear'),'음악과'+(y&&y.year?' · '+y.year+'학년도':''));
 var input=q('#th71TeacherName');if(input&&doc.activeElement!==input)input.value=name;
}

/* ---------- hero + KPI ---------- */
function hero(){
 var home=q('#os65Home'),header=q('#os65Home .os65-home-header'),quick=q('#os65Home .os65-quick');if(!home||!header)return;
 var wrap=q('#th71Hero');
 if(!wrap){wrap=el('section','th71-hero');wrap.id='th71Hero';wrap.setAttribute('aria-label','오늘 요약');home.insertBefore(wrap,home.firstChild);
  var art=el('div','th71-art');art.id='th71HeroArt';art.setAttribute('aria-hidden','true');art.innerHTML=ART;wrap.appendChild(art)}
 appendIfNeeded(wrap,header);if(quick)appendIfNeeded(wrap,quick);
 var eyebrow=header.querySelector('.os65-eyebrow'),heading=header.querySelector('h2'),desc=header.querySelector('.os65-home-desc');
 setText(eyebrow,'좋은 수업, 더 나은 기록');
 if(heading&&!heading.dataset.th71){heading.dataset.th71='1';heading.innerHTML='오늘, 음악수업과 평가를<br><span>한눈에</span> 관리합니다.'}
 if(desc&&!desc.dataset.th71){desc.dataset.th71='1';desc.innerHTML='수업 준비부터 수행평가, 생활기록부까지<br>음악 선생님을 위한 스마트한 교사 운영 시스템, MY TEACHER OS 입니다.'}
 setText(header.querySelector('.os65-privacy-note'),'홈에는 반 단위 숫자만 표시됩니다. 학생 개인 성적·기록은 교사 전용 Google 화면에서만 열립니다.');
}
var KPI=[
 {icon:'calendar',name:'오늘 수업',tone:'blue'},
 {icon:'file',name:'미채점',tone:'red'},
 {icon:'warn',name:'확인 필요',tone:'amber'},
 {icon:'edit',name:'생기부 메모',tone:'purple'}
];
function kpiShell(){
 doc.querySelectorAll('#os65Home .os65-quick-card').forEach(function(card,i){
  if(card.dataset.th71)return;card.dataset.th71='1';
  var k=KPI[i];if(!k)return;
  card.classList.add('th71-kpi','th71-kpi-'+k.tone);
  var icon=card.querySelector('.os65-quick-icon');if(icon)icon.innerHTML=svgIcon(k.icon);
  var name=card.querySelector('.os65-quick-name');if(name)name.textContent=k.name;
  var body=el('span','th71-kpi-body');body.innerHTML='<span class="th71-kpi-num"><b>—</b><em></em></span><small class="th71-kpi-sub"></small>';
  card.appendChild(body);
  var chev=el('span','th71-kpi-go');chev.innerHTML=svgIcon('chevron');card.appendChild(chev);
  if(i===2){card.removeAttribute('data-os65-view');card.dataset.th71Jump='alerts';card.setAttribute('aria-label','확인해야 할 알림 보기')}
 });
}
function setKpi(i,num,unit,sub){
 var card=doc.querySelectorAll('#os65Home .os65-quick-card')[i];if(!card)return;
 setText(card.querySelector('.th71-kpi-num b'),num);setText(card.querySelector('.th71-kpi-num em'),unit);setText(card.querySelector('.th71-kpi-sub'),sub);
}

/* ---------- workspace panels ---------- */
function panel(id,iconName,title,view,moreLabel){
 var p=el('section','th71-panel');p.id=id;p.setAttribute('aria-labelledby',id+'Title');
 var h=el('div','th71-panel-head');
 var t=el('h3');t.id=id+'Title';t.innerHTML=svgIcon(iconName,'th71-panel-ico');t.appendChild(doc.createTextNode(title));h.appendChild(t);
 if(view){var b=el('button','th71-more');b.type='button';b.dataset.os66View=view;b.innerHTML='<span>'+(moreLabel||'전체보기')+'</span>'+svgIcon('arrow');h.appendChild(b)}
 p.appendChild(h);return p;
}
function workspace(){
 var home=q('#os65Home');if(!home)return;
 if(!q('#th71Workspace')){
  var wrap=el('div','th71-grid');wrap.id='th71Workspace';
  var progress=panel('th71Progress','users','반별 수행평가 진행 현황','t49-classes');
  var tabs=el('div','th71-grades');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','학년 선택');
  [2,3].forEach(function(n){var b=el('button','th71-grade',n+'학년');b.type='button';b.dataset.th71Grade=n;b.setAttribute('role','tab');b.addEventListener('click',function(){activeGrade=n;sigs.progress='';renderProgress()});tabs.appendChild(b)});
  var list=el('div','th71-progress-list');list.id='th71ProgressList';list.setAttribute('aria-live','polite');
  var progressFoot=el('p','th71-panel-foot');progressFoot.id='th71ProgressFoot';
  progress.append(tabs,list,progressFoot);
  var todayP=panel('th71Today','calendar','오늘의 수업 일정','timetable','더보기');
  var src=el('div','th71-today-source');src.id='th71TodaySource';
  var timeline=el('ol','th71-timeline');timeline.id='th71Timeline';
  var fix=el('button','th71-text-link','시간표 · 바뀐 수업 고치기 →');fix.type='button';fix.dataset.os66View='timetable';
  todayP.append(src,timeline,fix);
  var recent=panel('th71Recent','chart','최근 수행평가 현황','assessment');
  var recentBody=el('div','th71-recent');recentBody.id='th71RecentBody';recent.appendChild(recentBody);
  var alerts=panel('th71Alerts','bell','확인해야 할 알림','projects','더보기');
  var alertList=el('div','th71-alert-list');alertList.id='th71AlertList';alertList.setAttribute('aria-live','polite');
  var taskHead=el('p','th71-task-head','할 일');
  var taskSlot=el('div','th71-task-slot');taskSlot.id='th71TaskSlot';
  alerts.append(alertList,taskHead,taskSlot);
  var left=el('div','th71-col th71-col-left'),right=el('div','th71-col th71-col-right');
  left.append(progress,recent);right.append(todayP,alerts);wrap.append(left,right);home.appendChild(wrap);
 }
 // Move (never clone) the live task list and form so v65/v66 handlers keep working.
 appendIfNeeded(q('#th71TaskSlot'),q('#os65PendingItems'));
 appendIfNeeded(q('#th71TaskSlot'),q('#os65TaskForm'));
}
function pill(text,tone){return el('span','th71-pill th71-pill-'+tone,text)}
function renderProgress(){
 var dest=q('#th71ProgressList'),foot=q('#th71ProgressFoot');if(!dest)return;
 var y=year(),s=summary(y);
 doc.querySelectorAll('[data-th71-grade]').forEach(function(b){var on=Number(b.dataset.th71Grade)===activeGrade;b.setAttribute('aria-selected',String(on));b.classList.toggle('th71-current',on)});
 var rows=s?s.classes.filter(function(c){return c.grade===activeGrade}):[];
 var fallback=s?[]:taughtClasses(y,activeGrade);
 if(!changed('progress',[activeGrade,rows,fallback,s&&s.importedAt]))return;
 dest.replaceChildren();
 var table=el('table','th71-table');table.setAttribute('aria-label',activeGrade+'학년 반별 수행평가 미채점 현황');
 var thead=el('thead'),hr=el('tr');hr.appendChild(el('th','','학급'));
 ['1차','2차','3차','4차'].forEach(function(r){hr.appendChild(el('th','',r))});thead.appendChild(hr);table.appendChild(thead);
 var tbody=el('tbody');
 if(rows.length){
  rows.forEach(function(c){
   var tr=el('tr'),th=el('th','th71-class');th.appendChild(el('b','',classLabel(c.id)));
   if(c.alertType==='긴급')th.appendChild(pill('긴급','red'));
   tr.appendChild(th);
   c.missing.forEach(function(n,i){var td=el('td');td.appendChild(n===0?pill('미채점 0명','green'):pill('미채점 '+n+'명','blue'));td.setAttribute('aria-label',(i+1)+'차 '+(n===0?'미채점 없음':'미채점 '+n+'명'));tr.appendChild(td)});
   tbody.appendChild(tr);
  });
 }else{
  fallback.forEach(function(id){var tr=el('tr'),th=el('th','th71-class');th.appendChild(el('b','',classLabel(id)));tr.appendChild(th);for(var i=0;i<4;i++){var td=el('td');td.appendChild(pill('—','gray'));tr.appendChild(td)}tbody.appendChild(tr)});
 }
 table.appendChild(tbody);
 if(rows.length||fallback.length){var scroll=el('div','th71-table-wrap');scroll.appendChild(table);dest.appendChild(scroll)}
 if(!s){
  var box=el('div','th71-connect');
  box.innerHTML=svgIcon('chart','th71-connect-ico');
  var copy=el('div');copy.append(el('b','',activeGrade+'학년 수행평가 집계 연결 필요'),el('p','','수행평가 메뉴의 반별 집계에서 Google 집계표를 읽거나 CSV를 넣으면 반별·차수별 미채점 인원이 여기에 표시됩니다.'));
  var go2=el('button','th71-btn','집계 연결하기');go2.type='button';go2.dataset.os66View='assessment';
  box.append(copy,go2);dest.appendChild(box);
  setText(foot,'반 단위 미채점 인원만 표시합니다. 학생 이름·점수는 표시하지 않습니다.');
  if(foot)foot.classList.remove('th71-stale');
 }else{
  var age=summaryAge(s);
  setText(foot,stamp(s.importedAt||s.savedAt)+' '+s.source+' 기준'+(age>STALE_MS?' · 하루 이상 지난 집계입니다. 수행평가 메뉴에서 다시 읽어 주세요.':'')+' · 미채점 0명은 실시·성적 확정을 뜻하지 않습니다. 학생 이름·점수는 표시하지 않습니다.');
  if(foot)foot.classList.toggle('th71-stale',age>STALE_MS);
  if(!rows.length)dest.appendChild(el('p','th71-empty',activeGrade+'학년 집계 학급이 없습니다.'));
 }
}
function progressOf(y,target){var p=y&&y.classProgress&&y.classProgress[target];return p&&typeof p==='object'?p:null}
function renderToday(){
 var list=q('#th71Timeline'),src=q('#th71TodaySource');if(!list)return;
 var y=year(),res=resolvedToday(y);
 var rows=res?res.slots.map(function(s){var p=progressOf(y,s.target);return {period:s.period,target:s.target,label:s.label,teacher:s.origin==='teacher',time:clockText(s.period,y),topic:p&&p.topic?String(p.topic).slice(0,40):'',lesson:p&&Number(p.lesson)>0?Number(p.lesson):0}}):[];
 if(!changed('today',[res&&res.kind,res&&res.fromWeek,res&&res.fetchedAt,rows]))return;
 src.replaceChildren();
 if(res&&root.TeacherOSToday70&&root.TeacherOSToday70.sourceText){
  var tone=res.kind==='live'?'ok':res.kind==='base'?'info':res.kind==='none'?'empty':'warn';
  src.appendChild(el('span','t70-source t70-'+tone,root.TeacherOSToday70.sourceText(res)));
 }
 list.replaceChildren();
 if(!res||!rows.length){
  var msg=!res?'학년도를 만들면 오늘 수업이 표시됩니다.':res.kind==='weekend'?'주말입니다. 다음 주 시간표는 더보기에서 확인하세요.':res.kind==='none'?'아직 시간표가 없습니다. 시간표 메뉴에서 컴시간을 연결하거나 수업을 직접 추가하세요.':'오늘 배정된 수업이 없습니다.';
  list.appendChild(el('li','th71-empty',msg));return;
 }
 rows.forEach(function(r){
  var li=el('li','th71-lesson'+(r.teacher?' th71-lesson-edited':''));
  var when=el('div','th71-when');when.appendChild(el('b','',r.period+'교시'));if(r.time)when.appendChild(el('time','',r.time));
  var cls=el('span','th71-class-pill th71-g'+gradeOf(r.target),/^[1-3]-\d{1,2}$/.test(r.target)?classLabel(r.target):r.label);
  var what=el('div','th71-what'),title=el('b',r.topic?'':'th71-muted',r.topic||'수업 내용 미입력');what.appendChild(title);
  what.appendChild(el('small','',(r.lesson?'진도 '+r.lesson+'차시 기록':'반별 진도 기록 없음')+(r.teacher?' · 교사 수정':'')));
  var ico=el('span','th71-lesson-ico');ico.innerHTML=svgIcon('music');
  li.append(when,cls,what,ico);list.appendChild(li);
 });
}
function roundOf(name){var m=String(name||'').match(/([1-4])\s*차/);return m?Number(m[1]):0}
function gradeFromTarget(t){var m=String(t||'').match(/([23])\s*학년|(?:^|[^0-9])([23])-\d/);return m?Number(m[1]||m[2]):0}
function renderRecent(){
 var dest=q('#th71RecentBody');if(!dest)return;
 var y=year(),s=summary(y),t=today();
 var list=(y&&Array.isArray(y.assessments)?y.assessments:[]).filter(function(a){return a&&a.name}).map(function(a){
  var due=isoDate(a.due)?a.due:'',d=due&&t?dayDiff(t,due):null;
  var round=roundOf(a.name),grade=gradeFromTarget(a.target),missing=null;
  if(s&&round&&grade){var cs=s.classes.filter(function(c){return c.grade===grade});if(cs.length)missing=cs.reduce(function(sum,c){return sum+c.missing[round-1]},0)}
  return {name:String(a.name).slice(0,40),target:String(a.target||'').slice(0,20),due:due,d:d,missing:missing,round:round,weight:String(a.weight||'').slice(0,10)};
 }).sort(function(a,b){var ka=a.d==null?9999:(a.d>=0?a.d:1000-a.d),kb=b.d==null?9999:(b.d>=0?b.d:1000-b.d);return ka-kb}).slice(0,4);
 if(!changed('recent',[list,s&&s.importedAt]))return;
 dest.replaceChildren();
 if(!list.length){
  var box=el('div','th71-connect');box.innerHTML=svgIcon('chart','th71-connect-ico');
  var copy=el('div');copy.append(el('b','','등록된 수행평가가 없습니다'),el('p','','평가명에 2차처럼 차수를, 대상에 2학년을 넣으면 반별 집계와 연결해 미채점 인원을 보여 줍니다.'));
  var b=el('button','th71-btn','수행평가 메뉴 열기');b.type='button';b.dataset.os66View='assessment';box.append(copy,b);dest.appendChild(box);return;
 }
 var table=el('table','th71-table th71-recent-table');
 var thead=el('thead'),hr=el('tr');['평가 항목','대상','마감일','채점 상태','비고'].forEach(function(h){hr.appendChild(el('th','',h))});thead.appendChild(hr);table.appendChild(thead);
 var tbody=el('tbody');
 list.forEach(function(a){
  var tr=el('tr');tr.appendChild(el('th','th71-assess-name',a.name));tr.appendChild(el('td','',a.target||'—'));tr.appendChild(el('td','',a.due?md(a.due):'—'));
  var st=el('td');
  if(a.missing===0)st.appendChild(pill('미채점 0명','green'));
  else if(a.missing>0)st.appendChild(pill('미채점 '+a.missing+'명','red'));
  else if(a.d!=null&&a.d>=0&&a.d<=7)st.appendChild(pill('마감 D-'+a.d,'amber'));
  else if(a.d!=null&&a.d>7)st.appendChild(pill('예정','blue'));
  else if(a.d!=null&&a.d<0)st.appendChild(pill('마감 지남','gray'));
  else st.appendChild(pill('일정 미입력','gray'));
  tr.appendChild(st);
  var note=a.missing!=null?a.round+'차 · 반별 집계 기준':(a.weight?'반영 '+a.weight:'');tr.appendChild(el('td','th71-muted',note||'—'));
  tbody.appendChild(tr);
 });
 table.appendChild(tbody);var wrap=el('div','th71-table-wrap');wrap.appendChild(table);dest.appendChild(wrap);
}
function alertRow(icon,title,sub,count,tone){
 var row=el('div','th71-alert th71-alert-'+tone);var i=el('span','th71-alert-ico');i.innerHTML=svgIcon(icon);row.appendChild(i);
 var copy=el('div','th71-alert-copy');copy.append(el('b','',title),el('small','',sub));row.appendChild(copy);
 if(count!==undefined&&count!==null)row.appendChild(el('strong','th71-alert-count',String(count)));return row;
}
function inDays(d,t,n){return isoDate(d)&&t&&dayDiff(t,d)>=0&&dayDiff(t,d)<=n}
function renderAlerts(){
 var dest=q('#th71AlertList');if(!dest)return 0;
 var y=year(),s=summary(y),res=resolvedToday(y),t=today();
 var tasks=y&&Array.isArray(y.tasks)?y.tasks.filter(function(x){return x&&!x.done}).length:0;
 var due=y&&Array.isArray(y.assessments)?y.assessments.filter(function(a){return a&&inDays(a.due,t,7)}).length:0;
 var events=y&&Array.isArray(y.calendarEvents)?y.calendarEvents.filter(function(e){return e&&inDays(e.date,t,7)}).length:0;
 var tot=s?summaryTotals(s):null;
 var timeWarn=!!res&&['synced','pattern','none'].indexOf(res.kind)>=0;
 var count=(tot&&tot.total?1:0)+(tot&&tot.urgent?1:0)+(timeWarn?1:0)+(due?1:0)+(events?1:0)+(tasks?1:0);
 if(!changed('alerts',[!!y,tasks,due,events,tot,timeWarn&&res.kind,s&&s.importedAt]))return count;
 dest.replaceChildren();
 if(!y){dest.appendChild(alertRow('help','학년도 설정 필요','학년도를 만들면 실제 등록된 정보로 알림을 보여 줍니다.','—','gray'));return 0}
 if(tot&&tot.total)dest.appendChild(alertRow('file','미채점 수행평가',tot.classesWithMissing+'개 반 · 1~4차 미채점 기록 '+tot.total+'건 (학생 수 아님)',tot.total,'red'));
 if(tot&&tot.urgent)dest.appendChild(alertRow('warn','긴급 표시 학급','원본 집계에서 긴급으로 표시된 반입니다.',tot.urgent,'red'));
 if(!s)dest.appendChild(alertRow('chart','수행평가 집계 연결 필요','연결하면 반별 미채점 인원을 알려 드립니다.','—','gray'));
 if(timeWarn)dest.appendChild(alertRow('calendar','시간표 변경 확인 필요',res.kind==='none'?'시간표 자료가 없습니다.':'최신 컴시간 수집이 확인되지 않았습니다.',1,'amber'));
 if(due)dest.appendChild(alertRow('clock','마감 임박 수행평가','7일 안에 마감되는 평가가 '+due+'건 있습니다.',due,'amber'));
 if(events)dest.appendChild(alertRow('calendar','일정 확인 필요','앞으로 7일 안의 학사일정이 '+events+'건 있습니다.',events,'purple'));
 if(tasks)dest.appendChild(alertRow('check','미완료 할 일','OS에 등록한 할 일이 '+tasks+'건 남아 있습니다.',tasks,'blue'));
 if(!count&&s)dest.appendChild(alertRow('check','확인할 알림 없음','등록된 자료 기준이며 학교 전체 업무 완료를 뜻하지 않습니다.',null,'green'));
 var dot=q('#t51Profile .t51-dot');if(dot)dot.hidden=!count;
 return count;
}
function renderKpis(alertCount){
 var y=year();if(!y)return;
 var res=resolvedToday(y),s=summary(y);
 if(res){
  if(res.kind==='weekend')setKpi(0,'0','개','주말');
  else if(res.kind==='none')setKpi(0,'—','','시간표 연결 필요');
  else{var periods=res.slots.map(function(x){return x.period}).filter(function(p,i,a){return a.indexOf(p)===i});
   setKpi(0,String(res.slots.length),'개',(periods.length?periods.join('·')+'교시':'오늘 수업 없음')+(res.kind==='pattern'||res.kind==='synced'?' · 변경 확인':''))}
 }else setKpi(0,'—','','시간표 확인 중');
 if(s){var tot=summaryTotals(s);setKpi(1,String(tot.total),'건','1~4차 합산 기록 · '+tot.classesWithMissing+'개 반 · '+stamp(s.importedAt||s.savedAt))}
 else setKpi(1,'—','','수행평가 집계 연결 필요');
 setKpi(2,String(alertCount||0),'건',alertCount?'확인할 알림':'확인할 알림 없음');
 var memos=Array.isArray(y.studentRecords)?y.studentRecords.length:0;
 var priv=q('#os65PrivateState');
 setKpi(3,String(memos),'건','교과세특 작성실 열기 ↗'+(priv&&/필요/.test(priv.textContent)?' · '+priv.textContent:''));
}

/* ---------- period times dialog (kept from v71.0) ---------- */
function openPeriods(){
 var y=year();if(!y){go('settings');return}
 var dlg=q('#th71Periods');
 if(!dlg){dlg=el('dialog','th71-period-dialog');dlg.id='th71Periods';
  dlg.innerHTML='<form method="dialog" class="th71-period-body"><h2>교시별 시각 설정</h2><p>학교 시정표에 있는 시각을 입력하세요. 입력한 교시만 오늘의 수업 일정에 시각이 표시됩니다.</p><div id="th71PeriodRows"></div><div class="th71-period-actions"><button type="button" id="th71PeriodsSave">저장</button><button type="button" id="th71PeriodsCancel">취소</button></div><p id="th71PeriodsError" role="alert"></p></form>';
  doc.body.appendChild(dlg);q('#th71PeriodsCancel').addEventListener('click',function(){dlg.close()});q('#th71PeriodsSave').addEventListener('click',savePeriods)}
 var rows=q('#th71PeriodRows');rows.replaceChildren();
 for(var i=1;i<=9;i++){
  var row=el('label','th71-period-row');row.appendChild(el('span','',i+'교시'));
  ['start','end'].forEach(function(k){var inp=el('input');inp.type='time';inp.dataset.th71Period=i;inp.dataset.th71Kind=k;inp.setAttribute('aria-label',i+'교시 '+(k==='start'?'시작':'종료'));inp.value=(y.periodTimes71&&y.periodTimes71[i]&&y.periodTimes71[i][k])||'';row.appendChild(inp)});
  rows.appendChild(row);
 }
 q('#th71PeriodsError').textContent='';if(dlg.showModal)dlg.showModal();
}
function savePeriods(){
 var y=year(),error=q('#th71PeriodsError');if(!y||!error)return;
 var map={};
 for(var i=1;i<=9;i++){
  var s=q('[data-th71-period="'+i+'"][data-th71-kind="start"]'),e=q('[data-th71-period="'+i+'"][data-th71-kind="end"]');
  var start=s?s.value:'',end=e?e.value:'';
  if(!start&&!end)continue;
  if(!start||!end||start>=end){error.textContent=i+'교시 시작·끝 시각을 확인하세요.';return}
  map[i]={start:start,end:end};
 }
 if(typeof root.save!=='function'){error.textContent='저장 연결을 확인할 수 없습니다. 설정은 저장되지 않았습니다.';return}
 var previous=y.periodTimes71;y.periodTimes71=map;
 try{root.save()}catch(err){y.periodTimes71=previous;error.textContent='저장에 실패했습니다. 기존 시정은 보존했습니다.';return}
 sigs.today='';renderToday();var d=q('#th71Periods');if(d&&d.close)d.close();
}

/* ---------- loop ---------- */
function bind(){
 doc.addEventListener('click',function(e){
  var jump=e.target.closest&&e.target.closest('[data-th71-jump="alerts"]');
  if(jump){e.preventDefault();var a=q('#th71Alerts');if(a){a.scrollIntoView({behavior:'smooth',block:'center'});a.classList.add('th71-flash');setTimeout(function(){a.classList.remove('th71-flash')},1200)}}
 });
}
function tick(){
 if(!q('#os65Home')||!doc.body.classList.contains('teacher66-mode')||!doc.body.classList.contains('teacher70-mode'))return;
 if(!ready){ready=true;doc.body.classList.add('teacher71-mode');bind()}
 sidebar();topbar();hero();kpiShell();workspace();
 var y=year();
 syncSummary(y);
 var w=q('#th71Workspace');if(w)w.hidden=!y;
 renderProfile();
 if(!y)return;
 renderProgress();renderToday();renderRecent();
 renderKpis(renderAlerts());
}
setTimeout(tick,900);setTimeout(tick,1450);setInterval(tick,2600);
root.TeacherOSHome71={refresh:function(){sigs={};tick()},cleanSummary:cleanSummary};
})(typeof globalThis!=='undefined'?globalThis:this);
