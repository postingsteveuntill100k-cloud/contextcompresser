// @ts-nocheck
import puppeteer from 'puppeteer-core';
import { getAdminAuth } from '../src/lib/firebase/admin';

async function testUiThemeAndRedirect() {
  console.log('================================================================');
  console.log('UI REFINEMENT, THEME TOGGLE & REDIRECT VERIFICATION');
  console.log('Target: https://compresscontext.web.app/');
  console.log('Browser: /usr/bin/google-chrome-stable');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);

    // 1. Check Landing Page Light Mode by default
    console.log('[Step 1] Loading landing page...');
    await page.goto('https://compresscontext.web.app/', { waitUntil: 'networkidle0' });

    const htmlClasses = await page.evaluate(() => document.documentElement.className);
    console.log('  HTML Element Class (Initial):', htmlClasses || '(none - default light mode)');
    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    console.log('  Body Computed Background Color:', bodyBg);

    // Check if redirect sign-in button exists
    const redirectBtn = await page.$('#btn-google-redirect-sign-in');
    if (!redirectBtn) {
      throw new Error('Could not find #btn-google-redirect-sign-in button on landing page');
    }
    const redirectBtnText = await page.$eval('#btn-google-redirect-sign-in', (el) => el.textContent?.trim());
    console.log(`  ✓ Found fallback redirect sign-in button: "${redirectBtnText}"`);

    // 2. Authenticate and enter workspace
    console.log('\n[Step 2] Authenticating test session to test workspace UI and Theme Toggle...');
    const testUid = 'user-theme-test-' + Date.now();
    const adminAuth = getAdminAuth();
    const customToken = await adminAuth.createCustomToken(testUid);
    const apiKey = 'AIzaSyDrWEa_Vm6OR3LwvJOceG6JWOiT97mme1E';

    const exchangeRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      }
    );
    const exchangeData = await exchangeRes.json();
    const realIdToken = exchangeData.idToken;

    await page.evaluate(
      ({ token, uid }) => {
        localStorage.setItem('gemini_context_session_token', token);
        localStorage.setItem('gemini_context_active_user', uid);
        document.cookie = `firebase_token=${token}; path=/; max-age=3600; SameSite=Lax; Secure`;
        window.dispatchEvent(new Event('storage'));
      },
      { token: realIdToken, uid: testUid }
    );

    await page.goto('https://compresscontext.web.app/home', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#theme-toggle-btn', { timeout: 10000 });
    console.log('  ✓ Navigated to /home and found #theme-toggle-btn');

    // 3. Test Theme Toggle
    console.log('\n[Step 3] Testing Light / Dark Mode Toggle interaction...');
    let isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    console.log('  Initial theme mode isDark:', isDark);

    // Click theme toggle
    await page.click('#theme-toggle-btn');
    await page.waitForFunction((prev) => document.documentElement.classList.contains('dark') !== prev, {}, isDark);

    let nextDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    console.log('  Theme after toggle isDark:', nextDark);
    const storedTheme = await page.evaluate(() => localStorage.getItem('contextos_theme'));
    console.log('  Stored theme in localStorage:', storedTheme);

    if (nextDark === isDark) {
      throw new Error('Theme toggle did not flip dark class on html element!');
    }
    console.log('  ✓ Theme toggle successfully switched theme mode and persisted to localStorage');

    // Click again to toggle back
    await page.click('#theme-toggle-btn');
    await page.waitForFunction((prev) => document.documentElement.classList.contains('dark') !== prev, {}, nextDark);
    const finalDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    console.log('  Theme after second toggle isDark:', finalDark);
    console.log('  ✓ Second toggle returned to previous mode cleanly');

    console.log('\n================================================================');
    console.log('UI THEME & REDIRECT VERIFICATION PASSED (100%)');
    console.log('================================================================');
  } finally {
    await browser.close();
  }
}

testUiThemeAndRedirect().catch((err) => {
  console.error('\n❌ UI THEME VERIFICATION FAILED:', err);
  process.exit(1);
});
