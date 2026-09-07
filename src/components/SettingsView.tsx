'use client';

import React, { useState } from 'react';
import { Save, Check, Brain, Database, ShieldCheck } from 'lucide-react';

export default function SettingsView() {
  const [model, setModel] = useState<'gemini-3.5-flash-lite' | 'gemini-3.5-flash'>('gemini-3.5-flash-lite');
  const [reasoningDepth, setReasoningDepth] = useState<'quick' | 'deep'>('deep');
  const [strictGrounding, setStrictGrounding] = useState(true);
  const [localCache, setLocalCache] = useState(true);
  const [quarantineInjections, setQuarantineInjections] = useState(true);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSave = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: '36px' }}>
      
      {/* Header */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="font-label-sm" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <span>System</span>
          <span style={{ margin: '0 8px', color: 'var(--hairline)' }}>/</span>
          <span style={{ color: 'var(--on-surface)' }}>Settings &amp; Preferences</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 className="font-headline-lg" style={{ color: 'var(--on-surface)', margin: 0 }}>
              Settings &amp; Preferences
            </h1>
            <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.6 }}>
              Configure your local-first context storage, Gemini reasoning engine parameters, vector sharding thresholds, and security boundaries.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {savedFeedback ? <Check size={16} /> : <Save size={16} />}
            <span>{savedFeedback ? 'Preferences Saved' : 'Save Preferences'}</span>
          </button>
        </div>
      </section>

      {/* Section 1: Reasoning & Synthesis Engine */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--surface-container-low)',
          border: '1px solid var(--hairline)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Brain size={22} color="var(--primary-container)" />
          <div>
            <h2 className="font-title" style={{ color: 'var(--on-surface)', margin: 0 }}>
              Reasoning &amp; Synthesis Engine
            </h2>
            <p className="font-body-sm" style={{ color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Controls the LLM backend utilized for historical deliberation, decision extraction, and context dossier compilation.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {/* Model Option: 3.5 Flash Lite */}
          <div
            onClick={() => setModel('gemini-3.5-flash-lite')}
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface-container)',
              border: model === 'gemini-3.5-flash-lite' ? '2px solid var(--primary-container)' : '1px solid var(--hairline)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="font-title" style={{ color: 'var(--on-surface)', fontSize: '14px' }}>
                Gemini 3.5 Flash Lite
              </span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--surface-container-high)',
                  color: 'var(--primary)',
                }}
              >
                Active
              </span>
            </div>
            <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '12.5px' }}>
              Ultra-fast, quota-efficient multi-turn dialogue indexing, instant AST extraction, and sub-second prompt compilation.
            </p>
          </div>

          {/* Model Option: 3.5 Flash */}
          <div
            onClick={() => setModel('gemini-3.5-flash')}
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface-container)',
              border: model === 'gemini-3.5-flash' ? '2px solid var(--primary-container)' : '1px solid var(--hairline)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="font-title" style={{ color: 'var(--on-surface)', fontSize: '14px' }}>
                Gemini 3.5 Flash
              </span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--surface-container-high)',
                  color: 'var(--text-muted)',
                }}
              >
                Standard
              </span>
            </div>
            <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '12.5px' }}>
              Deep context synthesis and comprehensive multi-turn cross-conversation reasoning.
            </p>
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ fontSize: '13.5px', color: 'var(--on-surface)', fontWeight: 500 }}>
                Strict Grounding &amp; Citation Verification
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Require all synthesized responses in &ldquo;Ask My History&rdquo; to provide verbatim citations from imported transcripts.
              </div>
            </div>
            <input
              type="checkbox"
              checked={strictGrounding}
              onChange={(e) => setStrictGrounding(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary-container)', cursor: 'pointer' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ fontSize: '13.5px', color: 'var(--on-surface)', fontWeight: 500 }}>
                Deep Deliberation Mode (Chain-of-Thought)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Inspect opposing architectural trade-offs and alternative solutions before ratifying answers.
              </div>
            </div>
            <input
              type="checkbox"
              checked={reasoningDepth === 'deep'}
              onChange={(e) => setReasoningDepth(e.target.checked ? 'deep' : 'quick')}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary-container)', cursor: 'pointer' }}
            />
          </label>
        </div>
      </section>

      {/* Section 2: Storage & Local Vault */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--surface-container-low)',
          border: '1px solid var(--hairline)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={22} color="#768A7E" />
          <div>
            <h2 className="font-title" style={{ color: 'var(--on-surface)', margin: 0 }}>
              Storage &amp; Local Vault
            </h2>
            <p className="font-body-sm" style={{ color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Local-first database configurations and Google Cloud Firestore replication settings.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ fontSize: '13.5px', color: 'var(--on-surface)', fontWeight: 500 }}>
                SQLite-WASM OPFS Client Indexing Cache
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Cache inverted search indexes in the browser&rsquo;s Origin Private File System for sub-10ms query times.
              </div>
            </div>
            <input
              type="checkbox"
              checked={localCache}
              onChange={(e) => setLocalCache(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary-container)', cursor: 'pointer' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ fontSize: '13.5px', color: 'var(--on-surface)', fontWeight: 500 }}>
                Prompt Injection Armoring &amp; Quarantine
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Defuse system directive overrides and quarantine injection strings within armored XML boundary sandboxes.
              </div>
            </div>
            <input
              type="checkbox"
              checked={quarantineInjections}
              onChange={(e) => setQuarantineInjections(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary-container)', cursor: 'pointer' }}
            />
          </label>
        </div>
      </section>

      {/* Section 3: Identity & Cloud Run Backend */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--surface-container-low)',
          border: '1px solid var(--hairline)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={22} color="var(--primary)" />
          <div>
            <h2 className="font-title" style={{ color: 'var(--on-surface)', margin: 0 }}>
              Identity &amp; Cloud Run Topology
            </h2>
            <p className="font-body-sm" style={{ color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Stateless service topology connecting Firebase Hosting with regional Google Cloud Run.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface-container)',
          }}
        >
          <div>
            <span className="font-label-sm" style={{ color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Frontend URL
            </span>
            <div style={{ fontSize: '13px', color: 'var(--on-surface)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              https://compresscontext.web.app
            </div>
          </div>

          <div>
            <span className="font-label-sm" style={{ color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Backend Container
            </span>
            <div style={{ fontSize: '13px', color: 'var(--on-surface)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              Cloud Run (us-central1)
            </div>
          </div>

          <div>
            <span className="font-label-sm" style={{ color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Client Auth Status
            </span>
            <div style={{ fontSize: '13px', color: '#768A7E', marginTop: '2px', fontWeight: 500 }}>
              Verified Google Token
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
