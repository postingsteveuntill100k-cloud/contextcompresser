import { CanonicalConversation, CanonicalMessage, Role } from '@/types';

export interface NormalizedYouTubeRecord {
  id: string;
  source: 'youtube';
  type: 'watch_history' | 'search_history';
  title: string;
  url?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedBrowserRecord {
  id: string;
  source: 'browser';
  type: 'web_activity';
  title: string;
  url: string;
  domain: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export function extractDomainFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    const match = rawUrl.match(/^(?:https?:\/\/)?(?:www\.)?([^/:?#]+)/i);
    return match ? match[1].toLowerCase() : 'web';
  }
}

function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Parses Gemini Scheduled Actions HTML (e.g. gemini_scheduled_actions_data.html from Takeout)
 */
export function parseGeminiScheduledActionsHtml(
  htmlContent: string,
  userId: string,
  importId: string
): CanonicalConversation[] {
  const conversations: CanonicalConversation[] = [];
  // Takeout HTML format divides items into <div> blocks
  const blockRegex = /<div>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = blockRegex.exec(htmlContent)) !== null) {
    const block = match[1].trim();
    if (!block) continue;

    // Extract fields like <b>Name:</b>..., <b>Instructions:</b>...
    const nameMatch = block.match(/<b>Name:<\/b>\s*([^<]+)/i);
    const instructionsMatch = block.match(/<b>Instructions:<\/b>\s*([^<]+)/i);
    const scheduleMatch = block.match(/<b>Schedule:<\/b>\s*([^<]+)/i);
    const stateMatch = block.match(/<b>State:<\/b>\s*([^<]+)/i);
    const updateTimeMatch = block.match(/<b>Last update time:<\/b>\s*([^<]+)/i);

    const name = nameMatch ? nameMatch[1].trim() : `Scheduled Action ${idx + 1}`;
    const instructions = instructionsMatch ? instructionsMatch[1].trim() : '';
    const schedule = scheduleMatch ? scheduleMatch[1].trim() : '';
    const state = stateMatch ? stateMatch[1].trim() : '';
    const dateStr = updateTimeMatch ? updateTimeMatch[1].trim() : new Date().toISOString();

    if (!instructions && !name) continue;

    const convoId = `conv_scheduled_${idx++}_${Date.now().toString(36)}`;
    const messages: CanonicalMessage[] = [];

    // Turn 1: User task directive
    messages.push({
      id: `${convoId}_m1`,
      conversationId: convoId,
      role: 'user',
      content: `Scheduled Task: ${name}\nSchedule: ${schedule}\nInstructions:\n${instructions}`,
      timestamp: dateStr,
      tokenCount: estimateTokenCount(instructions),
    });

    // Turn 2: Assistant configuration state
    if (state) {
      messages.push({
        id: `${convoId}_m2`,
        conversationId: convoId,
        role: 'model',
        content: `Task Status: ${state}. Scheduled action configured to run: ${instructions}`,
        timestamp: dateStr,
        tokenCount: estimateTokenCount(state),
      });
    }

    conversations.push({
      id: convoId,
      userId,
      importId,
      title: name,
      createdAt: dateStr,
      updatedAt: dateStr,
      source: 'gemini',
      messages,
      summary: instructions.slice(0, 160),
      tokenCount: messages.reduce((acc, m) => acc + m.tokenCount, 0),
      tags: ['gemini_takeout', 'scheduled_actions'],
      topics: [name],
    });
  }

  return conversations;
}

/**
 * Parses Gemini / Bard MyActivity.html or conversation transcripts from Takeout
 */
export function parseGeminiActivityHtml(
  htmlContent: string,
  userId: string,
  importId: string
): CanonicalConversation[] {
  const conversations: CanonicalConversation[] = [];
  // In My Activity HTML, cells are usually wrapped in class="content-cell" or <div class="outer-cell">
  const cellRegex = /<div class="content-cell[^"]*">([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = cellRegex.exec(htmlContent)) !== null) {
    const raw = match[1];
    // Strip tags and clean text
    const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length < 15) continue;

    // Distinguish user prompt from assistant answer if present
    const convoId = `conv_activity_${idx++}_${Date.now().toString(36)}`;
    conversations.push({
      id: convoId,
      userId,
      importId,
      title: text.slice(0, 60),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'gemini',
      messages: [
        {
          id: `${convoId}_m1`,
          conversationId: convoId,
          role: 'user',
          content: text,
          timestamp: new Date().toISOString(),
          tokenCount: estimateTokenCount(text),
        },
      ],
      summary: text.slice(0, 140),
      tokenCount: estimateTokenCount(text),
      tags: ['gemini_takeout', 'activity_log'],
    });
  }

  return conversations;
}

