const { test, expect } = require('@playwright/test');
const ids = [
  'orchestra-timbre','rhythm-lab','dynamics-expression','gayageum-observation',
  'vocal-breath-phrasing','bali-gamelan-archive','arirang-vocal'
];
const origin = process.env.MUSIC_PRESENTATION_BASE_URL || 'http://127.0.0.1:4173';
for (const id of ids) {
  test.describe('Seven-lesson presentation: '+id, () => {
    test('desktop PPT and activity mode preserve existing student controls and media', async ({ page }) => {
      await page.setViewportSize({width:1440,height:900});
      await page.route('https://**/*', r => r.abort('blockedbyclient'));
      const errors=[];
      page.on('pageerror',e => errors.push(e.message));
      const res=await page.goto(origin+'/lessons/'+id+'/?audit=1',{waitUntil:'domcontentloaded'});
      expect(res?.status()).toBe(200);
      const dock=page.locator('#music-presentation-controls');
      await expect(dock).toBeVisible();
      expect(await page.locator('body').getAttribute('data-music-lesson')).toBe(id);
      const nav=page.locator('#nav, #tabs, #steps').first();
      await expect(nav).toBeVisible();
      expect((await dock.locator('.mp-status').innerText())).toMatch(/\d+\s*\/\s*\d+/);
      await page.evaluate(()=>{window.__originalMediaNode=document.querySelector('audio,video,iframe');});
      await dock.locator('[data-mp="mode"]').click();
      await expect(page.locator('body')).toHaveClass(/music-presenting/);
      await expect(nav).toBeHidden();
      const same=await page.evaluate(()=>{const a=window.__originalMediaNode;return !a || document.contains(a) && a===document.querySelector('audio,video,iframe');});
      expect(same,'Mode toggle re-created the playing media element').toBeTruthy();
      const before=await dock.locator('.mp-status').innerText();
      await dock.locator('[data-mp="next"]').click();
      await expect(dock.locator('.mp-status')).not.toHaveText(before);
      await page.keyboard.press('m');
      await expect(page.locator('body')).not.toHaveClass(/music-presenting/);
      await expect(nav).toBeVisible();
      expect(errors,'Browser JavaScript errors').toEqual([]);
    });
    test('phone presentation mode fits dock and keyboard navigation', async ({ page }) => {
      await page.setViewportSize({width:390,height:844});
      await page.route('https://**/*', r => r.abort('blockedbyclient'));
      const res=await page.goto(origin+'/lessons/'+id+'/?mode=present',{waitUntil:'domcontentloaded'});
      expect(res?.status()).toBe(200);
      const dock=page.locator('#music-presentation-controls');
      await expect(dock).toBeVisible();
      await expect(page.locator('body')).toHaveClass(/music-presenting/);
      const bounds=await dock.boundingBox();
      expect(bounds).toBeTruthy();
      expect(bounds.x).toBeGreaterThanOrEqual(-1);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(391);
      const initial=await dock.locator('.mp-status').innerText();
      await page.keyboard.press('ArrowRight');
      await expect(dock.locator('.mp-status')).not.toHaveText(initial);
      await page.keyboard.press('ArrowLeft');
      await expect(dock.locator('.mp-status')).toHaveText(initial);
    });
  });
}
