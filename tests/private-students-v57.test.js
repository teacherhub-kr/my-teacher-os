/* v57 private gradebook sources, cross-year separation, privacy controls. */
const assert=require("assert"),fs=require("fs"),vm=require("vm"),path=require("path");
const root=path.join(__dirname,".."),dir=path.join(root,"apps-script/music-dashboard");
const server=fs.readFileSync(path.join(dir,"Code.gs"),"utf8");
const detail=fs.readFileSync(path.join(dir,"StudentDetails.gs"),"utf8");
const ui=fs.readFileSync(path.join(dir,"Index.html"),"utf8");
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
const sourceIds=Array.from({length:6},(_,i)=>"testPrivateGradebook"+i+"abcdef0123456789");
let reads=[],noteReads=0;const originals={};
for(let i=0;i<6;i++){
  originals[sourceIds[i]]={getSheetByName:name=>{
    if(!/^(?:[1-9])반$/.test(name))throw Error("untrusted tab name");
    return {getRange:range=>{
      if(range!=="A5:G50")noteReads++;
      reads.push({source:i,tab:name,range});
      return {getDisplayValues:()=>[
        ["1","가상학생하나",null,null,null,String(20+i),"응시"],
        ["2","가상학생둘",null,null,null,String(19+i),"미응시"]
      ]};
    }};
  }};
}
const expressions=sourceIds.map((id,i)=>'=IMPORTRANGE("https://docs.google.com/spreadsheets/d/'+id+'/edit","평가안내!A4:K'+(i<4?"12":"9")+'")');
const grade3BasisRows=[
  ["3-4","1","가상학생하나","23","24"],
  ["3-4","2","가상학생둘","22","25"],
  ["3-4","3","","",""], // reserved seat: not a student record
  ["3-5","1","다른학급학생","25","25"]
];
const master={
 getId:()=> "private-owner-file",
 getSheetByName:tab=>{
  if(tab==="채점연동_RAW")return {getRange:range=>{
    const i=[2,14,26,38,50,62].indexOf(Number(range.slice(1)));
    if(i<0||range[0]!=="A")throw Error("unexpected formula cell");
    return {getFormula:()=>expressions[i]};
  }};
  if(tab==="3학년_2학기_성적근거")return {getRange:range=>{
    if(range!=="A6:E270")throw Error("unsafe range "+range);
    return {getDisplayValues:()=>grade3BasisRows.map(row=>row.slice())};
  }};
  return {getRange:()=>({getDisplayValues:()=>[
    ["학년/반","학년","1차 미채점","2차 미채점","3차 미채점","4차 미채점"],
    ...Array.from({length:9},(_,i)=>["2-"+(i+1),"2","0","0","0","0"]),
    ...Array.from({length:6},(_,i)=>["3-"+(i+4),"3","0","0","0","0"])
  ]})};
 }
};
const ctx={
 SpreadsheetApp:{openById:id=>id==="private-owner-file"?master:originals[id]||(()=>{throw Error("wrong id: "+id)})()},
 PropertiesService:{getScriptProperties:()=>({getProperty:()=> "private-owner-file"})},
 Utilities:{formatDate:()=>"2026-10-30 10:00:00"},
 Number,String,Array,Object,Date,Error
};
vm.runInNewContext(server+"\n"+detail,ctx);
const grade2=JSON.parse(JSON.stringify(ctx.getStudentDetail(2,3)));
assert.equal(grade2.classId,"2-3");
assert.equal(grade2.studentCount,2);
assert.deepStrictEqual(grade2.students[0].scores,[20,21,22,23]);
assert.deepStrictEqual(grade2.students[1].scores,[19,20,21,22]);
assert.deepStrictEqual(reads.map(x=>x.source),[0,1,2,3]);
reads.length=0;
const grade3=JSON.parse(JSON.stringify(ctx.getStudentDetail(3,4)));
assert.equal(grade3.classId,"3-4");
assert.equal(grade3.studentCount,2);
assert.deepStrictEqual(grade3.students[0].scores,[23,24,24,25]);
assert.deepStrictEqual(grade3.students[1].scores,[22,25,23,24]);
assert.deepStrictEqual(reads.map(x=>x.source),[4,5],"grade 3 MUST use last two source sheets");
assert.equal(noteReads,0,"free-text note column must not be read");
grade3BasisRows.push(["3-4","4","","22",""]); // incomplete, score-bearing row must still block the class
assert.throws(()=>ctx.getStudentDetail(3,4),/학생 이름 누락/);
grade3BasisRows.pop();
assert(!("studentNumber" in grade3));
assert(!JSON.stringify(grade3).includes("다른학급학생"));
assert(!JSON.stringify(grade3).includes("private-owner-file"));
assert.deepStrictEqual(Object.keys(grade3.students[0]),["number","name","scores","statuses"]);
for(const [grade,room] of [[1,1],[2,10],[3,1],[3,0],[4,4],["bad",2]])assert.throws(()=>ctx.getStudentDetail(grade,room),/조회/);
assert.throws(()=>ctx.parseStudentScore57_("35","2-3",1,1),/범위/);
assert.equal(ctx.parseStudentScore57_("","2-3",1,1),null);
const separate={};ctx.findOrAddStudent57_(separate,1,"가상학생하나","2-3");
assert.throws(()=>ctx.findOrAddStudent57_(separate,1,"다른 이름","2-3"),/불일치/);
const savedGetTab=originals[sourceIds[0]].getSheetByName;
originals[sourceIds[0]].getSheetByName=function(){
  return {getRange:()=>({getDisplayValues:()=>[
    ["1","가상학생하나",null,null,null,"20","응시"],
    ["1","가상학생하나",null,null,null,"20","응시"]
  ]})};
};
assert.throws(()=>ctx.getStudentDetail(2,3),/중복/,"Duplicated ID within one gradebook must fail closed");
originals[sourceIds[0]].getSheetByName=savedGetTab;
// Actual source sheets include an '응시완료' aggregate row and a status-only
// row. Neither is a student; both must remain safely skippable.
originals[sourceIds[0]].getSheetByName=function(){
  return {getRange:()=>({getDisplayValues:()=>[
    ["1","가상학생하나",null,null,null,"20","응시"],
    ["2","가상학생둘",null,null,null,"19","미응시"],
    ["응시완료","요약",null,null,null,"2","확인"],
    ["",null,null,null,null,null,"통계"]
  ]})};
};
assert.equal(ctx.getStudentDetail(2,3).studentCount,2,
  "known aggregate/status-only rows must not be misclassified as students");
