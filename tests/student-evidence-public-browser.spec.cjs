// Public-only Chromium test with a fictional student. No actual school or Google data.
const {test,expect}=require('@playwright/test');
test.use({baseURL:'http://127.0.0.1:4173',
 viewport:{width:1280,height:800},serviceWorkers:'block'});
test('choose an observation focus, verify concrete facts, then draft and select A/B/C',async({page})=>{
 await page.addInitScript(()=>{
  const y={year:2026,schoolLevel:'중학교',schoolName:'가상학교',
   educationOffice:'경기도교육청',subjects:['음악'],
   projects:[],clubs:[],assessments:[],memories:[],tasks:[],calendarEvents:[],timetable:[],imports:[],
   students:[{id:'fictional-student-0001',name:'가상 학생',grade:'2',classNo:'3',number:'1'}],
   consultations:[],studentRecords:[],studentDrafts:{},
   roleProfile:{roles:['homeroom','subject'],homeroomGrade:'2',homeroomClass:'3',department:'',other:''}};
  const s={version:21,currentYear:2026,profile:{major:'음악',minutes:45},years:{'2026':y}};
  localStorage.setItem('myTeacherOS.v01',JSON.stringify(s));
 });
 await page.goto('/?mode=tools',{waitUntil:'domcontentloaded'});
 await expect(page.locator('body')).toHaveClass(/teacher66-mode/,{timeout:30000});
 await page.locator('#nav button[data-os66-category="student"]').click();
 await expect(page.locator('#srStudentList [data-student-id="fictional-student-0001"]')).toBeVisible();
 await expect(page.locator('#v21EvidenceList')).toContainText('작성할 직접 관찰 근거가 아직 없습니다.');
 await expect(page.locator('#v21Generate')).toBeDisabled();
 await page.locator('[data-v21-open-capture]').click();
 await page.locator('#v21QuickFocus [data-v21-focus="협력·소통"]').click();
 await page.locator('#v21QuickFact').fill('가상 학급자치 시간에 반 친구들의 의견을 듣고 공동 규칙을 정리하여 발표함.');
 // Verification is mandatory, not automatically checked.
 await page.locator('#v21QuickSave').click();
 await expect(page.locator('#v21QuickStatus')).toContainText('직접 관찰');
 await page.locator('#v21QuickConfirmed').check();
 await page.locator('#v21QuickSave').click();
 await expect(page.locator('#v21EvidenceList [data-v21-evidence]')).toHaveCount(1);
 await expect(page.locator('#v21Generate')).toBeEnabled();
 await page.locator('#v21Generate').click();
 await expect(page.locator('#v21DraftGrid .v21-draft-card')).toHaveCount(3);
 await expect(page.locator('#v21DraftGrid')).not.toContainText('지속적으로 관찰됨');
 await page.locator('[data-v21-select="A"]').click();
 await page.locator('#v21SaveDraft').click();
 await expect(page.locator('#v21DraftStatus')).toContainText('저장했습니다.');
 const stored=await page.evaluate(()=>{
  const y=JSON.parse(localStorage.getItem('myTeacherOS.v01')).years['2026'];
  return {records:y.studentRecords,draft:y.studentDrafts['fictional-student-0001'].behavior};
 });
 expect(stored.records).toHaveLength(1);
 expect(stored.draft.evidenceIds).toEqual([stored.records[0].id]);
 expect(stored.draft.text).toContain('공동 규칙을 정리하여 발표함');
});
