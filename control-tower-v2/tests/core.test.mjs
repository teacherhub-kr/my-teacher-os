import test from "node:test";
import assert from "node:assert/strict";
import {createTask,advance,publicStatus} from "../core.mjs";
const t0="2026-11-17T03:00:00Z",t1="2026-11-17T03:01:00Z",
  t2="2026-11-17T03:02:00Z",t3="2026-11-17T03:03:00Z",
  t4="2026-11-17T03:04:00Z";
const start=()=>createTask({id:"ct-v2-test-01",domain:"school",summary:"교사 전용 화면 검증"},t0);
const plan=()=>advance(start(),{type:"PLAN",at:t1,nextAction:"실제 도구 연결 확인"});
const rw={kind:"repo_write",scope:"teacherhub-kr/my-teacher-os:control-tower-v2",
  testPlan:"독립 회귀 테스트",rollbackPlan:"해당 변경 되돌리기",approvalId:"a-001"};
test("allowed domains, no identifiable metadata",()=>{
  assert.throws(()=>createTask({id:"x01",domain:"unknown",summary:"x"},t0));
  assert.throws(()=>createTask({id:"x01",domain:"school",summary:"hello@example.com"},t0));
  assert.equal(start().status,"intake");
});
test("read-only completion requires independent external evidence",()=>{
  let x=advance(plan(),{type:"START",at:t2,kind:"read",executor:"collector"});
  x=advance(x,{type:"REPORT_RESULT",at:t3,resultRef:"https://github.com/teacherhub-kr/my-teacher-os"});
  assert.throws(()=>advance(x,{type:"VERIFY",at:t4,verifier:"collector",proof:{}}));
  x=advance(x,{type:"VERIFY",at:t4,verifier:"auditor",proof:{
    outcome:"pass",ref:"https://github.com/teacherhub-kr/my-teacher-os/actions",
    checkedAt:t4,sourceLevel:"L0",origin:"external-tool"}});
  assert.equal(x.status,"completed");
  assert.deepEqual(Object.keys(publicStatus(x)),["id","domain","status","retryCount","lastEventAt"]);
  assert.throws(()=>advance(x,{type:"PLAN",at:t4,nextAction:"다시"}));
});
test("AI proposal and snapshots cannot prove completion",()=>{
  let x=advance(plan(),{type:"START",at:t2,kind:"read",executor:"agent"});
  x=advance(x,{type:"REPORT_RESULT",at:t3,resultRef:"https://example.org/result"});
  for(const level of ["L4","L3","L2"]){
    assert.throws(()=>advance(x,{type:"VERIFY",at:t4,verifier:"auditor",proof:{
      outcome:"pass",ref:"https://example.org/check",checkedAt:t4,
      sourceLevel:level,origin:"external-tool"}}));
  }
});
test("writes require exact approval and scoped intent",()=>{
  const awaiting=advance(plan(),{type:"REQUEST_APPROVAL",at:t2,change:rw});
  assert.equal(awaiting.status,"awaiting_approval");
  assert.throws(()=>advance(awaiting,{type:"START",at:t3,kind:"repo_write",scope:rw.scope,executor:"agent"}));
  assert.throws(()=>advance(awaiting,{type:"GRANT_APPROVAL",at:t3,actor:"agent",approvalId:"a-001",scope:rw.scope,expiresAt:"2026-11-18T00:00:00Z"}));
  let x=advance(awaiting,{type:"GRANT_APPROVAL",at:t3,actor:"user",approvalId:"a-001",scope:rw.scope,expiresAt:"2026-11-18T00:00:00Z"});
  assert.throws(()=>advance(x,{type:"START",at:t4,kind:"repo_write",scope:"other repo",executor:"agent"}));
  x=advance(x,{type:"START",at:t4,kind:"repo_write",scope:rw.scope,executor:"agent"});
  assert.equal(x.status,"executing");
});
test("expired authorization cannot execute",()=>{
  let x=advance(plan(),{type:"REQUEST_APPROVAL",at:t2,change:rw});
  x=advance(x,{type:"GRANT_APPROVAL",at:t3,actor:"user",approvalId:"a-001",scope:rw.scope,expiresAt:"2026-11-17T03:03:30Z"});
  assert.throws(()=>advance(x,{type:"START",at:t4,kind:"repo_write",scope:rw.scope,executor:"agent"}));
});
test("write completion cannot rely on user claim only",()=>{
  let x=advance(plan(),{type:"REQUEST_APPROVAL",at:t2,change:rw});
  x=advance(x,{type:"GRANT_APPROVAL",at:t3,actor:"user",approvalId:"a-001",scope:rw.scope,expiresAt:"2026-11-18T00:00:00Z"});
  x=advance(x,{type:"START",at:t4,kind:"repo_write",scope:rw.scope,executor:"worker"});
  x=advance(x,{type:"REPORT_RESULT",at:"2026-11-17T03:05:00Z",resultRef:"https://github.com/example/repo/actions"});
  assert.throws(()=>advance(x,{type:"VERIFY",at:"2026-11-17T03:06:00Z",verifier:"audit",proof:{
    outcome:"pass",ref:"https://github.com/example/repo/actions",checkedAt:"2026-11-17T03:06:00Z",
    sourceLevel:"L1",origin:"user-confirmation"}}));
});
test("stale proof and unlimited retries fail closed",()=>{
  let x=advance(plan(),{type:"START",at:t2,kind:"read",executor:"worker"});
  x=advance(x,{type:"REPORT_RESULT",at:t3,resultRef:"https://example.org/result"});
  assert.throws(()=>advance(x,{type:"VERIFY",at:t4,verifier:"audit",proof:{
    outcome:"pass",ref:"https://example.org/result",checkedAt:t1,sourceLevel:"L0",origin:"external-tool"}}));
  for(let n=0;n<3;n++){
    x=advance(x,{type:"FAIL",at:t4,reason:"upstream failure"});
    if(n<2){x=advance(x,{type:"RETRY",at:t4});
      x=advance(x,{type:"START",at:t4,kind:"read",executor:"worker"});
      x=advance(x,{type:"REPORT_RESULT",at:t4,resultRef:"https://example.org/result"});}
  }
  assert.equal(x.retryCount,3);
  assert.throws(()=>advance(x,{type:"RETRY",at:t4}));
});
test("the public summary excludes goals, source references and approval",()=>{
  const x=start(),p=publicStatus(x);
  assert.equal(p.summary,undefined);
  assert.equal(p.sourceRef,undefined);
  assert.equal(p.approval,undefined);
});
test("backdated transitions and future evidence are rejected",()=>{
  assert.throws(()=>advance(plan(),{type:"START",at:t0,kind:"read",executor:"worker"}));
  let x=advance(plan(),{type:"START",at:t2,kind:"read",executor:"worker"});
  x=advance(x,{type:"REPORT_RESULT",at:t3,resultRef:"https://example.org/result"});
  assert.throws(()=>advance(x,{type:"VERIFY",at:t4,verifier:"audit",proof:{
    outcome:"pass",ref:"https://example.org/result",checkedAt:"2026-11-17T03:10:00Z",
    sourceLevel:"L0",origin:"external-tool"}}));
});
