const { chromium } = require('playwright');
(async () => {
  const token = process.env.TEST_TOKEN;
  const role = process.env.TEST_ROLE || 'tenant';
  if (!token) { console.error('TEST_TOKEN not set'); process.exit(2); }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const base = process.env.APP_BASE || 'http://localhost:3001';
  // Set auth in localStorage then navigate
  // Use addInitScript with an inlined, JSON-escaped token to avoid argument marshalling issues
  const safeToken = JSON.stringify(token);
  const safeRole = JSON.stringify(role);
  await page.addInitScript(`(() => { try { localStorage.setItem('token', ${safeToken}); localStorage.setItem('role', ${safeRole}); } catch(e) { /* ignore */ } })()`);
  // Use domcontentloaded to avoid long waits on HMR websocket during dev server loads
  await page.goto(base + '/' + role, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Opened', base + '/' + role);
    const has = await page.$('.section-title, .dashboard');
    console.log('Found dashboard marker?', !!has);
    await browser.close();
    process.exit(has ? 0 : 1);
  } catch (err) {
    console.error('ERROR', err && err.message);
    try { await browser.close(); } catch {}
    process.exit(3);
  }
})();
