import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures');
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// 1. Valid Google Takeout JSON
const takeoutJson = [
  {
    title: "Takeout Architecture Discussion",
    create_time: 1710000000,
    mapping: {
      "node-1": {
        id: "node-1",
        parent: null,
        message: {
          id: "msg-1",
          author: { role: "user" },
          create_time: 1710000000,
          content: { parts: ["We decided to migrate our caching layer to Redis cluster because memory limits on single instances were causing OOM errors in production."] }
        }
      },
      "node-2": {
        id: "node-2",
        parent: "node-1",
        message: {
          id: "msg-2",
          author: { role: "assistant" },
          create_time: 1710000010,
          content: { parts: ["Acknowledged. We ratified Redis Cluster with 3 shards and replication. Memcached was evaluated but rejected due to lack of persistence."] }
        }
      }
    }
  }
];
fs.writeFileSync(path.join(FIXTURES_DIR, '1_valid_takeout.json'), JSON.stringify(takeoutJson, null, 2));

// 2. Valid Gemini conversation JSON
const geminiJson = {
  conversations: [
    {
      id: "gemini-convo-101",
      title: "Gemini Storage Strategy",
      messages: [
        {
          id: "gmsg-1",
          role: "user",
          content: "Why did we decide against local disk storage for uploaded archives?",
          timestamp: 1710001000
        },
        {
          id: "gmsg-2",
          role: "model",
          content: "We rejected local disk storage because serverless Cloud Run instances are ephemeral. We selected Google Cloud Storage bucket with CMEK encryption for durability.",
          timestamp: 1710001015
        }
      ]
    }
  ]
};
fs.writeFileSync(path.join(FIXTURES_DIR, '2_valid_gemini.json'), JSON.stringify(geminiJson, null, 2));

// 3. Valid Markdown transcript
const markdownContent = `# Chat: API Gateway Security Architecture
Date: 2026-03-15

User: We need to finalize the rate limiting configuration for the public API gateway.
Assistant: We agreed on a sliding window rate limiter of 100 requests per minute per IP using Redis. Token bucket was rejected due to burst concurrency spikes.
User: What was the fallback if Redis becomes unavailable?
Assistant: If Redis is unreachable, the gateway falls back to local in-memory token buckets with strict 20 req/min limits.
`;
fs.writeFileSync(path.join(FIXTURES_DIR, '3_valid_transcript.md'), markdownContent);

// 4. Malformed JSON
fs.writeFileSync(path.join(FIXTURES_DIR, '4_malformed.json'), '{"title": "Broken Json", "mapping": { "unfinished": ');

// 5. HTML document (common web error or export mistake)
fs.writeFileSync(path.join(FIXTURES_DIR, '5_html_document.html'), '<!DOCTYPE html><html><body><h1>403 Forbidden</h1><p>You do not have permission.</p></body></html>');

// 6. Unsupported format (.bin / executable / random binary)
fs.writeFileSync(path.join(FIXTURES_DIR, '6_unsupported.bin'), Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]));

// 7. ZIP containing supported files
const zipValid = new AdmZip();
zipValid.addFile('conversations.json', Buffer.from(JSON.stringify(takeoutJson, null, 2), 'utf8'));
zipValid.addFile('notes.md', Buffer.from(markdownContent, 'utf8'));
zipValid.writeZip(path.join(FIXTURES_DIR, '7_valid_archive.zip'));

// 8. Empty archive
const zipEmpty = new AdmZip();
zipEmpty.writeZip(path.join(FIXTURES_DIR, '8_empty_archive.zip'));

// 9. Archive containing malformed conversation
const zipMalformed = new AdmZip();
zipMalformed.addFile('corrupted.json', Buffer.from('{ broken json content', 'utf8'));
zipMalformed.writeZip(path.join(FIXTURES_DIR, '9_malformed_archive.zip'));

// 10. Large archive (simulating multi-file bundle)
const zipLarge = new AdmZip();
for (let i = 0; i < 20; i++) {
  zipLarge.addFile(`convo_${i}.json`, Buffer.from(JSON.stringify([{
    title: `Scalability Convo ${i}`,
    messages: [
      { role: "user", content: `Query ${i} regarding cluster scaling factor.` },
      { role: "assistant", content: `Response ${i}: autoscaling threshold set to 75% CPU utilization.` }
    ]
  }]), 'utf8'));
}
zipLarge.writeZip(path.join(FIXTURES_DIR, '10_large_archive.zip'));

// 11. Long conversation (many turns)
const longConvo = {
  conversations: [
    {
      id: "long-dialogue-001",
      title: "Extensive Database Migration Planning",
      messages: Array.from({ length: 60 }).map((_, idx) => ({
        id: `long-msg-${idx}`,
        role: idx % 2 === 0 ? "user" : "model",
        content: `Turn ${idx + 1}: Detailed step analysis for shard migration phase ${Math.floor(idx / 10)}. Ensuring zero downtime and monotonic replication stream checkpoints.`,
        timestamp: 1710000000 + idx * 60
      }))
    }
  ]
};
fs.writeFileSync(path.join(FIXTURES_DIR, '11_long_conversation.json'), JSON.stringify(longConvo, null, 2));

// 12. Duplicate import (identical to #1)
fs.copyFileSync(path.join(FIXTURES_DIR, '1_valid_takeout.json'), path.join(FIXTURES_DIR, '12_duplicate_import.json'));

// 13. Interrupted import placeholder (metadata indicating interrupted job)
fs.writeFileSync(path.join(FIXTURES_DIR, '13_interrupted_state.json'), JSON.stringify({
  jobId: "job-interrupted-001",
  status: "processing",
  processedCount: 15,
  totalCount: 50,
  checkpointIndex: 15
}, null, 2));

// 14. Resumed import placeholder
fs.writeFileSync(path.join(FIXTURES_DIR, '14_resumed_state.json'), JSON.stringify({
  jobId: "job-interrupted-001",
  status: "completed",
  processedCount: 50,
  totalCount: 50,
  checkpointIndex: 50
}, null, 2));

console.log('All 14 representative fixtures created in tests/fixtures:');
fs.readdirSync(FIXTURES_DIR).forEach(f => console.log(' - ' + f));
