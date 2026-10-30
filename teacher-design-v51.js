/* MY TEACHER OS v51 — reference-composition layer, no private grade data. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const h=(tag,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;return e};
function topbar(){
  const top=$('.top');if(!top)return;
  const title=top.querySelector('h1#title');if(title){title.closest('div')?.classList.add('t51-original-title')}
  if(!$('#t51Profile')){
    const p=h('div','t51-profile');p.id='t51Profile';
    p.innerHTML='<button type="button" class="t51-bell" data-t51-open="projects" aria-label="할 일 보기">♧<span class="t51-dot"></span></button>'+
      '<span class="t51-separator"></span><span class="t51-avatar" aria-hidden="true">♫</span>'+
      '<span class="t51-profile-name"><b>MY TEACHER OS</b><small>교사 전용 업무 공간</small></span>'+
      '<button type="button" class="t51-profile-settings" data-t51-open="settings" aria-label="설정 열기">⌄</button>';
    top.appendChild(p);
  }
  const search=$('#teacherGlobalSearch');if(search){search.setAttribute('aria-label','Teacher OS 전체 검색');search.title='학생 이름·성적을 입력할 때에는 비공개 자료에만 저장하세요'}
}
function sidebar(){
  const side=$('.side'),nav=$('#nav');if(!side||!nav)return;
  if(!$('#t51SidebarNote')){
    const note=h('div','t51-sidebar-note');note.id='t51SidebarNote';
    note.innerHTML='<p>좋은 음악수업이<br>좋은 아이들을 만듭니다.</p><small>오늘도 수고하셨어요! ♪</small><span aria-hidden="true" class="t51-flower">♬</span>';
    side.insertBefore(note,side.querySelector('.side-foot')||null);
  }
  const logo=$('.brand .logo');if(logo)logo.textContent='♫';
}
function dashboard(){
  const screen=$('#t49Screen');if(!screen)return;
  const hero=screen.querySelector('.t49-hero'),copy=screen.querySelector('.t49-hero-copy');
  if(hero){hero.classList.add('t51-hero')}
  if(copy&&!copy.dataset.t51Updated){
    const p=copy.querySelector('p');
    if(p)p.textContent='수업 준비부터 수행평가, 생활기록부까지. 음악 선생님을 위한 스마트한 교사 운영 시스템, MY TEACHER OS입니다.';
    copy.dataset.t51Updated='1';
  }
  const banner=$('#t49SetupBanner');
  const profile=$('#t51Profile');if(banner&&profile&&banner.parentElement!==profile){profile.insertBefore(banner,profile.firstChild)}
  if(banner){
    banner.classList.add('t51-onboarding-mini');
    const long=banner.querySelector('small');if(long)long.textContent='학년도를 설정하면 수업·평가 현황이 표시됩니다.';
  }
  const cards=screen.querySelectorAll('.t49-kpi');
  const labels=['오늘 수업','수행평가','확인 필요','생기부 근거'];
  const icons=['▣','▤','△','✎'];
  cards.forEach((el,i)=>{
    const label=el.querySelector('.t49-kpi-label');
    if(label)label.textContent=labels[i];
    const icon=el.querySelector('.t49-kpi-icon');if(icon)icon.textContent=icons[i];
    el.classList.add('t51-kpi');
  });
  const panels=screen.querySelectorAll('.t49-panel');
  if(panels[0]){panels[0].classList.add('t51-progress-panel');const t=panels[0].querySelector('.t49-panel-head h3');if(t)t.textContent='♧  반별 수행평가 진행 현황'}
  if(panels[1]){panels[1].classList.add('t51-today-panel');const t=panels[1].querySelector('.t49-panel-head h3');if(t)t.textContent='▣  오늘의 수업 일정'}
  if(panels[2]){panels[2].classList.add('t51-recent-panel');const t=panels[2].querySelector('.t49-panel-head h3');if(t)t.textContent='▥  최근 수행평가 · 업무 현황'}
  if(panels[3]){panels[3].classList.add('t51-alert-panel');const t=panels[3].querySelector('.t49-panel-head h3');if(t)t.textContent='🔔  확인해야 할 알림'}
  const progress=$('#t49Progress');
  if(progress&&progress.querySelectorAll('tbody tr').length>3){progress.querySelectorAll('tbody tr').forEach((tr,i)=>{tr.hidden=i>=3})}
  const recent=$('#t49AssessList');
  if(recent&&!recent.querySelector('.t51-evidence-table')){
    const existing=recent.querySelectorAll('.t49-list-item');
    const table=h('table','t51-evidence-table');
    table.innerHTML='<thead><tr><th>평가·업무</th><th>관련 학급</th><th>일정</th><th>진행</th></tr></thead><tbody></tbody>';
    const tbody=table.querySelector('tbody');
    if(!existing.length){
      tbody.innerHTML='<tr><td colspan="4" class="t51-no-private-data"><span class="t51-record-circle">♫</span>학년도를 설정하면 등록된 평가가 이곳에 표시됩니다.<small>학생별 점수는 교사용 원본에서만 확인합니다.</small></td></tr>';
    }else{
      [...existing].slice(0,4).forEach(el=>{
        const title=el.querySelector('b')?.textContent||'등록 평가',target=el.querySelector('small')?.textContent||'학급 확인',due=el.querySelector('.t49-when')?.textContent||'미정';
        const tr=h('tr');for(const [val,cls] of [[title,''],[target,''],[due,''],['등록','t51-status']]){const td=h('td',cls);td.textContent=val;tr.appendChild(td)}tbody.appendChild(tr);
      });
    }
    recent.replaceChildren(table);
  }
  const today=$('#t49TodayList');
  if(today&&today.querySelector('.t49-empty')&&!today.querySelector('.t51-preview-list')){
    today.innerHTML='<div class="t51-preview-list">'+
      '<div class="t51-schedule-row"><span class="t51-round">1</span><div><b>수업 시간표 연결</b><small>학년도를 설정하면 오늘 수업이 표시됩니다.</small></div><span class="t51-status">설정 필요</span></div>'+
      '<div class="t51-schedule-row"><span class="t51-round">2</span><div><b>수행평가 일정 확인</b><small>학교 평가 계획을 등록하면 자동으로 정리됩니다.</small></div><span class="t51-status">확인 대기</span></div>'+
      '<div class="t51-schedule-row"><span class="t51-round">♪</span><div><b>음악 수업자료실</b><small>MY MUSIC CLASS에 등록된 수업 자료를 확인하세요.</small></div><button type="button" data-t51-music>열기 ↗</button></div>'+
      '</div>';
  }
  const alerts=$('#t49Alerts');
  if(alerts&&alerts.querySelectorAll('.t49-list-item').length<=1&&!alerts.querySelector('.t51-alert-preview')){
    alerts.innerHTML='<div class="t51-alert-preview">'+
      '<div class="t51-alert-row"><span class="t51-alert-icon red">▤</span><b>수행평가 미채점</b><small>교사용 채점 원본에서 확인</small><em>—</em></div>'+
      '<div class="t51-alert-row"><span class="t51-alert-icon orange">♧</span><b>자발적 미참여</b><small>학생별 예외상태는 비공개</small><em>—</em></div>'+
      '<div class="t51-alert-row"><span class="t51-alert-icon blue">▣</span><b>수업 진도 확인</b><small>시간표 연결 후 확인</small><em>—</em></div>'+
      '<div class="t51-alert-row"><span class="t51-alert-icon purple">▦</span><b>생활기록부 근거</b><small>관찰 기록 연결 후 확인</small><em>—</em></div>'+
      '</div>';
  }
}
function apply(){
  if(!document.body.classList.contains('teacher49-mode'))return;
  document.body.classList.add('teacher51-mode');
  topbar();sidebar();dashboard();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-t51-open]');if(b){document.querySelector('#nav button[data-view="'+b.dataset.t51Open+'"]')?.click();}
  if(e.target.closest('[data-t51-music]'))location.href='lessons/';
});
setTimeout(apply,350);setTimeout(apply,1700);setTimeout(apply,4500);
setInterval(apply,2500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});
globalThis.TeacherOSReferenceV51={apply};
})();