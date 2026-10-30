/* MY TEACHER OS v54 — read-only class aggregates; no student-level records. */
(function(root,factory){const v=factory();if(typeof module==="object"&&module.exports)module.exports=v;if(root)root.TeacherOSMusicCore54=v;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const HEADERS=["학년/반","학년","1차 미채점","2차 미채점","3차 미채점","4차 미채점"];
const str=v=>String(v===undefined||v===null?"":v).trim();
function count(v){if(v===""||v===null||v===undefined||str(v)==="—")return null;if(typeof v==="string"&&!/^\d+$/.test(v.trim()))return null;const n=Number(v);return Number.isSafeInteger(n)&&n>=0&&n<=45?n:null}
function parseSummary(rows){
 if(!Array.isArray(rows)||!HEADERS.every((h,i)=>str(rows[0]?.[i])===h))throw Error("집계표 머리글이 예상과 다릅니다.");
 const classes=[],seen=new Set();
 for(const row of rows.slice(1)){
  const id=str(row?.[0]);if(!id)continue;
  if(!/^([23])-([1-9])$/.test(id))throw Error("잘못된 학급 코드: "+id);
  const grade=Number(id[0]),classNo=Number(id.slice(2));
  if(Number(row[1])!==grade||seen.has(id))throw Error("학년 또는 중복 학급 오류: "+id);
  if(grade===3&&classNo<4)throw Error("3학년 대상 반 오류: "+id);
  seen.add(id);
  const missing=[2,3,4,5].map(i=>count(row[i]));
  if(missing.some(n=>n===null))throw Error("미채점 수치 오류: "+id);
  const warning=str(row[10]);
  classes.push({id,grade,missing,stage:str(row[9]),connection:str(row[7]),
   alertType:/긴급/.test(warning)?"긴급":/미채점/.test(warning)?"미채점":warning?"진도 확인":"",
   hasAlert:!!warning});
 }
 if(classes.length!==15||classes.filter(x=>x.grade===2).length!==9||classes.filter(x=>x.grade===3).length!==6)throw Error("15개 반 집계가 일치하지 않습니다.");
 classes.sort((a,b)=>a.grade-b.grade||Number(a.id.slice(2))-Number(b.id.slice(2)));
 return {classes,missingTotal:classes.reduce((s,x)=>s+x.missing.reduce((t,v)=>t+v,0),0),
 alertClasses:classes.filter(x=>x.hasAlert).length,urgentClasses:classes.filter(x=>x.alertType==="긴급").length,
 importedAt:new Date().toISOString()};
}
function parseBatchGet(data){
 const v=data?.valueRanges?.[0]?.values;
 if(!Array.isArray(v))throw Error("Google Sheets에서 집계표를 읽지 못했습니다.");
 return parseSummary(v);
}
/* CSV/TSV is parsed locally; there are no external file-reading dependencies.
   Support Excel quoting, embedded newline, commas and BOM, without evaluating cells. */
function parseDelimited(input){
 const text=String(input??"").replace(/^\uFEFF/,"");
 if(text.length>1024*1024)throw Error("CSV 파일이 너무 큽니다.");
 const first=text.split(/\r?\n/,1)[0]||"";
 const delimiter=first.includes("\t")?"\t":",";
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){
   if(c==='"'&&text[i+1]==='"'){cell+='"';i++}
   else if(c==='"'){quoted=false}
   else cell+=c;
  }else if(c==='"'&&cell===""){quoted=true}
  else if(c===delimiter){row.push(cell);cell=""}
  else if(c==="\n"||c==="\r"){
   row.push(cell);rows.push(row);row=[];cell="";
   if(c==="\r"&&text[i+1]==="\n")i++;
   if(rows.length>1000)throw Error("예상보다 많은 데이터 행입니다.");
  }else cell+=c;
 }
 if(quoted)throw Error("CSV 따옴표가 닫히지 않았습니다.");
 if(row.length||cell){row.push(cell);rows.push(row)}
 const idx=rows.findIndex(r=>HEADERS.every((h,i)=>str(r[i])===h));
 if(idx<0||idx>5)throw Error("평가통합현황 제목 행을 찾지 못했습니다.");
 return parseSummary(rows.slice(idx));
}
function parseWorkbook(book,XLSX){
 if(!book||!XLSX||!book.Sheets?.["평가통합현황"])throw Error("평가통합현황 탭이 없는 파일입니다.");
 const rows=XLSX.utils.sheet_to_json(book.Sheets["평가통합현황"],{header:1,raw:false,defval:""});
 return parseSummary(rows.slice(2,18));
}
return {parseSummary,parseBatchGet,parseWorkbook,parseDelimited,count};
});