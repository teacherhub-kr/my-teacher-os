/**
 * AI Control Tower v2 — portable execution contract (no I/O, no persistence).
 * The host must authenticate approvals and verify external evidence. This module
 * must not receive student, financial, credential, or production payloads.
 */
export const DOMAINS=Object.freeze(["school","investment","personal","edujob"]);
export const STATES=Object.freeze(["intake","planned","awaiting_approval","executing","verifying","completed","failed","blocked"]);
export const WRITE_KINDS=Object.freeze(["email_send","calendar_change","file_write","repo_write","deploy","production_change","account_change","trade"]);
const ID=/^[a-zA-Z0-9][a-zA-Z0-9:_-]{2,79}$/;
const SENSITIVE=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?<!\d)01\d[- ]?\d{3,4}[- ]?\d{4}(?!\d)|(?<!\d)\d{6}[- ]?[1-4]\d{6}(?!\d)/i;
function need(ok,why){if(!ok)throw new Error(why)}
function nonempty(v,max=180){return typeof v==="string"&&v.trim().length>0&&v.length<=max&&!SENSITIVE.test(v)}
function validAt(v){return typeof v==="string"&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v))}
function refUrl(v){return typeof v==="string"&&/^https:\/\/[^\s/]+\//.test(v)&&v.length<=500&&!SENSITIVE.test(v)}
function record(task,type,at){task.history.push({type,status:task.status,at});return task}
function copy(v){return JSON.parse(JSON.stringify(v))}
export function createTask({id,domain,summary,sourceRef=""},at){
  need(ID.test(id),"invalid task id");
  need(DOMAINS.includes(domain),"invalid domain");
  need(nonempty(summary),"summary must be short and de-identified");
  need(validAt(at),"ISO timestamp required");
  need(!sourceRef||refUrl(sourceRef),"sourceRef must be an HTTPS reference");
  return {version:2,id,domain,summary,sourceRef,status:"intake",
    nextAction:"",change:null,approval:null,execution:null,evidence:[],
    retryCount:0,blockedReason:"",history:[{type:"CREATE",status:"intake",at}]};
}
export function advance(original,event){
  need(original&&original.version===2&&STATES.includes(original.status),"invalid task snapshot");
  need(event&&typeof event.type==="string"&&validAt(event.at),"event type and ISO timestamp required");
  need(Date.parse(event.at)>=Date.parse(original.history.at(-1)?.at||""),"event timestamps must be monotonic");
  const t=copy(original),kind=event.type,at=event.at;
  need(t.status!=="completed","completed task is immutable");
  if(kind==="PLAN"){
    need(t.status==="intake","PLAN requires intake");
    need(nonempty(event.nextAction),"PLAN requires de-identified nextAction");
    t.nextAction=event.nextAction.trim();t.status="planned";
  }else if(kind==="REQUEST_APPROVAL"){
    need(t.status==="planned","REQUEST_APPROVAL requires planned");
    need(WRITE_KINDS.includes(event.change?.kind),"unknown write operation");
    for(const k of ["scope","testPlan","rollbackPlan","approvalId"])
      need(nonempty(event.change[k],240),"missing change field: "+k);
    t.change={kind:event.change.kind,scope:event.change.scope,
      testPlan:event.change.testPlan,rollbackPlan:event.change.rollbackPlan,
      approvalId:event.change.approvalId};
    t.approval=null;t.status="awaiting_approval";
  }else if(kind==="GRANT_APPROVAL"){
    need(t.status==="awaiting_approval","GRANT_APPROVAL requires awaiting_approval");
    need(event.actor==="user","host-authenticated user required");
    need(event.approvalId===t.change.approvalId&&event.scope===t.change.scope,
      "approval must match exact request and scope");
    need(validAt(event.expiresAt)&&Date.parse(event.expiresAt)>Date.parse(at),
      "future approval expiry required");
    t.approval={approvalId:event.approvalId,scope:event.scope,approvedAt:at,
      expiresAt:event.expiresAt,actor:"user"};
    t.status="planned";
  }else if(kind==="START"){
    need(t.status==="planned","START requires planned");
    need(nonempty(event.executor,90),"executor id required");
    if(event.kind==="read"){
      need(!t.change,"pending write must not be started as read");
    }else{
      need(t.change&&event.kind===t.change.kind&&event.scope===t.change.scope,
        "write kind and scope must match planned change");
      need(t.approval&&t.approval.approvalId===t.change.approvalId&&
        t.approval.scope===t.change.scope&&Date.parse(t.approval.expiresAt)>=Date.parse(at),
        "exact unexpired approval required");
    }
    t.execution={executor:event.executor,kind:event.kind,scope:event.scope||"",
      startedAt:at};t.evidence=[];t.status="executing";
  }else if(kind==="REPORT_RESULT"){
    need(t.status==="executing","REPORT_RESULT requires executing");
    need(nonempty(event.resultRef,500)&&refUrl(event.resultRef),
      "resultRef must be an external HTTPS reference");
    t.execution.resultRef=event.resultRef;t.status="verifying";
  }else if(kind==="VERIFY"){
    need(t.status==="verifying","VERIFY requires verifying");
    need(nonempty(event.verifier,90)&&event.verifier!==t.execution.executor,
      "independent verifier required");
    const p=event.proof;
    need(p&&p.outcome==="pass"&&refUrl(p.ref)&&validAt(p.checkedAt),
      "passed external evidence with URL and timestamp required");
    need(p.sourceLevel==="L0"||(!t.change&&p.sourceLevel==="L1"),
      "write completion requires live authoritative L0 evidence");
    need(p.origin==="external-tool"||(p.sourceLevel==="L1"&&p.origin==="user-confirmation"),
      "evidence must originate outside model assertion");
    need(Date.parse(p.checkedAt)>=Date.parse(t.execution.startedAt),
      "stale evidence cannot complete execution");
    need(Date.parse(p.checkedAt)<=Date.parse(at),"future-dated evidence cannot complete execution");
    t.evidence=[{outcome:"pass",ref:p.ref,sourceLevel:p.sourceLevel,
      origin:p.origin,checkedAt:p.checkedAt,verifier:event.verifier}];
    t.status="completed";
  }else if(kind==="FAIL"){
    need(["executing","verifying","awaiting_approval"].includes(t.status),
      "FAIL requires an active attempt");
    need(nonempty(event.reason,240),"failure reason required");
    t.blockedReason=event.reason;t.retryCount+=1;t.status="failed";
  }else if(kind==="RETRY"){
    need(t.status==="failed"&&t.retryCount<=2,"retry bound exceeded");
    t.execution=null;t.evidence=[];t.blockedReason="";t.status="planned";
  }else if(kind==="BLOCK"){
    need(nonempty(event.reason,240),"block reason required");
    t.blockedReason=event.reason;t.status="blocked";
  }else if(kind==="UNBLOCK"){
    need(t.status==="blocked"&&nonempty(t.nextAction),"cannot resume without plan");
    t.blockedReason="";t.status="planned";
  }else throw new Error("unknown event type: "+kind);
  return record(t,kind,at);
}
/** Safe status snapshot only. Do not serialize full task to public GitHub. */
export function publicStatus(task){
  return {id:task.id,domain:task.domain,status:task.status,
    retryCount:task.retryCount,lastEventAt:task.history.at(-1)?.at||""};
}