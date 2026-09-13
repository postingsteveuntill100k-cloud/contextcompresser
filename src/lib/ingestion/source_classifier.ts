import { CanonicalConversation } from '@/types';
import { ExtractedFileEntry } from './local_extractor';
import {
  NormalizedYouTubeRecord,
  NormalizedBrowserRecord,
  parseGeminiScheduledActionsHtml,
  parseGeminiActivityHtml,
  parseGeminiJson,
  parseYouTubeActivity,
  parseBrowserActivity,
  parseMarkdownConversation,
} from './local_parsers';

export type DetectedSourceType = 'gemini' | 'youtube' | 'browser' | 'other' | 'custom';

export interface DiscoveredSourceItem {
  id: string;
  source: DetectedSourceType;
  title: string;
  subtitle?: string;
  date?: string;
  itemCount?: number;
  data: unknown;
  selected: boolean;
}

export interface DiscoverySummary {
  totalFiles: number;
  totalDecompressedBytes: number;
  geminiConversations: CanonicalConversation[];
  youtubeRecords: NormalizedYouTubeRecord[];
  browserRecords: NormalizedBrowserRecord[];
  browserDomains: Array<{ domain: string; count: number; selected: boolean }>;
  otherServices: Array<{ service: string; fileCount: number; sampleFiles: string[] }>;
  customFiles: Array<{ path: string; name: string; size: number; content: string; selected: boolean }>;
}

export function classifyFileSource(path: string, filename: string): {
  source: DetectedSourceType;
  subType: string;
  confidence: number;
} {
  const p = '/' + path.toLowerCase().replace(/\\/g, '/') + '/';
  const f = filename.toLowerCase();

  // 1. GEMINI / AI CHAT
  if (
    p.includes('/gemini/') ||
    p.includes('/gemini apps/') ||
    p.includes('/bard/') ||
    p.includes('/chatgpt/') ||
    p.includes('/claude/') ||
    p.includes('/my activity/gemini/') ||
    p.includes('/my activity/gemini apps/') ||
    p.includes('/my activity/bard/') ||
    f.includes('gemini_scheduled_actions') ||
    f.includes('gemini_gems') ||
    f.includes('gemini.json') ||
    f.includes('conversations.json') ||
    f.includes('chats.json') ||
    f.includes('chat.json')
  ) {
    return { source: 'gemini', subType: 'conversation', confidence: 0.95 };
  }

  // 2. YOUTUBE
  if (
    p.includes('/youtube/') ||
    p.includes('/youtube and youtube music/') ||
    p.includes('/my activity/youtube/') ||
    f.includes('watch-history') ||
    f.includes('search-history')
  ) {
    return { source: 'youtube', subType: 'video_activity', confidence: 0.95 };
  }

  // 3. CHROME / BROWSER
  if (
    p.includes('/chrome/') ||
    p.includes('/browser/') ||
    p.includes('/my activity/chrome/') ||
    f.includes('browserhistory') ||
    (f.includes('history') && (f.endsWith('.json') || f.endsWith('.html')))
  ) {
    return { source: 'browser', subType: 'web_history', confidence: 0.95 };
  }

  // 4. OTHER GOOGLE TAKEOUT SERVICES
  if (p.includes('/takeout/')) {
    const segments = p.split('/').filter(Boolean);
    const takeoutIdx = segments.indexOf('takeout');
    const serviceName = takeoutIdx >= 0 && segments.length > takeoutIdx + 1 ? segments[takeoutIdx + 1] : 'Other Service';
    return { source: 'other', subType: serviceName, confidence: 0.85 };
  }

  // 5. CUSTOM FILES (.json, .md, .txt)
  if (f.endsWith('.json') || f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.markdown')) {
    return { source: 'custom', subType: 'text_document', confidence: 0.7 };
  }

  return { source: 'other', subType: 'unknown_file', confidence: 0.4 };
}

/**
 * Analyzes extracted files locally, parses supported data formats,
 * and compiles the local discovery summary for user review.
 */
