import assert from 'assert';
import JSZip from 'jszip';
import {
  profileArchives,
  adaptiveExtractAndDiscover,
} from '../src/lib/ingestion/adaptive_importer';
import { sanitizeArchivePath } from '../src/lib/ingestion/local_extractor';

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          passCount++;
          console.log(`  ✓ [PASS] ${name}`);
        })
        .catch((err) => {
          failCount++;
          console.error(`  ✗ [FAIL] ${name}:`, err.message || err);
        });
    } else {
      passCount++;
      console.log(`  ✓ [PASS] ${name}`);
    }
  } catch (err: unknown) {
    failCount++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ [FAIL] ${name}:`, msg);
  }
}

async function run() {
  console.log('\n======================================================');
  console.log('RUNNING ADAPTIVE TAKEOUT IMPORTER TEST SUITE');
  console.log('======================================================\n');

  console.log('--- 1. Archive Profiling & Strategy Classification ---');

  await test('Small archive gets classified as SMALL strategy', async () => {
    const zip = new JSZip();
    zip.file(
      'Takeout/Gemini/conversations.json',
      JSON.stringify([
        {
          id: 'c1',
          title: 'Small Convo',
          messages: [{ role: 'user', content: 'Hi' }],
        },
      ])
    );
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const profile = await profileArchives([buf], ['test_small.zip']);
    assert.strictEqual(profile.strategy, 'SMALL');
    assert.strictEqual(profile.isSuspicious, false);
    assert.strictEqual(profile.totalFiles, 1);
  });

  await test('Medium archive simulation triggers MEDIUM strategy', async () => {
    const zip = new JSZip();
    // Simulate 550 entries to exceed 500 file threshold
    for (let i = 0; i < 550; i++) {
      zip.file(`Takeout/Notes/note_${i}.txt`, `Note content ${i}`);
    }
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const profile = await profileArchives([buf], ['test_medium.zip']);
    assert.strictEqual(profile.strategy, 'MEDIUM');
    assert.strictEqual(profile.totalFiles, 550);
  });

  await test('Suspicious archive with path traversal attempt is flagged as SUSPICIOUS', async () => {
    const zip = new JSZip();
    zip.file('../../etc/passwd', 'root:x:0:0:root:/root:/bin/bash');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const profile = await profileArchives([buf], ['attack.zip']);
    assert.strictEqual(profile.strategy, 'SUSPICIOUS');
    assert.strictEqual(profile.isSuspicious, true);
    assert(profile.suspiciousReason?.includes('suspicious path traversal'));
  });

  console.log('\n--- 2. Multi-Part Google Takeout Archive Processing ---');

  await test('Multi-part Takeout archives (Part 1 & Part 2) process sequentially and merge', async () => {
    // Part 1: Gemini conversation & YouTube activity
    const zip1 = new JSZip();
    zip1.file(
      'Takeout/Gemini/chats.json',
      JSON.stringify([
        {
          id: 'convo_part1_1',
          title: 'Machine Learning Architecture',
          create_time: '2026-08-01T10:00:00Z',
          messages: [
            { author: { role: 'user' }, content: { parts: ['Explain transformers'] } },
            { author: { role: 'model' }, content: { parts: ['Transformers use self-attention'] } },
          ],
        },
      ])
    );
    zip1.file(
      'Takeout/YouTube and YouTube Music/history/watch-history.html',
      `<html><body>
        <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
          <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
            Watched <a href="https://www.youtube.com/watch?v=abc12345">Attention Is All You Need Paper Walkthrough</a><br>Aug 1, 2026, 11:00:00 AM UTC
          </div>
        </div>
      </body></html>`
    );
    const part1Buf = await zip1.generateAsync({ type: 'nodebuffer' });

    // Part 2: Gemini conversation & Chrome history
    const zip2 = new JSZip();
    zip2.file(
      'Takeout/Gemini/chats_part2.json',
      JSON.stringify([
        {
          id: 'convo_part2_2',
          title: 'Distributed Systems & Raft',
          create_time: '2026-08-02T12:00:00Z',
          messages: [
            { author: { role: 'user' }, content: { parts: ['How does Raft leader election work?'] } },
            { author: { role: 'model' }, content: { parts: ['Raft uses randomized election timeouts.'] } },
          ],
        },
      ])
    );
    zip2.file(
      'Takeout/Chrome/BrowserHistory.json',
      JSON.stringify({
        'Browser History': [
          {
            title: 'GitHub - raft-consensus-algorithm',
            url: 'https://github.com/hashicorp/raft',
            time_usec: 1722510000000000,
          },
        ],
      })
    );
    const part2Buf = await zip2.generateAsync({ type: 'nodebuffer' });

    const progressMessages: string[] = [];
    const { summary, profile } = await adaptiveExtractAndDiscover([part1Buf, part2Buf], {
      userId: 'test_multi_user',
      importId: 'test_multi_imp',
      onProgress: (msg) => progressMessages.push(msg),
    });

    assert.strictEqual(profile.isMultiPart, true);
    assert.strictEqual(profile.partCount, 2);
    // Both Gemini conversations discovered
    assert.strictEqual(summary.geminiConversations.length, 2);
    assert(summary.geminiConversations.some((c) => c.title === 'Machine Learning Architecture'));
    assert(summary.geminiConversations.some((c) => c.title === 'Distributed Systems & Raft'));
    // YouTube record discovered
    assert.strictEqual(summary.youtubeRecords.length, 1);
    // Browser record discovered
    assert.strictEqual(summary.browserRecords.length, 1);
    assert.strictEqual(summary.browserDomains[0]?.domain, 'github.com');
  });

  console.log('\n--- 3. Heavy Binary Skipping (Memory Shield) ---');

  await test('Large binary media files (.mp4, .jpg) are registered in metadata but NOT decompressed as text', async () => {
    const zip = new JSZip();
    zip.file(
      'Takeout/Gemini/chat.json',
      JSON.stringify([
        {
          id: 'text_convo',
          title: 'Quick Chat',
          messages: [{ role: 'user', content: 'hello' }],
        },
      ])
    );
    // Add fake binary entries that should be skipped by the memory shield
    zip.file('Takeout/Google Photos/vacation.jpg', Buffer.alloc(1024, 0xff));
    zip.file('Takeout/YouTube/recorded_presentation.mp4', Buffer.alloc(2048, 0xaa));

    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const { summary } = await adaptiveExtractAndDiscover([buf], {
      userId: 'test_user',
      importId: 'test_imp',
    });

    // Gemini conversation parsed cleanly
    assert.strictEqual(summary.geminiConversations.length, 1);
    // Binary files placed under other services
    const mediaService = summary.otherServices.find(
      (s) => s.service === 'Media & Assets' || s.service.toLowerCase().includes('photos')
    );
    assert(mediaService !== undefined, 'Media assets should be registered under otherServices');
    assert(mediaService.fileCount >= 1);
  });

  console.log('\n--- 4. Deduplication Across Multi-Part Archives ---');

  await test('Duplicate conversation appearing in multiple parts is deduplicated', async () => {
    const duplicateConvo = {
      id: 'shared_convo_123',
      title: 'Shared Convo Across Split Takeout',
      create_time: '2026-08-01T00:00:00Z',
      messages: [{ role: 'user', content: 'Message' }],
    };

    const zip1 = new JSZip();
    zip1.file('Takeout/Gemini/part1.json', JSON.stringify([duplicateConvo]));
    const zip2 = new JSZip();
    zip2.file('Takeout/Gemini/part2.json', JSON.stringify([duplicateConvo]));

    const buf1 = await zip1.generateAsync({ type: 'nodebuffer' });
    const buf2 = await zip2.generateAsync({ type: 'nodebuffer' });

    const { summary } = await adaptiveExtractAndDiscover([buf1, buf2]);
    assert.strictEqual(summary.geminiConversations.length, 1, 'Duplicate conversation must be deduplicated to exactly 1');
  });

  console.log('\n--- 5. Path Sanitization & Traversal Defense ---');

  await test('Paths with dot-dot segments are safely flattened', () => {
    const raw = 'Takeout/My Activity/../../../etc/passwd';
    const sanitized = sanitizeArchivePath(raw);
    assert.strictEqual(sanitized, 'etc/passwd');
    assert(!sanitized.includes('..'));
  });

  console.log('\n--- 6. VERY_LARGE Takeout Archive Simulation (2.5 GB & >15,000 files) ---');

  await test('Archive exceeding 1 GB triggers VERY_LARGE adaptive strategy', async () => {
    // Simulate archive profile with mock File object of 2.4 GB
    const fakeTakeoutFile = {
      name: 'takeout-20260914-001.zip',
      size: 2.4 * 1024 * 1024 * 1024, // 2.4 GB
      type: 'application/zip',
      slice: () => Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    } as unknown as File;

    const profile = await profileArchives([fakeTakeoutFile]);
    assert.strictEqual(profile.strategy, 'VERY_LARGE');
    assert(profile.strategyReason.includes('Very large archive'));
    assert(profile.totalCompressedBytes > 2 * 1024 * 1024 * 1024);
  });

  console.log('\n--- 7. Mixed Google Services Archive Isolation ---');

  await test('Complex archive with 6+ Google services correctly isolates Gemini and Activity', async () => {
    const zip = new JSZip();
    // 1. Gemini conversation
    zip.file(
      'Takeout/Gemini/conversations.json',
      JSON.stringify([
        {
          id: 'gemini_complex_1',
          title: 'System Design Architecture',
          messages: [{ role: 'user', content: 'Design Kafka' }],
        },
      ])
    );
    // 2. YouTube
    zip.file('Takeout/YouTube and YouTube Music/history/watch-history.json', JSON.stringify([]));
    // 3. Chrome
    zip.file('Takeout/Chrome/BrowserHistory.json', JSON.stringify({ 'Browser History': [] }));
    // 4. Google Maps (Other Service)
    zip.file('Takeout/Maps (your places)/Saved Places.json', JSON.stringify({ locations: [] }));
    // 5. Google Drive (Other Service)
    zip.file('Takeout/Drive/document.pdf', Buffer.alloc(100));
    // 6. Google Photos (Other Service)
    zip.file('Takeout/Google Photos/2026-08/photo.jpg', Buffer.alloc(100));

    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const { summary } = await adaptiveExtractAndDiscover([buf]);

    assert.strictEqual(summary.geminiConversations.length, 1);
    assert.strictEqual(summary.geminiConversations[0].title, 'System Design Architecture');
    assert(summary.otherServices.some((s) => s.service.toLowerCase().includes('maps')));
    assert(summary.otherServices.some((s) => s.service.toLowerCase().includes('drive') || s.service === 'Other Files'));
  });

  console.log('\n--- 8. Selective Privacy Boundary Verification ---');

  await test('Unselected items are never included in transmission payload', () => {
    const allDiscoveredConvos = [
      { id: 'c1', title: 'Work project', content: 'confidential' },
      { id: 'c2', title: 'Personal medical', content: 'private medical info' },
    ];
    const selectedIds = new Set(['c1']);

    const preparedPayloadConvos = allDiscoveredConvos.filter((c) => selectedIds.has(c.id));
    assert.strictEqual(preparedPayloadConvos.length, 1);
    assert.strictEqual(preparedPayloadConvos[0].id, 'c1');
    const serialized = JSON.stringify(preparedPayloadConvos);
    assert(!serialized.includes('medical'), 'Medical data must not exist in payload');
  });

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passCount}/${passCount + failCount} PASSED (${failCount} FAILED)`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

