'use client';

import React, { useState } from 'react';
import { CanonicalConversation } from '@/types';
import { Sparkles, Search, MessageSquare, X, Upload } from 'lucide-react';

interface ConversationsViewProps {
  conversations: CanonicalConversation[];
  onGenerateFromConversations?: (convoIds: string[]) => void;
  onNavigateToImport?: () => void;
}

export default function ConversationsView({
  conversations = [],
  onGenerateFromConversations,
  onNavigateToImport,
}: ConversationsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeConvo, setActiveConvo] = useState<CanonicalConversation | null>(null);

  const filtered = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.summary && c.summary.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(filtered.map((c) => c.id));
  const deselectAll = () => setSelectedIds([]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div className="font-label-sm" style={{ textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Knowledge / Conversations
          </div>
          <h1 className="font-headline-lg" style={{ color: 'var(--on-surface)', margin: 0 }}>
            Conversations
          </h1>
          <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Browse and inspect your imported conversation history.
          </p>
        </div>

        {selectedIds.length > 0 && onGenerateFromConversations && (
          <button
            onClick={() => onGenerateFromConversations(selectedIds)}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={16} />
            <span>Synthesize from Selected ({selectedIds.length})</span>
          </button>
        )}
      </div>

      {/* Action Bar (Search & Selection) */}
      {conversations.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--surface-container-low)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 14px',
              gap: '10px',
              minWidth: '280px',
              flex: 1,
              maxWidth: '480px',
            }}
          >
            <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations by title or summary..."
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--on-surface)',
                fontSize: '13.5px',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
            <button
              onClick={selectAll}
              className="btn-secondary"
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              Select All
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={deselectAll}
                className="btn-secondary"
                style={{ padding: '5px 10px', fontSize: '12px' }}
              >
                Clear Selection
              </button>
            )}
            <span className="font-label-sm" style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
              {filtered.length} {filtered.length === 1 ? 'thread' : 'threads'}
            </span>
          </div>
        </div>
      )}

      {/* Conversation List */}
      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((convo) => {
            const isSelected = selectedIds.includes(convo.id);
            const msgCount = convo.messages?.length || 0;
            return (
              <div
                key={convo.id}
                className="panel-card"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '16px 20px',
                  backgroundColor: isSelected ? 'var(--surface-container-high)' : 'var(--surface-container-lowest)',
                  borderColor: isSelected ? 'var(--primary)' : 'var(--hairline)',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(convo.id)}
                  style={{
                    marginTop: '4px',
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--primary-container)',
                    cursor: 'pointer',
                  }}
                />

                <div
                  style={{ flex: 1, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}
                  onClick={() => setActiveConvo(convo)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: 0, fontSize: '15px' }}>
                      {convo.title}
                    </h3>
                    <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>
                      {new Date(convo.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {convo.summary ? (
                    <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                      {convo.summary}
                    </p>
                  ) : convo.messages?.[0]?.content ? (
                    <p className="font-body-sm" style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                      {convo.messages[0].content.slice(0, 140)}...
                    </p>
                  ) : null}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11.5px', color: 'var(--text-muted)', paddingTop: '4px' }}>
                    <span>{msgCount} {msgCount === 1 ? 'turn' : 'turns'}</span>
                    <span>Source: {convo.source || 'gemini_export'}</span>
                    {convo.projectTag && <span>Tag: {convo.projectTag}</span>}
                  </div>
                </div>

                <button
                  onClick={() => setActiveConvo(convo)}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  Inspect
                </button>
              </div>
            );
          })}
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
            gap: '16px',
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
            <MessageSquare size={24} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: 0 }}>
              No conversations imported yet
            </h3>
            <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
              Import a Google Takeout JSON export or a Markdown chat transcript to start exploring your AI history.
            </p>
          </div>

          {onNavigateToImport && (
            <button
              onClick={onNavigateToImport}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '13px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Upload size={14} />
              <span>Import History</span>
            </button>
          )}
        </div>
      )}

      {/* Conversation Detail Drawer */}
      {activeConvo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 100,
          }}
        >
          <div
            className="panel-card"
            style={{
              width: '100%',
              maxWidth: '680px',
              height: '100%',
              borderRadius: 0,
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--hairline)', paddingBottom: '16px' }}>
              <div>
                <span className="font-label-sm" style={{ color: 'var(--primary)' }}>
                  {activeConvo.messages?.length || 0} Messages · {new Date(activeConvo.createdAt).toLocaleDateString()}
                </span>
                <h2 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: '4px 0 0 0' }}>
                  {activeConvo.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveConvo(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              {activeConvo.messages && activeConvo.messages.length > 0 ? (
                activeConvo.messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: m.role === 'user' ? 'var(--surface-container-high)' : 'var(--surface-container-low)',
                      border: '1px solid var(--hairline)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 600, color: m.role === 'user' ? 'var(--primary)' : 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        {m.role}
                      </span>
                      <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="font-body-md" style={{ color: 'var(--on-surface)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                      {m.content}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
                  No message turns recorded in this conversation record.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
