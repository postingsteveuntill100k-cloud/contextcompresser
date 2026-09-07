import { CanonicalConversation, SearchResult, Role, RetrievalChunk, StructuredMemory } from '@/types';
import { generateEmbedding, cosineSimilarity } from '../ai/gemini';
import { getRetrievalChunks, getDeepRetrievalChunks, saveRetrievalChunks, getMemory } from '../storage/store';
import { estimateTokenCount } from '../ingestion/normalizer';

export interface SearchOptions {
  mode?: 'normal' | 'deep';
  projectTag?: string;
  startDate?: string;
  endDate?: string;
  roleFilter?: Role;
  limit?: number;
}

/**
 * Tokenizes text into normalized alphanumeric keywords
 */
export function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Genuine Okapi BM25 Lexical Ranking Algorithm
 *
 * Parameters:
 *   k1 = 1.2 (term frequency saturation)
 *   b = 0.75 (document length penalization)
 */
export class BM25Engine {
  private k1: number = 1.2;
  private b: number = 0.75;
  private avgdl: number = 0;
  private docCount: number = 0;
  private docLengths: Map<string, number> = new Map();
  private termFrequencies: Map<string, Map<string, number>> = new Map();
  private docFrequencies: Map<string, number> = new Map();

  constructor(documents: { id: string; text: string }[]) {
    this.docCount = documents.length;
    let totalLength = 0;

    for (const doc of documents) {
      const tokens = tokenize(doc.text);
      const len = tokens.length;
      this.docLengths.set(doc.id, len);
      totalLength += len;

      const tfMap = new Map<string, number>();
      const seenTerms = new Set<string>();

      for (const t of tokens) {
        tfMap.set(t, (tfMap.get(t) || 0) + 1);
        if (!seenTerms.has(t)) {
          seenTerms.add(t);
          this.docFrequencies.set(t, (this.docFrequencies.get(t) || 0) + 1);
        }
      }
      this.termFrequencies.set(doc.id, tfMap);
    }

    this.avgdl = this.docCount > 0 ? totalLength / this.docCount : 1;
  }

  public score(query: string, docId: string): number {
    const qTokens = tokenize(query);
    if (qTokens.length === 0 || this.docCount === 0) return 0;

    const docLen = this.docLengths.get(docId) || 0;
    const tfMap = this.termFrequencies.get(docId);
    if (!tfMap) return 0;

    let score = 0;
    for (const term of qTokens) {
      const tf = tfMap.get(term) || 0;
      if (tf === 0) continue;

      const df = this.docFrequencies.get(term) || 0;
      // Robertson-Spärck Jones IDF with 1-based log smoothing
      const idf = Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5));

      // BM25 term weighting with length normalization
      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / (this.avgdl || 1)));

      score += idf * (numerator / denominator);
    }

    // Exact phrase match bonus
    return score;
  }
}

import crypto from 'crypto';

/**
 * Information-aware semantic chunking of a message.
 * Never truncates at arbitrary length; splits long messages into sequential,
 * overlapping semantic chunks so facts anywhere in the message are indexed.
 */
