"""Real Chrome (Playwright) scenarios for v67.1 — FICTIONAL students only.
Google is emulated: script.google.com is routed to the repo's Index.html and
google.script.run is a stub that records every server call and its arguments."""
import json, sys, threading, http.server, functools, re
from playwright.sync_api import sync_playwright

REPO = sys.argv[1]
INDEX = open(f"{REPO}/apps-script/music-dashboard/Index.html", encoding="utf-8").read()
FAKE = "https://script.google.com/macros/s/AKfycbxFAKEabcdefghijklmnopqrstuvwxyz0123/exec"
ESSAY = "가상논술원문-비밀표지-7731 두 곡의 빠르기를 비교한 가상의 답안"

STUB = r"""
(() => {
  const classes=[...Array.from({length:9},(_,i)=>({id:'2-'+(i+1),grade:2,room:i+1,missing:[0,1,0,2],notice:i===2?'확인 필요':'없음'})),
    ...Array.from({length:6},(_,i)=>({id:'3-'+(i+4),grade:3,room:i+4,missing:[0,0,1,0],notice:'없음'}))];
  window.__rosterVersion=1; window.__calls=[];
  const roster=()=>window.__rosterVersion===1
    ?[{number:1,name:'가상학생A',scores:[20,null,18,15],statuses:['응시','미응시','응시','응시']},
      {number:2,name:'가상학생B',scores:[22,21,null,19],statuses:['응시','응시','','응시']}]
    :[{number:1,name:'가상학생Z',scores:[19,19,19,19],statuses:['응시','응시','응시','응시']},
      {number:2,name:'가상학생B',scores:[22,21,null,19],statuses:['응시','응시','','응시']}];
  function run(){let ok;const r={withSuccessHandler(f){ok=f;return r},withFailureHandler(){return r},
    getDashboardData(...a){__calls.push(['getDashboardData',JSON.stringify(a)]);setTimeout(()=>ok({classes,semesterNotes:{grade2:'2학년 노트',grade3:'3학년 노트'},caution:'주의',readAt:'2026-11-03 16:00:00',readAtType:'조회 시각'}),20)},
    getStudentDetail(...a){__calls.push(['getStudentDetail',JSON.stringify(a)]);const [g,room]=a;setTimeout(()=>ok({grade:g,room,classId:g+'-'+room,students:roster(),studentCount:2,readAt:'2026-11-03 16:00:01'}),20)}};return r}
  window.google={script:{get run(){return run()},url:{getLocation(cb){const p={};new URLSearchParams(location.search).forEach((v,k)=>p[k]=v);cb({parameter:p})}}}};
})();
"""

