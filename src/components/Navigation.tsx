'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ContextOSLogo from './ContextOSLogo';
import {
  Home,
  Search,
  MessageSquare,
  Folder,
  Download,
  Settings,
  LogOut,
  User,
} from 'lucide-react';

interface NavigationProps {
  convoCount?: number;
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Navigation({ convoCount = 0, isOpen = false, onCloseMobile }: NavigationProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navGroups = [
    {
      label: 'Workspace',
      items: [
        { href: '/home', label: 'Home', icon: Home, id: 'nav-home' },
        { href: '/ask', label: 'Ask', icon: Search, id: 'nav-ask' },
        { href: '/conversations', label: 'Conversations', icon: MessageSquare, id: 'nav-conversations', count: convoCount },
        { href: '/projects', label: 'Projects', icon: Folder, id: 'nav-projects' },
      ],
    },
    {
      label: 'System',
      items: [
        { href: '/import', label: 'Import History', icon: Download, id: 'nav-import' },
        { href: '/settings', label: 'Settings', icon: Settings, id: 'nav-settings' },
      ],
    },
  ];

  const handleLinkClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`contextos-nav ${isOpen ? 'mobile-open' : ''}`}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '264px',
        backgroundColor: 'var(--surface-container-low)',
        borderRight: '1px solid var(--hairline)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
      }}
    >
      {/* Brand & Nav List */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Brand Header */}
        <div
          style={{
            height: '64px',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid var(--hairline)',
            flexShrink: 0,
          }}
        >
          {/* Original ContextOS Logo Mark */}
          <ContextOSLogo size={30} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              className="font-title"
              style={{
                color: 'var(--on-surface)',
                fontWeight: 600,
                letterSpacing: '-0.015em',
                fontSize: '16px',
                lineHeight: 1.2,
              }}
            >
              ContextOS
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              AI Workspace
            </span>
          </div>
        </div>

        {/* Scrollable Nav Sections */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {navGroups.map((group) => (
            <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div
                className="font-label-sm"
                style={{
                  padding: '4px 10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  fontSize: '10.5px',
                  fontWeight: 600,
                }}
              >
                {group.label}
              </div>

              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/home' && pathname?.startsWith(item.href));
                const IconComponent = item.icon;

                return (
                  <Link
                    key={item.href}
                    id={item.id}
                    href={item.href}
                    onClick={handleLinkClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isActive ? 'var(--surface-container)' : 'transparent',
                      color: isActive ? 'var(--on-surface)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 500 : 400,
                      borderLeft: isActive ? '2px solid var(--primary-container)' : '2px solid transparent',
                      textDecoration: 'none',
                      fontSize: '13.5px',
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                    }}
                    className="nav-link-item"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IconComponent
                        size={17}
                        color={isActive ? 'var(--primary-container)' : 'var(--text-secondary)'}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.count !== undefined && item.count > 0 && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--surface-container-high)',
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {item.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Authenticated User Card */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--hairline)',
          backgroundColor: 'var(--surface-container-low)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface-container)',
            border: '1px solid var(--hairline)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--surface-container-high)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-container)',
                flexShrink: 0,
              }}
            >
              <User size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              <span
                className="font-label-md"
                style={{
                  color: 'var(--on-surface)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '13px',
                }}
              >
                {user?.displayName || 'Authenticated User'}
              </span>
              <span
                className="font-label-sm"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email || (user?.id ? `ID: ${user.id.slice(0, 10)}` : 'Connected')}
              </span>
            </div>
          </div>

          <button
            id="btn-sign-out"
            onClick={logout}
            title="Sign Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease, background-color 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--error)';
              e.currentTarget.style.backgroundColor = 'var(--surface-container-high)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
