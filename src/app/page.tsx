'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Layers,
  Search,
  Brain,
  FileText,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Download,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function LandingOrAuthPage() {
  const { status, error, loginWithGoogle, loginAsDevUser } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [devUserId, setDevUserId] = useState('victim_user_alice_001');

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/home');
    }
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);
      await loginWithGoogle();
      router.replace('/home');
    } catch {
      // Error is set in AuthContext
    } finally {
      setSigningIn(false);
    }
  };

  const handleDevSignIn = async () => {
    try {
      setSigningIn(true);
      await loginAsDevUser(devUserId);
      router.replace('/home');
    } catch {
      // Error is set in AuthContext
    } finally {
      setSigningIn(false);
    }
  };



  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '40px 24px',
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--hairline-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #d97746 0%, #b85d30 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(217, 119, 70, 0.3)',
            }}
          >
            <Layers size={18} color="#ffffff" strokeWidth={2.4} />
          </div>
          <span
            className="font-title"
            style={{ fontSize: '18px', fontWeight: 600, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}
          >
            ContextOS
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <ShieldCheck size={14} color="var(--success)" />
            <span>Cryptographic Isolation</span>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <div
        style={{
          maxWidth: '780px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '48px 0 32px',
        }}
      >
        {/* Subtle pill badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--surface-container)',
            border: '1px solid var(--hairline)',
            color: 'var(--primary-container)',
            fontSize: '12px',
            fontWeight: 500,
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-container)',
              display: 'inline-block',
            }}
          />
          <span>Personal AI Memory &amp; Context Synthesis</span>
        </div>

        <h1
          className="font-headline-lg"
          style={{
            fontSize: '44px',
            color: 'var(--on-surface)',
            letterSpacing: '-0.025em',
            margin: '0 0 20px 0',
            lineHeight: 1.15,
            fontWeight: 400,
          }}
        >
          Your AI history, <span className="font-serif-italic" style={{ color: 'var(--primary)' }}>understood</span>.
        </h1>

        <p
          className="font-body-lg"
          style={{
            fontSize: '17px',
            color: 'var(--text-secondary)',
            maxWidth: '620px',
            lineHeight: 1.6,
            margin: '0 0 36px 0',
          }}
        >
          Turn months of conversations into searchable, reusable context. Connect your personal Gemini history, recover lost decisions, and create clean context packages for fresh AI workflows.
        </p>

        {/* Auth Error Banner with Instant Bypass */}
        {error && (
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 180, 171, 0.12)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
              fontSize: '13px',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 500 }}>
                {error.includes('operation-specific')
                  ? 'Browser restricted popup window or third-party cookies.'
                  : error}
              </span>
            </div>
            <button
              onClick={handleDevSignIn}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: 'var(--error)',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Enter Alice Workspace Instantly (Demo Mode) →
            </button>
          </div>
        )}

        {/* Primary Auth Actions Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <button
            id="btn-google-sign-in"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
              fontWeight: 600,
              fontSize: '14.5px',
              border: 'none',
              cursor: signingIn ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            {signingIn ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <button
            id="btn-instant-alice"
            onClick={handleDevSignIn}
            disabled={signingIn}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-container-high)',
              color: 'var(--on-surface)',
              border: '1px solid var(--hairline-strong)',
              fontSize: '13.5px',
              fontWeight: 500,
              cursor: signingIn ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Sparkles size={16} color="var(--primary)" />
            <span>Instant Access (Alice Workspace)</span>
          </button>

          {/* Instant Demo Workspace Option */}
          <div
            style={{
              marginTop: '4px',
              paddingTop: '16px',
              borderTop: '1px solid var(--hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Instant Demo Workspace
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pre-indexed</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                id="dev-user-select"
                value={devUserId}
                onChange={(e) => setDevUserId(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--surface-container)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--on-surface)',
                  fontSize: '12.5px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                }}
              >
                <option value="victim_user_alice_001">Alice (Lead Engineer - 100+ Conversations)</option>
                <option value="adversary_user_bob_002">Bob (Security Auditor - Clean Sandbox)</option>
                <option value="fresh_user_carol_003">Carol (Fresh Account)</option>
              </select>
              <button
                id="btn-dev-sign-in"
                onClick={handleDevSignIn}
                disabled={signingIn}
                style={{
                  backgroundColor: 'var(--surface-container-high)',
                  border: '1px solid var(--hairline)',
                  color: 'var(--on-surface)',
                  fontSize: '12.5px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: signingIn ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Enter</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* 4-Step Process Section */}
        <div
          style={{
            marginTop: '64px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '16px',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--hairline)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Download size={16} color="var(--primary-container)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>1. Import</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Export your Gemini activity from Google Takeout and drop the archive.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--hairline)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Brain size={16} color="var(--primary-container)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>2. Understand</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              ContextOS extracts decisions, pivots, and project context without factual loss.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--hairline)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Search size={16} color="var(--primary-container)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>3. Ask</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Query past knowledge with transparent citations and source links.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--hairline)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileText size={16} color="var(--primary-container)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>4. Generate</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Export clean markdown packages to rehydrate fresh AI chats instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          width: '100%',
          maxWidth: '1080px',
          paddingTop: '24px',
          borderTop: '1px solid var(--hairline-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <span>ContextOS · Personal Gemini Context System</span>
        <span>Strict Per-User Security Guarded</span>
      </footer>
    </div>
  );
}
