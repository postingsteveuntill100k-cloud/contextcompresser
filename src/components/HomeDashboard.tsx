'use client';

import React, { useState } from 'react';
import { CanonicalConversation, ContextPackage, StructuredMemory } from '@/types';
import Link from 'next/link';
import {
  Search,
  Upload,
  ArrowUpRight,
  MessageSquare,
  Copy,
  Check,
  Brain,
  FileText,
  Layers,
} from 'lucide-react';

interface HomeDashboardProps {
  conversations: CanonicalConversation[];
  packages?: ContextPackage[];
  memory?: StructuredMemory | null;
  onAskQuery: (query: string) => void;
  onSelectProject: (projectName: string) => void;
  onOpenPackage: (packageName: string) => void;
  onNavigateToImport?: () => void;
}

export default function HomeDashboard({
  conversations,
  packages = [],
  memory,
  onAskQuery,
  onSelectProject,
  onOpenPackage,
  onNavigateToImport,
}: HomeDashboardProps) {
  const [queryInput, setQueryInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && queryInput.trim()) {
      onAskQuery(queryInput.trim());
    }
  };

  const handleCopyPackage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const convoCount = conversations.length;
  const decisionsCount = memory?.decisions?.length || 0;
  const packagesCount = packages.length;

  // FIRST-TIME EXPERIENCE: When user has 0 conversations, show intentional empty state
  if (convoCount === 0) {
    return (
      <div
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: '64px 24px 80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Subtle decorative aperture mark */}
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #d97746 0%, #b85d30 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(217, 119, 70, 0.35)',
            marginBottom: '28px',
          }}
        >
          <Layers size={28} color="#ffffff" strokeWidth={2.4} />
        </div>

        <h1
          className="font-headline-lg"
          style={{
            fontSize: '40px',
            color: 'var(--on-surface)',
            letterSpacing: '-0.025em',
            margin: '0 0 16px 0',
            lineHeight: 1.2,
            fontWeight: 400,
          }}
        >
          Your AI history, <span className="font-serif-italic" style={{ color: 'var(--primary)' }}>understood</span>.
        </h1>

        <p
          className="font-body-lg"
          style={{
            fontSize: '17px',
            color: 'var(--text-secondary)',
            maxWidth: '580px',
            lineHeight: 1.6,
            margin: '0 0 32px 0',
          }}
        >
          Bring your Gemini history into ContextOS and turn months of conversations into searchable, reusable context.
        </p>

        {/* Primary CTA */}
        {onNavigateToImport ? (
          <button
            id="cta-import-gemini"
            onClick={onNavigateToImport}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 16px rgba(217, 119, 70, 0.3)',
              cursor: 'pointer',
            }}
          >
            <Upload size={18} />
            <span>Import Gemini History</span>
          </button>
        ) : (
          <Link
            id="cta-import-gemini-link"
            href="/import"
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 16px rgba(217, 119, 70, 0.3)',
              textDecoration: 'none',
            }}
          >
            <Upload size={18} />
            <span>Import Gemini History</span>
          </Link>
        )}

        {/* How It Works Section */}
        <div
          style={{
            marginTop: '72px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--hairline)' }} />
            <span
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              How it works
            </span>
            <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--hairline)' }} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                padding: '20px',
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-container)' }}>
                <Upload size={16} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>1. Import</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Export your Gemini activity from Google Takeout and drop the archive here.
              </p>
            </div>

            <div
              style={{
                padding: '20px',
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-container)' }}>
                <Brain size={16} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>2. Understand</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                ContextOS parses discussions, extracted decisions, and project milestones automatically.
              </p>
            </div>

            <div
              style={{
                padding: '20px',
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-container)' }}>
                <Search size={16} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>3. Ask</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Search across all your past AI conversations with transparent, verified source citations.
              </p>
            </div>

            <div
              style={{
                padding: '20px',
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-container)' }}>
                <FileText size={16} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>4. Generate Context</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Produce concise context packages ready to copy and inject into fresh chats.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE DASHBOARD: When user has imported conversations
  // Dynamically cluster conversations into active topics
  const projectMap = new Map<string, { title: string; sessions: number; lastActive: string; sampleTopic: string }>();
  for (const c of conversations) {
    const key = c.projectTag || c.topics?.[0] || c.title.split(/[:\-–]/)[0].trim() || 'General Discussions';
    const existing = projectMap.get(key);
    if (existing) {
      existing.sessions += 1;
      if (new Date(c.updatedAt || c.createdAt) > new Date(existing.lastActive)) {
        existing.lastActive = c.updatedAt || c.createdAt;
      }
    } else {
      projectMap.set(key, {
        title: key,
        sessions: 1,
        lastActive: c.updatedAt || c.createdAt || new Date().toISOString(),
        sampleTopic: c.title,
      });
    }
  }
  const activeProjects = Array.from(projectMap.values()).slice(0, 6);

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '36px 24px 64px', display: 'flex', flexDirection: 'column', gap: '44px' }}>
      
      {/* Hero Section */}
      <section
        style={{
          maxWidth: '740px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          paddingTop: '8px',
        }}
      >
        {/* Real Data Telemetry Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--surface-container-high)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            marginBottom: '20px',
            border: '1px solid var(--hairline)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              display: 'inline-block',
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {`${convoCount.toLocaleString()} conversations · ${decisionsCount} decisions · ${packagesCount} packages`}
          </span>
        </div>

        {/* Editorial Headline */}
        <h1
          className="font-headline-lg"
          style={{
            color: 'var(--on-surface)',
            fontSize: '38px',
            letterSpacing: '-0.025em',
            margin: '0 0 14px 0',
            lineHeight: 1.2,
            fontWeight: 400,
          }}
        >
          Your AI history, <span className="font-serif-italic" style={{ color: 'var(--primary)' }}>understood</span>.
        </h1>

        <p
          className="font-body-lg"
          style={{
            color: 'var(--text-secondary)',
            margin: '0 0 28px 0',
            lineHeight: 1.6,
            maxWidth: '600px',
            fontSize: '15.5px',
          }}
        >
          Search your past conversations, recover lost decisions, and turn months of AI dialogue into durable context.
        </p>

        {/* Omni-Search Box */}
        <div
          style={{
            width: '100%',
            maxWidth: '660px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-xl)',
            padding: '8px 12px 8px 18px',
            gap: '12px',
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.35)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <Search size={20} color="var(--primary-container)" style={{ flexShrink: 0 }} />

          <input
            id="home-omni-input"
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your past thoughts, decisions, or code..."
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
            id="btn-ask-history-hero"
            onClick={() => queryInput.trim() && onAskQuery(queryInput.trim())}
            className="btn-primary"
            style={{ padding: '7px 16px', fontSize: '13px' }}
          >
            Ask History
          </button>
        </div>

        {/* Suggested prompt chips */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            marginTop: '16px',
          }}
        >
          {[
            'What database did I select, and why?',
            'What approaches failed during testing?',
            'What are my unresolved architecture questions?',
            'What security invariants did I define?',
          ].map((promptText) => (
            <button
              key={promptText}
              className="prompt-chip"
              onClick={() => onAskQuery(promptText)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-container)',
                border: '1px solid var(--hairline)',
                color: 'var(--text-secondary)',
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'color 0.15s ease, background-color 0.15s ease',
              }}
            >
              <ArrowUpRight size={13} color="var(--primary)" />
              <span>{promptText}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Grid: Real Project Clusters & Context Packages */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '32px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Real Active Project Clusters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <span
              className="font-label-sm"
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              Historical Clusters
            </span>
            <h2 className="font-headline-sm" style={{ color: 'var(--on-surface)', marginTop: '2px', fontSize: '20px' }}>
              Active Project Contexts
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeProjects.map((proj) => (
              <div
                key={proj.title}
                className="panel-card"
                onClick={() => onSelectProject(proj.title)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '16px 18px',
                  backgroundColor: 'var(--surface-container-low)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-container)',
                      }}
                    />
                    <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: 0, fontSize: '15px' }}>
                      {proj.title}
                    </h3>
                  </div>
                  <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>
                    {new Date(proj.lastActive).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, fontSize: '13px' }}>
                  {proj.sampleTopic}
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--hairline)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageSquare size={13} />
                    {proj.sessions} {proj.sessions === 1 ? 'conversation' : 'conversations'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Real Context Packages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <span
              className="font-label-sm"
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Ready to Inject
            </span>
            <h2 className="font-headline-sm" style={{ color: 'var(--on-surface)', marginTop: '2px', fontSize: '20px' }}>
              Context Packages
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {packages.length > 0 ? (
              packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="panel-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '16px 18px',
                    backgroundColor: 'var(--surface-container-low)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <span className="font-label-sm" style={{ color: 'var(--primary)', fontSize: '11px' }}>
                        {pkg.mode.toUpperCase()} · {pkg.tokenCount?.toLocaleString() || 0} tokens
                      </span>
                      <h4
                        className="font-title"
                        style={{ color: 'var(--on-surface)', margin: '2px 0 0 0', cursor: 'pointer', fontSize: '15px' }}
                        onClick={() => onOpenPackage(pkg.projectTitle)}
                      >
                        {pkg.projectTitle}
                      </h4>
                    </div>
                    <button
                      className="btn-ghost"
                      onClick={() => handleCopyPackage(pkg.id, pkg.markdownContent)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface-container-high)',
                        border: '1px solid var(--hairline)',
                        color: 'var(--on-surface)',
                      }}
                    >
                      {copiedId === pkg.id ? (
                        <>
                          <Check size={13} color="var(--success)" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4, fontSize: '12.5px' }}>
                    {pkg.objective || 'Synthesized decisions and technical context.'}
                  </p>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: '28px 20px',
                  backgroundColor: 'var(--surface-container-low)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                <p style={{ margin: '0 0 12px 0' }}>No context packages generated yet.</p>
                <Link
                  href="/generate"
                  style={{
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '12.5px',
                  }}
                >
                  Generate your first package &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
