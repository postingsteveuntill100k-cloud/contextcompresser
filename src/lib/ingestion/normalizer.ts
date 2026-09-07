import { CanonicalConversation, CanonicalMessage, Role } from '@/types';
import { detectFormat } from './detector';
import { sanitizeText } from './sanitizer';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

export interface NormalizationResult {
  conversations: CanonicalConversation[];
  totalMessages: number;
  warnings: string[];
  errors: string[];
  formatDetected: string;
}

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Standard heuristic: ~4 characters per token for English text & code
  return Math.max(1, Math.ceil(text.length / 4));
}

function normalizeRole(rawRole: string | undefined): Role {
  if (!rawRole) return 'user';
  const r = rawRole.toLowerCase().trim();
  if (r.includes('model') || r.includes('gemini') || r.includes('assistant') || r.includes('ai') || r.includes('bot')) {
    return 'model';
  }
  if (r.includes('system')) {
    return 'system';
  }
  return 'user';
}

function extractTextFromParts(parts: unknown): string {
  if (typeof parts === 'string') return parts;
  if (Array.isArray(parts)) {
    return parts
      .map((p) => {
        if (typeof p === 'string') return p;
        if (typeof p === 'object' && p !== null) {
          if ('text' in p && typeof (p as { text: unknown }).text === 'string') {
            return (p as { text: string }).text;
          }
        }
        return '';
      })
      .join('\n');
  }
  if (typeof parts === 'object' && parts !== null) {
    if ('text' in parts && typeof (parts as { text: unknown }).text === 'string') {
      return (parts as { text: string }).text;
    }
  }
  return '';
}

