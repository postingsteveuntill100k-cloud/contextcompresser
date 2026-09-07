'use client';

import React, { useState, useRef } from 'react';
import { RawImport } from '@/types';
import { fetchWithAuth } from '@/lib/security/client_auth';
import Link from 'next/link';
import {
  Upload,
  FileArchive,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  MessageSquare,
  Loader2,
  FileCode,
} from 'lucide-react';

interface ImportHubProps {
  currentUser?: string;
  onImportComplete?: () => void;
  rawImports: RawImport[];
  onExploreConversations?: () => void;
  onAskHistory?: () => void;
}

type Stage = 'idle' | 'uploading' | 'parsing' | 'normalizing' | 'extracting' | 'indexing' | 'ready' | 'error';

export default function ImportHub({
  onImportComplete,
  rawImports,
  onExploreConversations,
  onAskHistory,
}: ImportHubProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [stageMessage, setStageMessage] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileSize, setSelectedFileSize] = useState<string>('');
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importReport, setImportReport] = useState<{
    format?: string;
    convoCount?: number;
    warnings?: string[];
    duplicate?: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setSelectedFileName(file.name);
    setSelectedFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    setErrorMessage(null);
    setImportReport(null);
    setImportedCount(null);

    // Real progress stages based on actual processing
    setStage('uploading');
    setStageMessage(`Uploading ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Transition to server processing
      setStage('parsing');
      setStageMessage('Parsing archive structure and validating schema...');

      const res = await fetchWithAuth('/api/import', {
        method: 'POST',
        body: formData,
      });

      setStage('extracting');
      setStageMessage('Extracting decisions, technical context, and indexing for retrieval...');

      // Handle non-JSON or server error safely without letting syntax error leak
      interface ApiImportResponse {
        error?: string;
        duplicate?: boolean;
        conversationCount?: number;
        conversationsImported?: number;
        conversations?: unknown[];
        format?: string;
        message?: string;
        warnings?: string[];
      }
      let data: ApiImportResponse;
      const text = await res.text();
      try {
        data = JSON.parse(text) as ApiImportResponse;
      } catch {
        throw new Error(`Server returned an unreadable response (HTTP ${res.status}). Please verify server logs.`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Import failed with status ${res.status}`);
      }

      if (data.duplicate) {
        setStage('ready');
        setImportedCount(data.conversationCount || 0);
        setImportReport({
          duplicate: true,
          convoCount: data.conversationCount || 0,
          warnings: data.message ? [data.message] : [],
        });
      } else {
        setStage('ready');
        const count = data.conversationsImported ?? (data.conversations ? data.conversations.length : 0);
        setImportedCount(count);
        setImportReport({
          format: data.format,
          convoCount: count,
          warnings: data.warnings,
        });
      }

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: unknown) {
      setStage('error');
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '36px 24px 80px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {/* Header */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span
          className="font-label-sm"
          style={{
            color: 'var(--primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}
        >
          Data Ingestion
        </span>
        <h1 className="font-headline-lg" style={{ color: 'var(--on-surface)', margin: 0, fontSize: '32px', fontWeight: 400 }}>
          Import AI History
        </h1>
        <p className="font-body-md" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: '680px' }}>
          Connect your Google Gemini history archive. ContextOS preserves your raw archives verbatim as immutable evidence, extracts decisions and context, and indexes everything for instant retrieval.
        </p>
      </section>

      {/* Step-by-Step Onboarding Guide for Google Takeout */}
      <div
        style={{
          backgroundColor: 'var(--surface-container-low)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="font-title" style={{ color: 'var(--on-surface)', margin: 0, fontSize: '16px' }}>
              How to obtain your Gemini history
            </h2>
            <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Follow these simple steps to export your data directly from Google.
            </p>
          </div>

          <a
            id="link-google-takeout"
            href="https://takeout.google.com/takeout/custom/gemini"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-container-high)',
              border: '1px solid var(--hairline)',
              color: 'var(--on-surface)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span>Open Google Takeout</span>
            <ExternalLink size={14} color="var(--primary-container)" />
          </a>
        </div>

        {/* 4 Steps */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
          }}
        >
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-container)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              Step 1
            </span>
            <h3 style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--on-surface)', margin: 0 }}>
              Export Gemini Activity
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Visit Google Takeout with Gemini pre-selected. Click &ldquo;Next Step&rdquo;.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-container)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              Step 2
            </span>
            <h3 style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--on-surface)', margin: 0 }}>
              Download Archive
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              When your export is ready, download the <code style={{ color: 'var(--primary)' }}>.zip</code> or <code style={{ color: 'var(--primary)' }}>.json</code> file.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-container)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              Step 3
            </span>
            <h3 style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--on-surface)', margin: 0 }}>
              Upload Archive
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Select or drag your archive into the drop zone below.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-container)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              Step 4
            </span>
            <h3 style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--on-surface)', margin: 0 }}>
              Automatic Indexing
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              ContextOS indexes all conversations and extracts key decisions automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Clean Drag & Drop Zone */}
      <div
        id="drop-zone"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => {
          if (stage !== 'uploading' && stage !== 'parsing' && stage !== 'extracting') {
            fileInputRef.current?.click();
          }
        }}
        style={{
          border: isDragging ? '2px dashed var(--primary-container)' : '1px dashed var(--hairline)',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: isDragging ? 'var(--surface-container-high)' : 'var(--surface-container-low)',
          cursor: stage === 'uploading' || stage === 'parsing' || stage === 'extracting' ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <input
          id="archive-file-input"
          type="file"
          ref={fileInputRef}
          accept=".zip,.json,.md"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--surface-container)',
            border: '1px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-container)',
          }}
        >
          {stage === 'uploading' || stage === 'parsing' || stage === 'extracting' ? (
            <Loader2 size={26} className="animate-spin" />
          ) : stage === 'ready' ? (
            <CheckCircle2 size={26} color="var(--success)" />
          ) : (
            <Upload size={26} />
          )}
        </div>

        <div>
          <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: '0 0 6px 0', fontSize: '16px' }}>
            {stage === 'uploading'
              ? 'Uploading archive...'
              : stage === 'parsing'
              ? 'Parsing and verifying archive...'
              : stage === 'extracting'
              ? 'Extracting context & indexing...'
              : stage === 'ready'
              ? 'Archive processed successfully'
              : 'Select your Gemini Archive to Import'}
          </h3>
          <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {stageMessage || 'Drag and drop your file here, or click to browse'}
          </p>
        </div>

        {/* Supported Formats & File Limits */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-container)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            .ZIP (Takeout Archive)
          </span>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-container)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            .JSON (Gemini Export)
          </span>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-container)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            .MD (Markdown Log)
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· Up to 50 MB</span>
        </div>

        {selectedFileName && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '4px',
              backgroundColor: 'var(--surface-container-high)',
              fontSize: '12px',
              color: 'var(--on-surface)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <FileCode size={13} />
            <span>{selectedFileName}</span>
            {selectedFileSize && <span style={{ color: 'var(--text-muted)' }}>({selectedFileSize})</span>}
          </div>
        )}
      </div>

      {/* Completion Banner */}
      {stage === 'ready' && importedCount !== null && (
        <div
          id="import-complete-card"
          style={{
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--success)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(118, 138, 126, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 style={{ color: 'var(--on-surface)', margin: 0, fontSize: '16px', fontWeight: 600 }}>
                Import complete
              </h3>
              <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0 0', fontSize: '13.5px' }}>
                {importedCount} {importedCount === 1 ? 'conversation' : 'conversations'} imported and indexed.
                {importReport?.format ? ` (Source: ${importReport.format})` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {onExploreConversations ? (
              <button
                id="btn-explore-conversations"
                onClick={onExploreConversations}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MessageSquare size={14} />
                <span>Explore conversations</span>
              </button>
            ) : (
              <Link
                id="btn-explore-conversations-link"
                href="/conversations"
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <MessageSquare size={14} />
                <span>Explore conversations</span>
              </Link>
            )}

            {onAskHistory ? (
              <button
                id="btn-ask-history-after-import"
                onClick={onAskHistory}
                className="btn-ghost"
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--surface-container-high)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--on-surface)',
                  cursor: 'pointer',
                }}
              >
                <Search size={14} color="var(--primary)" />
                <span>Ask my history</span>
              </button>
            ) : (
              <Link
                id="btn-ask-history-after-import-link"
                href="/ask"
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--surface-container-high)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--on-surface)',
                  textDecoration: 'none',
                }}
              >
                <Search size={14} color="var(--primary)" />
                <span>Ask my history</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Human-Readable Error Banner */}
      {errorMessage && (
        <div
          id="import-error-card"
          style={{
            backgroundColor: 'rgba(255, 180, 171, 0.08)',
            border: '1px solid var(--error)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <AlertCircle size={20} color="var(--error)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ color: 'var(--error)', margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>
              Import could not be completed
            </h4>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Previously Imported Raw Archives */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <span
              className="font-label-sm"
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              Audit Trail
            </span>
            <h2 className="font-headline-sm" style={{ color: 'var(--on-surface)', margin: '2px 0 0 0', fontSize: '18px' }}>
              Imported Archives ({rawImports.length})
            </h2>
          </div>
        </div>

        {rawImports.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rawImports.map((imp) => (
              <div
                key={imp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-container-low)',
                  border: '1px solid var(--hairline)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileArchive size={18} color="var(--primary)" />
                  <div>
                    <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--on-surface)' }}>
                      {imp.filename}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span>{imp.format}</span>
                      <span>·</span>
                      <span>{imp.conversationCount} conversations</span>
                      <span>·</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>SHA-256: {imp.sha256?.slice(0, 10)}...</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <Clock size={13} />
                  <span>{new Date(imp.importedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '24px',
              backgroundColor: 'var(--surface-container-low)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}
          >
            No archives imported yet. Export your Takeout archive to get started.
          </div>
        )}
      </section>
    </div>
  );
}