/**
 * Determines whether raw JSON data represents genuine conversation history
 * rather than arbitrary metadata, settings, package files, or bookmarks.
 */
export function isConversationData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;

  const record = data as Record<string, unknown>;

  // Check object properties
  if (Array.isArray(record.conversations) && record.conversations.length > 0) return true;
  if (Array.isArray(record.chats) && record.chats.length > 0) return true;
  if (Array.isArray(record.turns) && record.turns.length > 0) return true;
  if (Array.isArray(record.contents) && record.contents.length > 0) return true;
  if (Array.isArray(record.chat_messages) && record.chat_messages.length > 0) return true;
  if (record.mapping && typeof record.mapping === 'object') return true;

  if (Array.isArray(record.messages) && record.messages.length > 0) {
    const first = record.messages[0];
    if (first && typeof first === 'object') {
      const msg = first as Record<string, unknown>;
      if (msg.role || msg.author || msg.content || msg.parts || msg.creator || msg.text) {
        return true;
      }
    }
  }

  // Check array of items
  if (Array.isArray(data) && data.length > 0) {
    for (let i = 0; i < Math.min(data.length, 5); i++) {
      const item = data[i];
      if (!item || typeof item !== 'object') continue;
      const it = item as Record<string, unknown>;
      if (Array.isArray(it.messages) || Array.isArray(it.turns) || Array.isArray(it.parts) || Array.isArray(it.contents)) {
        return true;
      }
      if (Array.isArray(it.chat_messages)) return true;
      if (it.mapping && typeof it.mapping === 'object') return true;
      if (typeof it.header === 'string' && (it.header.includes('Gemini') || it.header.includes('Bard'))) {
        return true;
      }
      if (typeof it.title === 'string' && (it.title.startsWith('Prompted') || it.title.startsWith('Asked'))) {
        return true;
      }
      if (it.role && (it.content || it.text || it.parts)) return true;
    }
  }

  return false;
}

export function isConversationJson(jsonContent: string): boolean {
  try {
    const parsed = JSON.parse(jsonContent);
    return isConversationData(parsed);
  } catch {
    return false;
  }
}

/**
 * Parses Takeout Gemini / AI JSON into CanonicalConversation format.
 * Supports:
 * - Google Takeout Gemini conversations & chats
 * - Google Takeout My Activity JSON (Prompted: ...)
 * - Google Chat Takeout (messages.json)
 * - ChatGPT export (mapping tree)
 * - Claude export (chat_messages)
 * - Vertex / Gemini API export (contents)
 */
