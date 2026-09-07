'use client';

import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, Edit3, Eye, Download } from 'lucide-react';

interface ContextResultProps {
  title?: string;
  initialContent?: string;
  content?: string;
  onBack?: () => void;
}

export default function ContextResult({
  title = 'ContextOS Architecture & Core Decisions',
  initialContent,
  content: directContent,
  onBack,
}: ContextResultProps) {
  const [content, setContent] = useState(directContent || initialContent || DEFAULT_RESULT_CONTENT);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Top Document Meta & Action Ribbon */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Breadcrumb & Ready Badge */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div className="font-label-md" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                  marginRight: '4px',
                }}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <span>ContextOS</span>
            <span style={{ color: 'var(--hairline)' }}>/</span>
            <span>Context Packages</span>
            <span style={{ color: 'var(--hairline)' }}>/</span>
            <span style={{ color: 'var(--on-surface)', fontWeight: 500 }}>{title}</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--surface-container-low)',
              border: '1px solid var(--hairline)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-container)' }} />
            <span style={{ color: 'var(--on-surface)' }}>Ready to paste into any new AI session</span>
          </div>
        </div>

        {/* Executive Editorial Action Ribbon */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-lg)',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
            <span className="font-label-sm" style={{ textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Export Format:
            </span>
            <span
              style={{
                backgroundColor: 'var(--surface-container)',
                padding: '2px 8px',
                borderRadius: '4px',
                color: 'var(--on-surface)',
                fontWeight: 500,
                fontSize: '12px',
              }}
            >
              Frontier Model Brief (Markdown)
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>~2,480 tokens</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              id="result-copy-btn"
              onClick={handleCopy}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {copied ? <Check size={15} color="var(--on-primary-container)" /> : <Copy size={15} />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Context'}</span>
            </button>
            <button
              id="result-edit-btn"
              onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isEditing ? <Eye size={15} /> : <Edit3 size={15} />}
              <span>{isEditing ? 'View Document' : 'Edit Document'}</span>
            </button>
            <button
              id="result-export-btn"
              onClick={handleExport}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={15} />
              <span>Export .md</span>
            </button>
          </div>
        </div>
      </section>

      {/* Editorial Canvas: Central Living Document Column (max 760px) */}
      <div style={{ width: '100%', maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Document Header */}
        <header style={{ marginBottom: '36px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="font-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', fontWeight: 600 }}>
            <span>Curated Handoff Dossier</span>
            <span style={{ margin: '0 8px', color: 'var(--hairline)' }}>/</span>
            <span>Version 4.1</span>
          </div>
          <h1 className="font-display" style={{ color: 'var(--on-surface)', lineHeight: 1.15, margin: 0 }}>
            {title}
          </h1>
          <p className="font-body-lg" style={{ color: 'var(--text-secondary)', margin: '4px 0 12px 0' }}>
            A complete project brief synthesized from your historical AI conversations, technical deliberations, and verified architectural decisions.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <span>Compiled: Today</span>
            <span>•</span>
            <span>Target: Claude 3.5 Sonnet / GPT-4o / Gemini Flash</span>
            <span>•</span>
            <span>Grounding Score: 99.4%</span>
          </div>
        </header>

        {/* Content Body: View or Edit Mode */}
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              id="result-editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: '600px',
                backgroundColor: 'var(--surface-container-lowest)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                color: 'var(--on-surface)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13.5px',
                lineHeight: 1.6,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsEditing(false)} className="btn-primary">
                Save &amp; Return to View
              </button>
            </div>
          </div>
        ) : (
          <article
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '36px',
              fontFamily: 'var(--font-sans)',
              color: 'var(--on-surface)',
              lineHeight: 1.75,
            }}
          >
            {/* 01. Context & Objective */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span className="font-label-sm" style={{ fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.08em' }}>
                  01
                </span>
                <h2 className="font-headline-md" style={{ color: 'var(--on-surface)', margin: 0 }}>
                  Project Context &amp; Objective
                </h2>
              </div>
              <p className="font-body-lg" style={{ color: 'var(--on-surface-variant)', margin: 0 }}>
                ContextOS is engineered as a sovereign, local-first personal knowledge substrate. Its purpose is to bridge the continuous amnesia between disparate foundation model sessions by transforming raw, multi-year AI conversation transcripts into structured, queryable semantic memory without routing private thought records through third-party aggregators.
              </p>
              <p className="font-body-lg" style={{ color: 'var(--on-surface-variant)', margin: 0 }}>
                Rather than functioning as a transient chat client or generic prompt organizer, ContextOS acts as an operating system kernel for human thought assembly—producing compact, highly grounded context packages that prime newly initiated model environments with instant domain fluency.
              </p>
            </section>

            {/* 02. Architecture */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span className="font-label-sm" style={{ fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.08em' }}>
                  02
                </span>
                <h2 className="font-headline-md" style={{ color: 'var(--on-surface)', margin: 0 }}>
                  Architecture
                </h2>
              </div>
              <p className="font-body-lg" style={{ color: 'var(--on-surface-variant)', margin: 0 }}>
                ContextOS implements a strictly client-orchestrated execution topology. The browser sandboxes both relational indexation and vector retrieval routines directly on user silicon:
              </p>
              <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
                <li>
                  <strong style={{ color: 'var(--on-surface)' }}>Storage Substrate:</strong> SQLite compiled to WebAssembly via OPFS for durable, zero-telemetry local transcript trees.
                </li>
                <li>
                  <strong style={{ color: 'var(--on-surface)' }}>Retrieval Pipeline:</strong> Hybrid BM25 lexical search merged with dense cosine embeddings for sub-10ms prompt recall.
                </li>
                <li>
                  <strong style={{ color: 'var(--on-surface)' }}>Security Model:</strong> Fail-closed cryptographic JWT token verification with hard isolation boundaries.
                </li>
              </ul>
            </section>

            {/* 03. Key Technical Invariants */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span className="font-label-sm" style={{ fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.08em' }}>
                  03
                </span>
                <h2 className="font-headline-md" style={{ color: 'var(--on-surface)', margin: 0 }}>
                  Key Technical Invariants
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--hairline)' }}>
                  <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: '0 0 4px 0' }}>
                    Stateless Firebase Auth Primitives
                  </h3>
                  <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    Enforces standard public key verification without external database session state, ensuring instant restarts.
                  </p>
                </div>
                <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--hairline)' }}>
                  <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: '0 0 4px 0' }}>
                    Human-Curated Editorial Prose Output
                  </h3>
                  <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    Frontier LLMs retain significantly higher causal recall when supplied with prose context compared to rigid XML schemas.
                  </p>
                </div>
              </div>
            </section>

            {/* 04. Model Prompt Seed */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span className="font-label-sm" style={{ fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.08em' }}>
                  04
                </span>
                <h2 className="font-headline-md" style={{ color: 'var(--on-surface)', margin: 0 }}>
                  Frontier Model Instruction Seed
                </h2>
              </div>
              <div
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--surface-container-lowest)',
                  border: '1px solid var(--hairline)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  color: 'var(--on-surface)',
                  lineHeight: 1.6,
                }}
              >
                &ldquo;You are an expert system designer joining the ContextOS team. Review the compiled architectural decisions and technical invariants above. How should we proceed with optimizing the streaming ingestion pipeline without degrading client UI responsiveness?&rdquo;
              </div>
            </section>
          </article>
        )}
      </div>

    </div>
  );
}

const DEFAULT_RESULT_CONTENT = `# ContextOS Architecture & Core Decisions
Curated Handoff Dossier / Version 4.1

## 01 Project Context & Objective
ContextOS is engineered as a sovereign, local-first personal knowledge substrate. Its purpose is to bridge the continuous amnesia between disparate foundation model sessions by transforming raw, multi-year AI conversation transcripts into structured, queryable semantic memory.

## 02 Architecture
ContextOS implements a strictly client-orchestrated execution topology. The browser sandboxes both relational indexation and vector retrieval routines directly on user silicon using SQLite-WASM backed by OPFS.

## 03 Key Technical Invariants
- Stateless Firebase Auth Primitives
- Human-Curated Editorial Prose Output
- Sub-10ms hybrid lexical + dense retrieval

## 04 Frontier Model Instruction Seed
"You are an expert system designer joining the ContextOS team. Review the compiled architectural decisions and technical invariants above."
`;
