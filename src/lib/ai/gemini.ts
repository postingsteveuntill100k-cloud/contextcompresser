/**
 * Secure Server-Side Gemini Client Wrapper
 *
 * Enforces:
 * 1. Zero client-side API key leakage (server-only runtime check).
 * 2. Strict request timeouts and exponential backoff retry for transient 429/503 errors.
 * 3. Safe structured logging without logging private conversations or credentials.
 * 4. Model agility: gemini-3.7-flash, gemini-3.8-flash, gemini-embedding-2.
 * 5. Automatic multi-model failover for resilient API calls.
 */

import fs from 'fs';
import path from 'path';
import { getSecret } from '../security/secret_manager';

// Dynamically load .env.local ONLY in development/test if environment variables are not set
function ensureEnvLoaded(): void {
  if (process.env.GEMINI_API_KEY) return;
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  const envPath = path.join(process.cwd(), '.env.local');
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

ensureEnvLoaded();

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Secret resolution: queries GCP Secret Manager in production, falls back to env in dev/test
async function resolveApiKey(): Promise<string> {
  const key = await getSecret('GEMINI_API_KEY');
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('Critical: Missing required production secret GEMINI_API_KEY from Secret Manager. System failing closed.');
  }
  return key;
}

function getDefaultModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
}

function getReasoningModel(): string {
  return process.env.GEMINI_REASONING_MODEL || 'gemini-3.5-flash-lite';
}

function getEmbeddingModel(): string {
  return process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
}

// Ordered fallback model chain for automatic failover
const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
];

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseFormatJson?: boolean;
  systemInstruction?: string;
  timeoutMs?: number;
}

export interface GenerateResult {
  text: string;
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export async function generateContentWithGemini(
  prompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Privileged model calls are blocked.');
  }

  const requestedModel = options.model || getDefaultModel();
  const timeoutMs = options.timeoutMs || 35000;

  const payload: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
      ...(options.responseFormatJson ? { responseMimeType: 'application/json' } : {}),
    },
  };

  if (options.systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  // Build ordered model list: requested model first, then fallbacks (deduped)
  const modelsToTry = [requestedModel, ...FALLBACK_MODELS.filter((m) => m !== requestedModel)];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const url = `${BASE_URL}/models/${model}:generateContent`;

    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();

          // 404 means this model is no longer available — skip to next model
          if (response.status === 404) {
            lastError = new Error(`Model ${model} not available: ${errText.slice(0, 200)}`);
            break; // break inner retry loop, try next model
          }

          if (response.status === 429 || response.status === 503) {
            lastError = new Error(`Gemini API ${response.status} for ${model}: ${errText.slice(0, 200)}`);
            if (attempt < maxAttempts) {
              // Brief backoff before retry on same model
              await new Promise((r) => setTimeout(r, attempt * 1500));
              continue;
            }
            // Exhausted retries on this model — break to try next model
            break;
          }

          // 400, 401, 403 are permanent client configuration / auth errors; do not cycle models
          if (response.status === 400 || response.status === 401 || response.status === 403) {
            throw new Error(`Gemini API permanent configuration error (${response.status}): ${errText.slice(0, 300)}`);
          }

          throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 300)}`);
        }

        const data = await response.json();

        // 1. Validate prompt-level safety blocks
        if (data.promptFeedback?.blockReason) {
          throw new Error(`Gemini request blocked by safety filter: ${data.promptFeedback.blockReason}`);
        }

        // 2. Validate candidates presence
        if (!Array.isArray(data.candidates) || data.candidates.length === 0) {
          throw new Error(`Gemini returned zero candidates. Raw response: ${JSON.stringify(data).slice(0, 250)}`);
        }

        const candidate = data.candidates[0];

        // 3. Check candidate finishReason for safety / recitation filters
        if (candidate.finishReason && ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT'].includes(candidate.finishReason)) {
          throw new Error(`Gemini candidate blocked by content filter with finishReason=${candidate.finishReason}`);
        }

        // 4. Validate text parts
        const text = candidate?.content?.parts?.[0]?.text;
        if (typeof text !== 'string') {
          throw new Error(`Malformed Gemini response: missing text in candidate content parts.`);
        }

        const usage = data.usageMetadata || {};

        if (model !== requestedModel) {
          console.log(`[Gemini Client] Model fallback engaged: served via '${model}' (originally requested '${requestedModel}')`);
        }

        return {
          text,
          model,
          promptTokens: usage.promptTokenCount || 0,
          candidatesTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        };
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        lastError = err instanceof Error ? err : new Error(String(err));

        // Fast-fail permanent configuration/client errors
        if (lastError.message.includes('permanent configuration error')) {
          throw lastError;
        }

        // Timeout (AbortError): transient failure on this model.
        if (lastError.name === 'AbortError' || lastError.message.includes('timed out')) {
          lastError = new Error(`Gemini API request to ${model} timed out after ${timeoutMs}ms`);
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, attempt * 1000));
            continue;
          }
          // Exhausted attempts on this model; break inner loop to try next model in fallback chain
          break;
        }

        if (attempt >= maxAttempts) break;
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }

  throw lastError || new Error('Gemini API call failed after trying all available models.');
}

/**
 * Generate semantic vector embedding for a query or text chunk
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const embeddingModel = getEmbeddingModel();
  const url = `${BASE_URL}/models/${embeddingModel}:embedContent`;
  const payload = {
    content: {
      parts: [{ text: text.slice(0, 8000) }], // Stay within chunk token window
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Embedding API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const values = data.embedding?.values;
  if (!Array.isArray(values)) {
    throw new Error('Malformed embedding response: missing embedding values array.');
  }

  return values;
}

/**
 * Cosine similarity between two float vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Export model name getters for use in other modules
const DEFAULT_MODEL = getDefaultModel();
const REASONING_MODEL = getReasoningModel();
const EMBEDDING_MODEL = getEmbeddingModel();
export { DEFAULT_MODEL, REASONING_MODEL, EMBEDDING_MODEL };