export function parseGeminiJson(
  jsonContent: string,
  userId: string,
  importId: string
): CanonicalConversation[] {
  let data: unknown;
  try {
    data = JSON.parse(jsonContent);
  } catch {
    return [];
  }

  if (!isConversationData(data)) {
    return [];
  }

  const conversations: CanonicalConversation[] = [];
  const record = data as Record<string, unknown> | null;

  // 1. Google Takeout My Activity JSON format
  if (Array.isArray(data) && data.length > 0 && typeof (data[0] as Record<string, unknown>)?.header === 'string') {
    let convIdx = 0;
    for (const item of data as Record<string, unknown>[]) {
      if (!item || typeof item !== 'object') continue;
      const header = String(item.header || '');
      const rawTitle = String(item.title || '');
      const time = String(item.time || new Date().toISOString());
      const subtitles = Array.isArray(item.subtitles) ? item.subtitles : [];

      if (!rawTitle.startsWith('Prompted') && !header.includes('Gemini') && !header.includes('Bard')) {
        continue;
      }

      const promptText = rawTitle.replace(/^Prompted:?\s*/i, '').replace(/^Asked:?\s*/i, '').trim();
      if (!promptText) continue;

      const convoId = `conv_myactivity_${convIdx++}_${Date.now().toString(36)}`;
      const messages: CanonicalMessage[] = [
        {
          id: `${convoId}_m1`,
          conversationId: convoId,
          role: 'user',
          content: promptText,
          timestamp: time,
          tokenCount: estimateTokenCount(promptText),
        },
      ];

      // If response text is included in subtitles
      if (subtitles.length > 0 && subtitles[0]?.name) {
        const answerText = String(subtitles[0].name).trim();
        if (answerText) {
          messages.push({
            id: `${convoId}_m2`,
            conversationId: convoId,
            role: 'model',
            content: answerText,
            timestamp: time,
            tokenCount: estimateTokenCount(answerText),
          });
        }
      }

      conversations.push({
        id: convoId,
        userId,
        importId,
        title: promptText.slice(0, 60),
        createdAt: time,
        updatedAt: time,
        source: 'gemini',
        messages,
        summary: promptText.slice(0, 160),
        tokenCount: messages.reduce((acc, m) => acc + m.tokenCount, 0),
        tags: ['gemini_takeout', 'my_activity_json'],
      });
    }

    if (conversations.length > 0) {
      return conversations;
    }
  }

  // 2. Standard arrays of conversations or single conversation wrapper
  const list = Array.isArray(data)
    ? data
    : Array.isArray(record?.conversations)
    ? record.conversations
    : Array.isArray(record?.chats)
    ? record.chats
    : Array.isArray(record?.messages) || Array.isArray(record?.turns) || record?.mapping || Array.isArray(record?.contents)
    ? [record]
    : [];

  if (Array.isArray(list)) {
    for (let i = 0; i < list.length; i++) {
      const item = list[i] as Record<string, unknown> | null;
      if (typeof item !== 'object' || !item) continue;

      const title = String(item.title || item.name || `Conversation ${i + 1}`);
      const convoId = `conv_json_${i}_${Date.now().toString(36)}`;
      const messages: CanonicalMessage[] = [];

      // A. ChatGPT mapping tree
      if (item.mapping && typeof item.mapping === 'object') {
        const mapping = item.mapping as Record<string, { message?: Record<string, unknown> }>;
        const nodes = Object.values(mapping)
          .filter((n) => n && n.message && n.message.content)
          .map((n) => n.message!);

        nodes.sort((a, b) => (Number(a.create_time) || 0) - (Number(b.create_time) || 0));

        for (let mIdx = 0; mIdx < nodes.length; mIdx++) {
          const rawM = nodes[mIdx];
          const author = (rawM.author as Record<string, string>)?.role || 'user';
          const role: Role = author === 'assistant' || author === 'model' ? 'model' : 'user';

          let content = '';
          const contentObj = rawM.content as Record<string, unknown> | undefined;
          if (contentObj && Array.isArray(contentObj.parts)) {
            content = contentObj.parts.filter((p) => typeof p === 'string').join('\n');
          } else if (typeof rawM.content === 'string') {
            content = rawM.content;
          }

          if (content.trim()) {
            const timeIso = rawM.create_time ? new Date(Number(rawM.create_time) * 1000).toISOString() : new Date().toISOString();
            messages.push({
              id: `${convoId}_m${mIdx + 1}`,
              conversationId: convoId,
              role,
              content: content.trim(),
              timestamp: timeIso,
              tokenCount: estimateTokenCount(content),
            });
          }
        }
      }

      // B. Claude chat_messages
      else if (Array.isArray(item.chat_messages)) {
        const chatMsgs = item.chat_messages as Record<string, unknown>[];
        for (let mIdx = 0; mIdx < chatMsgs.length; mIdx++) {
          const rawM = chatMsgs[mIdx];
          const sender = String(rawM.sender || 'human').toLowerCase();
          const role: Role = sender === 'assistant' || sender === 'model' ? 'model' : 'user';
          const text = String(rawM.text || rawM.content || '').trim();
          const timestamp = String(rawM.created_at || new Date().toISOString());

          if (text) {
            messages.push({
              id: `${convoId}_m${mIdx + 1}`,
              conversationId: convoId,
              role,
              content: text,
              timestamp,
              tokenCount: estimateTokenCount(text),
            });
          }
        }
      }

      // C. Gemini API contents
      else if (Array.isArray(item.contents)) {
        const contents = item.contents as Record<string, unknown>[];
        for (let mIdx = 0; mIdx < contents.length; mIdx++) {
          const rawM = contents[mIdx];
          const roleStr = String(rawM.role || 'user').toLowerCase();
          const role: Role = roleStr.includes('model') ? 'model' : 'user';
          let text = '';
          if (Array.isArray(rawM.parts)) {
            text = (rawM.parts as Record<string, string>[])
              .map((p) => (typeof p === 'string' ? p : p.text || ''))
              .join('\n')
              .trim();
          }
          if (text) {
            messages.push({
              id: `${convoId}_m${mIdx + 1}`,
              conversationId: convoId,
              role,
              content: text,
              timestamp: new Date().toISOString(),
              tokenCount: estimateTokenCount(text),
            });
          }
        }
      }

      // D. Standard messages or turns or Google Chat messages
      else {
        const rawMsgs = Array.isArray(item.messages)
          ? (item.messages as Record<string, unknown>[])
          : Array.isArray(item.turns)
          ? (item.turns as Record<string, unknown>[])
          : [];

        for (let mIdx = 0; mIdx < rawMsgs.length; mIdx++) {
          const rawM = rawMsgs[mIdx];
          if (typeof rawM !== 'object' || !rawM) continue;

          let content = '';
          if (typeof rawM.content === 'string') content = rawM.content;
          else if (typeof rawM.text === 'string') content = rawM.text;
          else if (Array.isArray(rawM.parts)) {
            content = rawM.parts
              .map((p: unknown) => (typeof p === 'string' ? p : (p as Record<string, string>)?.text || ''))
              .join('\n');
          }

          // Handle Google Chat creator
          let authorStr = String(rawM.role || rawM.author || '');
          if (!authorStr && rawM.creator && typeof rawM.creator === 'object') {
            authorStr = String((rawM.creator as Record<string, string>).name || 'user');
          }
          const roleStr = authorStr.toLowerCase();
          const role: Role = roleStr.includes('model') || roleStr.includes('gemini') || roleStr.includes('assistant') || roleStr.includes('bot')
            ? 'model'
            : 'user';

          const timestamp = String(rawM.timestamp || rawM.created_at || rawM.created_date || rawM.date || new Date().toISOString());

          if (content.trim()) {
            messages.push({
              id: `${convoId}_m${mIdx + 1}`,
              conversationId: convoId,
              role,
              content: content.trim(),
              timestamp,
              tokenCount: estimateTokenCount(content),
            });
          }
        }
      }

      if (messages.length > 0) {
        conversations.push({
          id: convoId,
          userId,
          importId,
          title,
          createdAt: messages[0].timestamp,
          updatedAt: messages[messages.length - 1].timestamp,
          source: 'gemini',
          messages,
          summary: messages[0].content.slice(0, 160),
          tokenCount: messages.reduce((acc, m) => acc + m.tokenCount, 0),
          tags: ['gemini_takeout', 'json'],
        });
      }
    }
  }

  return conversations;
}

