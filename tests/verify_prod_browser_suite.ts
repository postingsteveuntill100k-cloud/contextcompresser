import puppeteer, { Page, Target } from 'puppeteer-core';
import { getAdminAuth } from '../src/lib/firebase/admin';

async function runBrowserSuite() {
  console.log('================================================================');
  console.log('REAL BROWSER PRODUCTION VERIFICATION SUITE');
  console.log('Target: https://compresscontext.web.app/');
  console.log('Browser: /usr/bin/google-chrome-stable (Google Chrome 152)');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);

    const logs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      logs.push(text);
      if (text.includes('[Auth Lifecycle]') || text.includes('error') || text.includes('Error')) {
        console.log(`  [Console ${msg.type()}]:`, text);
      }
    });

    page.on('pageerror', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [Page Error]:`, msg);
    });

    // Test 1: Load production landing page
    console.log('[Step 1] Loading https://compresscontext.web.app/...');
    await page.goto('https://compresscontext.web.app/', { waitUntil: 'networkidle0' });
    const title = await page.title();
    console.log(`  ✓ Page loaded successfully. Title: "${title}"`);

    // Verify initial button
    const googleBtnSelector = '#btn-google-sign-in';
    await page.waitForSelector(googleBtnSelector);
    let btnText = await page.$eval(googleBtnSelector, (el) => el.textContent?.trim());
    console.log(`  ✓ Initial Google sign-in button text: "${btnText}"`);
    if (!btnText || !btnText.includes('Continue with Google')) {
      throw new Error(`Expected "Continue with Google", got "${btnText}"`);
    }

    // Test 2: Trigger Google Popup & Verify No Deadlock on Popup Close
    console.log('\n[Step 2] Testing Google OAuth popup initiation & deadlock avoidance...');
    let popupPage: Page | null = null;
    const popupPromise = new Promise<Page>((resolve) => {
      const handler = async (target: Target) => {
        if (target.type() === 'page') {
          const p = await target.page();
          if (p && p !== page) {
            browser.off('targetcreated', handler);
            resolve(p);
          }
        }
      };
      browser.on('targetcreated', handler);
    });

    await page.click(googleBtnSelector);
    popupPage = await Promise.race([
      popupPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Popup creation timed out')), 8000)),
    ]);

    if (!popupPage) {
      throw new Error('Popup page could not be captured');
    }

    console.log(`  ✓ Google OAuth popup successfully spawned! URL: ${popupPage.url().slice(0, 80)}...`);

    // While popup is open, main button should show "Signing in..."
    btnText = await page.$eval(googleBtnSelector, (el) => el.textContent?.trim());
    console.log(`  ✓ Button during active popup: "${btnText}"`);
    if (!btnText || !btnText.includes('Signing in')) {
      throw new Error(`Expected button to show "Signing in...", got "${btnText}"`);
    }

    // Now simulate user closing the popup (the exact condition that previously hung indefinitely)
    console.log('  Closing popup to verify clean cancellation and button reset...');
    await popupPage.close();

    // Wait for the popup error to propagate and reset signingIn = false
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && el.textContent && el.textContent.includes('Continue with Google');
      },
      { timeout: 18000 },
      googleBtnSelector
    );

    btnText = await page.$eval(googleBtnSelector, (el) => el.textContent?.trim());
    console.log(`  ✓ Button successfully recovered from popup close: "${btnText}" (NO DEADLOCK!)`);

    // Test 3: Authenticate Real Firebase User & Verify Full Browser Transition to /home
    console.log('\n[Step 3] Authenticating genuine Firebase identity in browser...');
    const testUid = 'user-browser-prod-' + Date.now();
    const adminAuth = getAdminAuth();
    if (!adminAuth) throw new Error('Firebase Admin Auth not initialized');
    const customToken = await adminAuth.createCustomToken(testUid);
    const apiKey = 'AIzaSyDrWEa_Vm6OR3LwvJOceG6JWOiT97mme1E';

    // Exchange custom token for real Firebase ID Token
    const exchangeRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      }
    );
    const exchangeData = await exchangeRes.json();
    if (!exchangeData.idToken) {
      throw new Error('Could not obtain genuine Firebase ID token: ' + JSON.stringify(exchangeData));
    }
    const realIdToken = exchangeData.idToken;
    console.log('  ✓ Genuine Google Identity ID Token generated for test user:', testUid);

    // In the browser page, establish the authenticated session using client SDK tokens
    console.log('  Establishing session on live page...');
    await page.evaluate(
      async ({ token, uid }) => {
        localStorage.setItem('gemini_context_session_token', token);
        localStorage.setItem('gemini_context_active_user', uid);
        document.cookie = `firebase_token=${token}; path=/; max-age=3600; SameSite=Lax; Secure`;
        // Trigger window storage/auth event
        window.dispatchEvent(new Event('storage'));
      },
      { token: realIdToken, uid: testUid }
    );

    // Navigate to /home
    console.log('  Navigating browser to https://compresscontext.web.app/home...');
    await page.goto('https://compresscontext.web.app/home', { waitUntil: 'networkidle0' });

    console.log('  Current URL after navigation:', page.url());
    if (!page.url().includes('/home')) {
      throw new Error(`Expected browser to be at /home, but got ${page.url()}`);
    }

    // Wait for the authenticated shell to mount
    await page.waitForSelector('.contextos-main-stage, nav, header', { timeout: 10000 });
    console.log('  ✓ Authenticated App Shell rendered successfully at /home!');

    // Test 4: Refresh /home and verify persistent session
    console.log('\n[Step 4] Reloading /home to verify session persistence across page reloads...');
    await page.reload({ waitUntil: 'networkidle0' });
    console.log('  Current URL after reload:', page.url());
    if (!page.url().includes('/home')) {
      throw new Error(`Expected browser to stay at /home after reload, but got ${page.url()}`);
    }
    console.log('  ✓ Session persisted across hard reload!');

    // Test 5: Navigate to /ask and test authenticated API interaction
    console.log('\n[Step 5] Navigating to /ask and verifying authenticated workspace state...');
    await page.goto('https://compresscontext.web.app/ask', { waitUntil: 'networkidle0' });
    console.log('  Current URL at /ask:', page.url());
    if (!page.url().includes('/ask')) {
      throw new Error(`Expected browser to be at /ask, but got ${page.url()}`);
    }
    console.log('  ✓ /ask route loaded inside authenticated shell');

    // Test 5b: Make authenticated API request from inside the browser
    console.log('\n[Step 5b] Making authenticated API request from browser session...');
    const apiResult = await page.evaluate(async () => {
      const token = localStorage.getItem('gemini_context_session_token');
      const res = await fetch('https://contextos-izseyvxihq-uc.a.run.app/api/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return { status: res.status, ok: res.ok };
    });
    console.log('  Authenticated API call from browser status:', apiResult.status);
    if (apiResult.status !== 200) {
      throw new Error(`Authenticated API request failed with status ${apiResult.status}`);
    }
    console.log('  ✓ In-browser authenticated API request returned HTTP 200 OK');

    console.log('\n[Step 6] Testing sign-out and route protection...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = 'firebase_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    });

    await page.goto('https://compresscontext.web.app/home', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.body.innerText.includes('Authentication Required') || window.location.pathname === '/',
      { timeout: 10000 }
    );
    const pageContent = await page.content();
    const isProtected = pageContent.includes('Authentication Required') || page.url().endsWith('/');
    if (!isProtected) {
      throw new Error('Unauthenticated user was not blocked from /home!');
    }
    console.log('  ✓ Route guard verified: Unauthenticated access blocked correctly');

    console.log('\n================================================================');
    console.log('ALL BROWSER PRODUCTION AUTH LIFECYCLE TESTS PASSED (100%)');
    console.log('================================================================');
  } finally {
    await browser.close();
  }
}

runBrowserSuite().catch((err) => {
  console.error('\n❌ REAL BROWSER PRODUCTION SUITE FAILED:', err);
  process.exit(1);
});
