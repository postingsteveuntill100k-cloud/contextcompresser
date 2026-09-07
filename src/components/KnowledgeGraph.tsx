'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Plus,
  Filter,
} from 'lucide-react';
import { StructuredMemory } from '@/types';
import { fetchWithAuth } from '@/lib/security/client_auth';

interface KnowledgeGraphProps {
  currentUser: string;
}

export default function KnowledgeGraph({ currentUser }: KnowledgeGraphProps) {
  const [memory, setMemory] = useState<StructuredMemory | null>(null);
  const [activeTab, setActiveTab] = useState<'decisions' | 'failures' | 'unresolved'>('decisions');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form
  const [newTopic, setNewTopic] = useState('');
  const [newDecision, setNewDecision] = useState('');
  const [newWhy, setNewWhy] = useState('');
  const [newRejected, setNewRejected] = useState('');

  useEffect(() => {
    let active = true;
    async function loadMemory() {
      try {
        const res = await fetchWithAuth('/api/memory');
        const data = await res.json();
        if (active && data.memory) {
          setMemory(data.memory);
        }
      } catch (err) {
        console.error('Failed to load memory:', err);
      }
    }
    loadMemory();
    return () => { active = false; };
  }, [currentUser]);

  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecision.trim()) return;

    try {
      const res = await fetchWithAuth('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: {
            topic: newTopic || 'Architecture',
            decision: newDecision,
            why: newWhy,
            rejectedAlternatives: newRejected ? newRejected.split(',').map((s) => s.trim()) : [],
          },
        }),
      });
      if (res.ok) {
        setNewTopic('');
        setNewDecision('');
        setNewWhy('');
        setNewRejected('');
        setShowAddModal(false);
        // Refresh memory after successful add
        const refreshRes = await fetchWithAuth('/api/memory');
        const refreshData = await refreshRes.json();
        if (refreshData.memory) {
          setMemory(refreshData.memory);
        }
      }
    } catch (err) {
      console.error('Failed to add decision:', err);
    }
  };

  const uniqueTopics = Array.from(
    new Set((memory?.decisions || []).map((d) => d.topic).filter(Boolean))
  );

  const filteredDecisions = (memory?.decisions || []).filter((d) =>
    filterTopic === 'all' ? true : d.topic === filterTopic
  );

  return (
    <div style={{ padding: '0 20px 40px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px' }} className="text-gradient">
            Decisions & Structured Memory
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Extracted decisions, technical rationale, rejected alternatives, and failed approaches. Prevents repeating previous mistakes.
          </p>
        </div>

        <button
          id="btn-add-decision"
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} />
          <span>Record Architecture Decision</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="nav-tabs">
          <button
            id="tab-view-decisions"
            className={`nav-tab ${activeTab === 'decisions' ? 'active' : ''}`}
            onClick={() => setActiveTab('decisions')}
          >
            <CheckCircle2 size={16} color="var(--success)" />
            <span>Decisions ({memory?.decisions.length || 0})</span>
          </button>
          <button
            id="tab-view-failures"
            className={`nav-tab ${activeTab === 'failures' ? 'active' : ''}`}
            onClick={() => setActiveTab('failures')}
          >
            <XCircle size={16} color="var(--danger)" />
            <span>Failed Approaches ({memory?.failedApproaches.length || 0})</span>
          </button>
          <button
            id="tab-view-unresolved"
            className={`nav-tab ${activeTab === 'unresolved' ? 'active' : ''}`}
            onClick={() => setActiveTab('unresolved')}
          >
            <HelpCircle size={16} color="var(--warning)" />
            <span>Unresolved Issues ({memory?.unresolvedIssues.length || 0})</span>
          </button>
        </div>

        {activeTab === 'decisions' && uniqueTopics.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-dim)" />
            <select
              className="input-text"
              style={{ padding: '6px 12px', fontSize: '0.82rem', width: 'auto' }}
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
            >
              <option value="all">All Topics</option>
              {uniqueTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Decisions Tab */}
      {activeTab === 'decisions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredDecisions.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              No decisions recorded yet. Import conversations or click &quot;Record Architecture Decision&quot;.
            </div>
          ) : (
            filteredDecisions.map((dec) => (
              <div key={dec.id} className="glass-panel" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-primary">{dec.topic}</span>
                    <span
                      className={`badge ${
                        dec.status === 'active' ? 'badge-success' : 'badge-warning'
                      }`}
                    >
                      {dec.status.toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {new Date(dec.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '8px', color: '#ffffff' }}>
                  {dec.decision}
                </h3>

                {dec.why && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>
                    <strong>Rationale:</strong> {dec.why}
                  </p>
                )}

                {dec.rejectedAlternatives && dec.rejectedAlternatives.length > 0 && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#f87171' }}>Rejected alternatives:</span>
                    {dec.rejectedAlternatives.join(', ')}
                  </div>
                )}

                {dec.conversationTitle && (
                  <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Source Conversation: <em>{dec.conversationTitle}</em>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Failed Approaches Tab */}
      {activeTab === 'failures' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(!memory?.failedApproaches || memory.failedApproaches.length === 0) ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              No failed approaches recorded.
            </div>
          ) : (
            memory.failedApproaches.map((fail) => (
              <div
                key={fail.id}
                className="glass-panel"
                style={{ padding: '20px 24px', borderLeft: '4px solid var(--danger)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="badge badge-danger">FAILED ATTEMPT / DISCARDED</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {new Date(fail.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fca5a5', marginBottom: '8px' }}>
                  ❌ {fail.approach}
                </h3>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>
                  <strong>Why It Failed:</strong> {fail.whyFailed}
                </p>

                {fail.lesson && (
                  <div style={{ color: 'var(--secondary)', fontSize: '0.88rem', fontWeight: 500 }}>
                    💡 <strong>Lesson Learned:</strong> {fail.lesson}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Unresolved Issues Tab */}
      {activeTab === 'unresolved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(!memory?.unresolvedIssues || memory.unresolvedIssues.length === 0) ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              No unresolved issues recorded.
            </div>
          ) : (
            memory.unresolvedIssues.map((issue) => (
              <div
                key={issue.id}
                className="glass-panel"
                style={{ padding: '20px 24px', borderLeft: '4px solid var(--warning)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="badge badge-warning">
                    URGENCY: {issue.urgency.toUpperCase()}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fef08a', marginBottom: '8px' }}>
                  ❓ {issue.issue}
                </h3>

                {issue.context && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                    {issue.context}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Decision Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: '600px', width: '100%', padding: '28px', background: '#0d1326' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>
              Record Architecture Decision
            </h3>

            <form onSubmit={handleAddDecision} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  Topic / Area
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Database, Auth, Vector Retrieval"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  Decision Taken *
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Use Firestore security rules for cloud and local SQLite for dev"
                  value={newDecision}
                  onChange={(e) => setNewDecision(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  Rationale / Why was this chosen?
                </label>
                <textarea
                  className="input-text"
                  rows={3}
                  placeholder="e.g. Enforces strict multi-tenant authorization while keeping test velocity fast"
                  value={newWhy}
                  onChange={(e) => setNewWhy(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  Rejected Alternatives (comma separated)
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Shared single DB, Client-only IndexedDB"
                  value={newRejected}
                  onChange={(e) => setNewRejected(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
