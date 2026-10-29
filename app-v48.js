(function(){
  'use strict';
  const U=globalThis.TeacherOSSimpleUI48;if(!U)return;
  const q=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let timer=null;
  function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return{}}}
  function ensureCss(){if(q('#simpleUiCss48'))return;const l=document.createElement('link');l.id='simpleUiCss48';l.rel='stylesheet';l.href='app-v48.css?v=48.0-simple';document.head.appendChild(l)}
  function openView(view){const b=q(`#nav button[data-view="${view}"]`);if(b)b.click()}
  function simplifyNav(){
    // v50 owns the premium navigation icon/label pairing. Avoid overwriting
    // the first span (icon) with old short labels after the new UI renders.
    if(document.body.classList.contains('teacher49-mode'))return;
    const nav=q('#nav');if(!nav)return;
    U.SECONDARY_NAV.forEach(x=>{const b=nav.querySelector(`button[data-view="${x.view}"]`);if(b)b.dataset.simple48Secondary='1'});
    U.PRIMARY_NAV.forEach(x=>{const b=nav.querySelector(`button[data-view="${x.view}"]`);if(!b)return;const s=b.querySelector('span');if(s)s.textContent=x.label});
    const brand=q('.brand small');if(brand){brand.textContent='오늘 필요한 것만 보여줍니다.';brand.classList.add('simple48-brand-copy')}
    const foot=q('.side-foot');if(foot){foot.textContent='자동화는 뒤에서 실행됩니다. 문제가 있을 때만 알려드립니다.';foot.classList.add('simple48-side-foot')}
  }
  function connectionReady(){
    const neis=read('myTeacherOS.neis35.settings.v1'),desktop=read('myTeacherOS.desktop36.settings.v1'),ds=read('myTeacherOS.desktop36.state.v1');
    return !!neis.apiKey&&!!desktop.token&&ds.connected===true;
  }
  function renderBrief(){
    const dash=q('#dashboardBody');if(!dash)return;
    let card=q('#simpleBrief48');
    if(!card){card=document.createElement('article');card.id='simpleBrief48';card.className='card simple48-brief spaced';const anchor=q('#policyBanner');if(anchor)anchor.insertAdjacentElement('afterend',card);else dash.insertAdjacentElement('afterbegin',card)}
    const plan=globalThis.TeacherOSAutonomousRuntime40?.plan?.(),b=U.brief(plan),ready=connectionReady();
    const rows=b.focus.map(x=>`<div class="simple48-focus-row"><strong>${esc(x.title)}</strong><small>${x.due?esc(x.due):'마감 확인 중'}</small></div>`).join('');
    card.innerHTML=`<div class="simple48-brief-head"><div><span class="kicker">TODAY</span><h2>오늘 할 일</h2><p class="muted">Teacher OS가 수업·일정·업무를 합쳐 중요한 것만 보여줍니다.</p></div><span class="simple48-health ${ready?'':'warn'}">${ready?'자동화 정상':'시스템 확인'}</span></div><div class="simple48-metrics"><div class="simple48-metric"><b>${b.urgent}</b><span>지금 확인</span></div><div class="simple48-metric"><b>${b.week}</b><span>이번 주</span></div><div class="simple48-metric"><b>${b.confirm}</b><span>내 확인 필요</span></div><div class="simple48-metric"><b>${b.auto}</b><span>자동 관리</span></div></div><div class="simple48-focus">${rows||'<div class="simple48-empty">지금 바로 처리할 급한 업무가 없습니다.</div>'}</div>`;
  }
  function simplifyDashboard(){
    U.TECH_DASH_IDS.forEach(id=>q('#'+id)?.classList.add('simple48-hidden'));
    q('#dashboardBody > .summary')?.classList.add('simple48-hidden');
    q('#agentRun')?.closest('article')?.classList.add('simple48-hidden');
    q('#flowList')?.closest('article')?.classList.add('simple48-hidden');
    const policy=q('#policyBanner');if(policy&&!String(policy.textContent||'').trim())policy.classList.add('simple48-hidden');
    renderBrief();
  }
  function addBack(view){const section=q('#'+view);if(!section||q(`#${view} .simple48-back`))return;const intro=section.querySelector('.section-intro');if(!intro)return;const bar=document.createElement('div');bar.className='simple48-back';bar.innerHTML='<span>평소에는 이 화면을 열 필요가 없습니다.</span><button class="btn secondary tiny" type="button">시스템으로 돌아가기</button>';bar.querySelector('button').addEventListener('click',()=>openView('settings'));intro.before(bar)}
  function secondaryTools(){
    const settings=q('#settings');if(!settings||q('#simpleMore48'))return;
    const box=document.createElement('details');box.id='simpleMore48';box.className='card simple48-more spaced';box.innerHTML=`<summary>추가 기능</summary><p class="mini">자주 쓰지 않는 기능은 여기로 정리했습니다.</p><div class="simple48-tool-grid">${U.SECONDARY_NAV.map(x=>`<button class="btn secondary" type="button" data-simple-open="${esc(x.view)}">${esc(x.label)}</button>`).join('')}</div>`;
    const adv=q('#simpleAdvanced48');if(adv)adv.insertAdjacentElement('afterend',box);else settings.appendChild(box);
    box.addEventListener('click',e=>{const b=e.target.closest('[data-simple-open]');if(b)openView(b.dataset.simpleOpen)});
    U.SECONDARY_NAV.forEach(x=>addBack(x.view));
  }
  function collapseAdvanced(){
    const settings=q('#settings');if(!settings||q('#simpleAdvanced48'))return;
    const cards=['googleSettings34','neisSettings35','desktopSettings36'].map(id=>q('#'+id)).filter(Boolean);if(!cards.length)return;
    const d=document.createElement('details');d.id='simpleAdvanced48';d.className='simple48-advanced';d.innerHTML='<summary>연결 세부설정</summary><div class="simple48-system-note">정상일 때는 열 필요가 없습니다.</div><div class="simple48-advanced-body"></div>';
    const anchor=q('#setupHealth47')||settings.querySelector('.health-grid');if(anchor)anchor.insertAdjacentElement('afterend',d);else settings.appendChild(d);
    const body=d.querySelector('.simple48-advanced-body');cards.forEach(x=>body.appendChild(x));
  }
  function simplifyCopy(){
    const set=q('#settings .section-intro h2');if(set)set.textContent='시스템 상태';
    const setp=q('#settings .section-intro .muted');if(setp)setp.textContent='문제가 있을 때만 확인하세요. 정상 연결은 Teacher OS가 뒤에서 관리합니다.';
    const map={calendar:['일정','학교 일정과 마감을 한곳에서 봅니다.'],timetable:['수업','오늘 수업과 시간표만 빠르게 확인합니다.'],assessment:['평가','평가 일정과 준비할 일을 확인합니다.'],projects:['업무','행정업무와 마감을 확인합니다.']};
    Object.entries(map).forEach(([id,v])=>{const s=q('#'+id);if(!s)return;const h=s.querySelector('.section-intro h2'),p=s.querySelector('.section-intro .muted');if(h)h.textContent=v[0];if(p){p.textContent=v[1];p.classList.add('simple48-section-copy')}})
  }
  function apply(){ensureCss();document.body.classList.add('simple48-mode');simplifyNav();simplifyDashboard();simplifyCopy();collapseAdvanced();secondaryTools()}
  const prev=globalThis.render;if(typeof prev==='function')globalThis.render=function(){const out=prev.apply(this,arguments);setTimeout(apply,0);return out};
  setTimeout(apply,1600);setTimeout(apply,3600);timer=setInterval(apply,30000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')apply()});
  globalThis.TeacherOSSimpleRuntime48={apply,openView};
})();
