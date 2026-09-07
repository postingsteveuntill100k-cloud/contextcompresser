'use client';

import React, { useState } from 'react';
import { ContextPackage } from '@/types';
import { Sparkles, Search, Copy, Check, Download, Eye, Layers } from 'lucide-react';

interface ContextPackagesViewProps {
  packages?: ContextPackage[];
  onOpenPackageDoc?: (doc: { title: string; content: string }) => void;
  onNavigateToGenerate?: () => void;
  onRefresh?: () => void;
}

export default function ContextPackagesView({
  packages = [],
  onOpenPackageDoc,
  onNavigateToGenerate,
}: ContextPackagesViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPackages = packages.filter((p) =>
    (p.projectTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.markdownContent || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (pkg: ContextPackage) => {
    navigator.clipboard.writeText(pkg.markdownContent);
    setCopiedId(pkg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (pkg: ContextPackage) => {
    const blob = new Blob([pkg.markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (pkg.projectTitle || 'Context-Package').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div className="font-label-sm" style={{ textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Context / Repository
          </div>
          <h1 className="font-headline-lg" style={{ color: 'var(--on-surface)', margin: 0 }}>
            Context Packages
          </h1>
          <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Portable, zero-loss architectural context dossiers generated from your historical records.
          </p>
        </div>

        {onNavigateToGenerate && (
          <button
            onClick={onNavigateToGenerate}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={16} />
            <span>Synthesize New Package</span>
          </button>
        )}
      </div>

      {/* Search Filter Bar */}
      {packages.length > 0 && (
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
            placeholder="Search saved context packages..."
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

      {/* Package List */}
      {filteredPackages.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="panel-card"
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 24px' }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface-container-high)',
                        color: 'var(--primary)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {pkg.mode.toUpperCase()}
                    </span>
                    <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>
                      {pkg.tokenCount?.toLocaleString() || 0} tokens · {pkg.compressionRatio}% ratio
                    </span>
                  </div>

                  <h3
                    className="font-title"
                    style={{
                      color: 'var(--on-surface)',
                      margin: 0,
                      cursor: onOpenPackageDoc ? 'pointer' : 'default',
                    }}
                    onClick={() => onOpenPackageDoc && onOpenPackageDoc({ title: pkg.projectTitle, content: pkg.markdownContent })}
                  >
                    {pkg.projectTitle}
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => handleCopy(pkg)}
                    style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedId === pkg.id ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                    <span>{copiedId === pkg.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={() => handleDownload(pkg)}
                    style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </button>

                  {onOpenPackageDoc && (
                    <button
                      className="btn-primary"
                      onClick={() => onOpenPackageDoc({ title: pkg.projectTitle, content: pkg.markdownContent })}
                      style={{ padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {pkg.objective || pkg.markdownContent.slice(0, 160)}...
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--hairline)',
                  fontSize: '11.5px',
                  color: 'var(--text-muted)',
                }}
              >
                <span>Created {new Date(pkg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>ID: {pkg.id.slice(0, 16)}</span>
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
            <Layers size={24} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: 0 }}>
              No context packages found
            </h3>
            <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
              Generate a portable context briefing from your conversations to preserve architecture decisions and invariants across fresh AI models.
            </p>
          </div>

          {onNavigateToGenerate && (
            <button
              onClick={onNavigateToGenerate}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '13px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} />
              <span>Generate Context Package</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
}
