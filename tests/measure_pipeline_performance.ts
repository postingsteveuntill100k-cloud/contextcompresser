// @ts-nocheck
import { getAdminAuth } from '../src/lib/firebase/admin';
import { getConversations, getMemory, saveContextPackage } from '../src/lib/storage/store';
import { hybridSearch } from '../src/lib/retrieval/hybrid';
import { askHistory } from '../src/lib/ai/qa';
import { generateContextPackage } from '../src/lib/ai/compressor';

async function measurePipeline() {
  console.log('================================================================');
  console.log('CONTEXTOS PIPELINE LATENCY & PERFORMANCE AUDIT');
  console.log('================================================================\n');

  const userId = 'user_perf_audit_benchmark';

  // 1. Auth Latency
  const tAuthStart = performance.now();
  const adminAuth = getAdminAuth();
  let authLatency = 0;
  if (adminAuth) {
    const customToken = await adminAuth.createCustomToken(userId);
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
    await adminAuth.verifyIdToken(exchangeData.idToken);
    authLatency = performance.now() - tAuthStart;
  }

  // 2. Parallel Firestore Retrieval Latency (conversations + memory concurrently)
  const tFsStart = performance.now();
  const [conversations, memory] = await Promise.all([
    getConversations(userId),
    getMemory(userId),
  ]);
  const firestoreLatency = performance.now() - tFsStart;

  // 3. Retrieval & Ranking Latency (Hybrid BM25 + Semantic Search)
  const query = 'What did I decide about authentication and database architecture?';
  const tRetStart = performance.now();
  const searchResults = await hybridSearch(query, conversations, { mode: 'deep', limit: 12 }, userId);
  const retrievalLatency = performance.now() - tRetStart;

  // 4. Grounded Ask / Gemini Synthesis Latency
  const tGeminiStart = performance.now();
  const askRes = await askHistory(query, conversations, memory, 'deep', userId);
  const geminiLatency = performance.now() - tGeminiStart;

  // 5. Context Compression & Packaging Latency
  const tCompStart = performance.now();
  const pkg = await generateContextPackage({
    userId,
    projectTitle: 'Authentication & Architecture Audit',
    conversations,
    decisions: memory.decisions,
    technicalSpecs: memory.technicalSpecs,
    failedApproaches: memory.failedApproaches,
    unresolvedIssues: memory.unresolvedIssues,
    mode: 'quick',
  });
  const compressionLatency = performance.now() - tCompStart;

  // 6. Persistence Latency
  const tPersistStart = performance.now();
  await saveContextPackage(userId, pkg);
  const persistenceLatency = performance.now() - tPersistStart;

  const totalRoundtripLatency = firestoreLatency + retrievalLatency + geminiLatency + persistenceLatency;

  console.log('STAGE-BY-STAGE MEASURED LATENCY:');
  console.log(`  1. Auth Token Exchange & Verification:  ${authLatency.toFixed(1)} ms`);
  console.log(`  2. Parallel Firestore Retrieval:         ${firestoreLatency.toFixed(1)} ms`);
  console.log(`  3. Hybrid Retrieval & BM25 Ranking:      ${retrievalLatency.toFixed(1)} ms`);
  console.log(`  4. Grounded Synthesis with Gemini:       ${geminiLatency.toFixed(1)} ms`);
  console.log(`  5. Context Compression & Packaging:      ${compressionLatency.toFixed(1)} ms`);
  console.log(`  6. Firestore Persistence:                ${persistenceLatency.toFixed(1)} ms`);
  console.log(`  -------------------------------------------------`);
  console.log(`  Total Core Pipeline Execution:          ${totalRoundtripLatency.toFixed(1)} ms`);
  console.log(`  Package Token Count:                    ${pkg.tokenCount} tokens`);
  console.log(`  Grounded Answer Model:                  ${askRes.model}`);
  console.log(`  Citations Retrieved:                    ${askRes.citations.length}`);
  console.log('\n================================================================');
  console.log('LATENCY AUDIT COMPLETE');
  console.log('================================================================');
}

measurePipeline().catch((err) => {
  console.error('Performance measurement error:', err);
  process.exit(1);
});
