const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const base = process.env.APP_BASE || 'http://localhost:3001';
    console.log('Opening', base + '/signin');
    await page.goto(base + '/signin', { waitUntil: 'networkidle' });
    // Fill form
    await page.fill('input[placeholder="Email"]', process.env.TEST_EMAIL || 'rms-test-user@example.com');
    await page.fill('input[placeholder="Password"]', process.env.TEST_PASSWORD || 'Password123!');
    await Promise.all([
      page.click('button:has-text("Sign In")'),
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(e => null)
    ]);
    const url = page.url();
    console.log('After submit, URL:', url);
    if (url.includes('/tenant') || url.includes('/landlord') || url.includes('/caretaker')) {
      console.log('SUCCESS: redirected to dashboard ->', url);
      // try to assert dashboard content exists
      const hasTitle = await page.$('.section-title, .auth-title, .dashboard');
      console.log('Found dashboard marker element?', !!hasTitle);
      await browser.close();
      process.exit(0);
    } else {
      console.error('NOT REDIRECTED to dashboard. Current URL:', url);
      const html = await page.content();
      console.error('Page HTML length:', html.length);
      await browser.close();
      process.exit(2);
    }
  } catch (err) {
    console.error('ERROR during headless sign-in:', err && err.message);
    try { await browser.close(); } catch {}
    process.exit(3);
  }
})();
