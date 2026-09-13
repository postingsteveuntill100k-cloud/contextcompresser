'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RawImport, CanonicalConversation } from '@/types';
import { fetchWithAuth } from '@/lib/security/client_auth';
import { useData } from '@/context/DataContext';
import ContextOSLoader from './ContextOSLoader';
import Link from 'next/link';
import GoogleTakeoutGuide from './GoogleTakeoutGuide';
import { adaptiveExtractAndDiscover, ArchiveProfile } from '@/lib/ingestion/adaptive_importer';
import { extractZipArchive, isZipArchive, ExtractedFileEntry } from '@/lib/ingestion/local_extractor';
import { analyzeExtractedArchive, DiscoverySummary } from '@/lib/ingestion/source_classifier';
import {
  parseGeminiJson,
  parseMarkdownConversation,
  parseGeminiScheduledActionsHtml,
  parseGeminiActivityHtml,
  parseYouTubeActivity,
  parseBrowserActivity,
} from '@/lib/ingestion/local_parsers';
import {
  Upload,
  FileArchive,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  MessageSquare,
  FileCode,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Globe,
  Video,
  Bot,
  FileText,
  Lock,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
} from 'lucide-react';

interface ImportHubProps {
  currentUser?: string;
  onImportComplete?: () => void;
  rawImports: RawImport[];
  onExploreConversations?: () => void;
  onAskHistory?: () => void;
}

type Stage =
  | 'idle'
  | 'analyzing'
  | 'source_selection'
  | 'privacy_review'
  | 'uploading'
  | 'ready'
  | 'error';

