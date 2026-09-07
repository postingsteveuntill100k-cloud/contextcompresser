'use client';

import React, { useState } from 'react';
import { DeveloperHandoff, CodeSymbol } from '@/types';
import { fetchWithAuth } from '@/lib/security/client_auth';
import { Code2, Terminal, Copy, Check } from 'lucide-react';

interface DeveloperModeProps {
  currentUser: string;
}

const SAMPLE_DEV_CODE = `import { generateEmbedding, cosineSimilarity } from './embeddings';
import { CanonicalConversation, SearchResult } from '@/types';

export interface SearchOptions {
  mode: 'normal' | 'deep';
  limit?: number;
}

export class HybridRetrievalEngine {
  private cache: Map<string, number[]>;

  constructor() {
    this.cache = new Map();
  }

  public async executeHybridQuery(query: string, conversations: CanonicalConversation[]): Promise<SearchResult[]> {
    const queryVector = await generateEmbedding(query);
    // Combines BM25 and cosine similarity
    return [];
  }
}`;

export default function DeveloperMode({ currentUser }: DeveloperModeProps) {
  const [sourceCode, setSourceCode] = useState(SAMPLE_DEV_CODE);
  const [filename, setFilename] = useState('src/lib/retrieval/engine.ts');
  const [analyzing, setAnalyzing] = useState(false);
  const [handoff, setHandoff] = useState<DeveloperHandoff | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateHandoff = async () => {
    setAnalyzing(true);
    try {
      const res = await fetchWithAuth('/api/dev-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectTitle: 'Personal Gemini Context Engine',
          codeSnippets: [
            {
              filename,
              code: sourceCode,
            },
          ],
        }),
      });

      const data = await res.json();
      if (data.handoff) {
        setHandoff(data.handoff);
      }
    } catch (err) {
      console.error('Developer handoff generation failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="font-label-sm" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <span>Developer</span>
          <span style={{ margin: '0 8px', color: 'var(--hairline)' }}>/</span>
          <span style={{ color: 'var(--on-surface)' }}>AST &amp; Code Handoff Synthesis</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <h1 className="font-headline-lg" style={{ color: 'var(--on-surface)', margin: 0 }}>
            Developer Mode
          </h1>
          <span className="font-mono-xs" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--surface-container-high)', padding: '3px 8px', borderRadius: '4px' }}>
            Scoped Identity: {currentUser}
          </span>
        </div>
        <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Deterministic AST parses your code structure (symbols, functions, classes, imports), while Gemini synthesizes historical architectural decisions to generate a complete engineering handoff package.
        </p>
      </section>

      {/* Code Input & AST Analyzer Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(300px, 1fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* Code Editor */}
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code2 size={18} color="var(--primary)" />
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-container)',
                  border: '1px solid var(--hairline)',
                  color: 'var(--on-surface)',
                  fontSize: '12.5px',
                  fontFamily: 'var(--font-mono)',
                  width: '240px',
                }}
              />
            </div>
            <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>TypeScript AST Target</span>
          </div>

          <textarea
            id="dev-code-input"
            rows={14}
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              lineHeight: 1.5,
              backgroundColor: 'var(--surface-container-lowest)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--on-surface)',
              padding: '16px',
              resize: 'vertical',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              id="btn-generate-handoff"
              className="btn-primary"
              disabled={analyzing || !sourceCode.trim()}
              onClick={handleGenerateHandoff}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Terminal size={18} />
              <span>{analyzing ? 'Parsing AST & Synthesizing...' : 'Generate Developer Handoff'}</span>
            </button>
          </div>
        </div>

        {/* AST Symbols Discovered */}
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div>
            <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: 0 }}>
              Deterministic AST Structure
            </h3>
            <p className="font-body-sm" style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Extracted syntax tree symbols available for historical deliberation fusion:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
            {handoff && handoff.symbols.length > 0 ? (
              handoff.symbols.map((sym: CodeSymbol, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-container)',
                    border: '1px solid var(--hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--on-surface)' }}>
                    {sym.name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--surface-container-high)',
                      color: 'var(--primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {sym.kind}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Click &ldquo;Generate Developer Handoff&rdquo; to execute deterministic symbol parsing and historical synthesis.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Generated Developer Handoff Package */}
      {handoff && (
        <div
          style={{
            padding: '32px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--hairline)', paddingBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-container)', color: '#768A7E', fontWeight: 600 }}>
                  AST + Decisions Fused
                </span>
                <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>
                  {handoff.tokenCount} tokens
                </span>
              </div>
              <h2 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: 0 }}>
                {handoff.projectTitle} - Engineering Handoff
              </h2>
            </div>

            <button
              id="btn-copy-handoff"
              className="btn-primary"
              onClick={() => copyToClipboard(handoff.handoffMarkdown)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied Handoff!' : 'Copy Handoff Package'}</span>
            </button>
          </div>

          <div
            style={{
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface-container-lowest)',
              border: '1px solid var(--hairline)',
              fontFamily: 'var(--font-serif)',
              fontSize: '15px',
              lineHeight: 1.7,
              color: 'var(--on-surface)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {handoff.handoffMarkdown}
          </div>
        </div>
      )}

    </div>
  );
}
