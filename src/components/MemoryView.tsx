'use client';

import React, { useState } from 'react';
import { CanonicalConversation, StructuredMemory } from '@/types';
import { Brain, Cpu, AlertTriangle, Upload } from 'lucide-react';

interface MemoryViewProps {
  conversations?: CanonicalConversation[];
  memory?: StructuredMemory | null;
  onNavigateToImport?: () => void;
  onInspectItem?: (title: string) => void;
}

type MemoryTab = 'specs' | 'failures' | 'issues' | 'timeline';

export default function MemoryView({
  memory,
  onNavigateToImport,
  onInspectItem,
}: MemoryViewProps) {
  const [activeTab, setActiveTab] = useState<MemoryTab>('specs');

  const specs = memory?.technicalSpecs || [];
  const failures = memory?.failedApproaches || [];
  const issues = memory?.unresolvedIssues || [];
  const timeline = memory?.timeline || [];

  const totalEntities = specs.length + failures.length + issues.length + timeline.length;

  const tabs: Array<{ id: MemoryTab; label: string; count: number }> = [
    { id: 'specs', label: 'Technical Specs & Invariants', count: specs.length },
    { id: 'failures', label: 'Failed Approaches', count: failures.length },
    { id: 'issues', label: 'Unresolved Issues', count: issues.length },
    { id: 'timeline', label: 'Timeline Milestones', count: timeline.length },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div className="font-label-sm" style={{ textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Knowledge / Synthesis Layer
          </div>
          <h1 className="font-headline-lg" style={{ color: 'var(--on-surface)', margin: 0 }}>
            Structured Memory Stream
          </h1>
          <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Extracted technical specifications, failed approaches, active blockers, and timeline events.
          </p>
        </div>

        <span className="font-label-sm" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
          {totalEntities} Structured {totalEntities === 1 ? 'Entity' : 'Entities'}
        </span>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--hairline)', paddingBottom: '12px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12.5px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? 'var(--surface-container-high)' : 'transparent',
              color: activeTab === tab.id ? 'var(--on-surface)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 500 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontSize: '11px', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {totalEntities > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 1. Technical Specs */}
          {activeTab === 'specs' && (
            specs.length > 0 ? (
              specs.map((spec) => (
                <div
                  key={spec.id}
                  className="panel-card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 24px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={18} color="#768A7E" />
                      <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: 0 }}>
                        {spec.technology}
                      </h3>
                    </div>
                    {onInspectItem && (
                      <button
                        className="btn-secondary"
                        onClick={() => onInspectItem(spec.technology)}
                        style={{ padding: '3px 10px', fontSize: '11.5px' }}
                      >
                        Ask History
                      </button>
                    )}
                  </div>

                  <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {spec.architecture}
                  </p>

                  {spec.constraints && spec.constraints.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
                      <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>Constraints &amp; Invariants:</span>
                      <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                        {spec.constraints.map((c, i) => (
                          <li key={i} style={{ lineHeight: 1.5 }}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="panel-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No technical specifications recorded in memory.
              </div>
            )
          )}

          {/* 2. Failed Approaches */}
          {activeTab === 'failures' && (
            failures.length > 0 ? (
              failures.map((fail) => (
                <div
                  key={fail.id}
                  className="panel-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '20px 24px',
                    borderLeft: '3px solid #ffb4ab',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={18} color="#ffb4ab" />
                      <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: 0 }}>
                        {fail.approach}
                      </h3>
                    </div>
                    {onInspectItem && (
                      <button
                        className="btn-secondary"
                        onClick={() => onInspectItem(fail.approach)}
                        style={{ padding: '3px 10px', fontSize: '11.5px' }}
                      >
                        Ask History
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>Why It Failed:</span>
                    <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      {fail.whyFailed}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>Lesson Learned:</span>
                    <p className="font-body-sm" style={{ color: 'var(--primary)', margin: 0, fontStyle: 'italic' }}>
                      {fail.lesson}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="panel-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No failed approaches recorded in memory.
              </div>
            )
          )}

          {/* 3. Unresolved Issues */}
          {activeTab === 'issues' && (
            issues.length > 0 ? (
              issues.map((iss) => (
                <div
                  key={iss.id}
                  className="panel-card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 24px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: iss.urgency === 'high' ? '#2A211B' : 'var(--surface-container-high)',
                          color: iss.urgency === 'high' ? 'var(--primary)' : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {iss.urgency} Urgency
                      </span>
                      <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: 0 }}>
                        {iss.issue}
                      </h3>
                    </div>
                  </div>

                  <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {iss.context}
                  </p>
                </div>
              ))
            ) : (
              <div className="panel-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No unresolved issues recorded in memory.
              </div>
            )
          )}

          {/* 4. Timeline Milestones */}
          {activeTab === 'timeline' && (
            timeline.length > 0 ? (
              timeline.map((event, idx) => (
                <div
                  key={event.id || idx}
                  className="panel-card"
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '18px 24px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="font-label-sm" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {event.stage}
                    </span>
                    <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>
                      {new Date(event.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="font-body-sm" style={{ color: 'var(--on-surface)', margin: 0 }}>
                    {event.changeDescription}
                  </p>
                  {event.reason && (
                    <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '12px' }}>
                      Reason: {event.reason}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="panel-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No timeline milestones recorded in memory.
              </div>
            )
          )}

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
            <Brain size={24} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: 0 }}>
              Structured memory is empty
            </h3>
            <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
              Structured memory is automatically synthesized from your dialogue history when you import Google Takeout or AI transcript files.
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

    </div>
  );
}
