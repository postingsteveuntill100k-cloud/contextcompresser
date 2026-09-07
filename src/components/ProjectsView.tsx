'use client';

import React, { useState } from 'react';
import { CanonicalConversation, StructuredMemory } from '@/types';
import { Search, Folder, MessageSquare, Upload } from 'lucide-react';

interface ProjectsViewProps {
  conversations?: CanonicalConversation[];
  memory?: StructuredMemory | null;
  onNavigateToImport?: () => void;
  onOpenProject?: (projectName: string) => void;
  onGenerateForProject?: (projectName: string) => void;
}

export default function ProjectsView({
  conversations = [],
  onNavigateToImport,
  onOpenProject,
  onGenerateForProject,
}: ProjectsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Dynamically cluster conversations into project groups
  const projectMap = new Map<string, {
    title: string;
    conversations: CanonicalConversation[];
    lastActive: string;
    totalMessages: number;
    sampleSummary: string;
  }>();

  for (const c of conversations) {
    const key = c.projectTag || c.topics?.[0] || c.title.split(/[:\-–]/)[0].trim() || 'General Engineering';
    const existing = projectMap.get(key);
    const msgCount = c.messages?.length || 0;
    const date = c.updatedAt || c.createdAt || new Date().toISOString();

    if (existing) {
      existing.conversations.push(c);
      existing.totalMessages += msgCount;
      if (new Date(date) > new Date(existing.lastActive)) {
        existing.lastActive = date;
      }
    } else {
      projectMap.set(key, {
        title: key,
        conversations: [c],
        lastActive: date,
        totalMessages: msgCount,
        sampleSummary: c.summary || (c.messages?.[0]?.content?.slice(0, 140) || 'Active conversation thread'),
      });
    }
  }

  const projectList = Array.from(projectMap.values()).filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sampleSummary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div className="font-label-sm" style={{ textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Knowledge / Organization
          </div>
          <h1 className="font-headline-lg" style={{ color: 'var(--on-surface)', margin: 0 }}>
            Active Projects &amp; Workspaces
          </h1>
          <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Conversations grouped automatically by topic and project context.
          </p>
        </div>

        <span className="font-label-sm" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
          {projectMap.size} {projectMap.size === 1 ? 'Project Cluster' : 'Project Clusters'}
        </span>
      </div>

      {/* Search Filter */}
      {projectMap.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            gap: '10px',
          }}
        >
          <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects and topics..."
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--on-surface)',
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
      )}

      {/* Project Cards Grid */}
      {projectList.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {projectList.map((proj) => (
            <div
              key={proj.title}
              className="panel-card"
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '22px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-container)',
                    }}
                  />
                  <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: 0 }}>
                    {proj.title}
                  </h3>
                </div>

                <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>
                  {new Date(proj.lastActive).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {proj.sampleSummary}...
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MessageSquare size={14} />
                  {proj.conversations.length} {proj.conversations.length === 1 ? 'conversation' : 'conversations'}
                </span>

                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MessageSquare size={14} />
                  {proj.totalMessages} messages
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--hairline)',
                }}
              >
                {onOpenProject && (
                  <button
                    onClick={() => onOpenProject(proj.title)}
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    Ask History
                  </button>
                )}

                {onGenerateForProject && (
                  <button
                    onClick={() => onGenerateForProject(proj.title)}
                    className="btn-primary"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                  >
                    Synthesize Brief
                  </button>
                )}
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
            <Folder size={24} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: 0 }}>
              No projects indexed yet
            </h3>
            <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
              Import a Google Takeout JSON archive or Markdown transcript to see your project threads organized automatically.
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
