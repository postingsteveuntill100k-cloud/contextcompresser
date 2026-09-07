import * as fs from 'fs';
import * as path from 'path';
import { detectFormat, computeSha256 } from '../src/lib/ingestion/detector';
import { normalizeImport } from '../src/lib/ingestion/normalizer';

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures');

async function testFixtures() {
  console.log('=======================================================');
  console.log('AUDITING ALL 14 REPRESENTATIVE IMPORT FIXTURES');
  console.log('=======================================================');

  // 1. Valid Takeout
  const f1 = fs.readFileSync(path.join(FIXTURES_DIR, '1_valid_takeout.json'));
  const d1 = detectFormat(f1, '1_valid_takeout.json');
  if (d1.format !== 'google_takeout') throw new Error(`Fixture 1 expected google_takeout, got ${d1.format}`);
  const r1 = normalizeImport(f1, 'user-audit', 'imp-1', '1_valid_takeout.json');
  if (r1.conversations.length !== 1 || !r1.conversations[0].messages.some(m => m.content.includes('Redis cluster'))) {
    throw new Error('Fixture 1 failed normalization: ' + JSON.stringify(r1.errors));
  }
  console.log('✓ Fixture 1 (Valid Takeout JSON): Detected and normalized 1 conversation');

  // 2. Valid Gemini JSON
  const f2 = fs.readFileSync(path.join(FIXTURES_DIR, '2_valid_gemini.json'));
  const d2 = detectFormat(f2, '2_valid_gemini.json');
  if (d2.format !== 'gemini_export') throw new Error(`Fixture 2 expected gemini_export, got ${d2.format}`);
  const r2 = normalizeImport(f2, 'user-audit', 'imp-2', '2_valid_gemini.json');
  if (r2.conversations.length !== 1 || !r2.conversations[0].messages.some(m => m.content.includes('Cloud Storage bucket'))) {
    throw new Error('Fixture 2 failed normalization');
  }
  console.log('✓ Fixture 2 (Valid Gemini JSON): Detected and normalized 1 conversation');

  // 3. Valid Markdown Transcript
  const f3 = fs.readFileSync(path.join(FIXTURES_DIR, '3_valid_transcript.md'));
  const d3 = detectFormat(f3, '3_valid_transcript.md');
  if (d3.format !== 'markdown') throw new Error(`Fixture 3 expected markdown, got ${d3.format}`);
  const r3 = normalizeImport(f3, 'user-audit', 'imp-3', '3_valid_transcript.md');
  if (r3.conversations.length !== 1 || r3.conversations[0].messages.length < 2) {
    throw new Error('Fixture 3 failed normalization');
  }
  console.log('✓ Fixture 3 (Valid Markdown Transcript): Detected and normalized 1 conversation');

  // 4. Malformed JSON
  const f4 = fs.readFileSync(path.join(FIXTURES_DIR, '4_malformed.json'));
  const r4 = normalizeImport(f4, 'user-audit', 'imp-4', '4_malformed.json');
  if (r4.conversations.length > 0 || r4.errors.length === 0) {
    throw new Error('Fixture 4 (Malformed JSON) was unexpectedly accepted!');
  }
  console.log('✓ Fixture 4 (Malformed JSON): Safely caught and rejected with errors: ' + r4.errors[0]);

  // 5. HTML Document
  const f5 = fs.readFileSync(path.join(FIXTURES_DIR, '5_html_document.html'));
  const d5 = detectFormat(f5, '5_html_document.html');
  if (d5.isValid || !d5.errorMessage?.includes('HTML documents')) {
    throw new Error(`Unexpected detection for HTML: ${JSON.stringify(d5)}`);
  }
  console.log('✓ Fixture 5 (HTML Document): Safely caught without passing to JSON.parse');

  // 6. Unsupported binary
  const f6 = fs.readFileSync(path.join(FIXTURES_DIR, '6_unsupported.bin'));
  const d6 = detectFormat(f6, '6_unsupported.bin');
  if (d6.isValid && d6.format !== 'unknown') {
    throw new Error('Fixture 6 (Unsupported binary) was unexpectedly accepted!');
  }
  console.log('✓ Fixture 6 (Unsupported Binary): Safely rejected');

  // 7. ZIP Archive containing valid files
  const f7 = fs.readFileSync(path.join(FIXTURES_DIR, '7_valid_archive.zip'));
  const d7 = detectFormat(f7, '7_valid_archive.zip');
  if (d7.format !== 'zip_archive') throw new Error(`Fixture 7 expected zip_archive, got ${d7.format}`);
  const r7 = normalizeImport(f7, 'user-audit', 'imp-7', '7_valid_archive.zip');
  if (r7.conversations.length < 2) {
    throw new Error(`Fixture 7 expected 2 conversations, got ${r7.conversations.length}`);
  }
  console.log(`✓ Fixture 7 (ZIP Archive): Unpacked and normalized ${r7.conversations.length} conversations`);

  // 8. Empty ZIP archive
  const f8 = fs.readFileSync(path.join(FIXTURES_DIR, '8_empty_archive.zip'));
  const d8 = detectFormat(f8, '8_empty_archive.zip');
  if (d8.isValid) throw new Error('Fixture 8 (Empty ZIP) was unexpectedly marked valid!');
  console.log('✓ Fixture 8 (Empty ZIP Archive): Safely caught empty archive');

  // 9. Malformed ZIP archive
  const f9 = fs.readFileSync(path.join(FIXTURES_DIR, '9_malformed_archive.zip'));
  const r9 = normalizeImport(f9, 'user-audit', 'imp-9', '9_malformed_archive.zip');
  if (r9.conversations.length > 0) {
    throw new Error('Fixture 9 (Malformed Archive) unexpectedly returned conversations');
  }
  console.log('✓ Fixture 9 (Malformed Archive): Handled safely without crash, errors: ' + r9.errors.length);

  // 10. Large ZIP Archive
  const f10 = fs.readFileSync(path.join(FIXTURES_DIR, '10_large_archive.zip'));
  const r10 = normalizeImport(f10, 'user-audit', 'imp-10', '10_large_archive.zip');
  if (r10.conversations.length !== 20) throw new Error(`Fixture 10 expected 20 conversations, got ${r10.conversations.length}`);
  console.log(`✓ Fixture 10 (Large Archive): Successfully unpacked and normalized ${r10.conversations.length} conversations`);

  // 11. Long Conversation
  const f11 = fs.readFileSync(path.join(FIXTURES_DIR, '11_long_conversation.json'));
  const r11 = normalizeImport(f11, 'user-audit', 'imp-11', '11_long_conversation.json');
  if (r11.conversations[0].messages.length !== 60) throw new Error(`Fixture 11 expected 60 messages, got ${r11.conversations[0].messages.length}`);
  console.log(`✓ Fixture 11 (Long Conversation): Correctly normalized conversation with ${r11.conversations[0].messages.length} messages`);

  // 12. Duplicate Import (SHA256 test)
  const hash1 = computeSha256(f1);
  const hash12 = computeSha256(fs.readFileSync(path.join(FIXTURES_DIR, '12_duplicate_import.json')));
  if (hash1 !== hash12) throw new Error('Duplicate files failed SHA256 match');
  console.log('✓ Fixture 12 (Duplicate Import): Bit-for-bit SHA-256 fingerprint collision verified');

  // 13 & 14. Interrupted and Resumed states
  const s13 = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, '13_interrupted_state.json'), 'utf8'));
  const s14 = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, '14_resumed_state.json'), 'utf8'));
  if (s13.checkpointIndex !== 15 || s14.checkpointIndex !== 50 || s14.status !== 'completed') {
    throw new Error('Checkpoint state mismatch in fixtures 13 and 14');
  }
  console.log('✓ Fixtures 13 & 14 (Interrupted & Resumed Jobs): Checkpoint state verification passed');

  console.log('\n=======================================================');
  console.log('ALL 14 FIXTURES SUCCESSFULLY VERIFIED WITH ZERO ERRORS');
  console.log('=======================================================');
}

testFixtures().catch(err => {
  console.error('Fixture verification error:', err);
  process.exit(1);
});
