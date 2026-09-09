'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DataProvider, useData } from '@/context/DataContext';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import { Layers, LogIn, Loader2 } from 'lucide-react';

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { conversations } = useData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface)' }}>
      {/* Sidebar Navigation */}
      <Navigation
        convoCount={conversations.length}
        isOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Top Header */}
      <Header
        convoCount={conversations.length}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      {/* Main Content Stage */}
      <main
        className="contextos-main-stage"
        style={{
          marginLeft: '264px',
          paddingTop: '64px',
          minHeight: '100vh',
          backgroundColor: 'var(--surface)',
        }}
      >
        {children}
      </main>
    </div>
  );
}

export default function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  const { status, loginAsDevUser } = useAuth();
  const [devUserChoice, setDevUserChoice] = useState('victim_user_alice_001');

  console.log('[Auth Lifecycle] AppLayout: current status =', status);

  if (status === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--surface)',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #d97746 0%, #b85d30 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(217, 119, 70, 0.3)',
          }}
        >
          <Layers size={22} color="#ffffff" strokeWidth={2.4} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          <Loader2 size={16} className="animate-spin" />
          <span>Verifying session security...</span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--surface)',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-xl)',
            padding: '36px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #d97746 0%, #b85d30 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(217, 119, 70, 0.35)',
            }}
          >
            <Layers size={24} color="#ffffff" strokeWidth={2.4} />
          </div>

          <div>
            <h2
              className="font-headline-sm"
              style={{ color: 'var(--on-surface)', fontSize: '22px', margin: '0 0 8px 0' }}
            >
              Authentication Required
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
              Please sign in to access your personal AI history and workspace.
            </p>
          </div>

          <Link
            href="/"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
              fontWeight: 600,
              fontSize: '14px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              transition: 'background-color 0.15s ease',
            }}
          >
            <LogIn size={16} />
            <span>Go to Sign In</span>
          </Link>

          {process.env.NODE_ENV !== 'production' && (
            <div
              style={{
                width: '100%',
                paddingTop: '16px',
                borderTop: '1px solid var(--hairline)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quick Development Sign In
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={devUserChoice}
                  onChange={(e) => setDevUserChoice(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--surface-container)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--on-surface)',
                    fontSize: '12px',
                    padding: '6px 8px',
                  }}
                >
                  <option value="victim_user_alice_001">Alice (Engineer)</option>
                  <option value="adversary_user_bob_002">Bob (Auditor)</option>
                  <option value="fresh_user_carol_003">Carol (New User)</option>
                </select>
                <button
                  onClick={() => loginAsDevUser(devUserChoice)}
                  style={{
                    backgroundColor: 'var(--surface-container-high)',
                    border: '1px solid var(--hairline)',
                    color: 'var(--on-surface)',
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <DataProvider>
      <AppShellContent>{children}</AppShellContent>
    </DataProvider>
  );
}
