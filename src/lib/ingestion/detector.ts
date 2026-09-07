import crypto from 'crypto';
import AdmZip from 'adm-zip';

export type DetectedFormat =
  | 'google_takeout'
  | 'gemini_export'
  | 'raw_json'
  | 'markdown'
  | 'zip_archive'
  | 'unknown';

export interface DetectionResult {
  format: DetectedFormat;
  isValid: boolean;
  sha256: string;
  itemCountEstimate: number;
  confidence: number;
  encoding: string;
  errorMessage?: string;
  innerFiles?: string[];
}

export function computeSha256(content: string | Buffer): string {
  if (Buffer.isBuffer(content)) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function detectFormat(rawInput: string | Buffer, filename: string = ''): DetectionResult {
  const isBuf = Buffer.isBuffer(rawInput);
  const rawBytes = isBuf ? rawInput : Buffer.from(rawInput, 'utf8');
  const sha256 = computeSha256(rawBytes);

  if (!rawInput || rawBytes.length === 0) {
    return {
      format: 'unknown',
      isValid: false,
      sha256,
      itemCountEstimate: 0,
      confidence: 0,
      encoding: 'utf-8',
      errorMessage: 'Archive is empty (0 bytes).',
    };
  }

  const lowerFilename = filename.toLowerCase();

  // 1. Check for ZIP Archive (PK\x03\x04 magic bytes or .zip extension)
  const isZipMagic = rawBytes.length >= 4 && rawBytes[0] === 0x50 && rawBytes[1] === 0x4B && rawBytes[2] === 0x03 && rawBytes[3] === 0x04;
  if (lowerFilename.endsWith('.zip') || isZipMagic) {
    try {
      const zip = new AdmZip(rawBytes);
      const zipEntries = zip.getEntries();
      const relevantEntries = zipEntries.filter(
        (e) => !e.isDirectory && (e.entryName.toLowerCase().endsWith('.json') || e.entryName.toLowerCase().endsWith('.md') || e.entryName.toLowerCase().endsWith('.txt'))
      );

      if (zipEntries.length === 0) {
        return {
          format: 'zip_archive',
          isValid: false,
          sha256,
          itemCountEstimate: 0,
          confidence: 0.9,
          encoding: 'binary',
          errorMessage: 'ZIP archive is empty.',
        };
      }

      if (relevantEntries.length === 0) {
        return {
          format: 'zip_archive',
          isValid: false,
          sha256,
          itemCountEstimate: 0,
          confidence: 0.9,
          encoding: 'binary',
          errorMessage: 'ZIP archive contains no recognized conversation files (.json or .md).',
        };
      }

      return {
        format: 'zip_archive',
        isValid: true,
        sha256,
        itemCountEstimate: relevantEntries.length,
        confidence: 0.95,
        encoding: 'binary',
        innerFiles: relevantEntries.map((e) => e.entryName),
      };
    } catch {
      return {
        format: 'zip_archive',
        isValid: false,
        sha256,
        itemCountEstimate: 0,
        confidence: 0.5,
        encoding: 'binary',
        errorMessage: 'Corrupt or malformed ZIP archive: unable to unpack directory.',
      };
    }
  }

  // Convert to UTF-8 text for text-based inspections
  const rawContent = isBuf ? rawBytes.toString('utf8') : rawInput;
  const trimmed = rawContent.trim();

  // 2. Reject HTML error pages and web documents
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.toLowerCase().startsWith('<html') ||
    lowerFilename.endsWith('.html') ||
    lowerFilename.endsWith('.htm')
  ) {
    return {
      format: 'unknown',
      isValid: false,
      sha256,
      itemCountEstimate: 0,
      confidence: 0.9,
      encoding: 'utf-8',
      errorMessage: 'HTML documents and web error pages are unsupported. Please provide a Gemini Takeout JSON export, Markdown transcript, or ZIP archive.',
    };
  }

  // 3. Try JSON detection
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);

      // Google Takeout format check
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return {
            format: 'raw_json',
            isValid: true,
            sha256,
            itemCountEstimate: 0,
            confidence: 0.7,
            encoding: 'utf-8',
          };
        }

        const sample = parsed[0];
        if (sample && (sample.turns || sample.messages || sample.create_time || sample.createTime)) {
          return {
            format: 'google_takeout',
            isValid: true,
            sha256,
            itemCountEstimate: parsed.length,
            confidence: 0.95,
            encoding: 'utf-8',
          };
        }

        return {
          format: 'raw_json',
          isValid: true,
          sha256,
          itemCountEstimate: parsed.length,
          confidence: 0.85,
          encoding: 'utf-8',
        };
      }

      // Object format check
      if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed.conversations)) {
          return {
            format: 'gemini_export',
            isValid: true,
            sha256,
            itemCountEstimate: parsed.conversations.length,
            confidence: 0.98,
            encoding: 'utf-8',
          };
        }

        if (Array.isArray(parsed.chats) || Array.isArray(parsed.threads)) {
          const list = parsed.chats || parsed.threads;
          return {
            format: 'gemini_export',
            isValid: true,
            sha256,
            itemCountEstimate: list.length,
            confidence: 0.9,
            encoding: 'utf-8',
          };
        }

        // Single conversation object
        if (parsed.turns || parsed.messages || parsed.title) {
          return {
            format: 'gemini_export',
            isValid: true,
            sha256,
            itemCountEstimate: 1,
            confidence: 0.8,
            encoding: 'utf-8',
          };
        }
      }
    } catch {
      // If JSON parse fails, check if filename implies JSON
      if (lowerFilename.endsWith('.json')) {
        return {
          format: 'raw_json',
          isValid: false,
          sha256,
          itemCountEstimate: 0,
          confidence: 0.5,
          encoding: 'utf-8',
          errorMessage: 'Malformed JSON syntax: unable to parse file content.',
        };
      }
    }
  }

  // 4. Markdown format check (ensure not HTML or binary)
  if (
    lowerFilename.endsWith('.md') ||
    lowerFilename.endsWith('.txt') ||
    trimmed.includes('# ') ||
    trimmed.includes('**User:**') ||
    trimmed.includes('**Model:**') ||
    trimmed.includes('**Gemini:**')
  ) {
    const matches = trimmed.match(/^#\s+[^\n]+/gm);
    const count = matches ? matches.length : 1;
    return {
      format: 'markdown',
      isValid: true,
      sha256,
      itemCountEstimate: count,
      confidence: 0.85,
      encoding: 'utf-8',
    };
  }

  return {
    format: 'unknown',
    isValid: false,
    sha256,
    itemCountEstimate: 0,
    confidence: 0.2,
    encoding: 'utf-8',
    errorMessage: 'Unrecognized archive format. Please supply a Gemini Takeout JSON export, Markdown transcript, or ZIP archive.',
  };
}
