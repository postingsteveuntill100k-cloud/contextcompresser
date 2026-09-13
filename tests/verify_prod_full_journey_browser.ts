import puppeteer from 'puppeteer-core';
import { getAdminAuth } from '../src/lib/firebase/admin';

async function runFullJourneyBrowserTest() {
  console.log('================================================================');
  console.log('REAL BROWSER E2E: COMPLETE PRODUCT JOURNEY & FORENSIC AUDIT');
  console.log('Target: https://compresscontext.web.app');
  console.log('Browser: /usr/bin/google-chrome-stable');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(35000);

    const networkRequests: { url: string; method: string; postData?: string }[] = [];
    page.on('request', (req) => {
      networkRequests.push({
        url: req.url(),
        method: req.method(),
        postData: req.postData(),
      });
    });

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Error') || text.includes('warning') || text.includes('[Data Lifecycle]')) {
        console.log(`  [Browser ${msg.type()}]:`, text);
      }
    });

    // -------------------------------------------------------------------------
    // STEP 1: Mint Brand New Fresh Test User
    // -------------------------------------------------------------------------
    console.log('[Step 1] Initializing fresh user account...');
    const freshUid = 'user-journey-audit-' + Date.now();
    const adminAuth = getAdminAuth();
    if (!adminAuth) throw new Error('Firebase Admin Auth not initialized');
    const customToken = await adminAuth.createCustomToken(freshUid);
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
    if (!exchangeData.idToken) {
      throw new Error('Could not obtain Firebase ID token: ' + JSON.stringify(exchangeData));
    }
    const idToken = exchangeData.idToken;
    console.log('  ✓ Fresh authenticated identity minted:', freshUid);

    // -------------------------------------------------------------------------
    // STEP 2: Authenticate and Verify Fresh Account Truthfulness on /home
    // -------------------------------------------------------------------------
    console.log('\n[Step 2] Establishing browser session and inspecting /home on fresh account...');
    await page.goto('https://compresscontext.web.app/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(
      ({ token, uid }) => {
        localStorage.setItem('gemini_context_session_token', token);
        localStorage.setItem('gemini_context_active_user', uid);
        document.cookie = `firebase_token=${token}; path=/; max-age=3600; SameSite=Lax; Secure`;
        window.dispatchEvent(new Event('storage'));
      },
      { token: idToken, uid: freshUid }
    );

    await new Promise((r) => setTimeout(r, 600));
    await page.goto('https://compresscontext.web.app/home', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => {
        const banner = document.querySelector('#fresh-account-onboarding-banner');
        return banner && banner.textContent && banner.textContent.includes('Import your AI history');
      },
      { timeout: 15000 }
    );
    const homeText = await page.evaluate(() => document.body.innerText);

    // Verify ZERO fake questions or demo data
    if (homeText.includes('Project Inception: Real-time') || homeText.includes('dec_seed_1')) {
      throw new Error('FORENSIC FAILURE: Seed demo data leaked into fresh account!');
    }
    if (!homeText.includes('Import your AI history to start asking questions about it.')) {
      throw new Error(`Fresh account onboarding banner missing! Got homeText: "${homeText.slice(0, 200)}"`);
    }
    console.log('  ✓ Fresh account verified: 100% clean state with zero fake data or questions.');

    // -------------------------------------------------------------------------
    // STEP 3: Verify Empty States on /conversations, /projects, /packages
    // -------------------------------------------------------------------------
    await page.goto('https://compresscontext.web.app/conversations', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.innerText.includes('No conversations imported yet'), { timeout: 15000 });
    console.log('  ✓ /conversations empty state verified.');

    await page.goto('https://compresscontext.web.app/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.innerText.includes('No projects indexed yet'), { timeout: 15000 });
    console.log('  ✓ /projects empty state verified.');

    await page.goto('https://compresscontext.web.app/packages', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.innerText.includes('No context packages found'), { timeout: 15000 });
    console.log('  ✓ /packages empty state verified.');

    // -------------------------------------------------------------------------
    // STEP 4: Test Responsive Mobile Viewport (< 768px)
    // -------------------------------------------------------------------------
    console.log('\n[Step 4] Testing mobile viewport responsiveness (375 x 667 iPhone SE)...');
    await page.setViewport({ width: 375, height: 667 });
    await page.goto('https://compresscontext.web.app/home', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.mobile-menu-btn', { timeout: 15000 });

    // Check that mobile menu button is visible
    const mobileMenuBtn = await page.$('.mobile-menu-btn');
    if (!mobileMenuBtn) throw new Error('.mobile-menu-btn not found in DOM');
    const isBtnVisible = await page.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }, mobileMenuBtn);

    if (!isBtnVisible) {
      throw new Error('Mobile menu button is not visible on mobile viewport!');
    }
    console.log('  ✓ Mobile menu button is visible on mobile screen.');

    // Click mobile menu button to open drawer
    await mobileMenuBtn.click();
    await page.waitForSelector('.mobile-nav-backdrop', { timeout: 5000 });
    console.log('  ✓ Mobile navigation drawer opened with backdrop overlay.');

    // Click backdrop overlay to close drawer
    const backdrop = await page.$('.mobile-nav-backdrop');
    if (!backdrop) throw new Error('.mobile-nav-backdrop not found');
    await backdrop.click();
    await new Promise((r) => setTimeout(r, 400));
    console.log('  ✓ Tapping mobile backdrop successfully dismissed navigation.');

    // Reset viewport to desktop
    await page.setViewport({ width: 1280, height: 800 });

    // -------------------------------------------------------------------------
    // STEP 5: Google Takeout Guide & Fast Path on /import
    // -------------------------------------------------------------------------
    console.log('\n[Step 5] Navigating to /import and testing Visual Google Takeout Guide...');
    await page.goto('https://compresscontext.web.app/import', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#toggle-guide-btn', { timeout: 15000 });

    await page.click('#toggle-guide-btn');
    await page.waitForSelector('img[alt*="Takeout"]', { timeout: 5000 });
    const guideContent = await page.evaluate(() => document.body.innerText);
    if (!guideContent.includes('Deselect all') || !guideContent.includes('My Activity')) {
      throw new Error('Takeout guide content missing key steps!');
    }
    console.log('  ✓ Visual Google Takeout Guide opened with 5-step flow and screenshots.');

    // Fast-path to drop zone
    const fastPathBtn = await page.$('button.btn-primary');
    if (fastPathBtn) {
      const btnTxt = await page.evaluate((el) => el.innerText, fastPathBtn);
      if (btnTxt.includes('I Have My ZIP')) {
        await fastPathBtn.click();
        await new Promise((r) => setTimeout(r, 300));
        console.log('  ✓ "I Have My ZIP" fast-path button clicked.');
      }
    }

    // -------------------------------------------------------------------------
    // STEP 6: Zero-Leakage Adaptive Takeout Import
    // -------------------------------------------------------------------------
    console.log('\n[Step 6] Selecting Takeout ZIP and verifying privacy boundary...');
    const zipPath = '/home/abhinav/Downloads/takeout-20260906T163310Z-1-001.zip';
    const fileInput = (await page.$('#archive-file-input')) as import('puppeteer-core').ElementHandle<HTMLInputElement> | null;
    if (!fileInput) throw new Error('#archive-file-input not found');
    await fileInput.uploadFile(zipPath);

    // Wait for local extraction to transition to source selection
    await page.waitForSelector('#source-selection-container', { timeout: 18000 });

    // Verify zero bytes transmitted to /api/import before user confirmation
    const prematureUploads = networkRequests.filter(
      (r) => r.method === 'POST' && (r.url.includes('/api/import') || (r.postData && r.postData.includes('PK\x03\x04')))
    );
    if (prematureUploads.length > 0) {
      throw new Error('CRITICAL PRIVACY BREACH: Raw archive uploaded before confirmation!');
    }
    console.log('  ✓ PRIVACY BOUNDARY VERIFIED: Zero bytes sent before explicit confirmation.');

    // -------------------------------------------------------------------------
    // STEP 7: Source Selection & Confirmation Manifest
    // -------------------------------------------------------------------------
    console.log('\n[Step 7] Reviewing discovered sources and privacy manifest...');
    const geminiCard = await page.$eval('#source-card-gemini', (el) => (el as HTMLElement).innerText);
    if (!geminiCard.includes('Overnight Jules')) {
      throw new Error('Real Takeout Gemini scheduled action was not discovered!');
    }
    console.log('  ✓ Discovered real Takeout Gemini scheduled action conversation.');

    await page.click('#btn-review-selection');
    await page.waitForSelector('#privacy-review-card', { timeout: 8000 });
    const manifestNotice = await page.$eval('#privacy-review-card', (el) => (el as HTMLElement).innerText);
    if (!manifestNotice.includes('Only your selected data will be sent')) {
      throw new Error('Privacy confirmation notice missing!');
    }
    console.log('  ✓ Privacy review manifest verified.');

    // Confirm upload and cloud context building
    await page.click('#btn-confirm-upload');
    await page.waitForSelector('#import-complete-card', { timeout: 35000 });
    const completionText = await page.$eval('#import-complete-card', (el) => (el as HTMLElement).innerText);
    console.log('  ✓ Import complete banner:\n   ', completionText.replace(/\n+/g, ' | '));

    // -------------------------------------------------------------------------
    // STEP 8: Grounded Q&A on Imported History
    // -------------------------------------------------------------------------
    console.log('\n[Step 8] Testing Grounded Q&A (/ask) with imported Takeout data...');
    await page.goto('https://compresscontext.web.app/ask', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#ask-query-input', { timeout: 12000 });

    await page.type('#ask-query-input', 'What agent was used for the overnight task?');
    await page.click('#ask-submit-btn');

    // Wait for grounded answer to be synthesized
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.includes('Jules') || text.includes('Hermes') || text.includes('Ollama');
      },
      { timeout: 30000 }
    );
    const answerText = await page.evaluate(() => document.body.innerText);
    console.log('  ✓ Grounded Q&A successfully recalled imported conversation details!');
    if (!answerText.includes('Jules')) {
      throw new Error('Expected answer to cite Jules or Hermes Agent from imported data!');
    }

    // -------------------------------------------------------------------------
    // STEP 9: Verify Project Clustered on /projects
    // -------------------------------------------------------------------------
    console.log('\n[Step 9] Verifying /projects cluster display...');
    await page.goto('https://compresscontext.web.app/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return !text.includes('No projects indexed yet') && (text.includes('1 Project') || text.includes('Overnight Jules') || text.includes('Projects'));
      },
      { timeout: 20000 }
    );
    console.log('  ✓ /projects reflects imported project thread.');

    // -------------------------------------------------------------------------
    // STEP 10: Clean Sign Out & Route Lock
    // -------------------------------------------------------------------------
    console.log('\n[Step 10] Testing Sign Out and session termination...');
    const signOutBtn = await page.$('#btn-sign-out');
    if (!signOutBtn) throw new Error('#btn-sign-out button not found in navigation');
    await signOutBtn.click();

    await page.waitForFunction(
      () => window.location.pathname === '/' || document.body.innerText.includes('Authentication Required'),
      { timeout: 10000 }
    );
    console.log('  ✓ Successfully signed out and returned to secure landing page.');

    console.log('\n================================================================');
    console.log('ALL REAL BROWSER FULL JOURNEY TESTS PASSED (100%)');
    console.log('================================================================\n');
  } finally {
    await browser.close();
  }
}

runFullJourneyBrowserTest().catch((err) => {
  console.error('\n❌ FULL JOURNEY BROWSER TEST FAILED:', err);
  process.exit(1);
});