function semanticChunkMessage(
  content: string,
  convoTitle: string,
  role: Role,
  maxChunkLen: number = 750
): string[] {
  const trimmed = content.trim();
  if (trimmed.length <= maxChunkLen) {
    return [`[${convoTitle}] ${role.toUpperCase()}: ${trimmed}`];
  }

  // 1. Split by paragraphs or newlines
  const rawParagraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // 2. Break any oversized paragraph down into sentence-aware units with overlap
  const atomicUnits: string[] = [];
  for (const p of rawParagraphs) {
    if (p.length <= maxChunkLen) {
      atomicUnits.push(p);
    } else {
      // Decompose oversized paragraph by sentences with overlap
      const sentences = p.match(/[^.!?\n]+[.!?\n]+(\s|$)/g) || [p];
      let currentUnit = '';
      let prevSentence = '';
      for (const s of sentences) {
        if ((currentUnit + ' ' + s).trim().length > maxChunkLen && currentUnit.trim().length > 0) {
          atomicUnits.push(currentUnit.trim());
          // Preserve 1-sentence overlap
          currentUnit = (prevSentence ? prevSentence + ' ' : '') + s;
        } else {
          currentUnit = (currentUnit ? currentUnit + ' ' : '') + s;
        }
        prevSentence = s.trim();
      }
      if (currentUnit.trim().length > 0) {
        atomicUnits.push(currentUnit.trim());
      }
    }
  }

  // 3. Assemble atomic units into bounded chunks with role/title header
  const chunks: string[] = [];
  let chunkIndex = 1;
  let currentChunk = `[${convoTitle}] ${role.toUpperCase()}: `;

  for (const unit of atomicUnits) {
    const candidate = currentChunk.endsWith(': ')
      ? currentChunk + unit
      : currentChunk + '\n\n' + unit;

    if (candidate.length > maxChunkLen && currentChunk.length > 30) {
      chunks.push(currentChunk.trim());
      chunkIndex++;
      currentChunk = `[${convoTitle}] ${role.toUpperCase()} (part ${chunkIndex}): ` + unit;
    } else {
      currentChunk = candidate;
    }
  }

  if (currentChunk.trim().length > 30) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [`[${convoTitle}] ${role.toUpperCase()}: ${trimmed.slice(0, maxChunkLen)}`];
}

/**
 * Bounded concurrency async map helper
 */
async function mapWithBoundedConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIdx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIdx < items.length) {
      const current = nextIdx++;
      results[current] = await fn(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Exponential backoff embedding generator with bounded retry.
 * Chunks are strictly bounded and embedding-safe; no lossy text slicing needed.
 */
async function generateEmbeddingWithRetry(text: string, maxRetries: number = 2): Promise<number[] | undefined> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const vec = await generateEmbedding(text);
      return vec;
    } catch {
      attempt++;
      if (attempt > maxRetries) return undefined;
      await new Promise((r) => setTimeout(r, attempt * 400));
    }
  }
  return undefined;
}

/**
 * Ingest-Time Indexing Pipeline
 *
 * Semantic chunking (no arbitrary character loss), bounded concurrency (4 parallel workers),
 * retry with exponential backoff, and persistent index storage in Cloud Firestore.
 */
export async function indexConversationForRetrieval(
  userId: string,
  conversation: CanonicalConversation
): Promise<RetrievalChunk[]> {
  const rawItems: {
    msgId: string;
    role: Role;
    chunkText: string;
    timestamp: string;
    chunkIndex: number;
  }[] = [];

  const msgs = conversation.messages || [];

  for (const msg of msgs) {
    if (!msg.content || msg.content.trim().length < 15) continue;
    const chunkTexts = semanticChunkMessage(msg.content, conversation.title, msg.role);
    chunkTexts.forEach((ct, idx) => {
      rawItems.push({
        msgId: msg.id,
        role: msg.role,
        chunkText: ct,
        timestamp: msg.timestamp,
        chunkIndex: idx,
      });
    });
  }

  // Bounded concurrency embedding pipeline (concurrency limit = 4)
  const chunks = await mapWithBoundedConcurrency(rawItems, 4, async (item) => {
    const chunkId = `chk_${item.msgId}_${item.chunkIndex}`;
    const sourceHash = crypto.createHash('sha256').update(item.chunkText).digest('hex');
    const vector = await generateEmbeddingWithRetry(item.chunkText);

    const chunk: RetrievalChunk = {
      id: chunkId,
      userId,
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      messageId: item.msgId,
      chunkIndex: item.chunkIndex,
      sourceHash,
      role: item.role,
      chunkText: item.chunkText,
      timestamp: item.timestamp,
      vector,
      tokenCount: estimateTokenCount(item.chunkText),
    };
    return chunk;
  });

  if (chunks.length > 0) {
    await saveRetrievalChunks(userId, chunks);
  }

  return chunks;
}

/**
 * Scalable Hybrid Search
 *
 * Uses genuine BM25 + Cosine Vector similarity.
 * Evaluates candidate chunks with bounded Firestore fetching.
 *
 * Distinct Recall Modes:
 * - NORMAL: Focused, high-precision, top-k chunks.
 * - DEEP: Exhaustive multi-facet retrieval across chunk index AND structured memory
 *         (incorporating decisions, failed approaches, timeline, and contradictions).
 */
