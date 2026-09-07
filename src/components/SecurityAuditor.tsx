'use client';

import React, { useState } from 'react';
import { SecurityAuditReport, SecurityTestCase } from '@/lib/security/auditor';
import { fetchWithAuth } from '@/lib/security/client_auth';
import { ShieldCheck, Shield, Lock, Key, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function SecurityAuditor() {
  const [report, setReport] = useState<SecurityAuditReport | null>(null);
  const [testing, setTesting] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const runAudit = async () => {
    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await fetchWithAuth('/api/security-test', { method: 'POST' });
      const data = await res.json();
      if (res.status === 403) {
        setStatusMessage('Penetration test suite is disabled in production to eliminate attack surface.');
      } else if (data.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error('Security audit execution failed:', err);
      setStatusMessage('Security audit execution failed.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="font-label-sm" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <span>System</span>
          <span style={{ margin: '0 8px', color: 'var(--hairline)' }}>/</span>
          <span style={{ color: 'var(--on-surface)' }}>Security &amp; Cross-User Isolation</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ maxWidth: '720px' }}>
            <h1 className="font-headline-lg" style={{ color: 'var(--on-surface)', margin: 0 }}>
              Security &amp; Privacy Monitor
            </h1>
            <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.6 }}>
              Automated adversarial penetration test suite verifying cross-user partition barriers, ID guessing defenses, prompt injection containment, and zero-leak secret management.
            </p>
          </div>

          <button
            id="btn-run-security-tests"
            className="btn-primary"
            disabled={testing}
            onClick={runAudit}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {testing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            <span>{testing ? 'Executing Attack Suite...' : 'Run Penetration Suite'}</span>
          </button>
        </div>

        {statusMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-container-high)',
              border: '1px solid var(--hairline)',
              color: 'var(--primary)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Shield size={18} />
            <span>{statusMessage}</span>
          </div>
        )}
      </section>

      {/* Security Architecture Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        <div
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={20} color="var(--primary)" />
            <h3 className="font-title" style={{ margin: 0, fontSize: '14.5px', color: 'var(--on-surface)' }}>
              User Tenant Isolation
            </h3>
          </div>
          <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Every conversation, memory entity, and context package is strictly isolated by authenticated userId. Cross-user reading and enumeration are denied at the server layer.
          </p>
        </div>

        <div
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#efbe7d" />
            <h3 className="font-title" style={{ margin: 0, fontSize: '14.5px', color: 'var(--on-surface)' }}>
              Prompt Injection Boundary
            </h3>
          </div>
          <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Historical archives are treated as untrusted data. Directive override keywords are defused and historical text is quarantined within armored XML boundary sandboxes.
          </p>
        </div>

        <div
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} color="#768A7E" />
            <h3 className="font-title" style={{ margin: 0, fontSize: '14.5px', color: 'var(--on-surface)' }}>
              Zero-Leak Secret Policy
            </h3>
          </div>
          <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Gemini API keys and infrastructure secrets are held exclusively in Node.js server memory and never transmitted to the browser or logged in traces.
          </p>
        </div>
      </div>

      {/* Audit Report Results */}
      {report && (
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {report.status === 'SECURE' ? (
                <CheckCircle2 size={24} color="#768A7E" />
              ) : (
                <AlertCircle size={24} color="var(--error)" />
              )}
              <div>
                <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: 0 }}>
                  {report.status === 'SECURE' ? 'All Security Invariants Verified' : 'Security Tests Flagged Issues'}
                </h3>
                <span className="font-label-sm" style={{ color: 'var(--text-muted)' }}>
                  {report.passedTests} of {report.totalTests} tests passed
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--surface-container)',
                color: report.status === 'SECURE' ? '#768A7E' : 'var(--error)',
              }}
            >
              {report.status === 'SECURE' ? 'Partition Secure' : 'Vulnerabilities Detected'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {report.results.map((tc: SecurityTestCase, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-container)',
                  border: '1px solid var(--hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {tc.passed ? (
                    <CheckCircle2 size={16} color="#768A7E" style={{ flexShrink: 0 }} />
                  ) : (
                    <AlertCircle size={16} color="var(--error)" style={{ flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--on-surface)', fontWeight: 500 }}>
                      {tc.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {tc.details}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: tc.passed ? '#768A7E' : 'var(--error)',
                  }}
                >
                  {tc.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
