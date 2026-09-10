import React, { useState, useEffect, useCallback } from 'react';
import { AskResponse } from '@/types';
import { fetchWithAuth } from '@/lib/security/client_auth';
import {
  Search,
  ArrowUpRight,
  Loader2,
  Copy,
  Check,
  BookOpen,
  Quote,
  Sparkles,
} from 'lucide-react';

interface AskHistoryProps {
  initialQuery?: string;
  onGenerateFromTopic?: (topic: string) => void;
}

const SAMPLE_QUERIES = [
  'What database did I select, and why?',
  'What approaches failed during testing, and what was the lesson?',
  'What did I decide about authentication and user isolation?',
  'What are my unresolved architectural questions?',
];

export default function AskHistory({ initialQuery = '', onGenerateFromTopic }: AskHistoryProps) {
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('Finding relevant conversations...');
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState<'normal' | 'deep'>('deep');

  const executeQuery = useCallback(async (targetQuery?: string) => {
    const q = (targetQuery || query).trim();
    if (!q) return;

    setActiveQuery(q);
    setLoading(true);
    setLoadingStage('Finding relevant conversations...');
    setResponse(null);
    setSelectedSourceIndex(null);

    const t1 = setTimeout(() => setLoadingStage('Checking decisions and previous attempts...'), 1200);
    const t2 = setTimeout(() => setLoadingStage('Synthesizing grounded answer with Gemini...'), 2800);

    try {
      const res = await fetchWithAuth('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, mode: searchMode }),
      });
      if (res.ok) {
        const data: AskResponse = await res.json();
        setResponse(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setResponse({
          answer: `We couldn't finish that request. Your history is safe. Please try again. (${err.error || 'Request unsuccessful'})`,
          citations: [],
          mode: searchMode,
          grounded: false,
          model: 'error',
          executionMs: 0,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResponse({
        answer: `We couldn't finish that request. Your history is safe. Please try again. (${msg})`,
        citations: [],
        mode: searchMode,
        grounded: false,
        model: 'error',
        executionMs: 0,
      });
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
    }
  }, [query, searchMode]);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      const q = initialQuery.trim();
      const timer = setTimeout(() => {
        void executeQuery(q);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialQuery, executeQuery]);

  const handleCopyAnswer = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAnswerGrounded = response && response.citations && response.citations.length > 0;
  const isNotFound = response?.answer?.toLowerCase().includes('no relevant') ||
    response?.answer?.toLowerCase().includes('no record') ||
    response?.answer?.toLowerCase().includes('not found') ||
    response?.answer?.toLowerCase().includes('insufficient evidence');

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Search Header Ribbon */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="font-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
            <span>Vault Query</span>
            <span style={{ margin: '0 8px', color: 'var(--hairline)' }}>/</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Grounded Historical Recall</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Recall Mode:</span>
            <button
              onClick={() => setSearchMode('normal')}
              style={{
                padding: '3px 8px',
                fontSize: '11.5px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--hairline)',
                backgroundColor: searchMode === 'normal' ? 'var(--surface-container-high)' : 'transparent',
                color: searchMode === 'normal' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Normal
            </button>
            <button
              onClick={() => setSearchMode('deep')}
              style={{
                padding: '3px 8px',
                fontSize: '11.5px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--hairline)',
                backgroundColor: searchMode === 'deep' ? 'var(--surface-container-high)' : 'transparent',
                color: searchMode === 'deep' ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Deep Recall
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-xl)',
            padding: '10px 16px',
            gap: '12px',
            boxShadow: '0 6px 20px -2px rgba(0,0,0,0.3)',
          }}
        >
          <Search size={20} color="var(--primary-container)" style={{ flexShrink: 0 }} />
          <input
            id="ask-query-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeQuery()}
            placeholder="Ask anything about your past conversations, architecture choices, or code..."
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--on-surface)',
              fontSize: '15px',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <button
            id="ask-submit-btn"
            onClick={() => executeQuery()}
            disabled={loading || !query.trim()}
            className="btn-primary"
            style={{ padding: '6px 16px', fontSize: '13px' }}
          >
            {loading ? 'Searching...' : 'Ask History'}
          </button>
        </div>

        {/* Suggested Queries */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            marginTop: '4px',
          }}
        >
          {SAMPLE_QUERIES.map((sq) => (
            <button
              key={sq}
              className="prompt-chip"
              onClick={() => {
                setQuery(sq);
                executeQuery(sq);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--hairline)',
                color: 'var(--text-secondary)',
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              <ArrowUpRight size={13} color="var(--primary)" />
              <span>{sq}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Asymmetric 7-col / 5-col Workspace Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '36px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Grounded Answer & Synthesis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          
            {loading ? (
            <div
              className="panel-card"
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <Loader2 size={28} className="animate-spin" color="var(--primary)" />
              <p className="font-body-md" style={{ color: 'var(--on-surface)', margin: 0, fontWeight: 500 }}>
                {loadingStage}
              </p>
              <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Searching verified conversation index and architectural records...
              </p>
            </div>
          ) : response ? (
            <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '28px' }}>
              
              {/* Answer Header & Grounded Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--hairline)', paddingBottom: '16px' }}>
                <span className="font-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  Synthesized Answer
                </span>

                <span
                  style={{
                    fontSize: '11.5px',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isNotFound
                      ? '#2A211B'
                      : isAnswerGrounded
                      ? '#1B221E'
                      : 'var(--surface-container-high)',
                    color: isNotFound
                      ? 'var(--primary)'
                      : isAnswerGrounded
                      ? '#768A7E'
                      : 'var(--text-secondary)',
                    border: `1px solid ${isNotFound ? '#55433b' : isAnswerGrounded ? '#2C3530' : 'var(--hairline)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isNotFound ? 'var(--primary-container)' : isAnswerGrounded ? '#768A7E' : 'var(--text-muted)',
                    }}
                  />
                  <span>
                    {isNotFound
                      ? 'Insufficient Evidence'
                      : isAnswerGrounded
                      ? `Grounded (${response.citations.length} ${response.citations.length === 1 ? 'citation' : 'citations'})`
                      : 'Unverified'}
                  </span>
                </span>
              </div>

              {/* Active Query Headline */}
              <h2 className="font-headline-sm" style={{ color: 'var(--on-surface)', lineHeight: 1.3, margin: 0 }}>
                &ldquo;{activeQuery}&rdquo;
              </h2>

              {/* Real Answer Markdown/Text */}
              <div
                className="font-body-lg"
                style={{
                  color: 'var(--on-surface)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  fontSize: '15px',
                }}
              >
                {response.answer}
              </div>

              {/* Actions Ribbon */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '14px',
                  borderTop: '1px solid var(--hairline)',
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleCopyAnswer(response.answer)}
                    className="btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy Answer'}</span>
                  </button>

                  {onGenerateFromTopic && (
                    <button
                      onClick={() => onGenerateFromTopic(activeQuery)}
                      className="btn-secondary"
                      style={{ padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Sparkles size={14} color="var(--primary)" />
                      <span>Generate Context from Topic</span>
                    </button>
                  )}
                </div>

                <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>
                  Recall: {searchMode}
                </span>
              </div>

            </div>
          ) : (
            <div
              className="panel-card"
              style={{
                padding: '48px 32px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--surface-container-high)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                }}
              >
                <BookOpen size={22} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h3 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: 0 }}>
                  Search Your Historical AI Deliberations
                </h3>
                <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
                  ContextOS synthesizes answers strictly grounded in your imported conversations. Enter a question above or click a suggestion to start.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Real Provenance & Sources Drawer */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Historical Provenance
            </span>
            {response?.citations && (
              <span className="font-label-sm" style={{ color: 'var(--primary)' }}>
                {response.citations.length} Verified {response.citations.length === 1 ? 'Source' : 'Sources'}
              </span>
            )}
          </div>

          {response?.citations && response.citations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {response.citations.map((cite, idx) => (
                <div
                  key={cite.messageId || cite.conversationId || idx}
                  className="panel-card"
                  onClick={() => setSelectedSourceIndex(selectedSourceIndex === idx ? null : idx)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    borderColor: selectedSourceIndex === idx ? 'var(--primary)' : 'var(--hairline)',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Quote size={14} color="var(--primary)" />
                      <span className="font-title" style={{ fontSize: '13px', color: 'var(--on-surface)' }}>
                        {cite.conversationTitle || 'Verified Conversation'}
                      </span>
                    </div>
                    {cite.timestamp && (
                      <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>
                        {new Date(cite.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <p
                    className="font-body-sm"
                    style={{
                      color: 'var(--text-secondary)',
                      margin: 0,
                      lineHeight: 1.5,
                      fontStyle: 'italic',
                      backgroundColor: 'var(--surface-container-lowest)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '2px solid var(--primary-container)',
                    }}
                  >
                    &ldquo;{cite.snippet}&rdquo;
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>Role: {cite.role || 'historical turn'}</span>
                    <span>Click to {selectedSourceIndex === idx ? 'collapse' : 'inspect'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="panel-card"
              style={{
                padding: '24px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                color: 'var(--text-muted)',
              }}
            >
              <span className="font-label-md" style={{ color: 'var(--text-secondary)' }}>
                Zero-Hallucination Policy
              </span>
              <p className="font-body-sm" style={{ margin: 0, lineHeight: 1.5 }}>
                ContextOS answers only when there is factual historical evidence. Direct source quotes and conversation timestamps will appear here for verification.
              </p>
            </div>
          )}
        </aside>

      </div>

    </div>
  );
}
