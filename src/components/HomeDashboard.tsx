'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CanonicalConversation, ContextPackage, StructuredMemory } from '@/types';
import {
  Search,
  ArrowRight,
  ArrowUpRight,
  MessageSquare,
  FileText,
  Upload,
} from 'lucide-react';

interface HomeDashboardProps {
  conversations: CanonicalConversation[];
  packages?: ContextPackage[];
  memory?: StructuredMemory | null;
  onAskQuery: (query: string) => void;
  onSelectProject?: (projectName: string) => void;
  onOpenPackage?: (packageName: string) => void;
  onNavigateToImport?: () => void;
}

export default function HomeDashboard({
  conversations = [],
  onAskQuery,
  onNavigateToImport,
}: HomeDashboardProps) {
  const [queryInput, setQueryInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && queryInput.trim()) {
      onAskQuery(queryInput.trim());
    }
  };

  const handleAsk = () => {
    if (queryInput.trim()) {
      onAskQuery(queryInput.trim());
    }
  };

  // Sort conversations by most recent
  const sortedConversations = [...conversations].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const recentConversations = sortedConversations.slice(0, 4);

  const suggestedQueries = [
    'What architectural decisions did I make?',
    'Which approaches failed and why?',
    'What unresolved questions remain?',
  ];

  return (
    <div
      style={{
        maxWidth: '780px',
        margin: '0 auto',
        padding: '48px 24px 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
      }}
    >
      {/* 1. PRIMARY ACTION: ASK */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h1
            className="font-headline-lg"
            style={{
              fontSize: '32px',
              fontWeight: 500,
              color: 'var(--on-surface)',
              letterSpacing: '-0.02em',
              margin: '0 0 8px 0',
            }}
          >
            What do you want to find?
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Search your past conversations, recall decisions, or compile context for your next prompt.
          </p>
        </div>

        {/* Focused Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-xl)',
            padding: '8px 12px 8px 18px',
            gap: '12px',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.25)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <Search size={19} color="var(--primary-container)" style={{ flexShrink: 0 }} />
          <input
            id="home-omni-input"
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your AI history..."
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
            onClick={handleAsk}
            className="btn-primary"
            style={{
              padding: '8px 18px',
              fontSize: '13.5px',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            Ask
          </button>
        </div>

        {/* Quiet Suggested Queries */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          {suggestedQueries.map((queryText) => (
            <button
              key={queryText}
              onClick={() => onAskQuery(queryText)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-container)',
                border: '1px solid var(--hairline)',
                color: 'var(--text-secondary)',
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'color 0.15s ease, background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--on-surface)';
                e.currentTarget.style.backgroundColor = 'var(--surface-container-high)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.backgroundColor = 'var(--surface-container)';
              }}
            >
              <ArrowUpRight size={13} color="var(--primary-container)" />
              <span>{queryText}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 2. SECONDARY ACTION: GENERATE CONTEXT */}
      <section
        style={{
          padding: '24px 26px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--surface-container-low)',
          border: '1px solid var(--hairline)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface-container-high)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-container)',
            }}
          >
            <FileText size={17} />
          </div>
          <div>
            <h2
              className="font-title"
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--on-surface)',
                margin: 0,
              }}
            >
              Generate Context
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                margin: '2px 0 0 0',
              }}
            >
              Turn your AI history into context you can reuse.
            </p>
          </div>
        </div>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Extract key decisions, architecture, and current state from your conversations into a prompt-ready context package.
        </p>

        <div>
          <Link
            id="btn-generate-context"
            href="/generate"
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              fontSize: '13.5px',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            <span>Generate Context</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* 3. EXPLORE: RECENT HISTORY */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            className="font-title"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--on-surface)',
              margin: 0,
            }}
          >
            Recent History
          </h2>
          {conversations.length > 0 && (
            <Link
              href="/conversations"
              style={{
                fontSize: '13px',
                color: 'var(--primary-container)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              View all ({conversations.length}) &rarr;
            </Link>
          )}
        </div>

        {recentConversations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentConversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/conversations?id=${encodeURIComponent(conv.id)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  backgroundColor: 'var(--surface-container-low)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-container)';
                  e.currentTarget.style.borderColor = 'var(--hairline-strong)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-container-low)';
                  e.currentTarget.style.borderColor = 'var(--hairline)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <MessageSquare
                    size={16}
                    color="var(--text-muted)"
                    style={{ flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--on-surface)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {conv.title || 'Untitled Conversation'}
                    </div>
                    {conv.topics?.[0] && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '2px',
                        }}
                      >
                        {conv.topics[0]}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginLeft: '16px',
                    flexShrink: 0,
                  }}
                >
                  {(conv.updatedAt || conv.createdAt)
                    ? new Date(conv.updatedAt || conv.createdAt!).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    : ''}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '32px 24px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface-container-low)',
              border: '1px dashed var(--hairline)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '12px',
            }}
          >
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: 0,
                maxWidth: '440px',
                lineHeight: 1.5,
              }}
            >
              No conversations imported yet. Import your Gemini history from Google Takeout to search and generate context.
            </p>
            {onNavigateToImport ? (
              <button
                id="cta-import-gemini"
                onClick={onNavigateToImport}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <Upload size={15} />
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
                  gap: '8px',
                  padding: '9px 18px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                }}
              >
                <Upload size={15} />
                <span>Import Gemini History</span>
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
