/* Safety, correctness, and pure data-shaping test for owner-only Apps Script. */
const assert=require("assert"),fs=require("fs"),vm=require("vm"),path=require("path");
const root=path.resolve(__dirname,"..");
const dir=path.join(root,"apps-script/music-dashboard");
const source=fs.readFileSync(path.join(dir,"Code.gs"),"utf8");
const page=fs.readFileSync(path.join(dir,"Index.html"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(dir,"appsscript.json"),"utf8"));
const expectedHeaders=["학년/반","학년","1차 미채점","2차 미채점","3차 미채점","4차 미채점","현황","연동 상태","참조 평가일","일정표 단계","점검 알림"];
const fixture=[expectedHeaders];
const notices=[];
for(let r=1;r<=9;r++)fixture.push(["2-"+r,"2",String(r===1?0:1),"0","25","24","","","", "2차","진도 확인"]);
for(let r=4;r<=9;r++)fixture.push(["3-"+r,"3","0","0","0",String(r===6?0:1),"","","","3차",r===6?"학생명_절대전송금지":"긴급: 사용자에 대한 민감정보_전송금지"]);
let sheetReads=0,cellWrites=0,scriptPropertyWrites=0;
const properties=new Map();
const mockSpreadsheet={
  getId:()=>"test-private-sheet-id",
  getSheetByName:name=>{
    assert.equal(name,"평가통합현황");
    return {getRange:r=>{
      assert.equal(r,"A3:K18");sheetReads++;
      return {getDisplayValues:()=>fixture.map(row=>row.slice()),setValues:()=>cellWrites++};
    }};
  }
};
const context={
  SpreadsheetApp:{getActiveSpreadsheet:()=>mockSpreadsheet,openById:id=>{assert.equal(id,"test-private-sheet-id");return mockSpreadsheet}},
  PropertiesService:{getScriptProperties:()=>({setProperty:(k,v)=>{scriptPropertyWrites++;properties.set(k,v)},getProperty:k=>properties.get(k)})},
  HtmlService:{createHtmlOutputFromFile:file=>{assert.equal(file,"Index");return {setTitle(){return this},addMetaTag(){return this}}}},
  Utilities:{formatDate:()=> "2026-10-30 12:34:56"},
  Number,Array,String,Date,Object,Error
};
vm.runInNewContext(source,context);
assert.throws(()=>context.getDashboardData(),/초기 설정/);
const setup=context.initializeDashboard();
assert.equal(setup.classes,15);
assert.equal(scriptPropertyWrites,1);
assert.equal(cellWrites,0,"Sheet must never be written");
const response=JSON.parse(JSON.stringify(context.getDashboardData()));
assert.equal(response.classes.length,15);
assert.equal(response.classes.filter(x=>x.grade===2).length,9);
assert.equal(response.classes.filter(x=>x.grade===3).length,6);
assert.equal(response.classes[0].id,"2-1");
assert.equal(response.classes[14].id,"3-9");
assert.equal(response.readAt,"2026-10-30 12:34:56");
assert.equal(response.semesterNotes.grade3.includes("1학기"),true);
assert.equal(cellWrites,0);
assert.equal(scriptPropertyWrites,1);
assert(sheetReads>=2);
assert(!JSON.stringify(response).includes("절대전송금지"),"Raw alert text must never leave server");
assert(!JSON.stringify(response).includes("민감정보"),"Raw message must never leave server");
assert(!JSON.stringify(response).includes("test-private-sheet-id"),"Source spreadsheet identifier must not be returned");
assert.deepStrictEqual(Object.keys(response.classes[0]),["id","grade","room","missing","notice"]);
for(const invalid of [
  f=>{f[1][2]="46"},
  f=>{f[1][2]="#REF!"},
  f=>{f[1][0]="2-2"},
  f=>{f[10][0]="4-1"},
  f=>{f.pop()},
  f=>{f[0][0]="학생명"}
]){
 let rows=fixture.map(r=>r.slice());invalid(rows);
 assert.throws(()=>context.parseMusicSummary_(rows));
}
assert(!/googleapis\.com\/auth\/drive|script\.external_request/.test(JSON.stringify(manifest)));
assert(manifest.oauthScopes.includes("https://www.googleapis.com/auth/spreadsheets"),"SpreadsheetApp.openById requires full spreadsheets scope");
assert(!manifest.oauthScopes.some(s=>s.includes("drive")||s.endsWith("/spreadsheets.readonly")),"no conflicting or Drive scopes");
assert(/google\.script\.run/.test(page)&&/textContent/.test(page));
assert(!/localStorage|sessionStorage/.test(page),"private Apps Script screen must not persist scores");
assert(!/getRange\(["']A1:/.test(source),"no student list read allowed");
console.log("Owner-only Apps Script: 15 classes, read-only, strict privacy, validation and UI client PASS");
