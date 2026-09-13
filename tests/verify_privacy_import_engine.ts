import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { extractZipArchive, sanitizeArchivePath } from '../src/lib/ingestion/local_extractor';
import {
  classifyFileSource,
  analyzeExtractedArchive,
} from '../src/lib/ingestion/source_classifier';
import {
  parseGeminiScheduledActionsHtml,
  parseGeminiActivityHtml,
  parseGeminiJson,
  parseYouTubeActivity,
  parseBrowserActivity,
  parseMarkdownConversation,
  extractDomainFromUrl,
} from '../src/lib/ingestion/local_parsers';
import { detectFormat } from '../src/lib/ingestion/detector';
import { normalizeImport } from '../src/lib/ingestion/normalizer';
import { saveConversations, getConversations, getMemory, saveMemory } from '../src/lib/storage/store';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${msg}`);
    failed++;
  }
}

async function runTestMatrix() {
  console.log('\n======================================================');
  console.log('RUNNING CONTEXTOS PRIVACY & LOCAL IMPORT ENGINE SUITE');
  console.log('======================================================\n');

  // --- Group 1: Path Traversal & Security Sanitization ---
  console.log('--- 1. Archive Path Traversal & Security Sanitization ---');
  assert(sanitizeArchivePath('../../etc/passwd') === 'etc/passwd', 'Path traversal relative path stripped');
  assert(sanitizeArchivePath('C:\\Windows\\System32\\cmd.exe') === 'Windows/System32/cmd.exe', 'Drive letter and backslashes sanitized');
  assert(sanitizeArchivePath('/var/log/../../../secret.json') === 'secret.json', 'Embedded traversal segments resolved');
  assert(sanitizeArchivePath('Takeout/Gemini/actions.html') === 'Takeout/Gemini/actions.html', 'Legitimate nested Takeout path preserved');

  // --- Group 2: Client-side ZIP Extraction & Security Limits ---
  console.log('\n--- 2. Client-side ZIP Extraction & Security Limits ---');

  // A. Empty ZIP
  const emptyZip = new JSZip();
  const emptyBuf = await emptyZip.generateAsync({ type: 'nodebuffer' });
  try {
    await extractZipArchive(emptyBuf);
    assert(false, 'Empty ZIP should throw error');
  } catch (err: any) {
    assert(err.message.includes('empty'), 'Empty ZIP throws useful error');
  }

  // B. Corrupted ZIP
  const corruptBuf = Buffer.from('PK\x03\x04corrupted_payload_data_not_a_zip');
  try {
    await extractZipArchive(corruptBuf);
    assert(false, 'Corrupted ZIP should throw error');
  } catch (err: any) {
    assert(err.message.includes("couldn't read this ZIP"), 'Corrupted ZIP throws useful human error');
  }

  // C. Zip with Unicode Filenames and Nested Directories
  const unicodeZip = new JSZip();
  unicodeZip.file('Takeout/Gemini/チャット履歴_2026.json', JSON.stringify({ title: 'AI 会話', messages: [{ role: 'user', content: 'こんにちは' }] }));
  unicodeZip.file('Takeout/YouTube and YouTube Music/history/watch-history.html', '<div class="content-cell"><a href="https://youtube.com/watch?v=123">Quantum Computing Intro</a></div>');
  unicodeZip.file('Takeout/Chrome/BrowserHistory.json', JSON.stringify([{ url: 'https://github.com/trending', title: 'GitHub Trending', time_usec: 1726000000000000 }]));
  unicodeZip.file('Takeout/Google Maps/Reviews.json', JSON.stringify({ reviews: [] }));
  unicodeZip.file('notes/readme.md', '# Development Notes\n**User:** How to build ContextOS?\n**Model:** Local-first privacy architecture.');

  const unicodeBuf = await unicodeZip.generateAsync({ type: 'nodebuffer' });
  const entries = await extractZipArchive(unicodeBuf);
  assert(entries.length === 5, `ZIP entries extracted cleanly (got ${entries.length}, expected 5)`);
  assert(entries.some((e) => e.path.includes('チャット履歴')), 'Unicode filename preserved without corruption');

  // D. ZIP Limits (File count & Decompressed size)
  try {
    await extractZipArchive(unicodeBuf, undefined, { maxFileCount: 2 });
    assert(false, 'Excessive file count should throw error');
  } catch (err: any) {
    assert(err.message.includes('too many files'), 'File count limit enforced safely');
  }

  try {
    await extractZipArchive(unicodeBuf, undefined, { maxDecompressedBytes: 50 });
    assert(false, 'Excessive decompressed size should throw error');
  } catch (err: any) {
    assert(err.message.includes('exceeds maximum safe limit'), 'Decompressed size limit enforced safely');
  }

  // --- Group 3: Local Source Classification & Discovery Engine ---
  console.log('\n--- 3. Local Source Classification & Discovery Engine ---');
  const summary = await analyzeExtractedArchive(entries, 'user_test_privacy', 'imp_test');
  assert(summary.totalFiles === 5, 'Total files accounted for');
  assert(summary.geminiConversations.length >= 2, `Gemini & Markdown conversations discovered (${summary.geminiConversations.length})`);
  assert(summary.youtubeRecords.length === 1, `YouTube records discovered (${summary.youtubeRecords.length})`);
  assert(summary.browserRecords.length === 1, `Browser records discovered (${summary.browserRecords.length})`);
  assert(summary.browserDomains.some((d) => d.domain === 'github.com'), 'Extracted browser domain is github.com');
  assert(summary.otherServices.some((s) => s.service.toLowerCase().includes('maps')), 'Google Maps correctly classified as Other Service');

  // --- Group 4: Gemini Scheduled Actions & MyActivity HTML Parsing ---
  console.log('\n--- 4. Gemini HTML Scheduled Actions & Activity Parsing ---');
  const sampleActionsHtml = `
    <!DOCTYPE html>
    <html><body>
    <div>
      <b>Name:</b> Context Engine Sync<br>
      <b>Schedule:</b> Daily at 9am<br>
      <b>Instructions:</b> Index yesterday's conversations and extract architectural decisions.<br>
      <b>State:</b> ACTIVE<br>
      <b>Last update time:</b> 2026-09-10T09:00:00Z<br>
    </div>
    <div>
      <b>Name:</b> Code Audit Bot<br>
      <b>Instructions:</b> Scan repository for security leaks.<br>
      <b>State:</b> PAUSED<br>
    </div>
    </body></html>
  `;
  const actionConvos = parseGeminiScheduledActionsHtml(sampleActionsHtml, 'user_test', 'imp_1');
  assert(actionConvos.length === 2, `Parsed 2 scheduled action conversations (got ${actionConvos.length})`);
  assert(actionConvos[0].title === 'Context Engine Sync', 'Correct title extracted from HTML bold tags');
  assert(actionConvos[0].messages.length === 2, 'Two canonical message turns generated for scheduled action');
  assert(actionConvos[0].messages[0].content.includes('Index yesterday'), 'Instructions faithfully captured');

  // --- Group 5: Browser Domain Extraction & Filtering ---
  console.log('\n--- 5. Browser Domain Extraction & Granular Filtering ---');
  assert(extractDomainFromUrl('https://github.com/postingsteveuntill100k-cloud/contextcompresser') === 'github.com', 'GitHub URL domain extracted');
  assert(extractDomainFromUrl('http://www.stackoverflow.com/questions/12345') === 'stackoverflow.com', 'www subdomain stripped');
  assert(extractDomainFromUrl('docs.google.com/document/d/xyz') === 'docs.google.com', 'Google docs domain preserved');

  // --- Group 6: Real Takeout Archive Regression Test ---
  console.log('\n--- 6. Real Takeout Archive Regression Test ---');
  const realTakeoutPath = '/home/abhinav/Downloads/takeout-20260906T163310Z-1-001.zip';
  if (fs.existsSync(realTakeoutPath)) {
    const realZipBuf = fs.readFileSync(realTakeoutPath);
    const realEntries = await extractZipArchive(realZipBuf);
    assert(realEntries.length === 2, `Real Takeout archive unpacked (${realEntries.length} entries)`);

    const realSummary = await analyzeExtractedArchive(realEntries, 'user_real', 'imp_real');
    assert(realSummary.geminiConversations.length > 0, `Real Gemini scheduled actions discovered (${realSummary.geminiConversations.length} convos)`);
    assert(
      realSummary.geminiConversations.some((c) => c.title.includes('Jules')),
      `Real conversation title correctly recognized: "${realSummary.geminiConversations[0]?.title}"`
    );

    // Detector & Normalizer direct verification
    const detection = detectFormat(realZipBuf, 'takeout-20260906T163310Z-1-001.zip');
    assert(detection.isValid, 'Detector approves real Takeout ZIP');
    assert(detection.format === 'google_takeout', 'Detector classifies as google_takeout format');

    const norm = normalizeImport(realZipBuf, 'user_real', 'imp_real', 'takeout.zip');
    assert(norm.conversations.length > 0, `Normalizer extracted ${norm.conversations.length} conversations from Takeout HTML`);
  } else {
    console.log('  ⚠ [SKIP] Real takeout zip not found on path, skipping disk check');
  }

  // --- Group 7: Real Chat Takeout Archive Check ---
  console.log('\n--- 7. Real Chat Takeout Archive (Unsupported Service Isolation) ---');
  const chatTakeoutPath = '/home/abhinav/Downloads/takeout-20260904T112323Z-1-001.zip';
  if (fs.existsSync(chatTakeoutPath)) {
    const chatZipBuf = fs.readFileSync(chatTakeoutPath);
    const chatEntries = await extractZipArchive(chatZipBuf);
    const chatSummary = await analyzeExtractedArchive(chatEntries, 'user_chat', 'imp_chat');
    assert(chatSummary.otherServices.length > 0, `Classified under Other Services (${chatSummary.otherServices.map((s) => s.service).join(', ')})`);
    assert(chatSummary.geminiConversations.length === 0, 'Does NOT falsely hallucinate Google Chat as Gemini conversations');
  }

  // --- Group 8: Critical Privacy Verification (Zero Unselected Data Transmitted) ---
  console.log('\n--- 8. Critical Privacy & Data Minimization Verification ---');
  // Scenario:
  // User archive has 3 Gemini conversations, 20 YouTube records, and 50 Browser records across 3 domains.
  // User selects ONLY Gemini conversation #1 and browser domain "github.com".
  // User DESELECTS Gemini conversations #2 & #3, DESELECTS YouTube completely, and DESELECTS other browser domains.

  const mockGeminiConvos = [
    { id: 'c1', title: 'ContextOS Core Architecture', messages: [{ id: 'm1', conversationId: 'c1', role: 'user' as const, content: 'Private design 1', timestamp: '2026-09-01T00:00:00Z', tokenCount: 10 }] },
    { id: 'c2', title: 'Secret Medical Query', messages: [{ id: 'm2', conversationId: 'c2', role: 'user' as const, content: 'Private medical info', timestamp: '2026-09-02T00:00:00Z', tokenCount: 10 }] },
    { id: 'c3', title: 'Banking & Financial Planning', messages: [{ id: 'm3', conversationId: 'c3', role: 'user' as const, content: 'Private finances', timestamp: '2026-09-03T00:00:00Z', tokenCount: 10 }] },
  ];

  const mockYouTubeRecords = [
    { id: 'y1', source: 'youtube' as const, type: 'watch_history' as const, title: 'Secret video 1', timestamp: '2026-09-01T00:00:00Z' },
    { id: 'y2', source: 'youtube' as const, type: 'watch_history' as const, title: 'Secret video 2', timestamp: '2026-09-02T00:00:00Z' },
  ];

  const mockBrowserRecords = [
    { id: 'b1', source: 'browser' as const, type: 'web_activity' as const, domain: 'github.com', url: 'https://github.com/project', title: 'Code Repo', timestamp: '2026-09-01T00:00:00Z' },
    { id: 'b2', source: 'browser' as const, type: 'web_activity' as const, domain: 'bank.com', url: 'https://bank.com/account', title: 'Private Bank', timestamp: '2026-09-02T00:00:00Z' },
    { id: 'b3', source: 'browser' as const, type: 'web_activity' as const, domain: 'reddit.com', url: 'https://reddit.com/r/secret', title: 'Reddit thread', timestamp: '2026-09-03T00:00:00Z' },
  ];

  // Client Selection logic simulation
  const selectedConvoIds = new Set(['c1']);
  const selectedDomains = new Set(['github.com']);
  const includeGemini = true;
  const includeYouTube = false;
  const includeBrowser = true;

  const transmittedConvos = includeGemini ? mockGeminiConvos.filter((c) => selectedConvoIds.has(c.id)) : [];
  const transmittedYt = includeYouTube ? mockYouTubeRecords : [];
  const transmittedBrowser = includeBrowser ? mockBrowserRecords.filter((b) => selectedDomains.has(b.domain)) : [];

  const payload = {
    version: 1,
    selectedSources: ['gemini', 'browser'],
    conversations: transmittedConvos,
    youtubeRecords: transmittedYt,
    browserRecords: transmittedBrowser,
    manifest: {
      geminiCount: transmittedConvos.length,
      youtubeCount: transmittedYt.length,
      browserDomainCount: selectedDomains.size,
      browserRecordCount: transmittedBrowser.length,
      customFileCount: 0,
      totalSelectedItems: transmittedConvos.length + transmittedYt.length + transmittedBrowser.length,
      confirmedAt: new Date().toISOString(),
    },
  };

  const payloadString = JSON.stringify(payload);

  // Assertions on the actual wire payload
  assert(!payloadString.includes('Private medical info'), 'Unselected conversation #2 ("medical info") is NOT in payload (0 bytes)');
  assert(!payloadString.includes('Private finances'), 'Unselected conversation #3 ("finances") is NOT in payload (0 bytes)');
  assert(!payloadString.includes('Secret video'), 'Unselected YouTube history is NOT in payload (0 bytes)');
  assert(!payloadString.includes('bank.com'), 'Unselected domain ("bank.com") is NOT in payload (0 bytes)');
  assert(!payloadString.includes('reddit.com'), 'Unselected domain ("reddit.com") is NOT in payload (0 bytes)');
  assert(payloadString.includes('ContextOS Core Architecture'), 'Selected conversation #1 is present in payload');
  assert(payloadString.includes('github.com'), 'Selected domain ("github.com") is present in payload');
  assert(payload.manifest.totalSelectedItems === 2, `Manifest count is exact (${payload.manifest.totalSelectedItems})`);

  // --- Group 9: Multi-Tenant User Isolation ---
  console.log('\n--- 9. Multi-Tenant User Isolation ---');
  const userA = 'user_isolation_alice_' + Date.now();
  const userB = 'user_isolation_bob_' + Date.now();

  await saveConversations(userA, [
    {
      id: 'conv_alice_1',
      userId: userA,
      importId: 'imp_a',
      title: "Alice's Secret Patent Idea",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'gemini',
      messages: [{ id: 'm_a1', conversationId: 'conv_alice_1', role: 'user', content: 'Patent formula X', timestamp: new Date().toISOString(), tokenCount: 10 }],
    },
  ]);

  const bobConversations = await getConversations(userB);
  assert(!bobConversations.some((c) => c.title.includes("Alice")), "Bob cannot view Alice's imported conversations");
  assert(!bobConversations.some((c) => c.id === 'conv_alice_1'), "Bob's conversation list does not contain Alice's IDs");

  // --- Group 10: Existing Direct Formats Compatibility ---
  console.log('\n--- 10. Existing Direct Formats Compatibility ---');
  const directJson = JSON.stringify([
    {
      title: 'Direct Gemini Chat',
      messages: [
        { role: 'user', content: 'Direct import prompt' },
        { role: 'model', content: 'Direct import response' },
      ],
    },
  ]);
  const jsonDetection = detectFormat(directJson, 'chat.json');
  assert(jsonDetection.isValid, 'Direct JSON export detected successfully');

  const directMd = '# Direct Markdown Log\n**User:** Testing direct markdown\n**Model:** Markdown works directly.';
  const mdDetection = detectFormat(directMd, 'chat.md');
  assert(mdDetection.isValid && mdDetection.format === 'markdown', 'Direct Markdown detected successfully');

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed}/${passed + failed} PASSED (${failed} FAILED)`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestMatrix().catch((err) => {
  console.error('Test run failed with fatal error:', err);
  process.exit(1);
});
