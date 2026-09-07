/**
 * Google Cloud Secret Manager Integration
 *
 * Architecture:
 * GCP Runtime Identity (ADC) -> Secret Manager API -> In-Memory Cached Secret -> Server-Only Consumers
 *
 * Security Invariants:
 * 1. Never expose secrets to client JavaScript, browser, API responses, logs, or error messages.
 * 2. Fail-closed in production if required secrets cannot be resolved.
 * 3. Non-production / local development may use .env.local as a strictly local fallback.
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import fs from 'fs';
import path from 'path';

function getProjectId(): string {
  const pid = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!pid) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Secret Manager] Critical Production Security Error: Neither FIREBASE_PROJECT_ID nor GOOGLE_CLOUD_PROJECT is set. System failing closed.');
    }
    return 'gen-lang-client-0175818220'; // Development/test fallback only
  }
  return pid;
}

// In-memory cache for secrets with 5-minute TTL to reduce latency and API calls
interface CachedSecret {
  value: string;
  expiresAt: number;
}

const secretCache = new Map<string, CachedSecret>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let client: SecretManagerServiceClient | null = null;

function getSecretManagerClient(): SecretManagerServiceClient | null {
  if (client) return client;
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production: STRICTLY Application Default Credentials (ADC) via Cloud Run / GCP runtime identity.
      // Never package or load service-account.json from filesystem.
      client = new SecretManagerServiceClient();
      return client;
    }

    // Local dev/test only: check if local service-account exists
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      client = new SecretManagerServiceClient({ keyFilename: serviceAccountPath });
    } else {
      client = new SecretManagerServiceClient();
    }
    return client;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[Secret Manager] Failed to initialize client via ADC: ${err instanceof Error ? err.message : String(err)}`);
    }
    return null;
  }
}

/**
 * Access a secret version from Google Cloud Secret Manager.
 * In production: Strictly queries Secret Manager via ADC. Fails closed if missing.
 * In non-production: Checks Secret Manager, falls back to process.env / .env.local.
 */
export async function getSecret(secretName: string): Promise<string> {
  // Check memory cache first
  const cached = secretCache.get(secretName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // 1. Attempt retrieval from Google Cloud Secret Manager
  const smClient = getSecretManagerClient();
  if (smClient) {
    try {
      const pid = getProjectId();
      const name = `projects/${pid}/secrets/${secretName}/versions/latest`;
      const [version] = await smClient.accessSecretVersion({ name });
      const payload = version.payload?.data?.toString();
      if (payload) {
        secretCache.set(secretName, {
          value: payload,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return payload;
      }
    } catch {
      if (process.env[secretName]) {
        return process.env[secretName]!;
      }
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `[Secret Manager] Production Security Violation: Failed to retrieve secret '${secretName}' from Secret Manager. System failing closed.`
        );
      }
      // In dev/test, proceed to local env fallback
    }
  }

  // 2. Non-production fallback to environment variable or .env.local
  if (process.env[secretName]) {
    return process.env[secretName]!;
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith(`${secretName}=`)) {
            const val = trimmed.slice(`${secretName}=`.length).trim().replace(/^['"]|['"]$/g, '');
            process.env[secretName] = val;
            return val;
          }
        }
      }
    } catch {}
  }

  // 3. If in production, fail closed immediately
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[Secret Manager] Critical Production Security Error: Secret '${secretName}' is unavailable. System failing closed.`
    );
  }

  return '';
}
