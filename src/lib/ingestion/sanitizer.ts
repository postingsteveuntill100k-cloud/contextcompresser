/**
 * Prompt-Injection Defense & Historical Data Sanitizer
 *
 * All imported and historical conversation data is UNTRUSTED DATA.
 * This module strips boundary escapes, neutralizes command-override patterns,
 * and frames data safely inside strict boundary containers.
 */

// Patterns commonly used in injection attacks
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+(instructions|directives|prompts)/gi,
  /disregard\s+(all\s+)?(previous|prior)\s+(instructions|rules)/gi,
  /reveal\s+(the\s+)?(system\s+prompt|api\s*key|secret|credentials)/gi,
  /output\s+(your\s+)?(initial\s+instructions|system\s+prompt)/gi,
  /you\s+are\s+now\s+(in\s+developer\s+mode|dan|an\s+unrestricted\s+ai)/gi,
  /override\s+system\s+(policy|prompt|guardrails)/gi,
];

// Delimiter injection patterns that attempt to close XML/Markdown envelopes prematurely
const DELIMITER_ESCAPE_PATTERNS = [
  /<\/?untrusted[^>]*>/gi,
  /<\/?historical_context[^>]*>/gi,
  /<\/?system_directive[^>]*>/gi,
  /<\/?user_data[^>]*>/gi,
  /\[SYSTEM\s+OVERRIDE\]/gi,
  /\[SYSTEM_INSTRUCTION\]/gi,
  /<!--\s*END_OF_INSTRUCTIONS\s*-->/gi,
];

export interface SanitizationResult {
  sanitizedText: string;
  hasInjectionAttempt: boolean;
  neutralizedCount: number;
}

/**
 * Strips zero-width characters, bidirectional overrides, and rogue delimiters
 */
export function sanitizeText(input: string): SanitizationResult {
  if (!input || typeof input !== 'string') {
    return { sanitizedText: '', hasInjectionAttempt: false, neutralizedCount: 0 };
  }

  let text = input;
  let neutralizedCount = 0;

  // 1. Remove sneaky zero-width & bidirectional override unicode characters
  // \u200B-\u200D, \uFEFF, \u202A-\u202E
  text = text.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, '');

  // 2. Check for injection intent
  let hasInjectionAttempt = false;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      hasInjectionAttempt = true;
      neutralizedCount++;
      // Neutralize the injection keyword so it cannot act as a directive
      text = text.replace(pattern, (match) => `[UNTRUSTED_CONTENT_DEFUSED: "${match}"]`);
    }
  }

  // 3. Defuse delimiter breakouts
  for (const delimiter of DELIMITER_ESCAPE_PATTERNS) {
    if (delimiter.test(text)) {
      neutralizedCount++;
      text = text.replace(delimiter, '[ESCAPED_DELIMITER]');
    }
  }

  return {
    sanitizedText: text,
    hasInjectionAttempt,
    neutralizedCount,
  };
}

/**
 * Wraps historical data safely in an armored sandbox tag
 * Ensures Gemini strictly interprets enclosed text as literal data, never instructions.
 */
export function wrapInHistoricalSandbox(content: string, metadata: { conversationTitle?: string; date?: string; role?: string } = {}): string {
  const { sanitizedText } = sanitizeText(content);
  const titleAttr = metadata.conversationTitle ? ` source="${escapeXmlAttr(metadata.conversationTitle)}"` : '';
  const dateAttr = metadata.date ? ` timestamp="${escapeXmlAttr(metadata.date)}"` : '';
  const roleAttr = metadata.role ? ` role="${escapeXmlAttr(metadata.role)}"` : '';

  return `<untrusted_historical_record${titleAttr}${dateAttr}${roleAttr}>\n${sanitizedText}\n</untrusted_historical_record>`;
}

function escapeXmlAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
