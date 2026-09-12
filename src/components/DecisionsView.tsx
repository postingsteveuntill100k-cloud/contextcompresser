'use client';

import React, { useState } from 'react';
import { ExtractedDecision, CanonicalConversation } from '@/types';
import { fetchWithAuth } from '@/lib/security/client_auth';
import { Plus, Search, Scale, X, Upload } from 'lucide-react';

interface DecisionsViewProps {
  conversations?: CanonicalConversation[];
  decisions?: ExtractedDecision[];
  initialDecisions?: ExtractedDecision[];
  onRefresh?: () => void;
  onDecisionAdded?: () => void;
  onNavigateToImport?: () => void;
  onAskAboutDecision?: (query: string) => void;
  onInspectDecision?: (query: string) => void;
  onGenerateFromAsset?: (title: string) => void;
}

export default function DecisionsView({
  decisions: propDecisions,
  initialDecisions,
  onRefresh,
  onDecisionAdded,
  onNavigateToImport,
  onAskAboutDecision,
  onInspectDecision,
  onGenerateFromAsset,
}: DecisionsViewProps) {
  const decisions = initialDecisions || propDecisions || [];
  const handleAsk = onInspectDecision || onAskAboutDecision;
  const handleRefresh = onDecisionAdded || onRefresh;
  const [filter, setFilter] = useState<'all' | 'active' | 'superseded'>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newDecision, setNewDecision] = useState('');
  const [newWhy, setNewWhy] = useState('');
  const [newAlternatives, setNewAlternatives] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredDecisions = decisions.filter((d) => {
    if (filter === 'active' && d.status === 'superseded') return false;
    if (filter === 'superseded' && d.status !== 'superseded') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.topic.toLowerCase().includes(q) ||
        d.decision.toLowerCase().includes(q) ||
        d.why.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecision.trim() || !newWhy.trim()) return;

    setSaving(true);
    try {
      const alts = newAlternatives
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetchWithAuth('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: {
            topic: newTopic.trim() || 'Architecture',
            decision: newDecision.trim(),
            why: newWhy.trim(),
            rejectedAlternatives: alts,
          },
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewTopic('');
        setNewDecision('');
        setNewWhy('');
        setNewAlternatives('');
        if (handleRefresh) handleRefresh();
      }
    } catch (err) {
      console.error('Failed to save manual decision:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div className="font-label-sm" style={{ textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Knowledge / Decisions
          </div>
          <h1 className="font-headline-lg" style={{ color: 'var(--on-surface)', margin: 0 }}>
            Decisions
          </h1>
          <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Key architectural and technical choices extracted from your conversations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>Record Decision</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'active', 'superseded'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12.5px',
                border: '1px solid var(--hairline)',
                backgroundColor: filter === tab ? 'var(--surface-container-high)' : 'var(--surface-container-lowest)',
                color: filter === tab ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab} ({decisions.filter((d) => tab === 'all' ? true : tab === 'active' ? d.status !== 'superseded' : d.status === 'superseded').length})
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px',
            gap: '8px',
            minWidth: '240px',
          }}
        >
          <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter decisions..."
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--on-surface)',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
      </div>

      {/* Decisions List */}
      {filteredDecisions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredDecisions.map((d) => (
            <div
              key={d.id}
              className="panel-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '20px 24px',
                borderLeft: `3px solid ${d.status === 'superseded' ? '#55433b' : 'var(--primary-container)'}`,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: d.status === 'superseded' ? '#2A211B' : '#1B221E',
                      color: d.status === 'superseded' ? 'var(--text-muted)' : '#768A7E',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      border: `1px solid ${d.status === 'superseded' ? '#3A2E25' : '#26332A'}`,
                    }}
                  >
                    {d.status === 'superseded' ? 'SUPERSEDED' : 'ACTIVE DECISION'}
                  </span>
                  <span className="font-label-sm" style={{ color: 'var(--primary)' }}>
                    [{d.topic}]
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {handleAsk && (
                    <button
                      className="btn-secondary"
                      onClick={() => handleAsk(d.decision)}
                      style={{ padding: '3px 10px', fontSize: '11.5px' }}
                    >
                      Ask History
                    </button>
                  )}
                  {onGenerateFromAsset && (
                    <button
                      className="btn-secondary"
                      onClick={() => onGenerateFromAsset(d.topic)}
                      style={{ padding: '3px 10px', fontSize: '11.5px' }}
                    >
                      Synthesize Topic
                    </button>
                  )}
                </div>
              </div>

              <h3 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: 0, fontSize: '17px', lineHeight: 1.4 }}>
                {d.decision}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>Rationale:</span>
                <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {d.why}
                </p>
              </div>

              {d.rejectedAlternatives && d.rejectedAlternatives.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                  <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>Rejected Alternatives:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {d.rejectedAlternatives.map((alt) => (
                      <span
                        key={alt}
                        style={{
                          fontSize: '11.5px',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--surface-container-highest)',
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ❌ {alt}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11.5px',
                  color: 'var(--text-muted)',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--hairline)',
                }}
              >
                <span>Conversation: {d.conversationTitle || 'Extracted Memory'}</span>
                <span>{new Date(d.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
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
            <Scale size={24} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: 0 }}>
              No decisions recorded yet
            </h3>
            <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
              Decisions are automatically extracted from your conversations during import, or you can record an architectural choice manually.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Record Decision</span>
            </button>

            {onNavigateToImport && (
              <button
                onClick={onNavigateToImport}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={14} />
                <span>Import History</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual Decision Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
        >
          <div
            className="panel-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="font-headline-sm" style={{ margin: 0, color: 'var(--on-surface)' }}>
                Record Architectural Decision
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDecision} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="font-label-sm" style={{ color: 'var(--text-secondary)' }}>Topic or Subsystem</label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="e.g. Database Architecture"
                  style={{
                    backgroundColor: 'var(--surface-container-low)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: 'var(--on-surface)',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="font-label-sm" style={{ color: 'var(--text-secondary)' }}>Decision</label>
                <textarea
                  required
                  rows={3}
                  value={newDecision}
                  onChange={(e) => setNewDecision(e.target.value)}
                  placeholder="What architecture or invariant was chosen?"
                  style={{
                    backgroundColor: 'var(--surface-container-low)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: 'var(--on-surface)',
                    fontSize: '13.5px',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="font-label-sm" style={{ color: 'var(--text-secondary)' }}>Rationale (Why)</label>
                <textarea
                  required
                  rows={2}
                  value={newWhy}
                  onChange={(e) => setNewWhy(e.target.value)}
                  placeholder="Why was this chosen? What constraint drove the decision?"
                  style={{
                    backgroundColor: 'var(--surface-container-low)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: 'var(--on-surface)',
                    fontSize: '13.5px',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="font-label-sm" style={{ color: 'var(--text-secondary)' }}>Rejected Alternatives (comma-separated)</label>
                <input
                  type="text"
                  value={newAlternatives}
                  onChange={(e) => setNewAlternatives(e.target.value)}
                  placeholder="e.g. DynamoDB, PostgreSQL session tables"
                  style={{
                    backgroundColor: 'var(--surface-container-low)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: 'var(--on-surface)',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                  style={{ padding: '6px 16px', fontSize: '13px' }}
                >
                  {saving ? 'Saving...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
