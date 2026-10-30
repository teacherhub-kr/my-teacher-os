/* v54: Private teacher-side, read-only MUSIC CLASS aggregation. No raw student data or OAuth tokens are persisted. */
(function(){
"use strict";
const Core=globalThis.TeacherOSMusicCore54;if(!Core)return;
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const KEY_SHEET="myTeacherOS.teacher49.sheetUrl",KEY_CLIENT="myTeacherOS.music54.oauthClientId";
const SCOPE="https://www.googleapis.com/auth/spreadsheets.readonly";
let snapshot=null,source="",token="",expiry=0,client=null,seenTable=null;
const saved=k=>{try{return localStorage.getItem(k)||""}catch(e){return""}};
const sheetId=url=>{const m=/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})(?:\/|[?#]|$)/.exec(String(url||""));return m?m[1]:""};
const validClient=v=>/^[0-9]+-[\w-]+\.apps\.googleusercontent\.com$/.test(String(v||"").trim())?String(v).trim():"";
function message(v,error){const e=$("#music54Message");if(e){e.textContent=v;e.dataset.error=error?"1":"0"}}
function badge(v,good){const e=$("#music54Badge");if(e){e.textContent=v;e.className="music54-badge"+(good?" live":"")}}
function status(){return {loaded:!!snapshot,live:!!(snapshot&&source==="google"&&token&&Date.now()<expiry),source}};
function mount(){
 const host=$("#t49Screen");if(!host||$("#music54Panel"))return;
 const d=document.createElement("details");d.id="music54Panel";d.className="music54-panel";
 d.innerHTML='<summary><span class="music54-symbol" aria-hidden="true">♫</span><span><b>음악 수행평가 원본 연결</b><small>2학년 9개 반·3학년 6개 반의 1~4차 미채점 현황</small></span><span class="music54-badge" id="music54Badge">연결 대기</span></summary>'+
 '<div class="music54-body"><p class="music54-note">원본 채점표는 변경하지 않습니다. Google 연결은 학급별 집계 범위만 조회합니다. 엑셀 조회는 선택한 파일을 이 브라우저에서만 처리하며 학생별 정보를 화면에 표시하거나 서버로 전송하지 않습니다. Google 권한은 직접 승인해야 합니다.</p>'+
 '<div class="music54-fields"><label>Google 웹 OAuth 클라이언트 ID<input type="text" id="music54ClientId" autocomplete="off" spellcheck="false" placeholder="123456789-xxxx.apps.googleusercontent.com"></label>'+
 '<button type="button" data-music54="save-client">ID 저장</button><button type="button" class="music54-blue" data-music54="google">Google 읽기 전용 연결</button>'+
 '<button type="button" data-music54="refresh">원본 새로고침</button><button type="button" data-music54="clear">표시 중지</button></div>'+
 '<div class="music54-import"><label for="music54Excel"><b>Google 설정 전: 엑셀(.xlsx) 파일로 임시 조회</b><small>Google Sheets → 파일 → 다운로드 → Microsoft Excel(.xlsx). 파일은 이 브라우저에서만 처리되며 서버로 업로드하지 않습니다.</small></label>'+
 '<input id="music54Excel" type="file" accept=".xlsx,.xls"></div>'+
 '<p id="music54Message" role="status" aria-live="polite">아직 실제 평가 집계가 표시되지 않았습니다. Google 권한을 승인하거나 엑셀 파일을 선택하세요.</p>'+
 '<p class="music54-help">처음 한 번 Google Cloud에서 Sheets API를 사용 설정하고 웹 OAuth 클라이언트에 <code>https://teacherhub-kr.github.io</code>를 JavaScript 원본으로 등록해야 합니다. 클라이언트 비밀키를 이곳에 입력하지 마세요. Google 읽기 전용 권한은 다른 스프레드시트에도 적용될 수 있습니다.</p></div>';
 host.insertBefore(d,$("#t53Connections")||null);
 $("#music54ClientId").value=saved(KEY_CLIENT);
}
function restoreTable(){
 if(!snapshot||!$("#t49Progress"))return;
 const active=$('[data-t49-grade][aria-selected="true"]'),grade=active?Number(active.dataset.t49Grade):2;
 const current=JSON.stringify({grade,source,n:snapshot.classes.length,stamp:snapshot.importedAt});
 const host=$("#t49Progress");
 if(host.dataset.music54Fingerprint===current&&host.querySelector("table.music54-table"))return;
 const table=document.createElement("table");table.className="t49-table music54-table";
 const tr=document.createElement("tr");
 for(const heading of ["학급","1차 미채점","2차 미채점","3차 미채점","4차 미채점"]){const th=document.createElement("th");th.textContent=heading;tr.append(th)}
 const thead=document.createElement("thead");thead.append(tr);table.append(thead);
 const tbody=document.createElement("tbody");
 for(const row of snapshot.classes.filter(x=>x.grade===grade)){
  const tr=document.createElement("tr"),name=document.createElement("td");name.textContent=row.grade+"학년 "+row.id.split("-")[1]+"반";tr.append(name);
  for(const count of row.missing){const td=document.createElement("td"),pill=document.createElement("span");pill.className="music54-pill "+(count?"open":"clear");pill.textContent=count?count+"명 미채점":"미채점 0명";pill.title=count?"원본에서 아직 채점되지 않은 인원":"채점표상 미채점 0명 · 수업·보충 완료와는 별개";td.append(pill);tr.append(td)}
  tbody.append(tr);
 }
 table.append(tbody);host.replaceChildren(table);
 host.dataset.music54="true";host.dataset.music54Fingerprint=current;
 const panel=$(".t51-progress-panel .t49-muted");
 if(panel){panel.style.display="block";panel.textContent="채점 원본 집계입니다. 미채점 0명은 실제 수업 실시 또는 보충평가 완료가 아닙니다."}
}
function restoreCards(){
 if(!snapshot)return;const cards=$$(".t49-kpi");if(cards.length<3)return;
 const values=[[1,"미채점 집계",String(snapshot.missingTotal),source==="google"?"Google 집계 기준":"엑셀 임시 집계"],[2,"점검 대상 학급",String(snapshot.alertClasses),"원본 점검 안내 기준"]];
 for(const [i,label,value,foot] of values){const card=cards[i];const a=card.querySelector(".t49-kpi-label"),b=card.querySelector(".t49-kpi-value"),c=card.querySelector(".t49-kpi-foot");if(a)a.textContent=label;if(b)b.textContent=value;if(c)c.textContent=foot}
}
function restoreAlerts(){
 if(!snapshot)return;const host=$("#t49Alerts");if(!host)return;
 if(host.dataset.music54Source===snapshot.importedAt&&host.querySelectorAll(".music54-alert").length===4)return;
 host.dataset.music54="true";host.dataset.music54Source=snapshot.importedAt;
 const defs=[["누적 미채점",snapshot.missingTotal+"건"],["원본 점검 안내",snapshot.alertClasses+"개 반"],["긴급 표시 학급",snapshot.urgentClasses+"개 반"],["자료 출처",source==="google"?"Google 인증 조회":"엑셀 임시 확인"]];
 host.replaceChildren();
 for(const [name,value] of defs){const line=document.createElement("div");line.className="t51-alert-row music54-alert";
 const dot=document.createElement("span");dot.className="t51-alert-icon blue";dot.textContent="✓";
 const n=document.createElement("b");n.textContent=name;const hint=document.createElement("small");hint.textContent="학급별 집계 기준";
 const v=document.createElement("em");v.textContent=value;line.append(dot,n,hint,v);host.append(line)}
}
function render(){mount();if(!snapshot)return;restoreTable();restoreCards();restoreAlerts()}
function apply(data,kind){
 snapshot=data;source=kind;render();
 badge(kind==="google"?"Google 인증 집계":"엑셀 임시 집계",kind==="google");
 const t=new Date(data.importedAt).toLocaleString("ko-KR");
 message(data.classes.length+"개 반 · 미채점 총 "+data.missingTotal+"건 · 점검 "+data.alertClasses+"개 반 / 조회 "+t+" · 미채점 0명은 채점 기록상 0명일 뿐 수업 완료의 의미가 아닙니다.",false);
 if(globalThis.TeacherOSConnections53?.render)globalThis.TeacherOSConnections53.render(true);
}
async function refresh(){
 const id=sheetId(saved(KEY_SHEET));
 if(!id){message("연결 상태 메뉴에서 비공개 Google Sheets 원본 주소를 등록해 주세요.",true);return false}
 if(!token||Date.now()>=expiry){message("Google 읽기 권한이 없거나 만료됐습니다. Google 연결을 다시 승인하세요.",true);return false}
 const p=new URLSearchParams();p.set("valueRenderOption","FORMATTED_VALUE");p.append("ranges","'평가통합현황'!A3:K18");
 try{
  message("원본의 학급별 미채점 집계를 읽는 중입니다.",false);
  const res=await fetch("https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(id)+"/values:batchGet?"+p.toString(),{
   method:"GET",headers:{Authorization:"Bearer "+token},credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer"});
  if(!res.ok){if(res.status===401){token="";expiry=0}throw Error("Sheets API HTTP "+res.status)}
  const parsed=Core.parseBatchGet(await res.json());apply(parsed,"google");return true;
 }catch(e){message("집계를 읽지 못했습니다. 원본 권한·Sheets API 사용 설정·Google 승인 상태를 확인하세요. ("+String(e.message||e).slice(0,55)+")",true);return false}
}
function authorize(){
 const id=validClient(saved(KEY_CLIENT));if(!id){message("먼저 Google Cloud 웹 OAuth 클라이언트 ID를 저장해 주세요.",true);return}
 const oauth=globalThis.google?.accounts?.oauth2;
 if(!oauth?.initTokenClient){message("Google 로그인 라이브러리가 아직 준비되지 않았습니다. 브라우저 차단 설정을 확인하세요.",true);return}
 try{
  if(!client)client=oauth.initTokenClient({client_id:id,scope:SCOPE,callback:function(reply){
   if(!reply||reply.error||!reply.access_token){message("Google 계정 승인이 완료되지 않았습니다.",true);return}
   const scopes=String(reply.scope||"").split(/\s+/);
   if(!scopes.includes(SCOPE)){message("Google Sheets 읽기 권한이 승인되지 않았습니다.",true);return}
   token=reply.access_token;expiry=Date.now()+Math.max(1,Number(reply.expires_in||3500)-60)*1000;refresh();
  }});
  client.requestAccessToken({prompt:"consent"});
 }catch(e){message("Google 인증을 시작하지 못했습니다. OAuth 승인된 원본 설정을 확인하세요.",true)}
}
async function excel(file){
 if(!file)return;
 if(!/\.xlsx?$/i.test(file.name)||file.size>20*1024*1024){message("20MB 이하 Excel(.xlsx/.xls) 파일만 사용할 수 있습니다.",true);return}
 const XLSX=globalThis.XLSX;if(!XLSX?.read){message("Excel 읽기 라이브러리가 준비되지 않았습니다.",true);return}
 try{const bytes=await file.arrayBuffer();const wb=XLSX.read(bytes,{type:"array",cellFormula:false,cellHTML:false,cellText:true});
  const result=Core.parseWorkbook(wb,XLSX);apply(result,"excel");
 }catch(e){message("엑셀 집계 형식을 확인할 수 없습니다. 평가통합현황 탭과 15개 학급을 확인하세요.",true)}
 finally{const node=$("#music54Excel");if(node)node.value=""}
}
function clear(){
 snapshot=null;source="";token="";expiry=0;client=null;
 badge("연결 대기",false);message("표시를 종료했습니다. 미채점 집계와 인증 토큰은 브라우저 저장소에 저장하지 않았습니다.",false);
 if(globalThis.TeacherOSPremiumDashboard49?.apply)globalThis.TeacherOSPremiumDashboard49.apply();
 if(globalThis.TeacherOSConnections53?.render)globalThis.TeacherOSConnections53.render(true);
}
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-music54]");if(!b)return;
 const a=b.dataset.music54;
 if(a==="save-client"){const val=validClient($("#music54ClientId")?.value);if(!val){message("Google 웹 OAuth 클라이언트 ID 형식이 아닙니다.",true);return}
  try{localStorage.setItem(KEY_CLIENT,val);client=null;message("OAuth 클라이언트 ID만 브라우저에 저장됐습니다. Google 인증을 진행하세요.",false)}catch(e){message("브라우저 저장이 차단됐습니다.",true)}}
 if(a==="google")authorize();if(a==="refresh")refresh();if(a==="clear")clear();
});
document.addEventListener("change",e=>{if(e.target.id==="music54Excel")excel(e.target.files?.[0])});
function tick(){
 mount();
 if(source==="google"&&expiry&&Date.now()>=expiry){token="";expiry=0;badge("인증 만료 · 이전 집계",false);message("Google 인증이 만료됐습니다. 화면에 보이는 내용은 이전 집계입니다. 다시 인증하세요.",true)}
 render();
}
setTimeout(tick,300);setTimeout(tick,1600);setTimeout(tick,4600);setInterval(tick,3000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});
globalThis.TeacherOSMusic54={render,status,forget:clear};
})();