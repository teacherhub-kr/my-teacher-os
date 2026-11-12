/* MY TEACHER OS v70 — today-first timetable and a calmer shell.
   - The timetable never goes blank just because the Comcigan collector failed:
     it falls back to this week's last collected copy, then the latest collected
     week's pattern, then the teacher's own base timetable, and always says which.
   - A teacher can change one cell for one day (no class / another class / extra
     class) and revert it. Edits reuse y.timetableExceptions (the v06 model), so
     lesson counting in core-v06 sees the same changes.
   - No network requests, no student data. Pure helpers are exported for node tests. */
(function(root){
'use strict';
var DAYS=['월','화','수','목','금'];
var PATTERN_MAX_DAYS=42;
var EDIT_SOURCE='교사 수정';

/* ---------- pure helpers ---------- */
function isoAddDays(iso,n){var d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function mondayOf(iso){var d=new Date(iso+'T00:00:00Z'),off=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-off);return d.toISOString().slice(0,10)}
function weekdayIndex(iso){return (new Date(iso+'T00:00:00Z').getUTCDay()+6)%7}
function kstToday(now){return new Date((typeof now==='number'?now:Date.now())+9*3600000).toISOString().slice(0,10)}
function daysBetween(a,b){return Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000)}
function arr(v){return Array.isArray(v)?v:[]}
function isoDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))}
function normalizeTarget(v){
  var s=String(v==null?'':v).trim().replace(/\s+/g,' ').slice(0,20);
  var m=s.match(/^([1-3])\s*(?:-|–|학년|\.|\/|\s)\s*(\d{1,2})\s*반?$/);
  return m?m[1]+'-'+Number(m[2]):s;
}
function slotLabel(s){
  var target=normalizeTarget(s.target),subject=String(s.subject||'').trim();
  var label=String(s.label||'').trim();
  return label||(target+(subject?' '+subject:' 음악'));
}
function cleanSlot(s,origin){
  var period=Number(s&&s.period);
  if(!s||!Number.isInteger(period)||period<1||period>9)return null;
  var target=normalizeTarget(s.target);if(!target)return null;
  return {period:period,target:target,subject:String(s.subject||'음악'),label:slotLabel(s),origin:origin,changed:!!s.changed};
}
function weekUsable(w){return !!(w&&Array.isArray(w.slots)&&w.slots.length>0&&w.slots.length<=60)}
function pickSource(input,date){
  var wi=weekdayIndex(date),week=mondayOf(date),day=DAYS[wi];
  if(wi>4)return {kind:'weekend',week:week,slots:[]};
  var weeks=input.liveWeeks&&typeof input.liveWeeks==='object'?input.liveWeeks:{};
  if(Array.isArray(input.verified)&&input.verifiedWeek===week)
    return {kind:'live',week:week,slots:input.verified.filter(function(s){return s&&s.day===day})};
  var exact=weeks[week];
  if(weekUsable(exact))
    return {kind:'synced',week:week,fetchedAt:exact.updatedAt||'',slots:exact.slots.filter(function(s){return s&&(s.date===date||(!s.date&&s.day===day))})};
  var earlier=Object.keys(weeks).filter(function(k){return isoDate(k)&&k<week&&weekUsable(weeks[k])}).sort();
  var last=earlier[earlier.length-1];
  if(last&&daysBetween(last,week)<=PATTERN_MAX_DAYS)
    return {kind:'pattern',week:week,fromWeek:last,slots:weeks[last].slots.filter(function(s){return s&&s.day===day})};
  var base=arr(input.base);
  if(base.length)return {kind:'base',week:week,slots:base.filter(function(s){return s&&s.day===day})};
  return {kind:'none',week:week,slots:[]};
}
function targetMatches(exTarget,slotTarget){
  var t=normalizeTarget(exTarget);
  return !t||t==='전체'||t===normalizeTarget(slotTarget);
}
function applyExceptions(slots,exceptions,date){
  var out=slots.slice(),edited=false;
  arr(exceptions).filter(function(x){return x&&x.date===date}).forEach(function(ex){
    var p=Number(ex.period)||0;edited=true;
    if(ex.action==='cancel'){
      out=out.filter(function(s){return !((p?s.period===p:true)&&targetMatches(ex.target,s.target))});
    }else if(ex.action==='replace'||ex.action==='add'){
      if(ex.action==='replace'&&p)out=out.filter(function(s){return s.period!==p});
      var add=cleanSlot({period:p||9,target:ex.target,label:ex.label&&!/^교사 수정/.test(ex.label)?ex.label:'',subject:'음악'},'teacher');
      if(add){add.exceptionId=ex.id||'';out.push(add)}
    }
  });
  return {slots:out,edited:edited};
}
function resolveDay(input,date){
  var src=pickSource(input,date);
  var slots=src.slots.map(function(s){return cleanSlot(s,src.kind)}).filter(Boolean);
  var applied=applyExceptions(slots,input.exceptions,date);
  var cells={};applied.slots.forEach(function(s){(cells[s.period]=cells[s.period]||[]).push(s)});
  var edits=arr(input.exceptions).filter(function(x){return x&&x.date===date});
  var editedPeriods={};edits.forEach(function(x){editedPeriods[Number(x.period)||0]=true});
  return {date:date,day:DAYS[weekdayIndex(date)]||'',kind:src.kind,week:src.week,fromWeek:src.fromWeek||'',fetchedAt:src.fetchedAt||'',
    slots:applied.slots.sort(function(a,b){return a.period-b.period||a.target.localeCompare(b.target)}),
    edited:applied.edited,editedPeriods:editedPeriods};
}
function resolveWeek(input,anyDate){
  var monday=mondayOf(anyDate),days=[];
  for(var i=0;i<5;i++)days.push(resolveDay(input,isoAddDays(monday,i)));
  return {week:monday,days:days};
}
function fmtMD(iso){if(!isoDate(iso))return '';return Number(iso.slice(5,7))+'월 '+Number(iso.slice(8,10))+'일'}
function fmtStamp(v){var t=Date.parse(v||'');if(!Number.isFinite(t))return '';return kstToday(t).slice(5).replace('-','/')}
function sourceText(res){
  switch(res.kind){
    case 'live':return '컴시간 · 이번 주 확인됨';
    case 'synced':return '컴시간 '+(fmtStamp(res.fetchedAt)?fmtStamp(res.fetchedAt)+' 수집본':'수집본')+' · 이후 변경은 미확인';
    case 'pattern':return fmtMD(res.fromWeek)+' 주 컴시간 기준 · 이번 주 변경 확인 필요';
    case 'base':return '직접 입력한 기본 시간표';
    case 'weekend':return '주말';
    default:return '시간표 없음';
  }
}
function shortSourceText(res){
  switch(res.kind){
    case 'live':return '컴시간 이번 주 확인';
    case 'synced':return '컴시간 '+(fmtStamp(res.fetchedAt)||'')+' 수집본';
    case 'pattern':return res.fromWeek.slice(5).replace('-','/')+' 주 기준 · 변경 확인 필요';
    case 'base':return '기본 시간표';
    default:return sourceText(res);
  }
}
function sourceTone(kind){return kind==='live'?'ok':kind==='base'?'info':kind==='none'?'empty':'warn'}
function makeId(){return 't70-'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
/* Returns a new exceptions array; never mutates the input. */
function editCell(exceptions,date,period,change){
  if(!isoDate(date))throw new Error('날짜가 올바르지 않습니다.');
  period=Number(period);if(!Number.isInteger(period)||period<1||period>9)throw new Error('교시가 올바르지 않습니다.');
  var kept=arr(exceptions).filter(function(x){return !(x&&x.date===date&&Number(x.period)===period)});
  if(!change||change.type==='revert')return kept;
  var now=new Date().toISOString(),group=makeId();
  var original=change.original?normalizeTarget(change.original):'';
  var target=normalizeTarget(change.target);
  function ex(action,t,label){return {id:makeId(),date:date,period:period,target:t,action:action,label:label,source:EDIT_SOURCE,group:group,createdAt:now}}
  if(change.type==='cancel'){
    if(!original)throw new Error('바꿀 수업이 없습니다.');
    return kept.concat([ex('cancel',original,EDIT_SOURCE+': 수업 없음')]);
  }
  if(!target)throw new Error('반을 입력하세요. 예: 2-3');
  if(change.type==='replace'){
    if(!original)throw new Error('바꿀 수업이 없습니다.');
    if(original===target)return kept;
    return kept.concat([ex('cancel',original,EDIT_SOURCE+': '+original+' → '+target),ex('add',target,'')]);
  }
  if(change.type==='add')return kept.concat([ex('add',target,'')]);
  throw new Error('알 수 없는 변경입니다.');
}
function summary(res){
  if(!res)return null;
  if(res.kind==='weekend')return {value:'주말',note:'다음 주 시간표는 시간표 메뉴에서 확인'};
  if(res.kind==='none')return {value:'시간표 없음',note:'컴시간 연결 또는 기본 시간표 입력 필요'};
  if(!res.slots.length)return {value:'오늘 수업 없음',note:shortSourceText(res)};
  var periods=res.slots.map(function(s){return s.period}).filter(function(p,i,a){return a.indexOf(p)===i});
  return {value:periods.join('·')+'교시',note:res.slots.length+'개 · '+shortSourceText(res)+(res.edited?' · 교사 수정 포함':'')};
}
var pure={DAYS:DAYS,isoAddDays:isoAddDays,mondayOf:mondayOf,weekdayIndex:weekdayIndex,kstToday:kstToday,normalizeTarget:normalizeTarget,
  pickSource:pickSource,applyExceptions:applyExceptions,resolveDay:resolveDay,resolveWeek:resolveWeek,sourceText:sourceText,shortSourceText:shortSourceText,editCell:editCell,summary:summary};
if(typeof module==='object'&&module.exports){module.exports=pure;return}

/* ---------- browser runtime ---------- */
var doc=root.document;if(!doc)return;
var q=function(s){return doc.querySelector(s)};
var viewWeek='',ready=false,lastHome='',lastTable='';
function el(tag,cls,text){var n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n}
function year(){try{return typeof root.cur==='function'?root.cur():null}catch(e){return null}}
function runtimeInput(y){
  var verified=null,today=kstToday();
  try{var v=root.TeacherOSComcigan14&&root.TeacherOSComcigan14.verifiedSlots&&root.TeacherOSComcigan14.verifiedSlots(y);if(Array.isArray(v))verified=v}catch(e){}
  return {verified:verified,verifiedWeek:verified?mondayOf(today):'',liveWeeks:y&&y.liveTimetableWeeks||{},
    base:y?arr(y.timetable):[],exceptions:y?arr(y.timetableExceptions):[]};
}
function persist(){
  try{if(typeof root.save==='function'){root.save();return}}catch(e){}
  // state/KEY are app-v05 top-level lexical bindings shared by classic scripts.
  try{/* global state, KEY */root.localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
}
function badge(res){var b=el('span','t70-source t70-'+sourceTone(res.kind),sourceText(res));b.title='시간표 출처';return b}

/* Home: today's lessons and the quick card value */
function renderHome(){
  var home=q('#os65Home');if(!home)return;
  var y=year();
  doc.body.classList.toggle('t70-first-run',!y);
  var setup=q('#os66Setup');
  if(setup&&!setup.dataset.t70){
    setup.dataset.t70='1';
    setup.innerHTML='<div class="t70-setup-copy"><b>처음 한 번만 설정하면 됩니다</b>'+
      '<p>학년도를 만들면 오늘 수업·수행평가·할 일이 이 화면에 모입니다.</p></div>'+
      '<ol class="t70-steps" aria-label="처음 설정 순서"><li class="t70-step-now"><span>1</span>학년도 만들기</li>'+
      '<li><span>2</span>컴시간 연결<small>시간표 자동 표시</small></li>'+
      '<li><span>3</span>교사 전용 화면 주소<small>세특·성적은 Google에서만</small></li></ol>'+
      '<button type="button" data-os66-start>학년도 시작</button>';
  }
  var strip=q('#os70Today');
  if(!strip){
    strip=el('section','t70-today');strip.id='os70Today';strip.setAttribute('aria-labelledby','os70TodayHeading');
    var quick=home.querySelector('.os65-quick');
    if(quick)quick.insertAdjacentElement('afterend',strip);else home.appendChild(strip);
  }
  if(!y){strip.hidden=true;return}
  var res=resolveDay(runtimeInput(y),kstToday());
  var sum=summary(res);
  var value=q('#os65LessonValue'),note=q('#os65LessonNote');
  if(value&&value.textContent!==sum.value)value.textContent=sum.value;
  if(note&&note.textContent!==sum.note)note.textContent=sum.note;
  var sig=JSON.stringify([res.kind,res.fromWeek,res.fetchedAt,res.slots]);
  if(sig===lastHome&&!strip.hidden)return;lastHome=sig;strip.hidden=false;
  strip.replaceChildren();
  var head=el('div','t70-today-head');
  var h=el('h3','','오늘 수업');h.id='os70TodayHeading';
  var open=el('button','t70-link','시간표 · 바뀐 수업 고치기 →');open.type='button';open.dataset.os66View='timetable';
  head.append(h,badge(res),open);strip.appendChild(head);
  var list=el('ol','t70-today-list');
  if(!res.slots.length){
    var msg=res.kind==='weekend'?'주말입니다.':res.kind==='none'?'아직 시간표가 없습니다. 시간표 메뉴에서 컴시간을 연결하거나 수업을 직접 추가하세요.':'오늘 배정된 수업이 없습니다.';
    strip.appendChild(el('p','t70-empty',msg));return;
  }
  res.slots.forEach(function(s){
    var li=el('li','t70-lesson'+(s.origin==='teacher'?' t70-edited':''));
    li.append(el('b','',s.period+'교시'),el('span','',s.label));
    if(s.origin==='teacher')li.appendChild(el('small','',EDIT_SOURCE));
    list.appendChild(li);
  });
  strip.appendChild(list);
}

/* Timetable view: one grid, clear source, per-day edits */
function ensureCard(){
  var view=q('#timetable');if(!view)return null;
  var card=q('#tt70');
  if(card)return card;
  card=el('article','card t70-card');card.id='tt70';card.setAttribute('aria-labelledby','tt70Heading');
  card.innerHTML='<div class="t70-card-head"><div><span class="kicker">THIS WEEK</span><h3 id="tt70Heading">이번 주 시간표</h3>'+
    '<p class="t70-help">칸을 누르면 그날 하루만 바꿀 수 있습니다. 주황색 칸은 선생님이 고친 칸이며 언제든 원래대로 되돌릴 수 있습니다.</p></div>'+
    '<div class="t70-week-nav"><button type="button" data-t70-week="-1" aria-label="지난주">←</button>'+
    '<button type="button" data-t70-week="0">이번 주</button><button type="button" data-t70-week="1" aria-label="다음 주">→</button></div></div>'+
    '<div id="tt70Source" class="t70-source-row" aria-live="polite"></div>'+
    '<div class="t70-grid-wrap"><table id="tt70Grid" class="t70-grid"></table></div>';
  var intro=view.querySelector(':scope > .section-intro');
  if(intro)intro.insertAdjacentElement('afterend',card);else view.prepend(card);
  return card;
}
function renderTable(force){
  var card=ensureCard();if(!card)return;
  var y=year(),today=kstToday();
  if(!viewWeek)viewWeek=mondayOf(today);
  var table=q('#tt70Grid'),srcRow=q('#tt70Source');
  if(!y){
    var sigNone='none';if(!force&&lastTable===sigNone)return;lastTable=sigNone;
    srcRow.replaceChildren(el('span','t70-source t70-empty','학년도를 먼저 만들면 시간표를 표시하고 고칠 수 있습니다.'));
    table.replaceChildren();return;
  }
  var wk=resolveWeek(runtimeInput(y),viewWeek);
  var sig=JSON.stringify([viewWeek,today,wk.days.map(function(d){return [d.kind,d.fromWeek,d.fetchedAt,d.slots,d.editedPeriods]})]);
  if(!force&&sig===lastTable)return;lastTable=sig;
  q('#tt70Heading').textContent=(viewWeek===mondayOf(today)?'이번 주':fmtMD(viewWeek)+' 주')+' 시간표 ('+fmtMD(wk.days[0].date)+' ~ '+fmtMD(wk.days[4].date)+')';
  var kinds={};wk.days.forEach(function(d){kinds[sourceText(d)]=d});
  srcRow.replaceChildren();Object.keys(kinds).forEach(function(k){srcRow.appendChild(badge(kinds[k]))});
  var reliesOnOld=wk.days.some(function(d){return d.kind==='pattern'||d.kind==='synced'});
  var nothing=wk.days.every(function(d){return d.kind==='none'});
  if(reliesOnOld)srcRow.appendChild(el('span','t70-note','최신 컴시간 수집이 확인되지 않았습니다. 바뀐 수업은 칸을 눌러 직접 고치세요.'));
  else if(nothing)srcRow.appendChild(el('span','t70-note','아래 \'컴시간 개인 설정\'을 연결하면 자동으로 채워지고, 칸을 눌러 수업을 직접 추가할 수도 있습니다.'));
  var maxP=6;wk.days.forEach(function(d){d.slots.forEach(function(s){if(s.period>maxP)maxP=s.period})});maxP=Math.min(Math.max(maxP,7),9);
  var thead=el('thead'),hr=el('tr');hr.appendChild(el('th','','교시'));
  wk.days.forEach(function(d){var th=el('th',d.date===today?'t70-today-col':'');th.append(el('b','',d.day),el('small','',d.date.slice(5).replace('-','/')));if(d.date===today)th.setAttribute('aria-current','date');hr.appendChild(th)});
  thead.appendChild(hr);
  var tbody=el('tbody');
  for(var p=1;p<=maxP;p++){
    var tr=el('tr');tr.appendChild(el('th','t70-period',p));
    wk.days.forEach(function(d){
      var td=el('td',d.date===today?'t70-today-col':'');
      var items=d.slots.filter(function(s){return s.period===p});
      var edited=!!d.editedPeriods[p];
      var btn=el('button','t70-cell'+(edited?' t70-edited':'')+(items.length?'':' t70-free'));btn.type='button';
      btn.dataset.t70Date=d.date;btn.dataset.t70Period=String(p);
      if(items.length)items.forEach(function(s){btn.appendChild(el('span','t70-cell-label',s.label))});
      else btn.appendChild(el('span','t70-cell-empty',edited?'수업 없음':''));
      if(edited)btn.appendChild(el('small','t70-cell-tag',EDIT_SOURCE));
      btn.setAttribute('aria-label',d.day+'요일 '+p+'교시 '+(items.length?items.map(function(s){return s.label}).join(', '):'수업 없음')+(edited?' (교사 수정)':'')+' · 눌러서 그날만 바꾸기');
      td.appendChild(btn);tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.replaceChildren(thead,tbody);
}
function ensureDialog(){
  var dlg=q('#tt70Dlg');if(dlg)return dlg;
  dlg=el('dialog','t70-dialog');dlg.id='tt70Dlg';dlg.setAttribute('aria-labelledby','tt70DlgTitle');
  dlg.innerHTML='<form method="dialog" class="t70-dialog-body" id="tt70Form">'+
    '<div class="t70-dialog-head"><div><span class="kicker">이날만 바꾸기</span><h2 id="tt70DlgTitle"></h2><p id="tt70DlgNow" class="t70-help"></p></div>'+
    '<button type="button" class="t70-x" data-t70-close aria-label="닫기">×</button></div>'+
    '<label class="t70-field">바꿀 반<input id="tt70Target" maxlength="20" autocomplete="off" placeholder="예: 2-3"></label>'+
    '<div class="t70-dialog-actions">'+
    '<button type="button" class="btn primary" data-t70-do="replace" id="tt70Replace">이 반으로 바꾸기</button>'+
    '<button type="button" class="btn primary" data-t70-do="add" id="tt70Add">수업 추가</button>'+
    '<button type="button" class="btn secondary" data-t70-do="cancel" id="tt70Cancel">이날 수업 없음</button>'+
    '<button type="button" class="btn secondary" data-t70-do="revert" id="tt70Revert">원래대로 되돌리기</button></div>'+
    '<p id="tt70Error" class="t70-error" role="alert"></p>'+
    '<p class="t70-help">이 변경은 이 브라우저의 Teacher OS에만 저장되며 컴시간 원본은 바뀌지 않습니다.</p></form>';
  doc.body.appendChild(dlg);
  return dlg;
}
var editing=null;
function openEditor(date,period){
  var y=year();if(!y){q('#firstYear')&&q('#firstYear').click();return}
  var res=resolveDay(runtimeInput(y),date);
  var input=runtimeInput(y);input.exceptions=[];
  var original=resolveDay(input,date).slots.filter(function(s){return s.period===period});
  var current=res.slots.filter(function(s){return s.period===period});
  editing={date:date,period:period,original:original[0]?original[0].target:''};
  var dlg=ensureDialog();
  q('#tt70DlgTitle').textContent=fmtMD(date)+' ('+DAYS[weekdayIndex(date)]+') '+period+'교시';
  q('#tt70DlgNow').textContent='지금: '+(current.length?current.map(function(s){return s.label}).join(', '):'수업 없음')+
    (original.length?' · 원래: '+original.map(function(s){return s.label}).join(', '):'')+' · '+sourceText(res);
  q('#tt70Target').value='';q('#tt70Error').textContent='';
  q('#tt70Replace').hidden=!editing.original;
  q('#tt70Cancel').hidden=!editing.original;
  q('#tt70Add').hidden=!!editing.original;
  q('#tt70Revert').hidden=!res.editedPeriods[period];
  if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
  setTimeout(function(){var t=q('#tt70Target');if(t)t.focus()},0);
}
function closeEditor(){var dlg=q('#tt70Dlg');if(dlg){if(typeof dlg.close==='function'&&dlg.open)dlg.close();else dlg.removeAttribute('open')}editing=null}
function applyEdit(type){
  var y=year();if(!y||!editing)return;
  try{
    y.timetableExceptions=editCell(y.timetableExceptions,editing.date,editing.period,{type:type,original:editing.original,target:q('#tt70Target').value});
  }catch(e){q('#tt70Error').textContent=e.message;return}
  persist();closeEditor();lastHome='';renderTable(true);renderHome();
}
function bind(){
  doc.addEventListener('click',function(e){
    var cell=e.target.closest&&e.target.closest('.t70-cell');
    if(cell){openEditor(cell.dataset.t70Date,Number(cell.dataset.t70Period));return}
    var nav=e.target.closest&&e.target.closest('[data-t70-week]');
    if(nav){var n=Number(nav.dataset.t70Week);viewWeek=n===0?mondayOf(kstToday()):isoAddDays(viewWeek||mondayOf(kstToday()),n*7);renderTable(true);return}
    var act=e.target.closest&&e.target.closest('[data-t70-do]');
    if(act){applyEdit(act.dataset.t70Do);return}
    if(e.target.closest&&e.target.closest('[data-t70-close]')){closeEditor();return}
  });
  doc.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&e.target&&e.target.id==='tt70Target'){e.preventDefault();applyEdit(editing&&editing.original?'replace':'add')}
  });
}
function wrapHomeRender(){
  var f=root.TeacherOSFocusedV65;
  if(!f||typeof f.render!=='function'||f.render.t70)return;
  var base=f.render;
  var wrapped=function(){var r=base.apply(this,arguments);try{renderHome()}catch(e){}return r};
  wrapped.t70=true;f.render=wrapped;
}
function tick(){
  if(!doc.body||!doc.body.classList.contains('teacher66-mode'))return;
  if(!ready){ready=true;doc.body.classList.add('teacher70-mode');bind()}
  wrapHomeRender();
  try{renderHome()}catch(e){}
  try{renderTable(false)}catch(e){}
}
setTimeout(tick,600);setTimeout(tick,1200);setTimeout(tick,2000);
setInterval(tick,2500);
root.TeacherOSToday70=Object.assign({},pure,{refresh:function(){lastHome='';lastTable='';tick()}});
})(typeof globalThis!=='undefined'?globalThis:this);
