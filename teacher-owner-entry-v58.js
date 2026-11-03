/* MY TEACHER OS v58: owner-first entry.
 * A public GitHub Pages shell cannot authenticate a user. Redirect only to an
 * existing owner-only Google Apps Script deployment; Google enforces access.
 * Do not send student data, tokens or the deployment URL to public servers.
 */
(function(){
  'use strict';
  var KEY='myTeacherOS.music56.ownerOnlyWebAppUrl';
  function canonicalLink(value){
    var text=String(value||'').trim();
    var match=/^https:\/\/script\.google\.com\/macros\/s\/([A-Za-z0-9_-]{30,})\/exec\/?(?:[?#].*)?$/.exec(text);
    return match?'https://script.google.com/macros/s/'+match[1]+'/exec':'';
  }
  function start(){
    // Explicitly requested public tools do not claim to be authenticated.
    var params=new URLSearchParams(window.location.search);
    if(params.get('mode')==='tools')return false;
    var target='';
    try{target=canonicalLink(window.localStorage.getItem(KEY));}
    catch(err){return false;}
    if(!target)return false; // Existing first-use setup and all local data remain intact.
    var boot=document.querySelector('.boot span');
    if(boot)boot.textContent='교사 전용 Google 인증 화면으로 이동합니다.';
    try{
      window.location.replace(target);
      return true;
    }catch(err){
      if(boot)boot.textContent='자동 이동에 실패했습니다. 아래 교사 전용 대시보드 연결을 이용하세요.';
      return false;
    }
  }
  globalThis.TeacherOSEntry58={start:start,canonicalLink:canonicalLink};
})();
