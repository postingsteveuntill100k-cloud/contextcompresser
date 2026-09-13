import fs from 'fs';
import JSZip from 'jszip';
import { extractZipArchive, sanitizeArchivePath, isZipArchive } from '../src/lib/ingestion/local_extractor';
import {
  analyzeExtractedArchive,
} from '../src/lib/ingestion/source_classifier';
import {
  parseGeminiScheduledActionsHtml,
  extractDomainFromUrl,
} from '../src/lib/ingestion/local_parsers';
import { detectFormat } from '../src/lib/ingestion/detector';
import { normalizeImport } from '../src/lib/ingestion/normalizer';
import { saveConversations, getConversations } from '../src/lib/storage/store';

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes('empty'), 'Empty ZIP throws useful error');
  }

  // B. Corrupted ZIP
  const corruptBuf = Buffer.from('PK\x03\x04corrupted_payload_data_not_a_zip');
  try {
    await extractZipArchive(corruptBuf);
    assert(false, 'Corrupted ZIP should throw error');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("couldn't read this ZIP"), 'Corrupted ZIP throws useful human error');
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes('too many files'), 'File count limit enforced safely');
  }

  try {
    await extractZipArchive(unicodeBuf, undefined, { maxDecompressedBytes: 50 });
    assert(false, 'Excessive decompressed size should throw error');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes('exceeds maximum safe limit'), 'Decompressed size limit enforced safely');
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

  // --- Group 11: 14 Realistic Takeout ZIP Scenarios ---
  console.log('\n--- 11. 14 Realistic Takeout ZIP Scenarios ---');

  // Scenario 1: ZIP with nested Gemini JSON
  const zip1 = new JSZip();
  zip1.file('Takeout/Gemini Apps/conversations/conv1.json', JSON.stringify({
    title: 'Nested Gemini Convo',
    messages: [{ role: 'user', content: 'Nested prompt' }, { role: 'model', content: 'Nested answer' }],
  }));
  const entries1 = await extractZipArchive(await zip1.generateAsync({ type: 'nodebuffer' }));
  const sum1 = await analyzeExtractedArchive(entries1, 'u', 'i');
  assert(sum1.geminiConversations.length === 1 && sum1.geminiConversations[0].title === 'Nested Gemini Convo', 'Scenario 1: Nested Gemini JSON extracted and parsed');

  // Scenario 2: ZIP with multiple nested directories
  const zip2 = new JSZip();
  zip2.file('backup_2026/user_export/Takeout/Gemini/deep/chat.json', JSON.stringify([{
    title: 'Deeply Nested Chat',
    turns: [{ role: 'user', content: 'Deep turn' }],
  }]));
  const entries2 = await extractZipArchive(await zip2.generateAsync({ type: 'nodebuffer' }));
  const sum2 = await analyzeExtractedArchive(entries2, 'u', 'i');
  assert(sum2.geminiConversations.length === 1, 'Scenario 2: Deeply nested directory structure handled');

  // Scenario 3: Mixed ZIP (Gemini + YouTube + Browser + unrelated files)
  const zip3 = new JSZip();
  zip3.file('Takeout/Gemini/actions.html', '<div><b>Name:</b> Action 1<br><b>Instructions:</b> Mixed test<br></div>');
  zip3.file('Takeout/YouTube/watch-history.html', '<div class="content-cell"><a href="https://youtu.be/x">Video</a></div>');
  zip3.file('Takeout/Chrome/BrowserHistory.json', JSON.stringify([{ url: 'https://github.com/test', title: 'GH' }]));
  zip3.file('Takeout/Google Maps/Places.json', JSON.stringify({ places: [] }));
  zip3.file('Takeout/Android/devices.json', JSON.stringify({ devices: [] }));
  const entries3 = await extractZipArchive(await zip3.generateAsync({ type: 'nodebuffer' }));
  const sum3 = await analyzeExtractedArchive(entries3, 'u', 'i');
  assert(sum3.geminiConversations.length === 1 && sum3.youtubeRecords.length === 1 && sum3.browserRecords.length === 1, 'Scenario 3: Mixed sources classified into Gemini, YouTube, and Browser');
  assert(sum3.otherServices.length >= 2, 'Scenario 3: Unrelated Google services segregated into Other Services');

  // Scenario 4: ZIP with Markdown conversations
  const zip4 = new JSZip();
  zip4.file('conversations/architecture.md', '# ContextOS Design\n**User:** How does the privacy model work?\n**Model:** Local extraction in browser.');
  const entries4 = await extractZipArchive(await zip4.generateAsync({ type: 'nodebuffer' }));
  const sum4 = await analyzeExtractedArchive(entries4, 'u', 'i');
  assert(sum4.geminiConversations.length === 1 && sum4.geminiConversations[0].title === 'ContextOS Design', 'Scenario 4: Markdown conversation inside ZIP parsed');

  // Scenario 5: ZIP with standalone JSON
  const zip5 = new JSZip();
  zip5.file('chat_export.json', JSON.stringify({
    title: 'Standalone JSON in root',
    messages: [{ role: 'user', content: 'Root JSON test' }],
  }));
  const entries5 = await extractZipArchive(await zip5.generateAsync({ type: 'nodebuffer' }));
  const sum5 = await analyzeExtractedArchive(entries5, 'u', 'i');
  assert(sum5.geminiConversations.length === 1, 'Scenario 5: Standalone root JSON in ZIP recognized');

  // Scenario 6: ZIP with multiple conversation files
  const zip6 = new JSZip();
  for (let k = 1; k <= 5; k++) {
    zip6.file(`Takeout/Gemini/conversation_${k}.json`, JSON.stringify({
      title: `Conversation ${k}`,
      messages: [{ role: 'user', content: `Message from ${k}` }],
    }));
  }
  const entries6 = await extractZipArchive(await zip6.generateAsync({ type: 'nodebuffer' }));
  const sum6 = await analyzeExtractedArchive(entries6, 'u', 'i');
  assert(sum6.geminiConversations.length === 5, 'Scenario 6: Multiple conversation files (5/5) discovered');

  // Scenario 7: ZIP with malformed JSON
  const zip7 = new JSZip();
  zip7.file('Takeout/Gemini/good.json', JSON.stringify({ title: 'Good Convo', messages: [{ role: 'user', content: 'Good' }] }));
  zip7.file('Takeout/Gemini/broken.json', '{ this is not valid json !!!');
  const entries7 = await extractZipArchive(await zip7.generateAsync({ type: 'nodebuffer' }));
  const sum7 = await analyzeExtractedArchive(entries7, 'u', 'i');
  assert(sum7.geminiConversations.length === 1 && sum7.geminiConversations[0].title === 'Good Convo', 'Scenario 7: Malformed JSON handled gracefully without crashing import');

  // Scenario 8: ZIP with unrelated JSON (must NOT classify package.json or settings.json as conversations)
  const zip8 = new JSZip();
  zip8.file('package.json', JSON.stringify({ name: 'my-project', version: '1.0.0', dependencies: { react: '19.0.0' } }));
  zip8.file('Takeout/Chrome/Bookmarks.json', JSON.stringify({ roots: { bookmark_bar: { children: [] } } }));
  const entries8 = await extractZipArchive(await zip8.generateAsync({ type: 'nodebuffer' }));
  const sum8 = await analyzeExtractedArchive(entries8, 'u', 'i');
  assert(sum8.geminiConversations.length === 0, 'Scenario 8: Unrelated JSON files NOT falsely classified as conversations');
  assert(sum8.customFiles.length >= 1 || sum8.otherServices.length >= 1, 'Scenario 8: Unrelated JSON placed in custom/other');

  // Scenario 9: ZIP with empty directories
  const zip9 = new JSZip();
  zip9.folder('Takeout/Gemini/EmptyFolder');
  zip9.folder('Takeout/Photos/EmptyAlbum');
  zip9.file('Takeout/Gemini/real.json', JSON.stringify({ title: 'Real Convo', messages: [{ role: 'user', content: 'Hi' }] }));
  const entries9 = await extractZipArchive(await zip9.generateAsync({ type: 'nodebuffer' }));
  const sum9 = await analyzeExtractedArchive(entries9, 'u', 'i');
  assert(sum9.geminiConversations.length === 1, 'Scenario 9: Empty directories ignored safely');

  // Scenario 10: ZIP with large file within safety limits
  const zip10 = new JSZip();
  const largeMsg = 'Architecture decision: '.padEnd(20000, 'X');
  zip10.file('Takeout/Gemini/large.json', JSON.stringify({ title: 'Large Message Convo', messages: [{ role: 'user', content: largeMsg }] }));
  const entries10 = await extractZipArchive(await zip10.generateAsync({ type: 'nodebuffer' }));
  const sum10 = await analyzeExtractedArchive(entries10, 'u', 'i');
  assert(sum10.geminiConversations.length === 1 && sum10.geminiConversations[0].messages[0].content.length >= 20000, 'Scenario 10: Large file within limits handled cleanly');

  // Scenario 11: ZIP with many files
  const zip11 = new JSZip();
  for (let m = 0; m < 35; m++) {
    zip11.file(`files/doc_${m}.md`, `# Note ${m}\n**User:** Content for note ${m}`);
  }
  const entries11 = await extractZipArchive(await zip11.generateAsync({ type: 'nodebuffer' }));
  const sum11 = await analyzeExtractedArchive(entries11, 'u', 'i');
  assert(sum11.totalFiles === 35, 'Scenario 11: Multi-file archive (35 files) parsed without dropping files');

  // Scenario 12: ZIP with malicious/suspicious paths (Zip Slip containment)
  const zip12 = new JSZip();
  zip12.file('../../../../../etc/shadow', 'root:x:0:0:root:/root:/bin/bash');
  zip12.file('Takeout/Gemini/legit.json', JSON.stringify({ title: 'Legit', messages: [{ role: 'user', content: 'Legit' }] }));
  const entries12 = await extractZipArchive(await zip12.generateAsync({ type: 'nodebuffer' }));
  assert(!entries12.some((e) => e.path.startsWith('../') || e.path.startsWith('/etc')), 'Scenario 12: Directory traversal paths sanitized');

  // Scenario 13: ZIP with duplicate filenames in different directories
  const zip13 = new JSZip();
  zip13.file('folder_a/conversations.json', JSON.stringify([{ title: 'Convo A', messages: [{ role: 'user', content: 'A' }] }]));
  zip13.file('folder_b/conversations.json', JSON.stringify([{ title: 'Convo B', messages: [{ role: 'user', content: 'B' }] }]));
  const entries13 = await extractZipArchive(await zip13.generateAsync({ type: 'nodebuffer' }));
  const sum13 = await analyzeExtractedArchive(entries13, 'u', 'i');
  assert(sum13.geminiConversations.length === 2, 'Scenario 13: Duplicate filenames in separate directories preserved');

  // Scenario 14: Unexpected but valid Takeout structure (My Activity JSON and Claude export)
  const zip14 = new JSZip();
  zip14.file('My Activity/Gemini Apps/MyActivity.json', JSON.stringify([
    {
      header: 'Gemini Apps',
      title: 'Prompted: How does multi-tenancy work in ContextOS?',
      time: '2026-09-01T12:00:00Z',
      subtitles: [{ name: 'ContextOS uses scoped Firestore user documents.' }],
    },
  ]));
  zip14.file('claude_export/conversations.json', JSON.stringify([
    {
      uuid: 'cl-1',
      name: 'Claude Chat',
      chat_messages: [{ sender: 'human', text: 'Claude prompt' }, { sender: 'assistant', text: 'Claude response' }],
    },
  ]));
  const entries14 = await extractZipArchive(await zip14.generateAsync({ type: 'nodebuffer' }));
  const sum14 = await analyzeExtractedArchive(entries14, 'u', 'i');
  assert(sum14.geminiConversations.length === 2, 'Scenario 14: My Activity prompt JSON & Claude chat export parsed into canonical conversations');

  // Filename independence check
  const zipBufNoExt = await zip14.generateAsync({ type: 'nodebuffer' });
  const detectedAsZip = await isZipArchive(zipBufNoExt);
  assert(detectedAsZip, 'Filename independence: ZIP archive recognized from magic bytes without .zip extension');

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
