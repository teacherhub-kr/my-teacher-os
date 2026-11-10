/* Presentation enhancement, intentionally independent of lesson renderers.
 * Changes only an optional control dock and body CSS class; never re-creates media or responses.
 */
(() => {
  "use strict";
  const script = document.currentScript;
  const lesson = script?.dataset.musicLesson || location.pathname.split("/").filter(Boolean).at(-2) || "lesson";
  const supported = new Set([
    "orchestra-timbre","rhythm-lab","dynamics-expression","gayageum-observation",
    "vocal-breath-phrasing","bali-gamelan-archive","arirang-vocal"
  ]);
  if (!supported.has(lesson) || !document.body || document.getElementById("music-presentation-controls")) return;
  const body = document.body;
  body.dataset.musicLesson = lesson;
  const navSelector = lesson === "vocal-breath-phrasing" ? "#steps" :
    ["gayageum-observation","arirang-vocal"].includes(lesson) ? "#tabs" : "#nav";
  const legacyNav = document.querySelector(navSelector);
  const toolbar = document.createElement("nav");
  toolbar.id = "music-presentation-controls";
  toolbar.setAttribute("aria-label", "음악 수업 발표와 활동 전환");
  toolbar.innerHTML =
    '<span class="mp-label">MY MUSIC CLASS</span>' +
    '<button type="button" class="mp-switch" data-mp="mode" aria-pressed="false" title="PPT형 발표 모드로 전환 (M)">발표 모드</button>' +
    '<button type="button" data-mp="prev" aria-label="이전 활동 (왼쪽 방향키)" title="이전 활동">←</button>' +
    '<span class="mp-status" aria-live="polite" aria-atomic="true">1 / ?</span>' +
    '<button type="button" data-mp="next" aria-label="다음 활동 (오른쪽 방향키)" title="다음 활동">→</button>' +
    '<button type="button" data-mp="full" title="전체화면 (F)" aria-label="전체화면">⛶</button>' +
    '<a class="mp-guide" href="teacher.html" target="_blank" rel="noopener noreferrer" title="교사용 지도안">교사용</a>';
  body.append(toolbar);
  const get = action => toolbar.querySelector('[data-mp="' + action + '"]');
  const modeButton = get("mode");
  const prevButton = get("prev");
  const nextButton = get("next");
  const fullButton = get("full");
  const status = toolbar.querySelector(".mp-status");
  const storageKey = "music-presentation:" + lesson;
  let presenting = false;
  try { presenting = new URLSearchParams(location.search).get("mode") === "present" ||
    (new URLSearchParams(location.search).get("mode") !== "activity" && sessionStorage.getItem(storageKey) === "present"); }
  catch (_) {}
  function controls() {
    const prev = document.getElementById("prev") ||
      (lesson === "orchestra-timbre" ? document.querySelector(".foot button:first-child") : null);
    const next = document.getElementById("next") ||
      (lesson === "orchestra-timbre" ? document.querySelector(".foot button:last-child") : null);
    return {prev,next};
  }
  function currentStep() {
    const buttons = Array.from(legacyNav?.querySelectorAll("button") || []);
    if (buttons.length) {
      const active = buttons.findIndex(b => ["on","sel","active","selected","current"].some(c => b.classList.contains(c)) ||
        b.getAttribute("aria-current") === "step" || b.getAttribute("aria-selected") === "true");
      if (active >= 0) return {index:active,total:buttons.length};
    }
    const indicator = ["counter","count","pos","status"].map(id => document.getElementById(id)?.textContent || "").join(" ");
    const found = indicator.match(/\b(\d+)\s*\/\s*(\d+)\b/);
    if (found) return {index:Math.max(0,Number(found[1])-1),total:Number(found[2])};
    return {index:0,total:buttons.length || null};
  }
  function refreshStatus() {
    const state = currentStep(),btns=controls();
    status.textContent = (state.index + 1) + " / " + (state.total || "?");
    prevButton.disabled = !!btns.prev && btns.prev.disabled || state.index === 0;
    nextButton.disabled = !!btns.next && btns.next.disabled || (state.total !== null && state.index >= state.total-1);
    if (!btns.prev) prevButton.disabled = true;
    if (!btns.next) nextButton.disabled = true;
    body.classList.toggle("mp-first-step",state.index===0);
  }
  function applyMode() {
    body.classList.toggle("music-presenting",presenting);
    modeButton.textContent=presenting ? "활동 모드" : "발표 모드";
    modeButton.title=presenting ? "HTML 활동 모드로 돌아가기 (M)" : "PPT형 발표 모드로 전환 (M)";
    modeButton.setAttribute("aria-pressed",String(presenting));
    toolbar.dataset.mode=presenting ? "present" : "activity";
    try { sessionStorage.setItem(storageKey,presenting ? "present" : "activity"); } catch (_) {}
    refreshStatus();
  }
  function toggleMode(){presenting=!presenting;applyMode();}
  function move(direction) {
    const target = direction > 0 ? controls().next : controls().prev;
    if (target && !target.disabled) {target.click();queueMicrotask(refreshStatus);}
  }
  modeButton.addEventListener("click",toggleMode);
  prevButton.addEventListener("click",()=>move(-1));
  nextButton.addEventListener("click",()=>move(1));
  fullButton.addEventListener("click",()=>{
    if(document.fullscreenElement){document.exitFullscreen?.().catch(()=>{});}
    else{document.documentElement.requestFullscreen?.().catch(()=>{});}
  });
  document.addEventListener("fullscreenchange",()=>{
    fullButton.textContent=document.fullscreenElement ? "⤢" : "⛶";
    fullButton.setAttribute("aria-label",document.fullscreenElement ? "전체화면 종료" : "전체화면");
  });
  document.addEventListener("keydown",e=>{
    if(e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    const el=e.target;
    if (el?.isContentEditable || /^(INPUT|TEXTAREA|SELECT|AUDIO|VIDEO|IFRAME)$/.test(el?.tagName || "")) return;
    if ((e.key==="m"||e.key==="M") && !e.repeat){e.preventDefault();toggleMode();return;}
    if ((e.key==="f"||e.key==="F") && presenting && !e.repeat){e.preventDefault();fullButton.click();return;}
    if (!presenting) return;
    if (["ArrowRight","PageDown"].includes(e.key)) {e.preventDefault();move(1);}
    else if (["ArrowLeft","PageUp"].includes(e.key)) {e.preventDefault();move(-1);}
    else if(e.key===" " && (el===body || el===document.documentElement)){e.preventDefault();move(1);}
  });
  if(legacyNav){
    let scheduled=false;
    const observer = new MutationObserver(()=>{
      if(scheduled) return;scheduled=true;
      requestAnimationFrame(()=>{scheduled=false;refreshStatus();});
    });
    observer.observe(legacyNav,{childList:true,subtree:true,attributes:true,attributeFilter:["class","aria-current","aria-selected"]});
  }
  applyMode();
  window.addEventListener("pageshow",refreshStatus);
})();
