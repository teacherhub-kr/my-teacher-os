// Public-only browser smoke. Never reads private Google Apps Script or real school data.
const {test, expect} = require('@playwright/test');

test.use({
  baseURL: 'http://127.0.0.1:4173',
  viewport: {width: 1280, height: 800},
  serviceWorkers: 'block'
});

test('public tools boot and route between the five current workspaces', async ({page}) => {
  const res = await page.goto('/?mode=tools', {waitUntil: 'domcontentloaded'});
  expect(res?.status()).toBe(200);
  await expect(page.locator('body')).toHaveClass(/teacher66-mode/, {timeout: 30000});
  const nav = page.locator('#nav button[data-os66-category]');
  await expect(nav).toHaveCount(5);
  for (const category of ['home','lesson','assessment','student','work']) {
    await expect(page.locator('#nav button[data-os66-category="'+category+'"]')).toBeVisible();
  }
  await page.locator('#nav button[data-os66-category="assessment"]').click();
  await expect(page.locator('#assessment')).toHaveClass(/active/, {timeout: 10000});
  await expect(page.locator('#os66Tabs')).toBeVisible();
  // v71 relocates the original settings control inside an accessible profile menu.
  await expect(page.locator('body')).toHaveClass(/teacher71-mode/);
  await page.locator('#th71Profile summary').click();
  await expect(page.locator('#os66SettingsButton')).toBeVisible();
});

test('mobile public tools boot without private-data endpoints', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  const res = await page.goto('/?mode=tools', {waitUntil: 'domcontentloaded'});
  expect(res?.status()).toBe(200);
  await expect(page.locator('body')).toHaveClass(/teacher66-mode/, {timeout: 30000});
  await expect(page.locator('#nav button[data-os66-category]')).toHaveCount(5);
  expect(page.url()).toContain('127.0.0.1:4173');
});
