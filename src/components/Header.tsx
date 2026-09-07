'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Upload, Menu } from 'lucide-react';

interface HeaderProps {
  convoCount?: number;
  onToggleMobileMenu?: () => void;
}

export default function Header({ convoCount = 0, onToggleMobileMenu }: HeaderProps) {
  const pathname = usePathname();

  const getPageTitle = (path: string | null) => {
    if (!path || path === '/home') return 'Workspace Home';
    if (path.startsWith('/ask')) return 'Ask My History';
    if (path.startsWith('/conversations')) return 'Conversations';
    if (path.startsWith('/projects')) return 'Projects';
    if (path.startsWith('/memory')) return 'Memory Synthesis';
    if (path.startsWith('/decisions')) return 'Decisions & Contradictions';
    if (path.startsWith('/generate')) return 'Generate Context';
    if (path.startsWith('/packages')) return 'Context Packages';
    if (path.startsWith('/developer')) return 'Developer Mode';
    if (path.startsWith('/import')) return 'Import History';
    if (path.startsWith('/security')) return 'Security & Privacy';
    if (path.startsWith('/settings')) return 'Settings';
    return 'ContextOS';
  };

  return (
    <header
      className="contextos-header"
      style={{
        position: 'fixed',
        top: 0,
        left: '264px',
        right: 0,
        height: '64px',
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--hairline)',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
      }}
    >
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="mobile-menu-btn"
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
            }}
            aria-label="Toggle Navigation"
          >
            <Menu size={20} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-muted)' }}>ContextOS</span>
          <span style={{ color: 'var(--hairline)' }}>/</span>
          <span style={{ color: 'var(--on-surface)', fontWeight: 500 }}>{getPageTitle(pathname)}</span>
        </div>
      </div>

      {/* Right: Real Status & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Real Data Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: convoCount > 0 ? 'var(--success)' : 'var(--primary-container)',
              display: 'inline-block',
            }}
          />
          <span>
            {convoCount > 0
              ? `${convoCount.toLocaleString()} ${convoCount === 1 ? 'conversation' : 'conversations'} indexed`
              : 'No history imported yet'}
          </span>
        </div>

        <div style={{ height: '16px', width: '1px', backgroundColor: 'var(--hairline)' }} />

        {/* Quick Import Link */}
        <Link
          href="/import"
          id="header-import-link"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            fontWeight: 500,
            color: 'var(--on-surface)',
            backgroundColor: 'var(--surface-container-high)',
            border: '1px solid var(--hairline)',
            padding: '5px 12px',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            transition: 'background-color 0.15s ease, border-color 0.15s ease',
          }}
        >
          <Upload size={14} color="var(--primary-container)" />
          <span>Import History</span>
        </Link>
      </div>
    </header>
  );
}
