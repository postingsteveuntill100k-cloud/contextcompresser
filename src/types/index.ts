export type Role = 'user' | 'model' | 'system';

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface RawImport {
  id: string;
  userId: string;
  filename: string;
  mimeType?: string;
  byteSize?: number;
  format: 'google_takeout' | 'gemini_export' | 'raw_json' | 'markdown' | 'zip_archive' | 'unknown';
  sha256: string;
  storagePath?: string; // Cloud Storage immutable original object path
  rawContent?: string;
  conversationCount: number;
  importedAt: string;
  status: 'pending' | 'processing' | 'normalized' | 'indexed' | 'completed' | 'failed';
  error?: string;
}

export interface ImportJob {
  id: string;
  userId: string;
  importId: string;
  filename: string;
  storagePath: string;
  status: 'pending' | 'processing' | 'partial_success' | 'completed' | 'failed';
  totalConversations: number;
  storedConversations: number;
  normalizedConversations: number;
  extractedMemories: number;
  indexedChunks: number;
  failedCount: number;
  retriedCount: number;
  progressPercentage: number;
  lastError?: string;
  failedConversations?: { conversationId: string; title: string; error: string }[];
  checkpointIndex: number;
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
}

export interface CanonicalMessage {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  timestamp: string;
  tokenCount: number;
  metadata?: Record<string, unknown>;
}

export interface CanonicalConversation {
  id: string;
  userId: string;
  importId: string;
  externalId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  messages: CanonicalMessage[];
  projectTag?: string;
  summary?: string;
  tokenCount?: number;
  tags?: string[];
  topics?: string[];
}

export interface ExtractedDecision {
  id: string;
  userId: string;
  topic: string;
  decision: string;
  why: string;
  rejectedAlternatives: string[];
  timestamp: string;
  conversationId: string;
  conversationTitle: string;
  messageId?: string;
  sourceFingerprint?: string;
  extractionVersion?: string;
  status: 'active' | 'superseded';
  supersededBy?: string;
  supersessionRationale?: string;
}

export interface ExtractedTechnicalSpec {
  id: string;
  userId: string;
  technology: string;
  architecture: string;
  constraints: string[];
  conversationId: string;
  conversationTitle?: string;
  messageId?: string;
  timestamp?: string;
  sourceFingerprint?: string;
  extractionVersion?: string;
}

export interface FailedApproach {
  id: string;
  userId: string;
  approach: string;
  whyFailed: string;
  lesson: string;
  timestamp: string;
  conversationId: string;
  conversationTitle: string;
  messageId?: string;
  sourceFingerprint?: string;
  extractionVersion?: string;
}

export interface UnresolvedIssue {
  id: string;
  userId: string;
  issue: string;
  context: string;
  urgency: 'low' | 'medium' | 'high';
  conversationId: string;
  messageId?: string;
  timestamp?: string;
  sourceFingerprint?: string;
  extractionVersion?: string;
}

export interface TimelineEvent {
  id?: string;
  userId?: string;
  timestamp: string;
  stage: string;
  changeDescription: string;
  reason: string;
  conversationId: string;
  messageId?: string;
  sourceFingerprint?: string;
  extractionVersion?: string;
}

export interface Contradiction {
  id: string;
  userId: string;
  topic: string;
  statementA: string;
  statementB: string;
  dateA: string;
  dateB: string;
  resolution?: string;
  conversationId?: string;
  messageIdA?: string;
  messageIdB?: string;
  sourceFingerprint?: string;
  extractionVersion?: string;
}

export interface StructuredMemory {
  decisions: ExtractedDecision[];
  technicalSpecs: ExtractedTechnicalSpec[];
  failedApproaches: FailedApproach[];
  unresolvedIssues: UnresolvedIssue[];
  timeline: TimelineEvent[];
  contradictions: Contradiction[];
}

export type ContextMode = 'quick' | 'full' | 'dev_handoff';

export interface ContextPackage {
  id: string;
  userId: string;
  projectTitle: string;
  mode: ContextMode;
  objective: string;
  currentState: string;
  architecture: string;
  decisions: string[];
  whyDecisionsWereMade: string[];
  technicalDetails: string[];
  constraints: string[];
  failedApproaches: string[];
  unresolvedProblems: string[];
  nextSteps: string[];
  relevantHistorySnippet: string;
  markdownContent: string;
  tokenCount: number;
  sourceTokenCount: number;
  processedTokenCount: number;
  modelInputTokenCount: number;
  compressionRatio: number;
  provenanceConversationIds: string[];
  createdAt: string;
}

export interface RetrievalChunk {
  id: string;
  userId: string;
  conversationId: string;
  conversationTitle: string;
  messageId?: string;
  chunkIndex?: number;
  sourceHash?: string;
  role: Role;
  chunkText: string;
  timestamp: string;
  vector?: number[];
  tokenCount: number;
}

export interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type';
  file?: string;
  line?: number;
  params?: string[];
  returnType?: string;
}

export interface DeveloperHandoff {
  id: string;
  userId: string;
  projectTitle: string;
  symbols: CodeSymbol[];
  dependencies: string[];
  architectureOverview: string;
  importantFiles: string[];
  handoffMarkdown: string;
  tokenCount: number;
  createdAt: string;
}

export interface SearchCitation {
  sourceId?: string;
  conversationId: string;
  conversationTitle: string;
  messageId?: string;
  snippet: string;
  role: Role;
  timestamp: string;
  relevanceScore?: number;
}

export interface SearchResult {
  id: string;
  conversationId: string;
  conversationTitle: string;
  messageId?: string;
  messageSnippet: string;
  role: Role;
  timestamp: string;
  similarityScore: number;
  matchType: 'semantic' | 'lexical' | 'hybrid';
}

export interface AskResponse {
  answer: string;
  citations: SearchCitation[];
  mode: 'normal' | 'deep';
  grounded: boolean;
  model: string;
  executionMs: number;
}
