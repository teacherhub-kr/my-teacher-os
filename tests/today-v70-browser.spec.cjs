// v70 public browser check with fictional, student-free data. Never reads private Google or school data.
const {test, expect} = require('@playwright/test');

test.use({baseURL: 'http://127.0.0.1:4173', serviceWorkers: 'block'});
const THURSDAY_10_KST = new Date('2026-11-12T01:00:00Z');

function watch(page) {
  const seen = {errors: [], local: [], blocking: []};
  page.on('pageerror', e => seen.errors.push(e.message));
  page.on('request', r => { if (/127\.0\.0\.1:43135|localhost:43135/.test(r.url())) seen.local.push(r.url()); });
  page.on('console', m => { if (/parser-blocking/i.test(m.text())) seen.blocking.push(m.text()); });
  return seen;
}
async function boot(page) {
  await page.route(/cdn\.jsdelivr\.net/, r => r.abort());
  await page.clock.setFixedTime(THURSDAY_10_KST);
  await page.goto('/?mode=tools', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('body')).toHaveClass(/teacher70-mode/, {timeout: 30000});
}
// Last week's collected Comcigan copy only: the real state when the collector keeps failing.
function seedStaleSync(page) {
  return page.addInitScript(() => {
    if (sessionStorage.getItem('v70-seeded')) return;
    sessionStorage.setItem('v70-seeded', '1');
    const days = ['월', '화', '수', '목', '금'], ws = '2026-11-02';
    const slot = (d, p, t) => ({date: '2026-11-0' + (2 + d), day: days[d], period: p, target: t, subject: '음악',
      label: t + ' 음악', changed: false, source: '컴시간 자동동기화'});
    const y = {year: 2026, schoolLevel: '중학교', schoolName: '가상중학교', educationOffice: '경기도교육청', subjects: ['음악'],
      projects: [], clubs: [], assessments: [], memories: [], tasks: [], calendarEvents: [], timetable: [], timetableExceptions: [], imports: [],
      liveTimetableWeeks: {[ws]: {weekStart: ws, source: '컴시간 자동동기화', updatedAt: '2026-11-02T02:00:00.000Z',
        slots: [slot(0, 1, '2-1'), slot(3, 1, '3-2'), slot(3, 5, '2-4')]}},
      comciganSync: {status: 'error', lastApplied: '2026-11-02T02:00:00.000Z'}};
    localStorage.setItem('myTeacherOS.v01', JSON.stringify({version: 21, currentYear: 2026, profile: {major: '음악', minutes: 45}, years: {'2026': y}}));
  });
}

test('first run: one clear setup step, no crash, no local-computer probe, no blocking scripts', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 800});
  const seen = watch(page);
  await boot(page);
  await page.waitForTimeout(2500);
  await expect(page.locator('#os66Setup')).toBeVisible();
  await expect(page.locator('#os66Setup .t70-steps li')).toHaveCount(3);
  await expect(page.locator('#os65Home .os65-quick')).toBeHidden();
  expect(await page.locator('button:visible', {hasText: '학년도 시작'}).count()).toBe(1);
  await expect(page.locator('#v17Chip')).toBeHidden();
  expect((await page.locator('.top').boundingBox()).height).toBeLessThanOrEqual(80);
  expect(seen.errors).toEqual([]);
  expect(seen.local).toEqual([]);
  expect(seen.blocking).toEqual([]);
});

test('collector failing: last collected week is shown with its source, edited for one day, and reverted', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 800});
  const seen = watch(page);
  await seedStaleSync(page);
  await boot(page);
  await expect(page.locator('#os65LessonValue')).toHaveText('1·5교시', {timeout: 10000});
  await expect(page.locator('#os70Today')).toContainText('11월 2일 주 컴시간 기준');
  await expect(page.locator('#os70Today .t70-lesson')).toHaveCount(2);

  await page.locator('[data-os66-view="timetable"]:visible').first().click();
  await expect(page.locator('#timetable')).toHaveClass(/active/);
  await expect(page.locator('#tt70Heading')).toContainText('11월 9일 ~ 11월 13일');
  await expect(page.locator('#liveTimetableTable')).toBeHidden();
  await expect(page.locator('#timetableTable')).toBeHidden();
  const cell = page.locator('.t70-cell[data-t70-date="2026-11-12"][data-t70-period="1"]');
  await expect(cell).toContainText('3-2 음악');

  await cell.click();
  await expect(page.locator('#tt70Dlg')).toBeVisible();
  await page.fill('#tt70Target', '2학년 7반');
  await page.click('#tt70Replace');
  await expect(cell).toContainText('2-7 음악');
  await expect(cell).toHaveClass(/t70-edited/);

  await page.reload({waitUntil: 'domcontentloaded'});
  await expect(page.locator('body')).toHaveClass(/teacher70-mode/, {timeout: 30000});
  await expect(page.locator('#os70Today')).toContainText('2-7 음악');
  await expect(page.locator('#os65LessonNote')).toContainText('교사 수정 포함');
  const counts = await page.evaluate(() => {
    const y = cur();
    // Base timetable is empty here, so 3-2 counts 0 either way; 2-7 must count the teacher's added lesson.
    return ['3-2', '2-7'].map(t => TeacherOSCoreV6.teachingSlotsForDate(y.timetable, [], y.timetableExceptions, t, '2026-11-12').length);
  });
  expect(counts).toEqual([0, 1]);

  await page.locator('#nav [data-os66-category="lesson"]').click();
  await cell.click();
  await page.click('#tt70Revert');
  await expect(cell).toContainText('3-2 음악');
  await expect(cell).not.toHaveClass(/t70-edited/);
  expect(await page.evaluate(() => cur().timetableExceptions.length)).toBe(0);
  expect(await page.evaluate(() => Object.keys(cur().liveTimetableWeeks))).toEqual(['2026-11-02']);
  expect(seen.errors).toEqual([]);
  expect(seen.local).toEqual([]);
});

test('phone: compact header, no sideways scroll, report button clear of the bottom menu', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  const seen = watch(page);
  await seedStaleSync(page);
  await boot(page);
  await expect(page.locator('#os70Today .t70-lesson')).toHaveCount(2, {timeout: 10000});
  expect((await page.locator('.top').boundingBox()).height).toBeLessThanOrEqual(72);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('body')).toHaveClass(/teacher71-mode/);
  await page.locator('#th71Profile summary').click();
  await expect(page.locator('#os66SettingsButton')).toBeVisible();
  const fab = await page.locator('#feedbackFab26').boundingBox();
  const nav = await page.locator('aside.side').boundingBox();
  expect(fab.y + fab.height).toBeLessThanOrEqual(nav.y);
  await page.locator('#nav [data-os66-category="lesson"]').click();
  await expect(page.locator('#tt70Grid')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(seen.errors).toEqual([]);
});
