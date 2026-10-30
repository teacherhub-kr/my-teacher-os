/* Teacher OS v56: private Apps Script portal. Never reads private sheet data on GitHub Pages. */
(function(){
'use strict';
var LINK_KEY="myTeacherOS.music56.ownerOnlyWebAppUrl";
var q=function(s){return document.querySelector(s)};
var linkOK=function(value){
  var text=String(value||"").trim();
  var m=/^https:\/\/script\.google\.com\/macros\/s\/([A-Za-z0-9_-]{30,})\/exec\/?(?:[?#].*)?$/.exec(text);
  return m?"https://script.google.com/macros/s/"+m[1]+"/exec":"";
};
var getLink=function(){try{return linkOK(localStorage.getItem(LINK_KEY))}catch(e){return""}};
function tell(message,bad){
  var s=q("#teacher56Status");
  if(s){s.textContent=message;s.dataset.error=bad?"true":"false"}
}
function mount(){
  var home=q("#t49Screen");
  if(!home)return false;
  if(!q("#teacher56Panel")){
    var el=document.createElement("section");
    el.id="teacher56Panel";el.className="teacher56-panel";el.setAttribute("aria-label","교사 전용 음악 대시보드 연결");
    el.innerHTML='<div class="teacher56-head"><span class="teacher56-icon" aria-hidden="true">♫</span>'+
      '<div><span class="teacher56-eyebrow">OWNER-ONLY · GOOGLE APPS SCRIPT</span><h3>음악 수행평가 · 교사 전용 대시보드</h3>'+
      '<p>원본 Google Sheets를 개인 계정 권한으로 직접 읽습니다. MY TEACHER OS에는 학생정보를 복사하지 않습니다.</p></div>'+
      '<span class="teacher56-tag" id="teacher56Badge">설정 필요</span></div>'+
      '<div class="teacher56-controls"><button type="button" class="teacher56-primary" data-teacher56="open">교사 전용 화면 열기 <span aria-hidden="true">↗</span></button>'+
      '<details class="teacher56-settings"><summary>웹앱 주소 연결</summary><div><label for="teacher56Url">Apps Script 배포 후 발급되는 웹앱 주소(…/exec)</label>'+
      '<input id="teacher56Url" inputmode="url" type="url" spellcheck="false" autocomplete="off" placeholder="https://script.google.com/macros/s/.../exec" />'+
      '<button type="button" data-teacher56="save">주소 저장</button>'+
      '<button type="button" class="teacher56-ghost" data-teacher56="clear">주소 삭제</button></div></details>'+
      '<a class="teacher56-guide" href="https://github.com/teacherhub-kr/my-teacher-os/tree/main/apps-script/music-dashboard" target="_blank" rel="noopener noreferrer">최초 설정 안내 ↗</a></div>'+
      '<p id="teacher56Status" role="status" aria-live="polite" class="teacher56-status">교사용 웹앱은 아직 이 브라우저에 등록되지 않았습니다. 먼저 Google Sheets에서 나만 접근 웹앱으로 배포하세요.</p>'+
      '<p class="teacher56-security">구글 Cloud OAuth 클라이언트 ID는 필요하지 않습니다. 단, Google Apps Script 최초 실행 권한 승인은 필요합니다. 웹앱은 반드시 <b>나로 실행 · 나만 접근</b>으로 배포하세요. 링크 등록은 접속·권한 검증이 아닙니다.</p>';
    home.insertBefore(el,q("#music54Panel")||q("#t53Connections")||null);
  }
  var url=q("#teacher56Url");
  if(url&&document.activeElement!==url)url.value=getLink();
  var badge=q("#teacher56Badge");
  if(badge)badge.textContent=getLink()?"주소 등록됨 · 접근 미확인":"설정 필요";
  var older=q("#music54Panel");
  if(older&&!older.dataset.teacher56Adapted){
    older.dataset.teacher56Adapted="1";
    older.classList.add("teacher56-fallback");
    var label=older.querySelector("summary span:nth-child(2) b");
    if(label)label.textContent="CSV 파일로 임시 확인 (선택 사항)";
    var note=older.querySelector(".music54-note");
    if(note)note.textContent="Google Apps Script 배포 전에는 원본 평가통합현황 탭의 CSV를 다운로드하여 이 브라우저에서만 임시 조회할 수 있습니다. 파일 내용은 서버로 전송하지 않습니다.";
    var explanation=older.querySelector("#music54Message");
    if(explanation&&!globalThis.TeacherOSMusic54?.status()?.loaded){
      explanation.textContent="자동 연결은 위 교사용 Apps Script 대시보드를 사용하세요. 이곳은 CSV 임시 조회만 제공합니다.";
    }
  }
  return true;
}
function openPrivate(){
  var url=getLink();
  if(!url){
    tell("아직 웹앱 주소가 없습니다. 먼저 Google Sheets에서 Apps Script를 배포하고 주소를 등록하세요.",true);
    var details=q("#teacher56Panel .teacher56-settings");
    if(details)details.open=true;
    q("#teacher56Url")?.focus();return;
  }
  // The owner-only Apps Script login and all student/class details remain on Google's origin.
  var tab=window.open(url,"_blank","noopener,noreferrer");
  tell("Google 교사 전용 화면을 새 탭에서 열도록 요청했습니다. Google 계정으로 실제 접근 가능한지 확인하세요.",false);
}
document.addEventListener("click",function(e){
  var item=e.target.closest("[data-teacher56]");if(!item)return;
  var action=item.dataset.teacher56;
  if(action==="open"){openPrivate();return}
  if(action==="save"){
    var input=q("#teacher56Url");var url=linkOK(input?.value);
    if(!url){tell("유효한 Apps Script 웹앱 /exec 주소만 등록할 수 있습니다.",true);input?.focus();return}
    try{localStorage.setItem(LINK_KEY,url);mount();tell("이 브라우저에 웹앱 주소를 저장했습니다. 실제 권한 연결은 보호된 웹앱에서 확인해야 합니다.",false)}
    catch(err){tell("브라우저 보안 설정으로 저장하지 못했습니다.",true)}return;
  }
  if(action==="clear"){
    try{localStorage.removeItem(LINK_KEY);mount();tell("이 브라우저에서 웹앱 주소만 삭제했습니다. Google Sheets와 Apps Script 원본은 변경되지 않았습니다.",false)}
    catch(err){tell("저장된 주소를 지우지 못했습니다.",true)}
  }
});
window.addEventListener("storage",function(e){if(e.key===LINK_KEY)mount()});
document.addEventListener("visibilitychange",function(){if(!document.hidden)mount()});
setTimeout(mount,400);setTimeout(mount,1600);setTimeout(mount,4800);setInterval(mount,13000);
globalThis.TeacherOSPrivateMusic56={mount:mount,getLink:getLink,linkOK:linkOK,openPrivate:openPrivate};
})();