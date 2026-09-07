import http from 'http';
import fs from 'fs';
import path from 'path';

((process.env as unknown) as Record<string, string | undefined>).NODE_ENV = 'test';
process.env.TEST_AUTH_ENABLED = 'true';

// Dynamically load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
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

import { createSignedSessionToken } from '../src/lib/security/auth_guard';

const testToken = createSignedSessionToken('user_gemini_main', 'principal@internal.io', 3600);

async function testEndpoint(name: string, path: string, method: string = 'GET', body: unknown = null) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testToken}`,
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          console.log(`[HTTP ${res.statusCode}] ${name}: ${data.slice(0, 110)}...`);
          resolve({ status: res.statusCode, body: data });
        });
      }
    );
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('Testing live authenticated endpoints on http://localhost:3000...\n');
  await testEndpoint('Auth Profile API', '/api/auth');
  await testEndpoint('Conversations API', '/api/conversations');
  await testEndpoint('Memory API', '/api/memory');
  await testEndpoint('Security Test API', '/api/security-test', 'POST');
  await testEndpoint('Ask My History API', '/api/ask', 'POST', { question: 'What database architecture was chosen?' });
  await testEndpoint('Generate Context API', '/api/generate-context', 'POST', { projectTitle: 'Personal Gemini Context System', mode: 'quick' });
  await testEndpoint('Import API (List)', '/api/import');
  await testEndpoint('Dev Mode API', '/api/dev-mode', 'POST', {
    projectTitle: 'Context Engine Handoff',
    codeSnippets: [
      {
        filename: 'engine.ts',
        code: 'export class Engine { run() {} }',
      },
    ],
  });
}

run();