/**
 * Parses YouTube Watch History or Search History from Takeout HTML or JSON
 */
export function parseYouTubeActivity(
  content: string,
  filename: string
): NormalizedYouTubeRecord[] {
  const records: NormalizedYouTubeRecord[] = [];
  const lower = filename.toLowerCase();
  const isSearch = lower.includes('search');

  if (filename.endsWith('.json')) {
    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || typeof item !== 'object') continue;
        const title = String(item.title || item.snippet || item.query || 'YouTube activity');
        const url = item.titleUrl || item.url || undefined;
        const timestamp = String(item.time || item.timestamp || new Date().toISOString());

        records.push({
          id: `yt_${i}_${Date.now().toString(36)}`,
          source: 'youtube',
          type: isSearch ? 'search_history' : 'watch_history',
          title: title.replace(/^Watched\s+/i, '').replace(/^Searched for\s+/i, ''),
          url,
          timestamp,
        });
      }
    } catch {
      // Fallback
    }
  } else {
    // HTML parser for YouTube watch-history.html / search-history.html
    const cellRegex = /<div class="content-cell[^"]*">([\s\S]*?)<\/div>/gi;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = cellRegex.exec(content)) !== null) {
      const cellHtml = match[1];
      const linkMatch = cellHtml.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const cleanText = cellHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const url = linkMatch ? linkMatch[1] : undefined;
      const title = linkMatch
        ? linkMatch[2].replace(/<[^>]+>/g, '').trim()
        : cleanText.slice(0, 100);

      const timeMatch = cleanText.match(/\b([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM)\s+[A-Z]+)\b/);
      const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

      if (title) {
        records.push({
          id: `yt_html_${idx++}_${Date.now().toString(36)}`,
          source: 'youtube',
          type: isSearch ? 'search_history' : 'watch_history',
          title: title.replace(/^Watched\s+/i, '').replace(/^Searched for\s+/i, ''),
          url,
          timestamp,
        });
      }
    }
  }

  return records;
}