results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (f" — {detail}" if detail and not cond else ""))

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=REPO))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{srv.server_port}"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    outbound = []
    ctx.on("request", lambda r: outbound.append((r.url, r.post_data or "")))
    ctx.route(re.compile(r"https://script\.google\.com/.*"),
              lambda route: route.fulfill(status=200, content_type="text/html; charset=utf-8", body=INDEX))
    ctx.route(re.compile(r"https://(?!script\.google\.com).*"), lambda route: route.abort())
    ctx.add_init_script(STUB)
    ctx.add_init_script(f"try{{if(location.origin==='{BASE}')localStorage.setItem('myTeacherOS.music56.ownerOnlyWebAppUrl','{FAKE}')}}catch(e){{}}")

    # ---- 7. Public OS menu → 세특 tab → teacher web app (emulated Google) at the workroom
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(BASE + "/index.html")
    page.wait_for_function("document.body&&document.body.classList.contains('teacher66-mode')", timeout=20000)
    page.click("#nav [data-os66-category='student']")
    page.wait_for_selector("#os66Tabs [data-teacher56-view='seteuk']", timeout=5000)
    tabs = page.inner_text("#os66Tabs")
    check("7a 학생·생활기록부 메뉴에 '음악 교과세특 작성 ↗' 탭 표시", "음악 교과세특 작성" in tabs, tabs)
    with ctx.expect_page() as pop:
        page.click("#os66Tabs [data-teacher56-view='seteuk']")
    app = pop.value
    app.wait_for_load_state()
    check("7b 탭 클릭 시 등록된 교사 웹앱 주소 + ?view=seteuk 로 이동", app.url == FAKE + "?view=seteuk", app.url)
    app.wait_for_function("document.getElementById('studentClass').options.length===9", timeout=5000)
    app.wait_for_timeout(1200)
    top = app.evaluate("document.getElementById('recordPanel').getBoundingClientRect().top")
    check("7c 웹앱이 열리면 세특 작성실로 바로 스크롤", -5 < top < 140, f"top={top}")
    check("7d 화면 버전 표시 v67.3-seteuk", "v67.3-seteuk" in app.inner_text("#appBuild"))
    app.screenshot(path="/tmp/seteuk-workroom.png")
    public_errors = [e for e in errors if "TeacherOS" in e or "os66" in e]
    check("7e 공개 OS 스크립트 오류 없음(v66/v56 관련)", not public_errors, "; ".join(public_errors)[:300])

    # ---- 8. existing assessment lookup still works
    app.click("#refresh"); app.wait_for_timeout(200)
    check("8a 반별 집계 표 9개 반", app.locator("#results tr").count() == 9)
    app.select_option("#studentClass", "3"); app.click("#loadStudents")
    app.wait_for_function("document.querySelectorAll('#studentRows tr').length===2")
    row = app.inner_text("#studentRows tr:nth-child(1)")
    check("8b 학생별 성적 조회 정상(공란은 '미기록', 0점 아님)", "가상학생A" in row and "미기록" in row and not re.search(r"(?<![0-9])0점", row), row)
    check("8c 세특 학급 선택이 성적 조회와 연동", app.input_value("#recordClass") == "3")

    app.on("dialog", lambda d: d.accept())  # teacher accepts every confirmation prompt in this script
    S = lambda sel, v: app.fill(sel, v)
    pick = lambda n: (app.select_option("#recordStudent", str(n)), app.wait_for_timeout(50))
    # ---- 1. A's observation never shown on B
    pick(1)
    S("#recordActivity", "가상 합주"); S("#recordObserved", "셈여림 변화를 구별하여 자신의 파트 음량을 조절함")
    app.click("summary:has-text('논술·과제 원문')"); S("#recordSource", ESSAY)
    app.click("#makeRecord")
    draftA = app.input_value("#recordDraft")
    pick(2)
    check("1 A 학생 관찰·초안·논술이 B 학생에게 보이지 않음",
          app.input_value("#recordObserved") == "" and app.input_value("#recordDraft") == "" and app.input_value("#recordSource") == "")
    pick(1)
    check("1b A로 돌아오면 A의 내용 복원", app.input_value("#recordDraft") == draftA and app.input_value("#recordSource") == ESSAY)

    tick_all = lambda: [c.check() for c in app.locator("#recordFacts input[data-fact]:enabled").all()]
    # ---- 2. evidence change voids confirmation; teacher fact check is required
    gate = app.inner_text("#recordGate")
    check("2a 어휘 연결만으로는 확정 불가(교사 사실 확인 필요)", app.is_disabled("#confirmRecord") and "사실관계" in gate, gate)
    facts = app.inner_text("#recordFacts")
    check("2a-1 문장별 연결 근거(교사 관찰) 표시", "교사 관찰" in facts and "사실 검증이 아닙니다" in app.inner_text("#recordPanel"), facts[:200])
    tick_all()
    gate = app.inner_text("#recordGate")
    check("2a-2 입력 대상 '확인 필요'(기본값)이면 사실 확인을 다 해도 확정 차단", app.is_disabled("#confirmRecord") and "확인 필요" in gate, gate)
    app.select_option("#recordTarget", "제외")
    check("2a-3 입력 대상 '제외'도 확정 차단", app.is_disabled("#confirmRecord") and "제외" in app.inner_text("#recordGate"))
    app.select_option("#recordTarget", "대상")
    check("2a-4 '대상'으로 확인 + 모든 문장 사실 확인 후 확정 가능", not app.is_disabled("#confirmRecord"), app.inner_text("#recordGate"))
    app.click("#confirmRecord")
    check("2b 확정은 '교사 확정(임시)'로 표시", "1번 가상학생A · 교사 확정(임시)" in app.inner_text("#recordProgress"))
    S("#recordObserved", "셈여림 변화를 구별하여 자신의 파트 음량을 조절하고 친구에게 설명함")
    prog = app.inner_text("#recordProgress")
    check("2c 근거 수정 시 확정 해제 → 검토 중(근거 변경)", "교사 확정" not in prog and "근거 변경" in prog, prog)
    check("2d 변경 항목(관찰 내용)을 표시하고 재확정 차단", app.is_disabled("#confirmRecord") and app.is_visible("#recordRecheck") and "관찰 내용" in app.inner_text("#recordGate"))
    app.click("#recordRecheck")
    check("2e 대조 완료 후에도 문장 사실 확인은 다시 해야 함", app.is_disabled("#confirmRecord"))
    tick_all()
    check("2f 다시 사실 확인하면 확정 가능", not app.is_disabled("#confirmRecord"))
    # P1-1 essay-based evidence: essay change voids confirmation only when the work summary is used
    S("#recordWork", "감상문에서 셈여림 변화가 분위기에 주는 효과를 설명함")
    app.click("#makeRecord")
    tick_all(); app.click("#confirmRecord")
    S("#recordSource", ESSAY + " (수정본)")
    gate = app.inner_text("#recordGate")
    check("2g 산출물 근거 사용 중 논술 원문이 바뀌면 확정 해제", "논술 원문" in gate and app.is_disabled("#confirmRecord"), gate)
    # P0-3 counterexample: sentence reusing 2 evidence words but adding an unobserved activity
    app.click("#makeRecord"); tick_all()
    S("#recordDraft", app.input_value("#recordDraft") + " 셈여림 변화를 활용해 파트 반주를 직접 작곡하여 학급에 발표함.")
    gate = app.inner_text("#recordGate")
    check("2h 근거 단어 2개를 재사용한 허위 문장 → 교사 사실 확인 전 확정 차단", app.is_disabled("#confirmRecord") and "사실관계" in gate, gate)
    # P0-1 limit cannot be raised
    app.fill("#recordLimit", "3000"); app.dispatch_event("#recordLimit", "input")
    check("2i 입력 한도는 공식 1500Byte 초과로 올릴 수 없음", app.input_value("#recordLimit") == "1500" and "/ 1500" in app.inner_text("#recordBytes"), app.inner_text("#recordBytes"))
    # P1-3 target scope
    app.select_option("#recordTarget", "제외")
    check("2j 학교 기준 '입력 대상 아님' 표시 시 확정 불가·진행 현황 반영", app.is_disabled("#confirmRecord") and "입력 대상 아님" in app.inner_text("#recordProgress"))
    check("2k 진행 현황은 임시·누적 아님으로 표시", "누적 기록·완료율 아님" in app.inner_text("#recordProgressSummary"))
    app.select_option("#recordTarget", "확인 필요")
    check("2l 확정 후 '확인 필요'로 되돌리면 확정 불가", app.is_disabled("#confirmRecord"))

    # ---- 3. draft without evidence / invented sentences cannot be confirmed
    pick(2)
    S("#recordDraft", "가상 합주에서 화려한 꾸밈음을 즉흥 연주하며 뛰어난 음악성을 보임.")
    gate = app.inner_text("#recordGate")
    check("3a 근거 없이 직접 쓴 문장은 확정 차단", app.is_disabled("#confirmRecord") and "근거 없음" in gate, gate)
    S("#recordActivity", "가상 합주"); S("#recordObserved", "자신의 파트 박자를 세며 합주 속도에 맞춤")
    gate = app.inner_text("#recordGate")
    app.click("#recordRecheck")
    gate = app.inner_text("#recordGate")
    check("3b 근거를 넣고 대조를 눌러도 근거와 무관한 문장(활동명만 같음)은 확정 차단", app.is_disabled("#confirmRecord") and "연결되지 않는 문장" in gate, gate)
    app.click("#makeRecord")
    tick_all()
    S("#recordDraft", app.input_value("#recordDraft") + " 박자를 세는 과정에서 방과후학교 강좌 내용을 소개함.")
    check("3c 기재 불가 표현(방과후학교)은 확정 차단", app.is_disabled("#confirmRecord") and "기재 불가" in app.inner_text("#recordChecks"))

    # ---- 4. same number, different name after re-fetch
    app.evaluate("window.__rosterVersion=2")
    app.click("#recordLoadClass"); app.wait_for_function("document.getElementById('recordStudent').options.length===3")
    mismatch = app.inner_text("#recordMismatch")
    check("4a 재조회 후 번호 같고 이름 다르면 경고", app.is_visible("#recordMismatch") and "1번" in mismatch, mismatch)
    pick(1)
    check("4b 새 1번 학생(가상학생Z)에게 이전 A 기록이 나타나지 않음",
          app.input_value("#recordObserved") == "" and app.input_value("#recordDraft") == "" and app.input_value("#recordSource") == "")
    pick(2)
    check("4c 이름이 같은 2번 학생 기록은 유지", "박자" in app.input_value("#recordObserved"))

    # ---- 4-1. Within-workroom grade switch: grade 2 (9 rooms) vs grade 3 (6 rooms).
    # Use the SAME fictional students in both grades to detect cross-grade state leakage.
    app.locator("#recordPanel [data-grade='3']").click()
    app.wait_for_function("document.getElementById('recordClass').options.length===6")
    grade3rooms = app.locator("#recordClass option").evaluate_all("(nodes)=>nodes.map(n=>n.value)")
    check("4d 세특 작성실에서 3학년으로 전환하면 4~9반만 표시",
          grade3rooms == ['4','5','6','7','8','9'], str(grade3rooms))
    app.select_option("#recordClass", "4")
    app.click("#recordLoadClass")
    app.wait_for_function("document.getElementById('recordStudent').options.length===3")
    calls = app.evaluate("window.__calls")
    check("4e 3학년 4반은 보호된 기존 수행평가 조회(getStudentDetail) 재사용",
          any(c[0]=="getStudentDetail" and json.loads(c[1])==[3,4] for c in calls))
    pick(2)
    check("4f 같은 번호·이름이어도 다른 학년·반의 관찰 초안이 섞이지 않음",
          app.input_value("#recordObserved")=="" and app.input_value("#recordDraft")=="")
    app.locator("#recordPanel [data-grade='2']").click()
    app.wait_for_function("document.getElementById('recordClass').options.length===9")
    grade2rooms = app.locator("#recordClass option").evaluate_all("(nodes)=>nodes.map(n=>n.value)")
    check("4g 다시 2학년으로 전환하면 1~9반만 표시",
          grade2rooms==[str(i) for i in range(1,10)], str(grade2rooms))
    app.select_option("#recordClass","3")
    app.click("#recordLoadClass")
    app.wait_for_function("document.getElementById('recordStudent').options.length===3")
    pick(2)
    check("4h 기존 2학년 3반의 임시 작업은 학년 전환 후에도 해당 학생에게만 남음",
          "박자" in app.input_value("#recordObserved"))

    # ---- 6. loss warning is explicit
    banner = app.inner_text("#recordUnsaved")
    check("6a 저장 안 됨 경고가 작성 중 학생 수와 함께 상시 표시", "저장되지 않은" in banner and "새로고침" in banner, banner)
    prevented = app.evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented})()")
    check("6b 창 닫기·새로고침 전 경고 이벤트 등록", prevented)
    app.screenshot(path="/tmp/seteuk-gates.png", full_page=True)

    # ---- 5. essay text never leaves the page
    leaked = [u for u, d in outbound if "비밀표지-7731" in u or "비밀표지-7731" in d]
    calls = app.evaluate("window.__calls")
    check("5a 논술 원문이 어떤 네트워크 요청에도 포함되지 않음", not leaked, str(leaked)[:200])
    check("5b 서버 호출은 읽기 전용 2종이며 논술 원문 미포함",
          all(c[0] in ("getDashboardData", "getStudentDetail") and "7731" not in c[1] for c in calls), str(calls))
    hosts = sorted({re.sub(r"^(https?://[^/]+).*", r"\1", u) for u, _ in outbound})
    external = [h for h in hosts if h not in (BASE, "https://script.google.com")]
    check("5c 공개 OS·웹앱이 시도한 외부 호스트 목록(정보)", True, "")
    print("   요청 호스트:", hosts)
    storage = app.evaluate("(()=>{try{return localStorage.length+sessionStorage.length}catch(e){return -1}})()")
    check("5d 웹앱 쪽 브라우저 저장소 사용 0", storage == 0, str(storage))
    browser.close()
srv.shutdown()
failed = [r for r in results if not r[1]]
print(f"\n{len(results)-len(failed)}/{len(results)} PASS")
sys.exit(1 if failed else 0)
