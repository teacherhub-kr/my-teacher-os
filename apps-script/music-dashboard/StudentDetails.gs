/**
 * MY MUSIC CLASS v57 — Student-by-student read-only gradebook.
 * Must only be installed in the owner-only bound Apps Script.
 * Important: Never copy actual student names/grades into the public GitHub Pages app,
 * GitHub source, console, URL parameters, or Script Properties.
 */
function getStudentDetail(gradeValue, roomValue) {
  var grade = Number(gradeValue), room = Number(roomValue);
  if (!Number.isSafeInteger(grade) || !Number.isSafeInteger(room) ||
      (grade === 2 && (room < 1 || room > 9)) ||
      (grade === 3 && (room < 4 || room > 9)) ||
      (grade !== 2 && grade !== 3)) {
    throw new Error("조회할 수 없는 학급입니다.");
  }
  var id = PropertiesService.getScriptProperties().getProperty(MUSIC_DASHBOARD_PROPERTY);
  if (!id) throw new Error("원본 연결 설정이 없습니다. initializeDashboard를 먼저 실행하세요.");
  var master = SpreadsheetApp.openById(id);
  // The source map is discovered from the owner's existing IMPORTRANGE formulas.
  // No student data or source IDs are hard-coded into public JavaScript.
  var sourceIds = readStudentSourceIds_(master);
  var merged = {}, counts = grade === 2 ? [1, 2, 3, 4] : [3, 4];
  var prefix = grade + "-" + room;
  var semester = grade === 3
    ? "1·2차는 1학기 참고 성적, 3·4차는 2학기 수행평가"
    : "2학기 1~4차 수행평가";
  var notices = [];
  var allSourceRows = 0;
  counts.forEach(function (assessment) {
    var index = grade === 2 ? assessment - 1 : assessment + 1;
    var sourceFile = SpreadsheetApp.openById(sourceIds[index]);
    var tab = sourceFile.getSheetByName(room + "반");
    if (!tab) throw new Error("채점원본에 해당 반이 없습니다: " + prefix + " / " + assessment + "차");
    // A = student number, B = student name, F = total, G = assessment status.
    // H free-text observations/exception notes are deliberately not read.
    var rows = tab.getRange("A5:G50").getDisplayValues();
    var numbersInThisSource = {};
    rows.forEach(function (row) {
      var number = parseStudentNumber57_(row[0]);
      if (number === null) return;
      if (numbersInThisSource[number]) throw new Error("채점원본에 동일 학생 번호가 중복됩니다: " + prefix + " " + assessment + "차");
      numbersInThisSource[number] = true;
      var name = parseStudentName57_(row[1], prefix);
      var item = findOrAddStudent57_(merged, number, name, prefix);
      var score = parseStudentScore57_(row[5], prefix, assessment, number);
      item.scores[assessment - 1] = score;
      item.statuses[assessment - 1] = String(row[6] || "").trim().slice(0, 32);
      allSourceRows++;
    });
  });
  if (grade === 3) {
    var basis = master.getSheetByName("3학년_2학기_성적근거");
    if (!basis) throw new Error("3학년 1·2차 성적근거표를 찾지 못했습니다.");
    // A: class, B: number, C: name, D/E: first and second score.
    // Do not request free-text exception data from columns H:M.
    var entries = basis.getRange("A6:E270").getDisplayValues();
    var basisNumbers = {};
    entries.forEach(function (row) {
      if (String(row[0] || "").trim() !== prefix) return;
      var number = parseStudentNumber57_(row[1]);
      if (number === null) throw new Error("3학년 성적근거표 번호 누락: " + prefix);
      // The master roster may contain reserved numbered seats with no student.
      // Skip only entirely unassigned rows; a score without a name must fail closed.
      var basisName = String(row[2] == null ? "" : row[2]).trim();
      var basisFirst = String(row[3] == null ? "" : row[3]).trim();
      var basisSecond = String(row[4] == null ? "" : row[4]).trim();
      if (!basisName && !basisFirst && !basisSecond) return;
      if (basisNumbers[number]) throw new Error("3학년 성적근거표 학생 번호 중복: " + prefix);
      basisNumbers[number] = true;
      var name = parseStudentName57_(row[2], prefix);
      var item = findOrAddStudent57_(merged, number, name, prefix);
      item.scores[0] = parseStudentScore57_(row[3], prefix, 1, number);
      item.scores[1] = parseStudentScore57_(row[4], prefix, 2, number);
      item.statuses[0] = item.scores[0] === null ? "점수 공란" : "1학기 성적근거";
      item.statuses[1] = item.scores[1] === null ? "점수 공란" : "1학기 성적근거";
    });
  }
  var students = Object.keys(merged).map(function (number) { return merged[number]; })
    .sort(function (a, b) { return a.number - b.number; });
  if (!students.length || students.length > 45 || allSourceRows < students.length) {
    throw new Error("학생 명렬표가 없거나 대상 반의 데이터 규모가 잘못됐습니다: " + prefix);
  }
  students.forEach(function (s) {
    if (s.scores.some(function (value) { return value !== null && (value < 0 || value > 25); })) {
      throw new Error("학생 점수의 허용 범위를 벗어났습니다.");
    }
  });
  return {
    grade: grade,
    room: room,
    classId: prefix,
    students: students,
    studentCount: students.length,
    semester: semester,
    readAt: Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"),
    note: "개별 점수는 채점원본 표시값입니다. 공란은 0점이 아니며, 평가상태와 최종 성적 확정 여부를 별도 확인하세요."
  };
}
function readStudentSourceIds_(master) {
  var tab = master.getSheetByName("채점연동_RAW");
  if (!tab) throw new Error("기존 채점연동_RAW 탭이 없습니다.");
  var formulas = [2, 14, 26, 38, 50, 62].map(function (row) {
    return String(tab.getRange("A" + row).getFormula() || "");
  });
  var seen = {};
  return formulas.map(function (formula, idx) {
    var match = /^=IMPORTRANGE\("https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})\/edit",\s*"평가안내![A-Z]\d+:[A-Z]\d+"\)$/i.exec(formula);
    if (!match || seen[match[1]]) {
      throw new Error("채점연동 원본 #" + (idx + 1) + " 연결 수식이 올바르지 않습니다.");
    }
    seen[match[1]] = true;
    return match[1];
  });
}
function parseStudentNumber57_(value) {
  var raw = String(value == null ? "" : value).trim();
  if (!raw) return null;
  if (!/^\d{1,2}$/.test(raw)) return null;
  var number = Number(raw);
  if (number < 1 || number > 45) throw new Error("학생 번호가 범위를 벗어났습니다.");
  return number;
}
function parseStudentName57_(raw, classId) {
  var name = String(raw == null ? "" : raw).trim();
  if (!name || name.length > 40) throw new Error("학생 이름 누락 또는 비정상: " + classId);
  return name;
}
function parseStudentScore57_(raw, classId, assessment, number) {
  var value = String(raw == null ? "" : raw).trim();
  if (!value || value === "—" || value === "-") return null;
  if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(value)) {
    throw new Error("점수 형식 오류: " + classId + " " + assessment + "차 " + number + "번");
  }
  var numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 25) {
    throw new Error("점수 허용 범위 초과: " + classId + " " + assessment + "차 " + number + "번");
  }
  return numberValue;
}
function findOrAddStudent57_(merged, number, name, classId) {
  var key = String(number);
  var item = merged[key];
  if (item && item.name.replace(/\s+/g, "") !== name.replace(/\s+/g, "")) {
    // Do not combine two students' scores into one record even if class number coincides.
    throw new Error("원본 간 학생 이름 불일치: " + classId + " " + number + "번. 원본 대조가 필요합니다.");
  }
  if (!item) {
    item = { number: number, name: name, scores: [null, null, null, null],
      statuses: ["원본 없음", "원본 없음", "원본 없음", "원본 없음"] };
    merged[key] = item;
  }
  return item;
}
