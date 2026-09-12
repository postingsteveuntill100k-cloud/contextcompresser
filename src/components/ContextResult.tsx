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
            id="context-result-article"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                fontFamily: 'var(--font-sans)',
                color: 'var(--on-surface)',
                lineHeight: 1.7,
              }}
            >
              {content.split('\n\n').map((block, idx) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                // Main Heading (# Title)
                if (trimmed.startsWith('# ')) {
                  return (
                    <h1
                      key={idx}
                      className="font-headline-md"
                      style={{ color: 'var(--on-surface)', margin: '16px 0 8px 0', fontSize: '26px' }}
                    >
                      {trimmed.slice(2)}
                    </h1>
                  );
                }

                // Section Heading (## Subtitle)
                if (trimmed.startsWith('## ')) {
                  return (
                    <div key={idx} style={{ marginTop: '16px' }}>
                      <h2
                        className="font-title"
                        style={{ color: 'var(--primary)', margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600 }}
                      >
                        {trimmed.slice(3)}
                      </h2>
                    </div>
                  );
                }

                // Sub-heading (### Heading)
                if (trimmed.startsWith('### ')) {
                  return (
                    <h3
                      key={idx}
                      className="font-title"
                      style={{ color: 'var(--on-surface)', margin: '10px 0 6px 0', fontSize: '15px', fontWeight: 600 }}
                    >
                      {trimmed.slice(4)}
                    </h3>
                  );
                }

                // Code block (``` ... ```)
                if (trimmed.startsWith('```')) {
                  const lines = trimmed.split('\n');
                  const code = lines.slice(1, -1).join('\n') || trimmed;
                  return (
                    <pre
                      key={idx}
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--surface-container-lowest)',
                        border: '1px solid var(--hairline)',
                        overflowX: 'auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        lineHeight: 1.5,
                        color: 'var(--on-surface)',
                      }}
                    >
                      <code>{code}</code>
                    </pre>
                  );
                }

                // Bullet or list block (- or *)
                if (trimmed.split('\n').every((l) => l.trim().startsWith('- ') || l.trim().startsWith('* ') || l.trim().startsWith('• ') || /^\d+\.\s/.test(l.trim()))) {
                  return (
                    <ul
                      key={idx}
                      style={{
                        paddingLeft: '22px',
                        margin: '4px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '14.5px',
                        lineHeight: 1.6,
                      }}
                    >
                      {trimmed.split('\n').map((line, lIdx) => {
                        const clean = line.trim().replace(/^[-*•]\s+|\d+\.\s+/, '');
                        return <li key={lIdx}>{clean}</li>;
                      })}
                    </ul>
                  );
                }

                // Blockquote (> Quote)
                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote
                      key={idx}
                      style={{
                        margin: '8px 0',
                        padding: '12px 18px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--surface-container-low)',
                        borderLeft: '3px solid var(--primary)',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                        fontSize: '14px',
                      }}
                    >
                      {trimmed.replace(/^>\s+/gm, '')}
                    </blockquote>
                  );
                }

                // Standard paragraph
                return (
                  <p
                    key={idx}
                    className="font-body-lg"
                    style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '15px', lineHeight: 1.7 }}
                  >
                    {trimmed}
                  </p>
                );
              })}
            </article>
          )}
      </div>

    </div>
  );
}

const DEFAULT_RESULT_CONTENT = `# Context Briefing
Curated Handoff Context

## 01 Project Summary
ContextOS turns your past AI conversations into clear, usable context.

## 02 Key Decisions & Invariants
- Decisions and rationale extracted directly from your conversation history.
- Structured so fresh AI instances understand previous context without repeating past discussions.

## 03 Past Attempts & Lessons
- Review the decisions log and conversation details to explore historical attempts and lessons learned.
`;