export default function ImportHub({
  currentUser,
  onImportComplete,
  rawImports,
  onExploreConversations,
  onAskHistory,
}: ImportHubProps) {
  const { refreshData } = useData();
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Flow & State
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
    entities?: {
      decisions?: number;
      technicalSpecs?: number;
    };
  } | null>(null);

  // Local Discovery State
  const [discovery, setDiscovery] = useState<DiscoverySummary | null>(null);

  // Source Selections
  const [includeGemini, setIncludeGemini] = useState<boolean>(true);
  const [selectedConvoIds, setSelectedConvoIds] = useState<Set<string>>(new Set());
  const [convoSearch, setConvoSearch] = useState<string>('');

  const [includeYouTube, setIncludeYouTube] = useState<boolean>(false);

  const [includeBrowser, setIncludeBrowser] = useState<boolean>(false);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [domainSearch, setDomainSearch] = useState<string>('');

  const [includeCustom, setIncludeCustom] = useState<boolean>(true);
  const [selectedCustomPaths, setSelectedCustomPaths] = useState<Set<string>>(new Set());

  // UI Expansion
  const [geminiExpanded, setGeminiExpanded] = useState<boolean>(true);
  const [browserExpanded, setBrowserExpanded] = useState<boolean>(false);
  const [otherExpanded, setOtherExpanded] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const preventWindowDrop = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventWindowDrop);
    window.addEventListener('drop', preventWindowDrop);
    return () => {
      window.removeEventListener('dragover', preventWindowDrop);
      window.removeEventListener('drop', preventWindowDrop);
    };
  }, []);

  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [archiveProfile, setArchiveProfile] = useState<ArchiveProfile | null>(null);

  /**
   * Handles local extraction and discovery across one or multiple archive parts on user device.
   * Never uploads raw file to the server. Uses adaptive memory strategy.
   */
  const handleFilesUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      setSelectedFileName(files[0].name);
      setSelectedFileSize((files[0].size / (1024 * 1024)).toFixed(2) + ' MB');
    } else {
      const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
      setSelectedFileName(`${files.length} archive files (${files[0].name}, ...)`);
      setSelectedFileSize((totalBytes / (1024 * 1024)).toFixed(2) + ' MB');
    }

    setErrorMessage(null);
    setImportReport(null);
    setImportedCount(null);

    setStage('analyzing');
    setStageMessage('Reading archive on this device...');

    try {
      const { summary, profile } = await adaptiveExtractAndDiscover(files, {
        userId: currentUser || 'user_local',
        importId: 'imp_local',
        onProgress: (msg) => {
          setStageMessage(msg);
        },
      });

      setArchiveProfile(profile);

      const totalUsable =
        summary.geminiConversations.length +
        summary.youtubeRecords.length +
        summary.browserRecords.length +
        summary.customFiles.length;

      if (totalUsable === 0 && summary.otherServices.length === 0) {
        throw new Error('This archive contains no recognized history or document files (.json, .md, .txt, or .html).');
      }

      setDiscovery(summary);

      // Initialize selections
      setSelectedConvoIds(new Set(summary.geminiConversations.map((c) => c.id)));
      setIncludeGemini(summary.geminiConversations.length > 0);

      const defaultDomains = new Set<string>();
      summary.browserDomains.forEach((d) => {
        if (d.selected) defaultDomains.add(d.domain);
      });
      setSelectedDomains(defaultDomains);
      setIncludeBrowser(false); // Opt-in by default for privacy
      setIncludeYouTube(false); // Opt-in by default for privacy

      setSelectedCustomPaths(new Set(summary.customFiles.map((c) => c.path)));
      setIncludeCustom(summary.customFiles.length > 0);

      setStage('source_selection');
    } catch (err: unknown) {
      setStage('error');
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(
        msg.includes('corrupted') || msg.includes('read this ZIP')
          ? "We couldn't read this ZIP file. It may be corrupted or malformed."
          : msg
      );
    }
  };

  const handleFileUpload = (file: File) => handleFilesUpload([file]);

  /**
   * Confirms user selection and transmits ONLY the selected normalized records.
   */
  const handleConfirmAndUpload = async () => {
    if (!discovery) return;

    // Filter to strictly selected records
    const selectedConvos = includeGemini
      ? discovery.geminiConversations.filter((c) => selectedConvoIds.has(c.id))
      : [];

    const selectedYt = includeYouTube ? discovery.youtubeRecords : [];

    const selectedBrowser = includeBrowser
      ? discovery.browserRecords.filter((b) => selectedDomains.has(b.domain))
      : [];

    const selectedCustom = includeCustom
      ? discovery.customFiles.filter((f) => selectedCustomPaths.has(f.path))
      : [];

    const totalSelected =
      selectedConvos.length + selectedYt.length + selectedBrowser.length + selectedCustom.length;

    if (totalSelected === 0) {
      setErrorMessage('Please select at least one conversation or record to import.');
      return;
    }

    setStage('uploading');
    setStageMessage('Sending selected data to secure processing...');

    const allSelectedConvos: CanonicalConversation[] = [...selectedConvos];

    if (includeYouTube && selectedYt.length > 0) {
      const ytLines = selectedYt
        .slice(0, 100)
        .map(
          (y, idx) =>
            `${idx + 1}. [${y.type === 'search_history' ? 'Search' : 'Watched'}] ${y.title}${y.url ? ` - ${y.url}` : ''} (${y.timestamp})`
        )
        .join('\n');
      allSelectedConvos.push({
        id: `conv_yt_${Date.now()}`,
        userId: currentUser || 'user_local',
        importId: 'imp_local',
        title: `YouTube Research Activity (${selectedYt.length} items)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'youtube',
        messages: [
          {
            id: `m_yt_1`,
            conversationId: `conv_yt_${Date.now()}`,
            role: 'user',
            content: `Selected YouTube research activity:\n${ytLines}`,
            timestamp: new Date().toISOString(),
            tokenCount: Math.ceil(ytLines.length / 4),
          },
        ],
        summary: `YouTube activity (${selectedYt.length} records)`,
        tokenCount: Math.ceil(ytLines.length / 4),
        tags: ['youtube', 'research_activity'],
      });
    }

    if (includeBrowser && selectedBrowser.length > 0) {
      const brLines = selectedBrowser
        .slice(0, 150)
        .map(
          (b, idx) =>
            `${idx + 1}. [${b.domain}] ${b.title || b.url}${b.url ? ` - ${b.url}` : ''} (${b.timestamp})`
        )
        .join('\n');
      allSelectedConvos.push({
        id: `conv_browser_${Date.now()}`,
        userId: currentUser || 'user_local',
        importId: 'imp_local',
        title: `Web Research Activity (${selectedBrowser.length} items across ${selectedDomains.size} domains)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'browser',
        messages: [
          {
            id: `m_br_1`,
            conversationId: `conv_browser_${Date.now()}`,
            role: 'user',
            content: `Selected web activity across approved domains:\n${brLines}`,
            timestamp: new Date().toISOString(),
            tokenCount: Math.ceil(brLines.length / 4),
          },
        ],
        summary: `Web activity across ${selectedDomains.size} domains`,
        tokenCount: Math.ceil(brLines.length / 4),
        tags: ['browser', 'web_activity'],
      });
    }

    if (includeCustom && selectedCustom.length > 0) {
      for (let i = 0; i < selectedCustom.length; i++) {
        const cf = selectedCustom[i];
        allSelectedConvos.push({
          id: `conv_custom_${i}_${Date.now()}`,
          userId: currentUser || 'user_local',
          importId: 'imp_local',
          title: cf.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'custom',
          messages: [
            {
              id: `m_cf_${i}`,
              conversationId: `conv_custom_${i}_${Date.now()}`,
              role: 'user',
              content: cf.content,
              timestamp: new Date().toISOString(),
              tokenCount: Math.ceil(cf.content.length / 4),
            },
          ],
          summary: cf.content.slice(0, 140),
          tokenCount: Math.ceil(cf.content.length / 4),
          tags: ['custom_file'],
        });
      }
    }

    const BATCH_SIZE = 100;
    const totalBatches = Math.max(1, Math.ceil(allSelectedConvos.length / BATCH_SIZE));
    const persistentImportId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    interface ApiImportResponse {
      error?: string;
      duplicate?: boolean;
      conversationsImported?: number;
      format?: string;
      warnings?: string[];
      structuredEntitiesExtracted?: {
        decisions?: number;
        technicalSpecs?: number;
      };
    }

    try {
      setStageMessage('Preparing selected data...');
      await new Promise((r) => setTimeout(r, 60));

      let lastData: ApiImportResponse | null = null;
      let totalImportedConvos = 0;

      for (let b = 0; b < totalBatches; b++) {
        const batchConvos = allSelectedConvos.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
        const isFirst = b === 0;

        setStageMessage(
          totalBatches > 1
            ? `Uploading selected data (batch ${b + 1} of ${totalBatches})...`
            : 'Uploading selected data...'
        );

        const payload = {
          version: 1,
          importId: persistentImportId,
          batchIndex: b,
          totalBatches,
          filename: 'selected_history.json',
          content: JSON.stringify(batchConvos),
          selectedSources: [
            ...(includeGemini && selectedConvos.length > 0 ? ['gemini'] : []),
            ...(includeYouTube && selectedYt.length > 0 ? ['youtube'] : []),
            ...(includeBrowser && selectedBrowser.length > 0 ? ['browser'] : []),
            ...(includeCustom && selectedCustom.length > 0 ? ['custom'] : []),
          ],
          conversations: batchConvos,
          youtubeRecords: isFirst ? selectedYt : [],
          browserRecords: isFirst ? selectedBrowser : [],
          customFiles: isFirst ? selectedCustom.map((c) => ({ name: c.name, content: c.content })) : [],
          manifest: {
            geminiCount: selectedConvos.length,
            youtubeCount: selectedYt.length,
            browserDomainCount: includeBrowser ? selectedDomains.size : 0,
            browserRecordCount: selectedBrowser.length,
            customFileCount: selectedCustom.length,
            totalSelectedItems: totalSelected,
            batchIndex: b,
            totalBatches,
            confirmedAt: new Date().toISOString(),
          },
        };

        const res = await fetchWithAuth('/api/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (totalBatches > 1) {
          setStageMessage(`Processing context & indexing memories (batch ${b + 1} of ${totalBatches})...`);
        } else {
          setStageMessage('Processing context & indexing decisions...');
        }

        const text = await res.text();
        let data: ApiImportResponse;
        try {
          data = JSON.parse(text) as ApiImportResponse;
        } catch {
          throw new Error(`Server returned an unreadable response (HTTP ${res.status}).`);
        }

        if (!res.ok) {
          throw new Error(data.error || `Processing failed with status ${res.status}`);
        }

        lastData = data;
        totalImportedConvos += (data.conversationsImported ?? batchConvos.length);
      }

      setStage('ready');
      const count = totalImportedConvos > 0 ? totalImportedConvos : selectedConvos.length;
      setImportedCount(count);
      setImportReport({
        format: lastData?.format || 'Selected History',
        convoCount: count,
        warnings: lastData?.warnings,
        entities: lastData?.structuredEntitiesExtracted,
      });

      if (onImportComplete) {
        onImportComplete();
      }
      void refreshData();
    } catch (err: unknown) {
      setStage('error');
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(
        msg.includes('Network') || msg.includes('Failed to fetch')
          ? 'Your selected data could not be uploaded. Nothing else from the archive was sent.'
          : msg
      );
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      handleFilesUpload(files);
    }
  };

  // Filtered Gemini conversations
  const filteredConvos = (discovery?.geminiConversations || []).filter((c) =>
    c.title.toLowerCase().includes(convoSearch.toLowerCase())
  );

  // Filtered Browser domains
  const filteredDomains = (discovery?.browserDomains || []).filter((d) =>
    d.domain.toLowerCase().includes(domainSearch.toLowerCase())
  );

  // Calculate selected counts for privacy manifest
  const selectedGeminiCount = includeGemini ? selectedConvoIds.size : 0;
  const selectedYtCount = includeYouTube ? (discovery?.youtubeRecords.length || 0) : 0;
  const selectedBrowserRecordCount = includeBrowser
    ? (discovery?.browserRecords || []).filter((b) => selectedDomains.has(b.domain)).length
    : 0;
  const selectedCustomCount = includeCustom ? selectedCustomPaths.size : 0;
  const totalSelectedCount =
    selectedGeminiCount + selectedYtCount + selectedBrowserRecordCount + selectedCustomCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              className="font-label-sm"
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              Privacy-First Ingestion
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} color="var(--primary)" /> Client-side extraction
            </span>
          </div>
          <h1 className="font-headline-lg" style={{ color: 'var(--on-surface)', margin: 0 }}>
            Import AI & Research History
          </h1>
          <p className="font-body-md" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            ContextOS analyzes your Google Takeout archive locally on your device. You choose exactly which conversations and records are sent for processing.
          </p>
        </div>

        <button
          id="toggle-guide-btn"
          onClick={() => setShowGuide((prev) => !prev)}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <FileArchive size={15} color="var(--primary)" />
          <span>{showGuide ? 'Hide Takeout Guide' : 'Visual Takeout Guide'}</span>
        </button>
      </div>

      {/* Visual Google Takeout Guide (Toggleable) */}
      {showGuide && (
        <GoogleTakeoutGuide
          onGoToDropZone={() => {
            setShowGuide(false);
            const dropEl = document.getElementById('drop-zone');
            dropEl?.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => fileInputRef.current?.click(), 100);
          }}
          onClose={() => setShowGuide(false)}
        />
      )}

      {/* STAGE 1: IDLE DROP ZONE */}
      {stage === 'idle' && (
        <>
          {/* Quick Guide */}
          <div
            style={{
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--hairline)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileArchive size={18} color="var(--primary)" />
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--on-surface)', margin: 0 }}>
                  How to export from Google Takeout
                </h2>
              </div>
              <a
                href="https://takeout.google.com"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                <span>Open Google Takeout</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
              }}
            >
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--surface-container)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  Step 1
                </span>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', margin: 0 }}>
                  Select Services
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Deselect all, then check <strong style={{ color: 'var(--on-surface)' }}>Gemini</strong>, <strong style={{ color: 'var(--on-surface)' }}>YouTube</strong>, or <strong style={{ color: 'var(--on-surface)' }}>Chrome</strong>.
                </p>
              </div>

              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--surface-container)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  Step 2
                </span>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', margin: 0 }}>
                  Download Archive
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Receive the <code style={{ color: 'var(--primary)' }}>.zip</code> archive from Google.
                </p>
              </div>

              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--surface-container)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  Step 3
                </span>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', margin: 0 }}>
                  Local Inspection
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Drop your file below. ContextOS inspects it locally without uploading.
                </p>
              </div>

              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--surface-container)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  Step 4
                </span>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', margin: 0 }}>
                  Select & Process
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Choose only the data you want. Only approved items leave your browser.
                </p>
              </div>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            id="drop-zone"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isDragging
                ? '2px dashed var(--primary)'
                : '1px dashed var(--hairline)',
              borderRadius: 'var(--radius-xl)',
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: isDragging
                ? 'var(--surface-container-high)'
                : 'var(--surface-container-low)',
              boxShadow: isDragging ? '0 0 28px rgba(217, 119, 70, 0.28)' : 'none',
              cursor: 'pointer',
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
              multiple
              accept=".zip,.json,.html,.htm,.md,.txt"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const files = Array.from(e.target.files);
                  handleFilesUpload(files);
                  e.target.value = '';
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
              <Upload size={26} />
            </div>

            <div>
              <h3 className="font-title" style={{ color: 'var(--on-surface)', margin: '0 0 6px 0', fontSize: '16px' }}>
                {isDragging ? 'Drop your Takeout archive(s) here' : 'Drop your history here or click to browse'}
              </h3>
              <p className="font-body-sm" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                {isDragging
                  ? 'Release to inspect locally on your device'
                  : 'Select your Google Takeout (.zip), Gemini export (.json), or Markdown notes.'}
              </p>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Multi-part archives supported: If Google split your Takeout into 2 GB files (e.g. 001.zip, 002.zip), select or drop them all together!
              </p>
            </div>

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
                .ZIP (Google Takeout)
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
                .MD (Markdown Notes)
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· Processed strictly locally first</span>
            </div>
          </div>
        </>
      )}

      {/* STAGE 2: LOCAL EXTRACTION & ANALYSIS (LOOPING ANIMATION) */}
      {stage === 'analyzing' && (
        <div
          id="analyzing-card"
          style={{
            backgroundColor: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--hairline)',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <ContextOSLoader size={36} status="" />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', margin: '0 0 6px 0' }}>
              Analyzing your archive locally...
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>
              {stageMessage || 'Reading archive files on this device...'}
            </p>
          </div>
          {archiveProfile && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: 'var(--surface-container-high)',
                border: '1px solid var(--hairline-strong)',
                fontSize: '11.5px',
                color: 'var(--primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Sparkles size={13} />
              <span>
                Adaptive Engine: {archiveProfile.strategy} Mode · {archiveProfile.strategyReason}
              </span>
            </div>
          )}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: 'var(--surface-container-high)',
              fontSize: '12px',
              color: 'var(--primary)',
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={14} />
            <span>Zero bytes leave your device during analysis</span>
          </div>
        </div>
      )}

      {/* STAGE 3: SOURCE SELECTION */}
      {stage === 'source_selection' && discovery && (
        <div
          id="source-selection-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Adaptive Importer Engine Status Pill */}
          {archiveProfile && (
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: 'var(--surface-container)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--hairline)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={15} color="var(--primary)" />
                <span style={{ color: 'var(--on-surface)' }}>
                  <strong>Adaptive Engine:</strong> {archiveProfile.strategy} Strategy (
                  {archiveProfile.totalFiles.toLocaleString()} files indexed,{' '}
                  {(archiveProfile.totalCompressedBytes / (1024 * 1024)).toFixed(1)} MB
                  {archiveProfile.isMultiPart ? ` across ${archiveProfile.partCount} parts` : ''})
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(217, 90, 48, 0.12)',
                  color: 'var(--primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Memory Shield: Active
              </span>
            </div>
          )}

          {/* Trust Banner */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(217, 119, 70, 0.08)',
              border: '1px solid rgba(217, 119, 70, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} color="var(--primary)" />
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--on-surface)' }}>
                  Archive analyzed locally on this device
                </span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Choose exactly what ContextOS is allowed to process. Unselected data stays strictly on your device.
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
              }}
            >
              {discovery.totalFiles} files inspected ({((discovery.totalDecompressedBytes || 0) / (1024 * 1024)).toFixed(1)} MB)
            </span>
          </div>

          {/* 1. GEMINI CONVERSATIONS */}
          <div
            id="source-card-gemini"
            style={{
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              border: includeGemini ? '1px solid var(--primary)' : '1px solid var(--hairline)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--surface-container)',
                borderBottom: geminiExpanded ? '1px solid var(--hairline)' : 'none',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={includeGemini}
                  onChange={(e) => setIncludeGemini(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={18} color="var(--primary)" />
                  <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--on-surface)' }}>
                    Gemini Conversations
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-container-high)',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {discovery.geminiConversations.length}
                  </span>
                </div>
              </label>

              <button
                type="button"
                onClick={() => setGeminiExpanded(!geminiExpanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12.5px',
                }}
              >
                <span>{geminiExpanded ? 'Hide' : 'Review'}</span>
                {geminiExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {geminiExpanded && includeGemini && (
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search
                      size={14}
                      color="var(--text-muted)"
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={convoSearch}
                      onChange={(e) => setConvoSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '12.5px',
                        backgroundColor: 'var(--surface-container)',
                        border: '1px solid var(--hairline)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--on-surface)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedConvoIds(new Set(discovery.geminiConversations.map((c) => c.id)))}
                      className="btn-ghost"
                      style={{ padding: '4px 8px', fontSize: '11.5px' }}
                    >
                      Select all ({discovery.geminiConversations.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedConvoIds(new Set())}
                      className="btn-ghost"
                      style={{ padding: '4px 8px', fontSize: '11.5px' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-container-lowest)',
                  }}
                >
                  {filteredConvos.length > 0 ? (
                    filteredConvos.map((c) => {
                      const isSelected = selectedConvoIds.has(c.id);
                      return (
                        <label
                          key={c.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--hairline)',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(217, 119, 70, 0.04)' : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const next = new Set(selectedConvoIds);
                              if (e.target.checked) next.add(c.id);
                              else next.delete(c.id);
                              setSelectedConvoIds(next);
                            }}
                            style={{ marginTop: '3px', accentColor: 'var(--primary)' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.title}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                                {c.messages.length} messages
                              </span>
                            </div>
                            {c.summary && (
                              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.summary}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      No conversations match &ldquo;{convoSearch}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. YOUTUBE ACTIVITY */}
          <div
            id="source-card-youtube"
            style={{
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              border: includeYouTube ? '1px solid var(--primary)' : '1px solid var(--hairline)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={includeYouTube}
                onChange={(e) => setIncludeYouTube(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={18} color="var(--primary)" />
                <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--on-surface)' }}>
                  YouTube Activity
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--surface-container-high)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  {discovery.youtubeRecords.length} records
                </span>
              </div>
            </label>

            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Watch & search history for research context
            </span>
          </div>

          {/* 3. BROWSER & WEB ACTIVITY */}
          <div
            id="source-card-browser"
            style={{
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              border: includeBrowser ? '1px solid var(--primary)' : '1px solid var(--hairline)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--surface-container)',
                borderBottom: browserExpanded ? '1px solid var(--hairline)' : 'none',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={includeBrowser}
                  onChange={(e) => setIncludeBrowser(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={18} color="var(--primary)" />
                  <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--on-surface)' }}>
                    Browser / Web Activity
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-container-high)',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {discovery.browserRecords.length} records across {discovery.browserDomains.length} domains
                  </span>
                </div>
              </label>

              <button
                type="button"
                onClick={() => setBrowserExpanded(!browserExpanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12.5px',
                }}
              >
                <span>{browserExpanded ? 'Hide domains' : 'Filter domains'}</span>
                {browserExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {browserExpanded && includeBrowser && (
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search
                      size={14}
                      color="var(--text-muted)"
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      placeholder="Search domains (e.g. github.com)..."
                      value={domainSearch}
                      onChange={(e) => setDomainSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '12.5px',
                        backgroundColor: 'var(--surface-container)',
                        border: '1px solid var(--hairline)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--on-surface)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedDomains(new Set(discovery.browserDomains.map((d) => d.domain)))}
                      className="btn-ghost"
                      style={{ padding: '4px 8px', fontSize: '11.5px' }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDomains(new Set())}
                      className="btn-ghost"
                      style={{ padding: '4px 8px', fontSize: '11.5px' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-container-lowest)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '1px',
                  }}
                >
                  {filteredDomains.length > 0 ? (
                    filteredDomains.map((d) => {
                      const isSelected = selectedDomains.has(d.domain);
                      return (
                        <label
                          key={d.domain}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(217, 119, 70, 0.05)' : 'transparent',
                            borderBottom: '1px solid var(--hairline)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const next = new Set(selectedDomains);
                              if (e.target.checked) next.add(d.domain);
                              else next.delete(d.domain);
                              setSelectedDomains(next);
                            }}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--on-surface)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.domain}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {d.count}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      No domains match &ldquo;{domainSearch}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. CUSTOM FILES */}
          {discovery.customFiles.length > 0 && (
            <div
              id="source-card-custom"
              style={{
                backgroundColor: 'var(--surface-container-low)',
                borderRadius: 'var(--radius-lg)',
                border: includeCustom ? '1px solid var(--primary)' : '1px solid var(--hairline)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={includeCustom}
                  onChange={(e) => setIncludeCustom(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--primary)" />
                  <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--on-surface)' }}>
                    Custom Notes & Documents
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-container-high)',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {discovery.customFiles.length} files
                  </span>
                </div>
              </label>

              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Markdown & custom text files
              </span>
            </div>
          )}

          {/* 5. OTHER GOOGLE SERVICES (SAFELY IGNORED / INFORMATIONAL) */}
          {discovery.otherServices.length > 0 && (
            <div
              id="source-card-other"
              style={{
                backgroundColor: 'var(--surface-container-low)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--hairline)',
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => setOtherExpanded(!otherExpanded)}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: 'var(--surface-container)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="var(--success)" />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--on-surface)' }}>
                    Other Takeout services safely ignored ({discovery.otherServices.length})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>{otherExpanded ? 'Hide' : 'Show'}</span>
                  {otherExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {otherExpanded && (
                <div style={{ padding: '14px 16px', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <p style={{ margin: '0 0 10px 0' }}>
                    ContextOS specializes in AI conversations and research history. The following services detected in your Takeout archive are <strong style={{ color: 'var(--on-surface)' }}>never uploaded</strong>:
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {discovery.otherServices.map((s) => (
                      <span
                        key={s.service}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--surface-container-high)',
                          fontSize: '11.5px',
                          color: 'var(--on-surface)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {s.service} ({s.fileCount} files)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1px solid var(--hairline)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setStage('idle');
                setDiscovery(null);
              }}
              className="btn-ghost"
              style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={14} />
              <span>Choose different archive</span>
            </button>

            <button
              id="btn-review-selection"
              type="button"
              onClick={() => {
                if (totalSelectedCount === 0) {
                  setErrorMessage('Please select at least one item to continue.');
                  return;
                }
                setErrorMessage(null);
                setStage('privacy_review');
              }}
              className="btn-primary"
              style={{
                padding: '10px 20px',
                fontSize: '13.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <span>Review Selected Data ({totalSelectedCount} items)</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 4: PRIVACY CONFIRMATION & MANIFEST */}
      {stage === 'privacy_review' && discovery && (
        <div
          id="privacy-review-card"
          style={{
            backgroundColor: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--primary)',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(217, 119, 70, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ color: 'var(--on-surface)', margin: 0, fontSize: '17px', fontWeight: 600 }}>
                Privacy Confirmation: Only your selected data will be sent
              </h3>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '13.5px', lineHeight: 1.5 }}>
                Your complete Takeout archive stays on your computer. ContextOS will upload only the normalized records you explicitly approved below.
              </p>
            </div>
          </div>

          {/* Manifest Table */}
          <div
            style={{
              backgroundColor: 'var(--surface-container)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--hairline)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--hairline)',
                fontWeight: 600,
                fontSize: '13px',
                color: 'var(--on-surface)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Selected Source Breakdown</span>
              <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>Ready to transmit</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--on-surface)' }}>Gemini Conversations</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: selectedGeminiCount > 0 ? 'var(--on-surface)' : 'var(--text-muted)' }}>
                  {selectedGeminiCount} conversations
                </span>
              </div>

              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--on-surface)' }}>YouTube Research Activity</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: selectedYtCount > 0 ? 'var(--on-surface)' : 'var(--text-muted)' }}>
                  {selectedYtCount > 0 ? `${selectedYtCount} records` : 'None selected'}
                </span>
              </div>

              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--on-surface)' }}>Browser Web Activity</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: selectedBrowserRecordCount > 0 ? 'var(--on-surface)' : 'var(--text-muted)' }}>
                  {selectedBrowserRecordCount > 0 ? `${selectedBrowserRecordCount} records across ${selectedDomains.size} domains` : 'None selected'}
                </span>
              </div>

              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--on-surface)' }}>Custom Files</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: selectedCustomCount > 0 ? 'var(--on-surface)' : 'var(--text-muted)' }}>
                  {selectedCustomCount > 0 ? `${selectedCustomCount} files` : 'None selected'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setStage('source_selection')}
              className="btn-ghost"
              style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Edit Selection</span>
            </button>

            <button
              id="btn-confirm-upload"
              type="button"
              onClick={handleConfirmAndUpload}
              className="btn-primary"
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} />
              <span>Confirm & Build Context</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 5: UPLOADING & CLOUD CONTEXT EXTRACTION */}
      {stage === 'uploading' && (
        <div
          id="uploading-progress-card"
          style={{
            backgroundColor: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--hairline)',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <ContextOSLoader size={36} status="" />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', margin: '0 0 6px 0' }}>
              Building your context...
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>
              {stageMessage || 'Extracting decisions, technical specs, and indexing context...'}
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Processing only your approved items
          </span>
        </div>
      )}

      {/* STAGE 6: READY BANNER */}
      {stage === 'ready' && importedCount !== null && (
        <div
          id="import-complete-card"
          style={{
            backgroundColor: 'var(--surface-container-low)',
            border: '1px solid var(--success)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(118, 138, 126, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 style={{ color: 'var(--on-surface)', margin: 0, fontSize: '17px', fontWeight: 600 }}>
                Your context is ready
              </h3>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '13.5px' }}>
                {importedCount} {importedCount === 1 ? 'item' : 'items'} processed and indexed.
                {importReport?.entities?.decisions
                  ? ` Extracted ${importReport.entities.decisions} decisions and ${importReport.entities.technicalSpecs || 0} specifications.`
                  : ''}
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

            <button
              type="button"
              onClick={() => {
                setStage('idle');
                setDiscovery(null);
                setSelectedFileName('');
                setSelectedFileSize('');
                setImportedCount(null);
              }}
              className="btn-ghost"
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <RotateCcw size={14} />
              <span>Import Another Archive</span>
            </button>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMessage && stage !== 'source_selection' && (
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
          <div style={{ flex: 1 }}>
            <h4 style={{ color: 'var(--error)', margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>
              Import could not be completed
            </h4>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px 0', fontSize: '13px', lineHeight: 1.5 }}>
              {errorMessage}
            </p>
            <button
              onClick={() => {
                setStage('idle');
                setErrorMessage(null);
                setSelectedFileName('');
                setSelectedFileSize('');
                setDiscovery(null);
              }}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12.5px',
              }}
            >
              <RotateCcw size={13} />
              <span>Try Another File</span>
            </button>
          </div>
        </div>
      )}

      {/* Audit Trail: Previously Imported Archives */}
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
            No archives imported yet. Select or drop your archive above to begin.
          </div>
        )}
      </section>
    </div>
  );
}