export async function analyzeExtractedArchive(
  entries: ExtractedFileEntry[],
  userId: string = 'user_local',
  importId: string = 'imp_local',
  onProgress?: (msg: string) => void
): Promise<DiscoverySummary> {
  const geminiConversations: CanonicalConversation[] = [];
  const youtubeRecords: NormalizedYouTubeRecord[] = [];
  const browserRecords: NormalizedBrowserRecord[] = [];
  const otherServiceMap = new Map<string, { fileCount: number; sampleFiles: string[] }>();
  const customFiles: Array<{ path: string; name: string; size: number; content: string; selected: boolean }> = [];

  let totalDecompressedBytes = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    totalDecompressedBytes += entry.size;
    const classification = classifyFileSource(entry.path, entry.filename);

    if (i % 10 === 0) {
      // Yield to browser event loop so animations continue smoothly
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (onProgress && (i % 10 === 0 || i === entries.length - 1)) {
      onProgress(`Classifying data (${i + 1}/${entries.length}): ${entry.filename}`);
    }

    if (classification.source === 'gemini') {
      const lower = entry.filename.toLowerCase();
      if (lower.endsWith('.html') || lower.endsWith('.htm')) {
        const text = await entry.readText();
        if (
          lower.includes('scheduled_actions') ||
          lower.includes('gemini_gems') ||
          text.includes('<b>Name:</b>') ||
          text.includes('<b>Instructions:</b>')
        ) {
          const convos = parseGeminiScheduledActionsHtml(text, userId, importId);
          geminiConversations.push(...convos);
        } else {
          const convos = parseGeminiActivityHtml(text, userId, importId);
          if (convos.length > 0) {
            geminiConversations.push(...convos);
          } else {
            // Fallback to scheduled actions parser if activity cells weren't found
            const fallbackConvos = parseGeminiScheduledActionsHtml(text, userId, importId);
            geminiConversations.push(...fallbackConvos);
          }
        }
      } else if (lower.endsWith('.json')) {
        const text = await entry.readText();
        const convos = parseGeminiJson(text, userId, importId);
        if (convos.length > 0) {
          geminiConversations.push(...convos);
        } else {
          // Unrecognized or non-conversation JSON in Gemini folder
          customFiles.push({
            path: entry.path,
            name: entry.filename,
            size: entry.size,
            content: text,
            selected: false,
          });
        }
      }
    } else if (classification.source === 'youtube') {
      const text = await entry.readText();
      const records = parseYouTubeActivity(text, entry.filename);
      youtubeRecords.push(...records);
    } else if (classification.source === 'browser') {
      const lower = entry.filename.toLowerCase();
      if (lower.includes('history')) {
        const text = await entry.readText();
        const records = parseBrowserActivity(text, entry.filename);
        browserRecords.push(...records);
      } else {
        const serviceName = 'Chrome (' + entry.filename + ')';
        const existing = otherServiceMap.get(serviceName) || { fileCount: 0, sampleFiles: [] };
        existing.fileCount += 1;
        if (existing.sampleFiles.length < 3) existing.sampleFiles.push(entry.filename);
        otherServiceMap.set(serviceName, existing);
      }
    } else if (classification.source === 'custom') {
      const text = await entry.readText();
      const lower = entry.filename.toLowerCase();
      if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
        const mdConvos = parseMarkdownConversation(text, userId, importId, entry.filename);
        if (mdConvos.length > 0) {
          geminiConversations.push(...mdConvos);
        }
      } else if (lower.endsWith('.json')) {
        const jsonConvos = parseGeminiJson(text, userId, importId);
        if (jsonConvos.length > 0) {
          geminiConversations.push(...jsonConvos);
        }
      }
      customFiles.push({
        path: entry.path,
        name: entry.filename,
        size: entry.size,
        content: text,
        selected: true,
      });
    } else {
      // Other services
      const serviceName = classification.subType;
      const existing = otherServiceMap.get(serviceName) || { fileCount: 0, sampleFiles: [] };
      existing.fileCount += 1;
      if (existing.sampleFiles.length < 3) {
        existing.sampleFiles.push(entry.filename);
      }
      otherServiceMap.set(serviceName, existing);
    }
  }

  // Aggregate browser domains with counts
  const domainCountMap = new Map<string, number>();
  for (const b of browserRecords) {
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

  if (onProgress) onProgress('Waiting for selection');

  return {
    totalFiles: entries.length,
    totalDecompressedBytes,
    geminiConversations,
    youtubeRecords,
    browserRecords,
    browserDomains,
    otherServices,
    customFiles,
  };
}