export function normalizeImport(
  rawInput: string | Buffer,
  userId: string,
  importId: string,
  filename: string = 'gemini_export.json'
): NormalizationResult {
  const detection = detectFormat(rawInput, filename);
  const warnings: string[] = [];
  const errors: string[] = [];
  const conversations: CanonicalConversation[] = [];

  if (!detection.isValid && detection.errorMessage) {
    errors.push(detection.errorMessage);
    return {
      conversations: [],
      totalMessages: 0,
      warnings,
      errors,
      formatDetected: detection.format,
    };
  }

  const nowIso = new Date().toISOString();

  if (detection.format === 'zip_archive') {
    try {
      const rawBytes = Buffer.isBuffer(rawInput) ? rawInput : Buffer.from(rawInput, 'utf8');
      const zip = new AdmZip(rawBytes);
      const zipEntries = zip.getEntries();

      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        const entryName = entry.entryName;
        const lowerName = entryName.toLowerCase();
        if (lowerName.endsWith('.json') || lowerName.endsWith('.md') || lowerName.endsWith('.txt')) {
          const entryData = entry.getData().toString('utf8');
          const subResult = normalizeImport(entryData, userId, importId, entryName);
          conversations.push(...subResult.conversations);
          warnings.push(...subResult.warnings.map((w) => `[${entryName}] ${w}`));
          errors.push(...subResult.errors.map((e) => `[${entryName}] ${e}`));
        }
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      errors.push(`Error extracting ZIP archive: ${err}`);
    }

    const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
    return {
      conversations,
      totalMessages,
      warnings,
      errors,
      formatDetected: detection.format,
    };
  }

  const rawContent = Buffer.isBuffer(rawInput) ? rawInput.toString('utf8') : rawInput;

  if (detection.format === 'markdown') {
    // Parse markdown sections
    const rawSections = rawContent.split(/\n(?=#\s+)/);
    for (let i = 0; i < rawSections.length; i++) {
      const sec = rawSections[i].trim();
      if (!sec) continue;

      const lines = sec.split('\n');
      const title = lines[0].replace(/^#\s+/, '').trim() || `Conversation ${i + 1}`;
      const mdFp = crypto.createHash('sha256').update(`${title}_${i}`).digest('hex').slice(0, 12);
      const convoId = `conv_${importId}_${mdFp}`;

      const messages: CanonicalMessage[] = [];
      let currentRole: Role = 'user';
      let currentBuffer: string[] = [];

      for (let j = 1; j < lines.length; j++) {
        const line = lines[j];
        const userMatch = line.match(/^(\*\*(?:User|Human):\*\*|### (?:User|Human)|(?:User|Human):)/i);
        const modelMatch = line.match(/^(\*\*(?:Model|Gemini|Assistant):\*\*|### (?:Model|Gemini|Assistant)|(?:Model|Gemini|Assistant):)/i);

        if (userMatch || modelMatch) {
          if (currentBuffer.length > 0) {
            const rawTxt = currentBuffer.join('\n').trim();
            if (rawTxt) {
              const analysis = sanitizeText(rawTxt);
              const msgFp = crypto.createHash('sha256').update(`${messages.length}_${rawTxt.slice(0, 40)}`).digest('hex').slice(0, 10);
              messages.push({
                id: `msg_${convoId}_${msgFp}`,
                conversationId: convoId,
                role: currentRole,
                content: rawTxt, // 100% faithful original content preserved
                timestamp: nowIso,
                tokenCount: estimateTokenCount(rawTxt),
                metadata: analysis.hasInjectionAttempt ? { injectionRisk: true } : undefined,
              });
            }
            currentBuffer = [];
          }
          currentRole = userMatch ? 'user' : 'model';
          // Clean the prefix from line
          const cleanLine = line.replace(/^(\*\*(?:User|Human|Model|Gemini|Assistant):\*\*|### (?:User|Human|Model|Gemini|Assistant)|(?:User|Human|Model|Gemini|Assistant):)\s*/i, '');
          if (cleanLine) currentBuffer.push(cleanLine);
        } else {
          currentBuffer.push(line);
        }
      }

      if (currentBuffer.length > 0) {
        const rawTxt = currentBuffer.join('\n').trim();
        if (rawTxt) {
          const analysis = sanitizeText(rawTxt);
          const msgFp = crypto.createHash('sha256').update(`${messages.length}_${rawTxt.slice(0, 40)}`).digest('hex').slice(0, 10);
          messages.push({
            id: `msg_${convoId}_${msgFp}`,
            conversationId: convoId,
            role: currentRole,
            content: rawTxt, // 100% faithful original content preserved
            timestamp: nowIso,
            tokenCount: estimateTokenCount(rawTxt),
            metadata: analysis.hasInjectionAttempt ? { injectionRisk: true } : undefined,
          });
        }
      }

      if (messages.length > 0) {
        conversations.push({
          id: convoId,
          userId,
          importId,
          title,
          createdAt: nowIso,
          updatedAt: nowIso,
          source: 'markdown',
          messages,
        });
      }
    }
  } else {
    // JSON formats (Google Takeout / Gemini Export / Raw JSON)
    try {
      const parsed = JSON.parse(rawContent);
      let rawList: unknown[] = [];

      if (Array.isArray(parsed)) {
        rawList = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed.conversations)) {
          rawList = parsed.conversations;
        } else if (Array.isArray(parsed.chats)) {
          rawList = parsed.chats;
        } else if (Array.isArray(parsed.threads)) {
          rawList = parsed.threads;
        } else {
          // Single conversation
          rawList = [parsed];
        }
      }

      const seenConvoKeys = new Set<string>();

      for (let i = 0; i < rawList.length; i++) {
        const rawItem = rawList[i];
        if (typeof rawItem !== 'object' || rawItem === null) {
          warnings.push(`Item ${i + 1} is not a valid conversation object; skipped.`);
          continue;
        }

        const item = rawItem as Record<string, unknown>;
        const externalId = typeof item.id === 'string' ? item.id : undefined;
        const stableConvoSeed = externalId || `${item.title || ''}_${item.create_time || item.createTime || i}`;
        const convoFp = crypto.createHash('sha256').update(stableConvoSeed).digest('hex').slice(0, 12);
        const convoId = `conv_${importId}_${convoFp}`;

        // Prevent duplicate conversations in same file
        const dedupKey = externalId || stableConvoSeed;
        if (seenConvoKeys.has(dedupKey)) {
          warnings.push(`Duplicate conversation "${dedupKey}" detected; skipping redundant instance.`);
          continue;
        }
        seenConvoKeys.add(dedupKey);

        const title =
          typeof item.title === 'string' && item.title.trim().length > 0
            ? item.title.trim()
            : `Conversation #${i + 1}`;

        const createdAt =
          typeof item.create_time === 'string'
            ? item.create_time
            : typeof item.createTime === 'string'
            ? item.createTime
            : typeof item.created_at === 'string'
            ? item.created_at
            : nowIso;

        const updatedAt =
          typeof item.update_time === 'string'
            ? item.update_time
            : typeof item.updateTime === 'string'
            ? item.updateTime
            : createdAt;

        // Extract messages / turns
        let rawTurns: unknown[] = [];
        if (Array.isArray(item.turns)) {
          rawTurns = item.turns;
        } else if (Array.isArray(item.messages)) {
          rawTurns = item.messages;
        } else if (item.mapping && typeof item.mapping === 'object') {
          // ChatGPT / Takeout mapping tree
          interface MappingNode {
            message?: {
              create_time?: number;
              [key: string]: unknown;
            };
            [key: string]: unknown;
          }
          const mappingObj = item.mapping as Record<string, MappingNode>;
          const extracted: Array<{ create_time?: number; [key: string]: unknown }> = [];
          for (const node of Object.values(mappingObj)) {
            if (node && node.message) {
              extracted.push(node.message);
            }
          }
          extracted.sort((a, b) => {
            const timeA = typeof a.create_time === 'number' ? a.create_time : 0;
            const timeB = typeof b.create_time === 'number' ? b.create_time : 0;
            return timeA - timeB;
          });
          rawTurns = extracted;
        }

        const messages: CanonicalMessage[] = [];

        for (let m = 0; m < rawTurns.length; m++) {
          const rawTurn = rawTurns[m];
          if (typeof rawTurn !== 'object' || rawTurn === null) continue;

          const turn = rawTurn as Record<string, unknown>;
          const authorObj = typeof turn.author === 'object' && turn.author !== null ? (turn.author as Record<string, unknown>) : null;
          const role = normalizeRole(
            typeof turn.role === 'string'
              ? turn.role
              : authorObj && typeof authorObj.role === 'string'
              ? authorObj.role
              : typeof turn.author === 'string'
              ? turn.author
              : 'user'
          );

          let content = '';
          if (turn.parts) {
            content = extractTextFromParts(turn.parts);
          } else if (turn.content && typeof turn.content === 'object' && (turn.content as Record<string, unknown>).parts) {
            content = extractTextFromParts((turn.content as Record<string, unknown>).parts);
          } else if (typeof turn.content === 'string') {
            content = turn.content;
          } else if (typeof turn.text === 'string') {
            content = turn.text;
          } else if (typeof turn.body === 'string') {
            content = turn.body;
          }

          if (!content || content.trim().length === 0) {
            continue; // Skip completely empty turn
          }

          const rawContentTrimmed = content.trim();
          const analysis = sanitizeText(rawContentTrimmed);
          const turnTime =
            typeof turn.timestamp === 'string'
              ? turn.timestamp
              : typeof turn.create_time === 'string'
              ? turn.create_time
              : typeof turn.create_time === 'number'
              ? new Date(turn.create_time > 1e11 ? turn.create_time : turn.create_time * 1000).toISOString()
              : createdAt;

          const turnSeed = typeof turn.id === 'string' ? turn.id : `${m}_${rawContentTrimmed.slice(0, 40)}`;
          const msgFp = crypto.createHash('sha256').update(turnSeed).digest('hex').slice(0, 10);

          messages.push({
            id: `msg_${convoId}_${msgFp}`,
            conversationId: convoId,
            role,
            content: rawContentTrimmed, // 100% faithful original content preserved
            timestamp: turnTime,
            tokenCount: estimateTokenCount(rawContentTrimmed),
            metadata: analysis.hasInjectionAttempt ? { injectionRisk: true } : undefined,
          });
        }

        if (messages.length === 0) {
          warnings.push(`Conversation "${title}" had no parseable messages.`);
        }

        conversations.push({
          id: convoId,
          userId,
          importId,
          externalId,
          title,
          createdAt,
          updatedAt,
          source: detection.format,
          messages,
        });
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      errors.push(`Error normalizing JSON archive: ${err}`);
    }
  }

  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);

  return {
    conversations,
    totalMessages,
    warnings,
    errors,
    formatDetected: detection.format,
  };
}
