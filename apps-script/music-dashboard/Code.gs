/**
 * MY MUSIC CLASS — teacher-only Apps Script dashboard
 * Spreadsheet-bound project. Code runs under the deploying owner's account.
 * Publish as: Execute as Me / Who has access: Only myself.
 *
 * Required first-run: initializeDashboard() from the spreadsheet's script editor.
 * This script ONLY reads the aggregate tab and writes a private Script Property.
 * It NEVER edits scores, student rosters, permissions or the spreadsheet.
 */
var MUSIC_DASHBOARD_TAB = "평가통합현황";
var MUSIC_DASHBOARD_RANGE = "A3:K18";
var MUSIC_DASHBOARD_PROPERTY = "MUSIC_DASHBOARD_SPREADSHEET_ID";

function initializeDashboard() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("가변형 음악 스케줄표에서 확장 프로그램 → Apps Script로 연 다음 실행하세요.");
  }
  var result = getValidatedSummary_(spreadsheet);
  PropertiesService.getScriptProperties().setProperty(MUSIC_DASHBOARD_PROPERTY, spreadsheet.getId());
  return {
    setup: "완료",
    classes: result.classes.length,
    missingEntries: result.totals.all,
    note: "시트는 읽기만 했습니다. 이제 웹앱을 '나만' 접근으로 배포하세요."
  };
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("MY MUSIC CLASS · 교사 전용 평가 현황")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function getDashboardData() {
  var fileId = PropertiesService.getScriptProperties().getProperty(MUSIC_DASHBOARD_PROPERTY);
  if (!fileId) throw new Error("초기 설정이 없습니다. Apps Script 편집기에서 initializeDashboard를 먼저 실행하세요.");
  var book = SpreadsheetApp.openById(fileId);
  var data = getValidatedSummary_(book);
  data.readAt = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
  data.readAtType = "조회 시각 (원본 최종 수정 시각 아님)";
  return data;
}

/**
 * Pure whitelist mapping: individual student data never leaves the spreadsheet.
 * Input A3:K18 is class-level aggregates only; warning text is NEVER returned.
 */
function parseMusicSummary_(values) {
  if (!Array.isArray(values) || values.length !== 16) {
    throw new Error("집계 범위가 예상한 16행(제목+15개 반)이 아닙니다.");
  }
  var headers = ["학년/반", "학년", "1차 미채점", "2차 미채점", "3차 미채점", "4차 미채점"];
  for (var h = 0; h < headers.length; h++) {
    if (String(values[0][h] || "").trim() !== headers[h]) {
      throw new Error("집계표 제목이 변경되었습니다: " + headers[h]);
    }
  }
  var seen = {}, classes = [];
  var totals = { all: 0, grade2: 0, grade3: 0, byAssessment: [0, 0, 0, 0], warningClasses: 0, urgentClasses: 0 };
  for (var i = 1; i < values.length; i++) {
    var row = values[i] || [];
    var id = String(row[0] || "").trim();
    var match = /^([23])-([1-9])$/.exec(id);
    if (!match) throw new Error("학급 코드 오류 (데이터 행 " + i + ")");
    var grade = Number(match[1]), room = Number(match[2]);
    if ((grade === 3 && room < 4) || Number(row[1]) !== grade || seen[id]) {
      throw new Error("학년·반 범위 또는 중복 오류: " + id);
    }
    seen[id] = true;
    var counts = [];
    for (var j = 2; j <= 5; j++) {
      var raw = String(row[j] == null ? "" : row[j]).trim();
      if (!/^\d{1,2}$/.test(raw)) throw new Error("미채점 자료가 숫자가 아닙니다: " + id);
      var count = Number(raw);
      if (!Number.isSafeInteger(count) || count < 0 || count > 45) {
        throw new Error("미채점 집계가 범위를 벗어났습니다: " + id);
      }
      counts.push(count);
      totals.byAssessment[j - 2] += count;
      totals.all += count;
      if (grade === 2) totals.grade2 += count; else totals.grade3 += count;
    }
    var warning = String(row[10] || "");
    var category = /긴급/.test(warning) ? "긴급" : warning ? "확인 필요" : "없음";
    if (category !== "없음") totals.warningClasses++;
    if (category === "긴급") totals.urgentClasses++;
    // Return only allowlisted class-level fields; never return warning notes, raw rows or dates.
    classes.push({ id: id, grade: grade, room: room, missing: counts, notice: category });
  }
  if (classes.length !== 15 || classes.filter(function (c) { return c.grade === 2; }).length !== 9 ||
      classes.filter(function (c) { return c.grade === 3; }).length !== 6) {
    throw new Error("집계 대상은 2학년 9개 반 + 3학년 6개 반이어야 합니다.");
  }
  classes.sort(function (a, b) { return a.grade - b.grade || a.room - b.room; });
  return {
    version: 1,
    classes: classes,
    totals: totals,
    semesterNotes: {
      grade2: "2학년 2학기 1~4차 수행평가 · 미채점 현황",
      grade3: "3학년 1·2차는 1학기 참고 / 3·4차는 2학기 수행평가"
    },
    caution: "미채점 0명은 채점표 상태입니다. 수업 실시, 결시·보충 평가 및 성적 확정 여부를 뜻하지 않습니다."
  };
}

function getValidatedSummary_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(MUSIC_DASHBOARD_TAB);
  if (!sheet) throw new Error("원본에 평가통합현황 탭이 없습니다.");
  return parseMusicSummary_(sheet.getRange(MUSIC_DASHBOARD_RANGE).getDisplayValues());
}