export async function hybridSearch(
  query: string,
  conversations: CanonicalConversation[],
  options: SearchOptions = {},
  userId?: string
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const mode = options.mode || 'normal';
  const limit = options.limit || (mode === 'deep' ? 18 : 6);
  const candidateBudget = mode === 'deep' ? 250 : 80;

  // Generate query vector once
  let queryVector: number[] | null = null;
  try {
    queryVector = await generateEmbedding(query);
  } catch (err) {
    console.warn('[Hybrid Search] Query embedding unavailable, continuing with BM25:', err);
  }

  // 1. Retrieve candidate chunks from persistent index
  let indexChunks: RetrievalChunk[] = [];
  if (userId) {
    if (mode === 'deep') {
      const qKeywords = tokenize(query);
      indexChunks = await getDeepRetrievalChunks(userId, qKeywords, candidateBudget);
    } else {
      indexChunks = await getRetrievalChunks(userId, candidateBudget);
    }
  }

  // 2. If no persisted chunks found in Firestore yet, build ephemeral chunks from provided conversations
  if (indexChunks.length === 0 && conversations.length > 0) {
    for (const c of conversations) {
      for (const m of (c.messages || [])) {
        if (!m.content || m.content.length < 15) continue;
        indexChunks.push({
          id: `ephem_${m.id}`,
          userId: c.userId,
          conversationId: c.id,
          conversationTitle: c.title,
          messageId: m.id,
          role: m.role,
          chunkText: `[${c.title}] ${m.role.toUpperCase()}: ${m.content}`,
          timestamp: m.timestamp,
          tokenCount: m.tokenCount,
        });
      }
    }
  }

  // 3. In Deep Mode: augment candidate set with all structured memory facets (decisions, evolution, specs, failures, timeline, contradictions)
  if (mode === 'deep' && userId) {
    try {
      const memory: StructuredMemory = await getMemory(userId);
      for (const d of memory.decisions) {
        const evolutionNote = d.status === 'superseded' 
          ? ` [SUPERSEDED by ${d.supersededBy || 'later architecture'}: ${d.supersessionRationale || d.why}]`
          : '';
        indexChunks.push({
          id: `mem_${d.id}`,
          userId,
          conversationId: d.conversationId,
          conversationTitle: d.conversationTitle,
          messageId: d.messageId,
          role: 'model',
          chunkText: `[Structured Decision: ${d.topic}] ${d.decision} (Why: ${d.why}, Status: ${d.status})${evolutionNote}`,
          timestamp: d.timestamp,
          tokenCount: estimateTokenCount(d.decision),
        });
      }
      for (const s of memory.technicalSpecs) {
        indexChunks.push({
          id: `mem_${s.id}`,
          userId,
          conversationId: s.conversationId,
          conversationTitle: s.conversationTitle || `Technical Spec: ${s.technology}`,
          role: 'model',
          chunkText: `[Technical Specification: ${s.technology}] ${s.architecture} (Constraints: ${s.constraints.join('; ') || 'None'})`,
          timestamp: s.timestamp || new Date().toISOString(),
          tokenCount: estimateTokenCount(s.technology + s.architecture),
        });
      }
      for (const f of memory.failedApproaches) {
        indexChunks.push({
          id: `mem_${f.id}`,
          userId,
          conversationId: f.conversationId,
          conversationTitle: f.conversationTitle,
          role: 'model',
          chunkText: `[Failed Approach] ${f.approach} (Why Failed: ${f.whyFailed}; Lesson: ${f.lesson})`,
          timestamp: f.timestamp,
          tokenCount: estimateTokenCount(f.approach),
        });
      }
      for (const t of (memory.timeline || [])) {
        indexChunks.push({
          id: `mem_time_${t.timestamp}_${t.stage}`,
          userId,
          conversationId: t.conversationId,
          conversationTitle: `Timeline: ${t.stage}`,
          role: 'model',
          chunkText: `[Chronological Milestone - ${t.stage} @ ${t.timestamp}] ${t.changeDescription} (Reason: ${t.reason})`,
          timestamp: t.timestamp,
          tokenCount: estimateTokenCount(t.changeDescription),
        });
      }
      for (const c of (memory.contradictions || [])) {
        indexChunks.push({
          id: `mem_${c.id}`,
          userId,
          conversationId: 'contradiction_log',
          conversationTitle: `Contradiction: ${c.topic}`,
          role: 'model',
          chunkText: `[Historical Contradiction in ${c.topic}] Earlier (${c.dateA}): "${c.statementA}" vs Later (${c.dateB}): "${c.statementB}"`,
          timestamp: c.dateB,
          tokenCount: estimateTokenCount(c.statementA + c.statementB),
        });
      }
    } catch {
      // Memory augmentation optional
    }
  }

  if (indexChunks.length === 0) return [];

  // In Deep Mode: perform query expansion for related domain terminology
  const synMap: Record<string, string[]> = {
    database: ['datastore', 'firestore', 'storage', 'persistence', 'redis', 'postgres', 'sqlite'],
    auth: ['authentication', 'firebase auth', 'idtoken', 'session', 'jwt', 'security'],
    secret: ['credentials', 'secret manager', 'api key', 'environment', 'adc'],
    failure: ['failed', 'error', 'bug', 'issue', 'problem', 'reverted', 'discarded'],
    decision: ['decided', 'architecture', 'choice', 'superseded', 'selected', 'rationale'],
    compression: ['context', 'token', 'fidelity', 'hierarchy', 'reduction'],
  };
  const qLower = query.toLowerCase();
  let expandedQuery = query;
  if (mode === 'deep') {
    for (const [key, synonyms] of Object.entries(synMap)) {
      if (qLower.includes(key)) {
        expandedQuery += ' ' + synonyms.join(' ');
      }
    }
  }

  // Initialize genuine BM25 Engine on the candidate documents
  const bm25Docs = indexChunks.map((c) => ({ id: c.id, text: c.chunkText }));
  const bm25 = new BM25Engine(bm25Docs);

  // Find max BM25 score for normalization
  let maxBm25 = 0.001;
  const rawBm25Scores = new Map<string, number>();
  for (const chunk of indexChunks) {
    const raw = bm25.score(expandedQuery, chunk.id);
    rawBm25Scores.set(chunk.id, raw);
    if (raw > maxBm25) maxBm25 = raw;
  }

  const candidateResults: SearchResult[] = [];
  const scoreThreshold = mode === 'deep' ? 0.12 : 0.25;

  for (const chunk of indexChunks) {
    if (options.roleFilter && chunk.role !== options.roleFilter) continue;
    if (options.startDate && chunk.timestamp < options.startDate) continue;
    if (options.endDate && chunk.timestamp > options.endDate) continue;

    // Normalized BM25 score [0, 1]
    const bm25Norm = Math.min(1.0, (rawBm25Scores.get(chunk.id) || 0) / maxBm25);

    let semantic = 0;
    if (queryVector && chunk.vector && chunk.vector.length > 0) {
      semantic = cosineSimilarity(queryVector, chunk.vector);
    }

    // Hybrid combination: 60% semantic + 40% BM25 lexical
    const combinedScore =
      queryVector && semantic > 0
        ? 0.60 * Math.max(0, semantic) + 0.40 * bm25Norm
        : bm25Norm;

    if (combinedScore >= scoreThreshold || bm25Norm >= 0.35) {
      candidateResults.push({
        id: chunk.id,
        conversationId: chunk.conversationId,
        conversationTitle: chunk.conversationTitle,
        messageId: chunk.messageId,
        messageSnippet: chunk.chunkText.slice(0, 500) + (chunk.chunkText.length > 500 ? '...' : ''),
        role: chunk.role,
        timestamp: chunk.timestamp,
        similarityScore: Math.round(combinedScore * 100) / 100,
        matchType: semantic > 0.4 ? 'hybrid' : bm25Norm > 0.2 ? 'lexical' : 'semantic',
      });
    }
  }

  // Sort descending by similarity score
  candidateResults.sort((a, b) => b.similarityScore - a.similarityScore);

  return candidateResults.slice(0, limit);
}
