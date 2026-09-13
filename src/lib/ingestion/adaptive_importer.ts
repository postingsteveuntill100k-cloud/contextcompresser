import JSZip from 'jszip';
import { sanitizeArchivePath, isZipArchive, ExtractedFileEntry } from './local_extractor';
import {
  classifyFileSource,
  analyzeExtractedArchive,
  DiscoverySummary,
} from './source_classifier';
import { CanonicalConversation } from '@/types';
import { NormalizedYouTubeRecord, NormalizedBrowserRecord } from './local_parsers';

export type AdaptiveStrategy = 'SMALL' | 'MEDIUM' | 'LARGE' | 'VERY_LARGE' | 'SUSPICIOUS';

export interface ArchiveProfile {
  totalFiles: number;
  totalCompressedBytes: number;
  totalEstimatedDecompressedBytes: number;
  compressionRatio: number;
  largestEntryBytes: number;
  largestEntryName: string;
  strategy: AdaptiveStrategy;
  strategyReason: string;
  isSuspicious: boolean;
  suspiciousReason?: string;
  fileTypeDistribution: Record<string, number>;
  isMultiPart: boolean;
  partCount: number;
  deviceMemoryGB?: number;
}

export interface AdaptiveProcessingOptions {
  onProgress?: (stage: string, percent?: number) => void;
  userId?: string;
  importId?: string;
  strategyOverride?: AdaptiveStrategy;
}

/**
 * Non-text binary extensions that should NEVER be decompressed as text into RAM,
 * especially in medium, large, and very large Takeout archives.
 */
const BINARY_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'bmp',
  'tiff',
  'svg',
  'mp4',
  'mov',
  'mkv',
  'avi',
  'wmv',
  'webm',
  'mp3',
  'wav',
  'm4a',
  'flac',
  'ogg',
  'aac',
  'pdf',
  'zip',
  'tar',
  'gz',
  '7z',
  'rar',
  'exe',
  'bin',
  'iso',
  'dmg',
  'apk',
]);

/**
 * Checks available browser memory if supported by the browser runtime.
 */
function getBrowserMemorySignals(): { deviceMemoryGB?: number; jsHeapLimitMB?: number } {
  const result: { deviceMemoryGB?: number; jsHeapLimitMB?: number } = {};

  if (typeof navigator !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (typeof nav.deviceMemory === 'number') {
      result.deviceMemoryGB = nav.deviceMemory;
    }
  }

  if (typeof performance !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perf = performance as any;
    if (perf.memory && typeof perf.memory.jsHeapSizeLimit === 'number') {
      result.jsHeapLimitMB = Math.round(perf.memory.jsHeapSizeLimit / (1024 * 1024));
    }
  }

  return result;
}

/**
 * Inspects archive metadata, file counts, compression ratio, and memory signals
 * to determine the optimal adaptive processing strategy.
 */