originals[sourceIds[0]].getSheetByName=function(){
  return {getRange:()=>({getDisplayValues:()=>[
    ["1","가상학생하나",null,null,null,"20","응시"],
    ["2","가상학생둘",null,null,null,"19","미응시"],
    ["","번호없는학생",null,null,null,"18","응시"]
  ]})};
};
assert.throws(()=>ctx.getStudentDetail(2,3),/학생 번호 누락/,
  "a real student without a number must not silently disappear");
originals[sourceIds[0]].getSheetByName=function(){
  return {getRange:()=>({getDisplayValues:()=>[
    ["1","가상학생하나",null,null,null,"20","응시"],
    ["2","가상학생둘",null,null,null,"19","미응시"],
    ["학생A","번호오류학생",null,null,null,"18","응시"]
  ]})};
};
assert.throws(()=>ctx.getStudentDetail(2,3),/형식 오류/,
  "non-numeric student IDs must fail closed");
originals[sourceIds[0]].getSheetByName=savedGetTab;
assert(ui.includes('if(student.statuses[i])'),"Display lack of source score instead of hiding it");

assert(ui.includes("getStudentDetail(grade,room)"));
assert(ui.includes("student.name")&&ui.includes("textContent"));
assert(!index.includes("getStudentDetail"),"student details MUST NOT be exposed on public GitHub Pages");
assert(!index.includes("가상학생"));
assert(!/localStorage|sessionStorage/.test(ui),"client must never store student data");
console.log("v57 protected student details, six source mapping, prior-semester, note exclusion and no public leakage PASS");
