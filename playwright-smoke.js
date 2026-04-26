const { chromium } = require('playwright');

(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('console-error: ' + msg.text());
  });

  await page.goto('http://127.0.0.1:8130/', { waitUntil: 'networkidle' });

  const before = await page.evaluate(() => ({
    overlayHidden: document.getElementById('menuOverlay').classList.contains('hidden'),
    playText: document.getElementById('playBtn')?.textContent,
    overlayPointer: getComputedStyle(document.getElementById('menuOverlay')).pointerEvents,
    playRect: document.getElementById('playBtn').getBoundingClientRect().toJSON(),
    elAtCenter: (() => {
      const r = document.getElementById('playBtn').getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
      return { tag: el?.tagName, id: el?.id, cls: el?.className, text: el?.textContent?.slice(0,40) };
    })(),
  }));

  await page.click('#playBtn');
  await page.waitForTimeout(500);

  const after = await page.evaluate(() => ({
    overlayHidden: document.getElementById('menuOverlay').classList.contains('hidden'),
    tip: document.getElementById('tipLine')?.textContent,
    status: document.getElementById('statusLine')?.textContent,
    leftScore: document.getElementById('leftScore')?.textContent,
    rightScore: document.getElementById('rightScore')?.textContent,
  }));

  console.log(JSON.stringify({ before, after, errors }, null, 2));
  await browser.close();
})();
