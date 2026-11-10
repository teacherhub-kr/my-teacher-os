/* MY MUSIC CLASS · Hybrid Deck V2
   A full-screen PPT-like deck plus the original interactive HTML lesson.
   Original audio/video/quiz DOM is never recreated when changing modes. */
(() => {
  "use strict";
  const script=document.currentScript;
  const lessonId=script?.dataset?.musicLesson;
  const deckPath=script?.dataset?.deck || "./deck.json";
  const allowed=new Set(["orchestra-timbre","rhythm-lab","dynamics-expression","gayageum-observation","vocal-breath-phrasing","bali-gamelan-archive","arirang-vocal"]);
  if(!allowed.has(lessonId)||!document.body)return;
  const h=(tag,cl,txt,parent)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined&&txt!==null)e.textContent=String(txt);if(parent)parent.append(e);return e;};
  const btn=(label,cl,parent,fn)=>{const b=h("button",cl,label,parent);b.type="button";if(fn)b.addEventListener("click",fn);return b;};
  const storage="music-hybrid-v2:"+lessonId;
  const state={index:0,answers:{},revealed:{},patterns:{},teacher:false,remaining:2700,slideRemaining:0};
  let deck=null,root=null,stage=null,teacherPanel=null,openButton=null,top=null,bottom=null,clock=null,slideClock=null,progress=null;
  let timerId=0,lastTick=0;
  function save(){try{sessionStorage.setItem(storage,JSON.stringify({index:state.index,answers:state.answers,revealed:state.revealed,patterns:state.patterns,remaining:state.remaining}))}catch(_){}}
  function restore(){try{const p=JSON.parse(sessionStorage.getItem(storage)||"null");if(!p)return;state.index=Number.isInteger(p.index)?Math.min(Math.max(p.index,0),deck.slides.length-1):0;state.answers=p.answers&&typeof p.answers==="object"?p.answers:{};state.revealed=p.revealed&&typeof p.revealed==="object"?p.revealed:{};state.patterns=p.patterns&&typeof p.patterns==="object"?p.patterns:{};state.remaining=Number.isFinite(p.remaining)?Math.max(0,Math.min(2700,p.remaining)):2700;}catch(_){}}
  const mmss=n=>String(Math.floor(Math.max(0,n)/60)).padStart(2,"0")+":"+String(Math.ceil(Math.max(0,n)%60)).padStart(2,"0");
  function pauseOverlayMedia(){
    root?.querySelectorAll("audio,video").forEach(x=>x.pause());
    root?.querySelectorAll("iframe").forEach(f=>{try{f.contentWindow?.postMessage(JSON.stringify({event:"command",func:"pauseVideo",args:[]}),"https://www.youtube-nocookie.com")}catch(_){}});
  }
  function updateClock(){if(!clock)return;clock.textContent="수업 "+mmss(state.remaining);slideClock.textContent="장면 "+mmss(state.slideRemaining);}
  function setRunning(run){
    if(run===!!timerId)return;
    if(run){lastTick=Date.now();timerId=window.setInterval(()=>{
      const now=Date.now(),sec=Math.max(0,(now-lastTick)/1000);lastTick=now;
      state.remaining=Math.max(0,state.remaining-sec);state.slideRemaining=Math.max(0,state.slideRemaining-sec);
      if(state.remaining<=0){setRunning(false)}
      updateClock();save();
    },500);}else{clearInterval(timerId);timerId=0;}
    const b=root.querySelector("[data-hd=timer]");if(b)b.textContent=timerId?"Ⅱ 일시정지":"▶ 타이머";
  }
  function setup(){
    root=h("div","",null,document.body);root.id="music-hybrid-deck";root.dataset.theme=deck.theme;
    root.setAttribute("aria-label",deck.title+" 발표 화면");
    const header=h("header","hd-top",null,root);
    const brand=h("div","",null,header);
    h("div","hd-brand","MY MUSIC CLASS · HYBRID LESSON",brand);
    h("div","hd-meta",deck.title+" · 중학교 2학년 · 45분",brand);
    const tools=h("div","hd-tools",null,header);
    btn("활동 화면","hd-btn gold",tools,()=>show(false)).dataset.hd="activity";
    btn("교사 노트 N","hd-btn",tools,()=>{state.teacher=!state.teacher;paintTeacher();}).dataset.hd="teacher";
    clock=h("span","hd-clock","수업 45:00",tools);
    slideClock=h("span","hd-clock","장면 00:00",tools);
    btn("▶ 타이머","hd-btn",tools,()=>setRunning(!timerId)).dataset.hd="timer";
    btn("⛶ 전체화면","hd-btn",tools,()=>{
      if(document.fullscreenElement){document.exitFullscreen?.().catch(()=>{});}
      else{document.documentElement.requestFullscreen?.().catch(()=>{});}
    });
    const workspace=h("main","hd-workspace",null,root);stage=h("section","hd-slide",null,workspace);stage.setAttribute("aria-live","polite");
    bottom=h("footer","hd-bottom",null,root);
    const nav=h("div","hd-nav",null,bottom);
    btn("← 이전","hd-btn",nav,()=>go(state.index-1)).dataset.hd="prev";
    btn("다음 →","hd-btn gold",nav,()=>go(state.index+1)).dataset.hd="next";
    progress=h("div","hd-progress",null,bottom);
    h("span","hd-total","",bottom).dataset.hd="total";
    teacherPanel=h("aside","hd-teacher",null,root);teacherPanel.hidden=true;teacherPanel.setAttribute("aria-label","교사 전용 장면별 수업 운영안");
    openButton=btn("PPT형 발표 열기","hd-floating-open",document.body,()=>show(true));openButton.id="music-hybrid-open";
    applyInitial();
    paint();
  }
  function applyInitial(){
    const q=new URLSearchParams(location.search);
    const p=q.get("mode")==="present";
    show(p);
  }
  function show(present){
    if(!root)return;
    if(!present)pauseOverlayMedia();
    document.body.classList.toggle("music-hybrid-open",!!present);
    openButton.hidden=!!present;
    root.setAttribute("aria-hidden",present?"false":"true");
    if(!present){state.teacher=false;teacherPanel.hidden=true;setRunning(false);}
    if(present){paint();root.querySelector(".hd-slide")?.focus?.({preventScroll:true})}
    try{history.replaceState(null,"",location.pathname+(present?"?mode=present":"?mode=activity")+location.hash)}catch(_){}
    save();
  }
  function go(i){
    if(!deck||i<0||i>=deck.slides.length||i===state.index)return;
    pauseOverlayMedia();
    state.index=i;state.slideRemaining=deck.slides[i].min*60;paint();save();
  }
  function teacherText(slide){return slide.teacher||"교사 지도안의 내용과 시범을 확인합니다.";}
  function paintTeacher(){
    if(!deck)return;
    teacherPanel.replaceChildren();const s=deck.slides[state.index];
    h("h2","", "교사용 · "+(state.index+1)+" / "+deck.slides.length,teacherPanel);
    h("p","","장면 "+s.min+"분 · 음악 활동 설계 "+s.music+"분",teacherPanel);
    h("p","",teacherText(s),teacherPanel);
    h("p","","진행 순서: "+s.tasks.join(" → "),teacherPanel);
    h("p","","이 수업의 음악 활동 시간은 설계상 예상치이며, 학생별 실연·청음 여부는 실제 교실에서 관찰해야 합니다.",teacherPanel);
    const l=h("a","", "전체 45분 교사용 지도안",teacherPanel);l.href="teacher.html";l.target="_blank";l.rel="noopener noreferrer";
    btn("교사 노트 닫기","hd-btn",teacherPanel,()=>{state.teacher=false;paintTeacher();});
    teacherPanel.hidden=!state.teacher;
  }
  function renderAudioItem(parent,src,label){
    if(!/^(https:\/\/|http:\/\/127\.0\.0\.1|assets\/)/.test(src||""))return;
    const wrap=h("div","hd-sound",null,parent);h("b","",label||"실연 음원",wrap);
    const audio=h("audio","",null,wrap);audio.controls=true;audio.preload="none";
    audio.src=src.startsWith("assets/")?new URL(src,location.href).href:src;
    audio.setAttribute("aria-label",label||"음악 감상");
    audio.addEventListener("error",()=>{h("span","hd-source","음원 재생 실패 · 활동 화면의 원본 재생 도구를 이용하세요.",wrap)},{once:true});
  }
  function renderMedia(parent,media){
    if(!media)return false;
    if(media.youtube&&/^[\w-]{11}$/.test(media.youtube)){
      const wrap=h("div","hd-media wide",null,parent),poster=h("div","hd-media-placeholder",null,wrap);
      h("b","",media.label||"공식 연주 영상",poster);
      btn("▶","hd-play",poster,()=>{
        poster.remove();const f=h("iframe","",null,wrap);f.title=media.label||"음악 감상 영상";
        f.allow="autoplay; encrypted-media; picture-in-picture";f.allowFullscreen=true;
        f.referrerPolicy="strict-origin-when-cross-origin";
        f.src="https://www.youtube-nocookie.com/embed/"+media.youtube+"?rel=0&enablejsapi=1";
      }).setAttribute("aria-label","영상 재생");
      const source=h("p","hd-source",null,parent);h("span","", "영상이 차단되면 ",source);
      const a=h("a","", "원본 YouTube에서 열기",source);a.href="https://www.youtube.com/watch?v="+media.youtube;a.target="_blank";a.rel="noopener noreferrer";
      return true;
    }
    if(media.audio||Array.isArray(media.audios)){
      const list=h("div","hd-sound-list",null,parent);
      (Array.isArray(media.audios)?media.audios:[{src:media.audio,label:media.label}]).slice(0,4).forEach(a=>renderAudioItem(list,a.src,a.label));
      return true;
    }
    return false;
  }
  function renderTerms(parent,terms){
    if(!Array.isArray(terms)||!terms.length)return;
    const grid=h("div","hd-tiles",null,parent);
    for(const t of terms.slice(0,8))h("div","hd-tile",t,grid);
  }
  function renderPattern(parent,s){
    const originals=s.pattern;
    if(!Array.isArray(originals)||!originals.length)return;
    const key=String(state.index);
    let values=state.patterns[key];
    if(!Array.isArray(values)||values.length!==originals.length){values=originals.slice();state.patterns[key]=values;}
    const g=h("div","hd-pattern",null,parent);
    const rhythm=["타","티티","쉿"];
    values.forEach((value,i)=>{
      const editable=!!s.editable;const el=btn(value,"hd-beat",g,()=>{
        if(!editable)return;
        const k=rhythm.indexOf(state.patterns[key][i]);
        state.patterns[key][i]=rhythm[(k+1)%rhythm.length];save();paint();
      });el.dataset.editable=String(editable);el.disabled=!editable;
      const index=h("small","",String(i+1)+"박",el);index.setAttribute("aria-hidden","true");
    });
  }
  function renderQuiz(parent,s){
    const k=String(state.index),options=s.choices||[];
    const choices=h("div","hd-choices",null,parent);
    options.forEach((option,i)=>{
      const b=btn(String.fromCharCode(65+i)+". "+option,"hd-choice",choices,()=>{
        if(state.revealed[k])return;
        state.answers[k]=i;save();paint();
      });
      b.dataset.selected=String(state.answers[k]===i);
      if(state.revealed[k]&&i===s.answer)b.classList.add("correct");
      else if(state.revealed[k]&&state.answers[k]===i)b.classList.add("wrong");
    });
    h("p","hd-feedback",state.revealed[k]?s.explain:"정답을 고른 뒤 확인해 보세요.",parent);
    const row=h("div","hd-quiz-actions",null,parent);
    const b=btn(state.revealed[k]?"다시 풀기":"정답 확인","hd-btn gold",row,()=>{
      if(state.revealed[k]){delete state.revealed[k];delete state.answers[k];}
      else if(state.answers[k]!==undefined)state.revealed[k]=true;
      save();paint();
    });b.disabled=!state.revealed[k]&&state.answers[k]===undefined;
  }
  function actionsBox(parent,s){
    const box=h("div","hd-actions",null,parent);
    (s.tasks||[]).slice(0,3).forEach((item,i)=>{
      const row=h("div","hd-action",null,box);
      h("span","hd-action-number",String(i+1).padStart(2,"0"),row);
      h("div","hd-action-text",item,row);
    });
  }
  function paint(){
    if(!deck||!stage)return;
    const s=deck.slides[state.index];
    stage.replaceChildren();stage.dataset.kind=s.type;
    h("div","hd-decor",s.type==="closing"?"♫":s.type==="practice"?"♪":"♬",stage);
    const layout=h("div","hd-layout",null,stage),lead=h("div","hd-lead",null,layout);
    const kicker=h("div","hd-eyebrow",null,lead);
    h("span","hd-index",String(state.index+1).padStart(2,"0"),kicker);
    h("span","",s.phase+" · "+s.min+"분",kicker);
    h("h1","hd-title",s.title,lead);
    h("p","hd-prompt",s.prompt,lead);
    h("div","hd-accent-line",null,lead);
    const used=deck.slides.slice(0,state.index).reduce((n,x)=>n+x.min,0);
    h("div","hd-stage-info",used+"~"+(used+s.min)+"분 · "+deck.slides.length+"장면 중 "+(state.index+1)+"번째",lead);
    const side=h("div","hd-side",null,layout);
    const hadMedia=renderMedia(side,s.media);
    if(s.type==="quiz"&&s.choices)renderQuiz(side,s);
    else if(Array.isArray(s.pattern))renderPattern(side,s);
    else if(Array.isArray(s.terms)&&s.terms.length)renderTerms(side,s.terms);
    if(!hadMedia && !s.choices && !s.pattern && !s.terms)actionsBox(side,s);
    else if(hadMedia){ const short=h("div","hd-source",null,side);short.textContent="오늘 할 일 · "+(s.tasks||[]).slice(0,2).join(" / "); }
    else { const short=h("div","hd-source",null,side);short.textContent=(s.tasks||[]).slice(0,2).join(" · "); }
    root.querySelector('[data-hd=prev]').disabled=state.index===0;
    root.querySelector('[data-hd=next]').disabled=state.index===deck.slides.length-1;
    const p=progress;p.replaceChildren();
    deck.slides.forEach((_,i)=>{
      const b=btn("","hd-progress-step",p,()=>go(i));
      b.dataset.current=String(i===state.index);b.dataset.done=String(i<state.index);
      b.setAttribute("aria-label",String(i+1)+"번째 장면으로 이동");
      b.title=(i+1)+". "+deck.slides[i].title;
    });
    root.querySelector('[data-hd=total]').textContent=(state.index+1)+" / "+deck.slides.length+" · 45분";
    updateClock();paintTeacher();
  }
  document.addEventListener("keydown",event=>{
    if(!root||event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;
    const tag=event.target?.tagName;
    if(["INPUT","TEXTAREA","SELECT","AUDIO","VIDEO","IFRAME"].includes(tag)||event.target?.isContentEditable)return;
    if((event.key==="m"||event.key==="M")&&!event.repeat){event.preventDefault();show(!document.body.classList.contains("music-hybrid-open"));return;}
    if(!document.body.classList.contains("music-hybrid-open"))return;
    if((event.key==="n"||event.key==="N")&&!event.repeat){state.teacher=!state.teacher;paintTeacher();return;}
    if((event.key==="f"||event.key==="F")&&!event.repeat){root.querySelector(".hd-top .hd-btn:last-child")?.click();return;}
    if(event.key==="Escape"&&state.teacher){state.teacher=false;paintTeacher();return;}
    if(["ArrowRight","PageDown"].includes(event.key)){event.preventDefault();go(state.index+1);}
    else if(["ArrowLeft","PageUp"].includes(event.key)){event.preventDefault();go(state.index-1);}
    else if(event.key===" "&&(event.target===document.body||event.target===document.documentElement)){event.preventDefault();go(state.index+1);}
  });
  fetch(deckPath,{cache:"no-store"})
    .then(r=>{if(!r.ok)throw new Error("Deck HTTP "+r.status);return r.json();})
    .then(data=>{
      if(data.schemaVersion!==2||data.id!==lessonId||!Array.isArray(data.slides)||data.slides.length<9||
         data.slides.reduce((n,s)=>n+s.min,0)!==45||
         data.slides.reduce((n,s)=>n+s.music,0)<23)throw new Error("Invalid hybrid lesson plan "+lessonId);
      deck=data;restore();state.slideRemaining=deck.slides[state.index].min*60;
      setup();
      console.info("MUSIC_HYBRID_V2_READY",lessonId,deck.slides.length,"slides");
    })
    .catch(err=>{console.error("Music hybrid deck unavailable. Original HTML lesson remains functional.",err);});
})();
