'use client';

import React, { useState } from 'react';
import { fetchWithAuth } from '@/lib/security/client_auth';
import { CanonicalConversation, ContextPackage } from '@/types';
import { Loader2, Sparkles, Copy, Check, Download, ExternalLink, FileText } from 'lucide-react';

interface ContextGeneratorProps {
  initialTopic?: string;
  conversations?: CanonicalConversation[];
  onOpenResultDoc?: (docData: { title: string; content: string }) => void;
  onPackageSaved?: () => void;
}

export default function ContextGenerator({
  initialTopic = '',
  conversations = [],
  onOpenResultDoc,
  onPackageSaved,
}: ContextGeneratorProps) {
  const [projectTitle, setProjectTitle] = useState(initialTopic || (conversations.length > 0 ? conversations[0].title : 'Engineering Context Briefing'));
  const [mode, setMode] = useState<'quick' | 'full'>('quick');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedPackage, setGeneratedPackage] = useState<ContextPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genStage, setGenStage] = useState('Finding relevant conversations and structured decisions...');

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setGenStage('Finding relevant conversations and structured decisions...');

    const t1 = setTimeout(() => setGenStage('Compressing context with Gemini...'), 1500);
    const t2 = setTimeout(() => setGenStage('Synthesizing portable markdown package...'), 3500);

    try {
      const res = await fetchWithAuth('/api/generate-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: projectTitle.trim() || 'Engineering Context Briefing',
          mode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.package) {
          setGeneratedPackage(data.package);
          if (onPackageSaved) onPackageSaved();
        } else {
          setError('No package returned from generator.');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setError(
          err.error
            ? `We couldn't finish that request. Your history is safe. (${err.error})`
            : 'We couldn\'t finish generating that context package. Your history is safe. Please try again.'
        );
      }
    } catch (err: unknown) {
      console.error('Generate context failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`We couldn't finish that request. Your history is safe. Please try again. (${msg})`);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedPackage?.markdownContent) return;
    navigator.clipboard.writeText(generatedPackage.markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedPackage?.markdownContent) return;
    const blob = new Blob([generatedPackage.markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (generatedPackage.projectTitle || 'Context-Briefing').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px 64px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '40px',
          alignItems: 'start',
        }}
      >
        {/* Left Configuration Rail */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            position: 'sticky',
            top: '80px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="font-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Context / Synthesizer
            </div>
            <h1 className="font-headline-md" style={{ color: 'var(--on-surface)', margin: 0 }}>
              Generate Context
            </h1>
            <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Turn accumulated AI conversations into a zero-loss portable markdown briefing for new AI sessions.
            </p>
          </div>

          {/* Project Title Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="font-title" style={{ color: 'var(--on-surface)', fontSize: '13.5px' }}>
              Project or Context Title
            </label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="e.g. Storage & Ingestion Pipeline"
              style={{
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                color: 'var(--on-surface)',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>

          {/* Mode Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span className="font-title" style={{ color: 'var(--on-surface)', fontSize: '13.5px' }}>
              Synthesis Mode
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                onClick={() => setMode('quick')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: mode === 'quick' ? 'var(--surface-container-high)' : 'var(--surface-container-low)',
                  border: `1px solid ${mode === 'quick' ? 'var(--primary)' : 'var(--hairline)'}`,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'quick'}
                  onChange={() => setMode('quick')}
                  style={{ marginTop: '3px', accentColor: 'var(--primary-container)' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="font-title" style={{ fontSize: '13px', color: 'var(--on-surface)' }}>
                    Quick Context Briefing
                  </span>
                  <span className="font-body-sm" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    High-density synthesis (~400-600 words) focusing on active architecture, invariants, and failed approaches.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setMode('full')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: mode === 'full' ? 'var(--surface-container-high)' : 'var(--surface-container-low)',
                  border: `1px solid ${mode === 'full' ? 'var(--primary)' : 'var(--hairline)'}`,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'full'}
                  onChange={() => setMode('full')}
                  style={{ marginTop: '3px', accentColor: 'var(--primary-container)' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="font-title" style={{ fontSize: '13px', color: 'var(--on-surface)' }}>
                    Full Engineering Reconstruction
                  </span>
                  <span className="font-body-sm" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Exhaustive architectural record with chronological evolution, supersessions, and numerical specifications.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--error-container)',
                color: 'var(--error)',
                fontSize: '13px',
                border: '1px solid #93000a',
              }}
            >
              {error}
            </div>
          )}

          {/* Action Trigger */}
          <button
            id="btn-generate-package"
            onClick={handleGenerate}
            disabled={generating || !projectTitle.trim()}
            className="btn-primary"
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {generating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Synthesizing Context...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Generate Context Package</span>
              </>
            )}
          </button>
        </aside>

        {/* Right Editorial Stage: Real Context Package Preview */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Artifact Preview
            </span>

            {generatedPackage && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  id="btn-copy-package"
                  onClick={handleCopy}
                  className="btn-secondary"
                  style={{ padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  id="btn-download-package"
                  onClick={handleDownload}
                  className="btn-secondary"
                  style={{ padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Download .md</span>
                </button>

                {onOpenResultDoc && (
                  <button
                    id="btn-open-editorial-view"
                    onClick={() => onOpenResultDoc({ title: generatedPackage.projectTitle, content: generatedPackage.markdownContent })}
                    className="btn-primary"
                    style={{ padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ExternalLink size={14} />
                    <span>Editorial View</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {generatedPackage ? (
            <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '28px' }}>
              {/* Telemetry Header */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  alignItems: 'center',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--hairline)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>Tokens:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--primary)' }}>
                    {generatedPackage.tokenCount?.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>Raw Source:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {generatedPackage.sourceTokenCount?.toLocaleString()} tokens
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>Compression:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: '#768A7E' }}>
                    {generatedPackage.compressionRatio}%
                  </span>
                </div>
              </div>

              {/* Markdown Content Display */}
              <div
                style={{
                  backgroundColor: 'var(--surface-container-lowest)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  lineHeight: 1.65,
                  color: 'var(--on-surface)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '650px',
                  overflowY: 'auto',
                }}
              >
                {generatedPackage.markdownContent}
              </div>
            </div>
          ) : generating ? (
            <div
              className="panel-card"
              style={{
                padding: '64px 32px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <Loader2 size={32} className="animate-spin" color="var(--primary)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h3 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: 0, fontWeight: 500 }}>
                  {genStage}
                </h3>
                <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                  ContextOS is compressing your verified engineering history into a clean, reusable context package.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="panel-card"
              style={{
                padding: '64px 32px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--surface-container-high)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                }}
              >
                <FileText size={24} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h3 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: 0 }}>
                  Ready to Synthesize
                </h3>
                <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                  Configure your project title and synthesis mode on the left, then click &ldquo;Generate Context Package&rdquo; to build your artifact.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