/**
 * Parses Chrome Browser History from Takeout JSON or HTML
 */
export function parseBrowserActivity(
  content: string,
  filename: string
): NormalizedBrowserRecord[] {
  const records: NormalizedBrowserRecord[] = [];

  if (filename.endsWith('.json')) {
    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : (data as Record<string, unknown>)?.['Browser History'] || [];
      if (Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item || typeof item !== 'object') continue;
          const url = String(item.url || '');
          if (!url) continue;
          const title = String(item.title || url);
          const domain = extractDomainFromUrl(url);
          const timeMicros = Number(item.time_usec);
          const timestamp = timeMicros ? new Date(Math.floor(timeMicros / 1000)).toISOString() : new Date().toISOString();

          records.push({
            id: `browser_${i}_${Date.now().toString(36)}`,
            source: 'browser',
            type: 'web_activity',
            title,
            url,
            domain,
            timestamp,
          });
        }
      }
    } catch {
      // Fallback
    }
  } else {
    // Chrome History HTML
    const linkRegex = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = linkRegex.exec(content)) !== null) {
      const url = match[1];
      const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();
      const domain = extractDomainFromUrl(url);

      records.push({
        id: `browser_html_${idx++}_${Date.now().toString(36)}`,
        source: 'browser',
        type: 'web_activity',
        title: rawTitle || url,
        url,
        domain,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return records;
}

/**
 * Parses Markdown conversations into CanonicalConversation
 */
export function parseMarkdownConversation(
  markdownContent: string,
  userId: string,
  importId: string,
  filename: string = 'document.md'
): CanonicalConversation[] {
  const conversations: CanonicalConversation[] = [];
  const rawSections = markdownContent.split(/\n(?=#\s+)/);
  const nowIso = new Date().toISOString();

  for (let i = 0; i < rawSections.length; i++) {
    const sec = rawSections[i].trim();
    if (!sec) continue;

    const lines = sec.split('\n');
    const title = lines[0].replace(/^#\s+/, '').trim() || `${filename} (Section ${i + 1})`;
    const convoId = `conv_md_${i}_${Date.now().toString(36)}`;

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
            messages.push({
              id: `${convoId}_m${messages.length + 1}`,
              conversationId: convoId,
              role: currentRole,
              content: rawTxt,
              timestamp: nowIso,
              tokenCount: estimateTokenCount(rawTxt),
            });
          }
          currentBuffer = [];
        }
        currentRole = userMatch ? 'user' : 'model';
        const cleanLine = line.replace(
          /^(\*\*(?:User|Human|Model|Gemini|Assistant):\*\*|### (?:User|Human|Model|Gemini|Assistant)|(?:User|Human|Model|Gemini|Assistant):)\s*/i,
          ''
        );
        if (cleanLine) currentBuffer.push(cleanLine);
      } else {
        currentBuffer.push(line);
      }
    }

    if (currentBuffer.length > 0) {
      const rawTxt = currentBuffer.join('\n').trim();
      if (rawTxt) {
        messages.push({
          id: `${convoId}_m${messages.length + 1}`,
          conversationId: convoId,
          role: currentRole,
          content: rawTxt,
          timestamp: nowIso,
          tokenCount: estimateTokenCount(rawTxt),
        });
      }
    }

    if (messages.length === 0 && sec.length > 20) {
      // Single note / doc section without explicit turn headers
      messages.push({
        id: `${convoId}_m1`,
        conversationId: convoId,
        role: 'user',
        content: sec,
        timestamp: nowIso,
        tokenCount: estimateTokenCount(sec),
      });
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
        summary: messages[0].content.slice(0, 160),
        tokenCount: messages.reduce((acc, m) => acc + m.tokenCount, 0),
        tags: ['markdown', 'local_import'],
      });
    }
  }

  return conversations;
}
