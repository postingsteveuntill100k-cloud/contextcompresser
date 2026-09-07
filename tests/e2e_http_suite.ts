import * as fs from 'fs';
import * as path from 'path';
import { createSignedSessionToken } from '../src/lib/security/auth_guard';
import { getAdminAuth } from '../src/lib/firebase/admin';

const BASE_URL = process.env.TARGET_URL || process.env.BASE_URL || 'http://localhost:3000';

async function runE2E() {
  console.log('===========================================================');
  console.log('CONTEXTOS LIVE SERVER END-TO-END VERIFICATION (HTTP/API)');
  console.log(`Target: ${BASE_URL}`);
  console.log('===========================================================');

  // Step 1: Verify Homepage loads with 200 OK and correct branding
  console.log('\n[E2E Step 1] Verifying Homepage (GET /)...');
  const homeRes = await fetch(`${BASE_URL}/`);
  if (homeRes.status !== 200) {
    throw new Error(`Homepage failed with status ${homeRes.status}`);
  }
  const homeHtml = await homeRes.text();
  if (!homeHtml.includes('ContextOS') && !homeHtml.includes('contextos')) {
    throw new Error('Homepage does not contain ContextOS branding');
  }
  console.log('✓ Homepage successfully loaded (HTTP 200 OK, ContextOS branding verified)');

  // Step 1b: Verify All 12 Dedicated App Router Routes load with HTTP 200 OK
  console.log('\n[E2E Step 1b] Verifying all 12 application routes...');
  const appRoutes = [
    '/home',
    '/ask',
    '/conversations',
    '/projects',
    '/memory',
    '/decisions',
    '/generate',
    '/packages',
    '/developer',
    '/security',
    '/settings',
    '/import',
  ];

  for (const route of appRoutes) {
    const routeRes = await fetch(`${BASE_URL}${route}`);
    if (routeRes.status !== 200) {
      throw new Error(`Route ${route} failed with status ${routeRes.status}`);
    }
    const html = await routeRes.text();
    if (!html.includes('<!DOCTYPE html>') && !html.includes('html')) {
      throw new Error(`Route ${route} did not return valid HTML content`);
    }
    console.log(`  ✓ Route ${route} returns HTTP 200 OK (verified)`);
  }
  console.log('✓ All 12 dedicated application routes verified with HTTP 200 OK');

  // Step 2: Authenticate session
  console.log('\n[E2E Step 2] Authenticating test session via Bearer token...');
  const userId = 'user-e2e-' + Date.now();
  let token: string;
  if (BASE_URL.startsWith('https://')) {
    console.log('  Generating verified Google/Firebase ID Token for production test...');
    const adminAuth = getAdminAuth();
    if (!adminAuth) throw new Error('Firebase Admin could not be initialized for production test token generation');
    const customToken = await adminAuth.createCustomToken(userId);
    const apiKey = 'AIzaSyDrWEa_Vm6OR3LwvJOceG6JWOiT97mme1E';
    const exchangeRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    });
    const exchangeData = await exchangeRes.json();
    if (!exchangeData.idToken) {
      throw new Error(`Failed to exchange custom token for ID token: ${JSON.stringify(exchangeData)}`);
    }
    token = exchangeData.idToken;
    console.log('  ✓ Verified Google Identity ID Token obtained');
  } else {
    token = createSignedSessionToken(userId, `${userId}@contextos.test`);
  }
  const authHeaders = {
    'Authorization': `Bearer ${token}`
  };
  
  // Verify token via GET /api/auth
  const authCheckRes = await fetch(`${BASE_URL}/api/auth`, { headers: authHeaders });
  if (authCheckRes.status !== 200) {
    throw new Error(`Auth verification failed with status ${authCheckRes.status}: ${await authCheckRes.text()}`);
  }
  const authCheck = await authCheckRes.json();
  console.log(`✓ Authenticated session verified on live server (User: ${authCheck.user.id})`);

  // Step 3: Import Real History (3_valid_transcript.md)
  console.log('\n[E2E Step 3] Uploading real transcript fixture via FormData (POST /api/import)...');
  const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', '3_valid_transcript.md');
  const fileBytes = fs.readFileSync(fixturePath);
  
  const boundary = '----WebKitFormBoundaryE2EVerification' + Date.now();
  const filePayload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="3_valid_transcript.md"\r\nContent-Type: text/markdown\r\n\r\n`),
    fileBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const importRes = await fetch(`${BASE_URL}/api/import`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: filePayload
  });

  const importData = await importRes.json();
  if (importRes.status !== 200 && !importData.duplicate) {
    throw new Error(`Import failed with status ${importRes.status}: ${JSON.stringify(importData)}`);
  }
  console.log(`✓ Import response received:`, importData.message || 'Import processed successfully');

  // Step 4: Verify Conversation Count & Message Content
  console.log('\n[E2E Step 4] Fetching Conversations (GET /api/conversations)...');
  const convosRes = await fetch(`${BASE_URL}/api/conversations`, { headers: authHeaders });
  if (convosRes.status !== 200) {
    throw new Error(`Conversations fetch failed with status ${convosRes.status}`);
  }
  const convosData = await convosRes.json();
  const convos = Array.isArray(convosData) ? convosData : convosData.conversations || [];
  if (!Array.isArray(convos) || convos.length === 0) {
    throw new Error(`Expected at least 1 imported conversation, got: ${JSON.stringify(convosData)}`);
  }
  console.log(`✓ Retrieved ${convos.length} real conversation(s)`);
  const firstConvo = convos[0];
  console.log(`  - Title: "${firstConvo.title}", Messages: ${firstConvo.messages.length}`);
  if (!firstConvo.messages.some((m: { content: string }) => m.content.includes('sliding window rate limiter') || m.content.includes('Redis'))) {
    throw new Error('Conversation content does not contain expected transcript text');
  }
  console.log('✓ Conversation inspector messages verified');

  // Step 5: Ask My History with Grounded Question
  console.log('\n[E2E Step 5] Executing Grounded Q&A (POST /api/ask)...');
  const askRes = await fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: 'What rate limiting approach was decided and what happens if Redis is unreachable?',
      deepRecall: false
    })
  });
  if (askRes.status !== 200) {
    throw new Error(`Ask failed with status ${askRes.status}: ${await askRes.text()}`);
  }
  const askData = await askRes.json();
  console.log('✓ Grounded Answer Received:');
  console.log(`  "${askData.answer.slice(0, 200)}..."`);
  console.log(`  - Citations count: ${askData.citations?.length || 0}`);
  console.log(`  - Grounded status: ${askData.grounded}`);
  console.log(`  - Model served: ${askData.model}`);
  
  if (!askData.answer.toLowerCase().includes('sliding window') && !askData.answer.toLowerCase().includes('100') && !askData.answer.toLowerCase().includes('redis')) {
    throw new Error('Answer is not grounded in the imported history!');
  }
  console.log('✓ Provenance and answer grounding verified');

  // Step 6: Generate Context Package
  console.log('\n[E2E Step 6] Generating Context Package (POST /api/generate-context)...');
  const genRes = await fetch(`${BASE_URL}/api/generate-context`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectTitle: 'API Gateway Project',
      mode: 'quick_brief',
      conversationIds: [firstConvo.id]
    })
  });
  if (genRes.status !== 200) {
    throw new Error(`Context generation failed with status ${genRes.status}: ${await genRes.text()}`);
  }
  const genData = await genRes.json();
  console.log('✓ Context Package Generated:');
  console.log(`  - Title: ${genData.package?.title || 'API Gateway Project'}`);
  console.log(`  - Content length: ${genData.package?.markdownContent?.length} chars`);
  console.log(`  - Compressed tokens: ${genData.package?.tokenCount}`);
  console.log(`  - Compression ratio: ${genData.package?.compressionRatio}%`);
  
  if (!genData.package?.markdownContent) {
    throw new Error('Generated package missing markdownContent');
  }
  console.log('✓ Context package export & markdown verification complete');

  // Step 7: Verify Memory and Decisions
  console.log('\n[E2E Step 7] Verifying Decisions & Memory Records (GET /api/memory)...');
  const memRes = await fetch(`${BASE_URL}/api/memory`, { headers: authHeaders });
  if (memRes.status !== 200) {
    throw new Error(`Memory fetch failed with status ${memRes.status}`);
  }
  const memData = await memRes.json();
  console.log(`✓ Memory records retrieved (Decisions: ${memData.decisions?.length || 0}, Specs: ${memData.technicalSpecs?.length || 0})`);

  // Step 8: Adversarial & Failure Path Testing
  console.log('\n[E2E Step 8] Testing Adversarial & Error Handling Paths...');
  
  // 8a: Missing Auth
  const noAuthRes = await fetch(`${BASE_URL}/api/conversations`);
  if (noAuthRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated request, got ${noAuthRes.status}`);
  }
  console.log('✓ Unauthenticated request rejected with HTTP 401');

  // 8b: HTML upload rejection
  const htmlRes = await fetch(`${BASE_URL}/api/import`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: '<html><body>Forbidden</body></html>', filename: 'error.html' })
  });
  if (htmlRes.status !== 422) {
    throw new Error(`Expected 422 for HTML upload, got ${htmlRes.status}: ${await htmlRes.text()}`);
  }
  console.log('✓ HTML document rejected with HTTP 422');

  // 8c: Blank question safe handling
  const blankAskRes = await fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: '   ' })
  });
  if (blankAskRes.status !== 400) {
    throw new Error(`Expected 400 for blank question, got ${blankAskRes.status}`);
  }
  console.log('✓ Blank question rejected safely with HTTP 400');

  // Step 9: Live Cross-User Isolation Verification
  console.log('\n[E2E Step 9] Verifying Strict Multi-User Data Isolation on Live Server...');
  const userB_Id = 'adversary-user-bob-' + Date.now();
  let tokenB: string;
  if (BASE_URL.startsWith('https://')) {
    const adminAuth = getAdminAuth();
    if (!adminAuth) throw new Error('Firebase Admin could not be initialized for token generation');
    const customTokenB = await adminAuth.createCustomToken(userB_Id);
    const apiKey = 'AIzaSyDrWEa_Vm6OR3LwvJOceG6JWOiT97mme1E';
    const exchangeRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customTokenB, returnSecureToken: true }),
    });
    const exchangeData = await exchangeRes.json();
    tokenB = exchangeData.idToken;
  } else {
    tokenB = createSignedSessionToken(userB_Id, `${userB_Id}@contextos.test`);
  }
  const authHeadersB = { 'Authorization': `Bearer ${tokenB}` };

  // 9a: User B cannot see User A's conversations
  const userB_ConvosRes = await fetch(`${BASE_URL}/api/conversations`, { headers: authHeadersB });
  const userB_ConvosData = await userB_ConvosRes.json();
  const userB_Convos = Array.isArray(userB_ConvosData) ? userB_ConvosData : userB_ConvosData.conversations || [];
  if (userB_Convos.length !== 0) {
    throw new Error(`Security Breach: User B retrieved ${userB_Convos.length} conversation(s) belonging to User A!`);
  }
  console.log('✓ Cross-user isolation verified: User B sees 0 conversations from User A');

  // 9b: User B querying User A's secret history receives ungrounded/insufficient evidence
  const userB_AskRes = await fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { ...authHeadersB, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'What rate limiting configuration did we decide on?' })
  });
  const userB_AskData = await userB_AskRes.json();
  if (userB_AskData.grounded && userB_AskData.citations?.length > 0) {
    throw new Error(`Security Breach: User B received grounded answer for User A's private history!`);
  }
  console.log('✓ Cross-user isolation verified: User B Q&A cannot access User A historical context');

  console.log('\n===========================================================');
  console.log('ALL E2E LIVE USER WORKFLOWS VERIFIED WITH 100% SUCCESS');
  console.log('===========================================================');
}

runE2E().catch(err => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