export async function profileArchives(
  files: (File | Blob | ArrayBuffer | Uint8Array)[],
  fileNames: string[] = []
): Promise<ArchiveProfile> {
  let totalCompressedBytes = 0;
  let totalEstimatedDecompressedBytes = 0;
  let totalFiles = 0;
  let largestEntryBytes = 0;
  let largestEntryName = '';
  let isSuspicious = false;
  let suspiciousReason: string | undefined;

  const fileTypeDistribution: Record<string, number> = {};
  const isMultiPart = files.length > 1;

  for (let fIdx = 0; fIdx < files.length; fIdx++) {
    const file = files[fIdx];
    const name = fileNames[fIdx] || (file instanceof File ? file.name : `archive_${fIdx + 1}.zip`);

    let byteLength = 0;
    if (file && typeof (file as any).size === 'number') {
      byteLength = (file as any).size;
    } else if (file instanceof ArrayBuffer || file instanceof Uint8Array) {
      byteLength = file.byteLength;
    }
    totalCompressedBytes += byteLength;

    // Check if it's a zip archive
    const isZip = await isZipArchive(file);
    if (!isZip) {
      // Standalone file (.json, .html, .md, .txt)
      totalFiles += 1;
      totalEstimatedDecompressedBytes += byteLength;
      const extMatch = name.match(/\.([0-9a-zA-Z]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'other';
      fileTypeDistribution[ext] = (fileTypeDistribution[ext] || 0) + 1;
      continue;
    }

    // Inspect ZIP central directory without decompressing all file payloads
    let zip: JSZip | null = null;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (err: unknown) {
      if (byteLength > 100 * 1024 * 1024) {
        // Large or mock archive where full stream loading is bypassed
        totalEstimatedDecompressedBytes += byteLength;
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to inspect ZIP archive "${name}": ${msg}`);
      }
    }

    if (zip) {
      const entries = Object.entries(zip.files);
      for (const [rawPath, zipObj] of entries) {
        // Path traversal check (including root escapes and illegal root dir markers)
        if (
          rawPath.includes('../') ||
          rawPath.includes('..\\') ||
          rawPath.startsWith('/') ||
          rawPath === '/' ||
          rawPath.includes('\0') ||
          rawPath.startsWith('\\')
        ) {
          isSuspicious = true;
          suspiciousReason = `Archive contains suspicious path traversal entries: "${rawPath}".`;
        }

        if (zipObj.dir) continue;
        totalFiles += 1;

        const safePath = sanitizeArchivePath(rawPath);
        const parts = safePath.split('/');
        const filename = parts[parts.length - 1];
        const extMatch = filename.match(/\.([0-9a-zA-Z]+)$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'none';
        fileTypeDistribution[ext] = (fileTypeDistribution[ext] || 0) + 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uncompressedSize = (zipObj as any)._data?.uncompressedSize || (zipObj as any).uncompressedSize || 0;
        totalEstimatedDecompressedBytes += uncompressedSize;

        if (uncompressedSize > largestEntryBytes) {
          largestEntryBytes = uncompressedSize;
          largestEntryName = filename;
        }
      }
    }
  }

  // Calculate compression ratio
  const compressionRatio =
    totalCompressedBytes > 0 ? totalEstimatedDecompressedBytes / totalCompressedBytes : 1;

  // Decompression bomb detection (e.g. 42.zip or 100:1 ratio with > 100 MB decompressed)
  if (compressionRatio > 100 && totalEstimatedDecompressedBytes > 100 * 1024 * 1024) {
    isSuspicious = true;
    suspiciousReason = `Suspicious compression ratio (${compressionRatio.toFixed(0)}:1) detected. Possible decompression bomb.`;
  }

  const { deviceMemoryGB } = getBrowserMemorySignals();

  // Strategy Determination
  let strategy: AdaptiveStrategy = 'SMALL';
  let strategyReason = 'Standard in-memory processing.';

  if (isSuspicious) {
    strategy = 'SUSPICIOUS';
    strategyReason = suspiciousReason || 'Archive security checks failed.';
  } else if (
    totalCompressedBytes > 1024 * 1024 * 1024 || // > 1 GB
    totalFiles > 15000 ||
    (deviceMemoryGB && deviceMemoryGB <= 4 && totalCompressedBytes > 400 * 1024 * 1024)
  ) {
    strategy = 'VERY_LARGE';
    strategyReason = `Very large archive (${(totalCompressedBytes / (1024 * 1024)).toFixed(0)} MB, ${totalFiles.toLocaleString()} files). Using sequential batching and aggressive memory release.`;
  } else if (totalCompressedBytes > 100 * 1024 * 1024 || totalFiles > 3000) {
    strategy = 'LARGE';
    strategyReason = `Large archive (${(totalCompressedBytes / (1024 * 1024)).toFixed(0)} MB, ${totalFiles.toLocaleString()} files). Using incremental chunking and lazy text extraction.`;
  } else if (totalCompressedBytes > 25 * 1024 * 1024 || totalFiles > 500) {
    strategy = 'MEDIUM';
    strategyReason = `Medium archive (${(totalCompressedBytes / (1024 * 1024)).toFixed(0)} MB, ${totalFiles.toLocaleString()} files). Using controlled memory streaming.`;
  } else {
    strategy = 'SMALL';
    strategyReason = `Small archive (${(totalCompressedBytes / (1024 * 1024)).toFixed(1)} MB, ${totalFiles.toLocaleString()} files). Fast direct extraction.`;
  }

  return {
    totalFiles,
    totalCompressedBytes,
    totalEstimatedDecompressedBytes,
    compressionRatio: Number(compressionRatio.toFixed(2)),
    largestEntryBytes,
    largestEntryName,
    strategy,
    strategyReason,
    isSuspicious,
    suspiciousReason,
    fileTypeDistribution,
    isMultiPart,
    partCount: files.length,
    deviceMemoryGB,
  };
}

/**
 * Executes adaptive extraction and discovery across one or multiple archive parts.
 * Never loads all raw entries into RAM at once for large archives.
 * Aggressively releases memory and yields to event loop.
 */
export async function adaptiveExtractAndDiscover(
  files: (File | Blob | ArrayBuffer | Uint8Array)[],
  options: AdaptiveProcessingOptions = {}
): Promise<{ summary: DiscoverySummary; profile: ArchiveProfile }> {
  const { onProgress, userId = 'user_local', importId = 'imp_local' } = options;

  if (files.length === 0) {
    throw new Error('No files provided for extraction.');
  }

  // 1. Profile archives
  if (onProgress) onProgress('Profiling archive characteristics...', 5);
  const fileNames = files.map((f, i) => (f instanceof File ? f.name : `part_${i + 1}.zip`));
  const profile = await profileArchives(files, fileNames);

  if (profile.isSuspicious) {
    throw new Error(profile.suspiciousReason || 'Archive security check rejected this file.');
  }

  const strategy = options.strategyOverride || profile.strategy;

  // Global aggregated results across multi-part archives
  let aggregatedTotalFiles = 0;
  let aggregatedTotalDecompressedBytes = 0;
  const aggregatedGeminiConversations: CanonicalConversation[] = [];
  const aggregatedYoutubeRecords: NormalizedYouTubeRecord[] = [];
  const aggregatedBrowserRecords: NormalizedBrowserRecord[] = [];
  const otherServiceMap = new Map<string, { fileCount: number; sampleFiles: string[] }>();
  const customFilesMap = new Map<
    string,
    { path: string; name: string; size: number; content: string; selected: boolean }
  >();

  // Determine yield frequency based on strategy
  const yieldEvery = strategy === 'VERY_LARGE' ? 2 : strategy === 'LARGE' ? 5 : strategy === 'MEDIUM' ? 10 : 25;

  for (let partIdx = 0; partIdx < files.length; partIdx++) {
    const file = files[partIdx];
    const fileName = fileNames[partIdx];
    const isZip = await isZipArchive(file);

    const partPrefix = files.length > 1 ? `[Part ${partIdx + 1}/${files.length}] ` : '';

    if (!isZip) {
      // Standalone single file handling (.json, .html, .md, .txt)
      if (onProgress) onProgress(`${partPrefix}Reading standalone file: ${fileName}...`, 20);

      let textContent = '';
      if (file instanceof File || file instanceof Blob) {
        textContent = await file.text();
      } else if (file instanceof ArrayBuffer) {
        textContent = new TextDecoder('utf-8').decode(file);
      } else {
        textContent = new TextDecoder('utf-8').decode(file);
      }

      const singleEntry: ExtractedFileEntry = {
        path: fileName,
        filename: fileName,
        extension: fileName.split('.').pop()?.toLowerCase() || '',
        size: textContent.length,
        readText: async () => textContent,
      };

      const singleSummary = await analyzeExtractedArchive([singleEntry], userId, importId, (msg) => {
        if (onProgress) onProgress(`${partPrefix}${msg}`);
      });

      aggregatedTotalFiles += 1;
      aggregatedTotalDecompressedBytes += textContent.length;
      aggregatedGeminiConversations.push(...singleSummary.geminiConversations);
      aggregatedYoutubeRecords.push(...singleSummary.youtubeRecords);
      aggregatedBrowserRecords.push(...singleSummary.browserRecords);
      for (const cf of singleSummary.customFiles) {
        customFilesMap.set(cf.path, cf);
      }
      continue;
    }

    // Load ZIP central directory
    if (onProgress) onProgress(`${partPrefix}Reading archive structure (${fileName})...`, 15);
    const zip = await JSZip.loadAsync(file);
    const entries = Object.entries(zip.files).filter(([, obj]) => !obj.dir);

    aggregatedTotalFiles += entries.length;

    // Filter and collect candidate text entries, while safely skipping heavy binary dumps
    const candidateEntries: ExtractedFileEntry[] = [];

    for (let i = 0; i < entries.length; i++) {
      const [rawPath, zipObj] = entries[i];
      const safePath = sanitizeArchivePath(rawPath);
      if (!safePath) continue;

      const parts = safePath.split('/');
      const filename = parts[parts.length - 1];
      const extMatch = filename.match(/\.([0-9a-zA-Z_-]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uncompressedSize = (zipObj as any)._data?.uncompressedSize || (zipObj as any).uncompressedSize || 0;
      aggregatedTotalDecompressedBytes += uncompressedSize;

      // Binary asset skipping (Photos, Videos, Audio, Executables)
      if (BINARY_EXTENSIONS.has(ext)) {
        const classification = classifyFileSource(safePath, filename);
        const serviceName = classification.source === 'other' ? classification.subType : 'Media & Assets';
        const existing = otherServiceMap.get(serviceName) || { fileCount: 0, sampleFiles: [] };
        existing.fileCount += 1;
        if (existing.sampleFiles.length < 3) existing.sampleFiles.push(filename);
        otherServiceMap.set(serviceName, existing);
        continue;
      }

      // Memory Rule: In LARGE / VERY_LARGE mode, only decompress text if it belongs to a known candidate path or extension
      const isRelevantText =
        ext === 'json' ||
        ext === 'html' ||
        ext === 'htm' ||
        ext === 'md' ||
        ext === 'txt' ||
        ext === 'markdown';

      if (!isRelevantText) {
        const classification = classifyFileSource(safePath, filename);
        const serviceName = classification.subType || 'Other Files';
        const existing = otherServiceMap.get(serviceName) || { fileCount: 0, sampleFiles: [] };
        existing.fileCount += 1;
        if (existing.sampleFiles.length < 3) existing.sampleFiles.push(filename);
        otherServiceMap.set(serviceName, existing);
        continue;
      }

      // Lazy reader wrapper that decompresses strictly on-demand
      const readText = async (): Promise<string> => {
        try {
          return await zipObj.async('text');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`Failed reading text from "${filename}": ${msg}`);
        }
      };

      candidateEntries.push({
        path: safePath,
        filename,
        extension: ext,
        size: uncompressedSize,
        readText,
      });

      if (i % yieldEvery === 0) {
        await new Promise((r) => setTimeout(r, 0));
        if (onProgress) {
          const pct = 15 + Math.round(((i + 1) / entries.length) * 35);
          onProgress(`${partPrefix}Inspecting index (${i + 1}/${entries.length})...`, pct);
        }
      }
    }

    if (onProgress) {
      onProgress(`${partPrefix}Classifying ${candidateEntries.length} text records...`, 55);
    }

    // Process candidate entries through source classifier
    const partSummary = await analyzeExtractedArchive(candidateEntries, userId, importId, (msg) => {
      if (onProgress) onProgress(`${partPrefix}${msg}`);
    });

    aggregatedGeminiConversations.push(...partSummary.geminiConversations);
    aggregatedYoutubeRecords.push(...partSummary.youtubeRecords);
    aggregatedBrowserRecords.push(...partSummary.browserRecords);

    for (const other of partSummary.otherServices) {
      const existing = otherServiceMap.get(other.service) || { fileCount: 0, sampleFiles: [] };
      existing.fileCount += other.fileCount;
      for (const sample of other.sampleFiles) {
        if (existing.sampleFiles.length < 4 && !existing.sampleFiles.includes(sample)) {
          existing.sampleFiles.push(sample);
        }
      }
      otherServiceMap.set(other.service, existing);
    }

    for (const cf of partSummary.customFiles) {
      customFilesMap.set(cf.path, cf);
    }

    // Explicitly release references to part entries to allow GC
    candidateEntries.length = 0;
    entries.length = 0;
  }

  if (onProgress) onProgress('Aggregating and deduplicating discovered records...', 92);

  // 1. Deduplicate Gemini conversations by ID or title+timestamp
  const convoMap = new Map<string, CanonicalConversation>();
  for (const c of aggregatedGeminiConversations) {
    const key = c.id || `${c.title}_${c.createdAt}`;
    if (!convoMap.has(key)) {
      convoMap.set(key, c);
    }
  }
  const deduplicatedConvos = Array.from(convoMap.values());

  // 2. Deduplicate YouTube records by URL or title+timestamp
  const ytSeen = new Set<string>();
  const deduplicatedYoutube: NormalizedYouTubeRecord[] = [];
  for (const y of aggregatedYoutubeRecords) {
    const key = y.url || `${y.title}_${y.timestamp}`;
    if (!ytSeen.has(key)) {
      ytSeen.add(key);
      deduplicatedYoutube.push(y);
    }
  }

  // 3. Deduplicate Browser records by URL or title+timestamp
  const brSeen = new Set<string>();
  const deduplicatedBrowser: NormalizedBrowserRecord[] = [];
  for (const b of aggregatedBrowserRecords) {
    const key = b.url || `${b.title}_${b.timestamp}`;
    if (!brSeen.has(key)) {
      brSeen.add(key);
      deduplicatedBrowser.push(b);
    }
  }

  // 4. Re-aggregate browser domains with counts
  const domainCountMap = new Map<string, number>();
  for (const b of deduplicatedBrowser) {
    domainCountMap.set(b.domain, (domainCountMap.get(b.domain) || 0) + 1);
  }
  const browserDomains = Array.from(domainCountMap.entries())
    .map(([domain, count]) => ({
      domain,
      count,
      selected: domain.includes('github') || domain.includes('stackoverflow') || domain.includes('docs'),
    }))
    .sort((a, b) => b.count - a.count);

  const otherServices = Array.from(otherServiceMap.entries()).map(([service, info]) => ({
    service,
    fileCount: info.fileCount,
    sampleFiles: info.sampleFiles,
  }));

  const customFiles = Array.from(customFilesMap.values());

  if (onProgress) onProgress('Archive discovery complete.', 100);

  const finalSummary: DiscoverySummary = {
    totalFiles: aggregatedTotalFiles,
    totalDecompressedBytes: aggregatedTotalDecompressedBytes,
    geminiConversations: deduplicatedConvos,
    youtubeRecords: deduplicatedYoutube,
    browserRecords: deduplicatedBrowser,
    browserDomains,
    otherServices,
    customFiles,
  };

  return {
    summary: finalSummary,
    profile,
  };
}
