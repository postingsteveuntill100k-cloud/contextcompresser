// Real Secret Leakage Test
// Inspects all client-side JavaScript bundles in .next/static/
// to verify that ZERO server secrets, API keys, service accounts, or private tokens
// are leaked into the client browser bundle.

import fs from 'fs';
import path from 'path';

function findFiles(dir: string, ext: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(fullPath, ext));
    } else if (file.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

export async function verifyClientBundlesForSecretLeakage(): Promise<{ passed: boolean; violations: string[] }> {
  const staticDir = path.join(process.cwd(), '.next', 'static');
  if (!fs.existsSync(staticDir)) {
    const msg = 'NOT VERIFIED: .next/static directory not found. You must run npm run build before auditing client bundles.';
    console.error(`[Secret Bundle Audit] ✗ ${msg}`);
    return { passed: false, violations: [msg] };
  }

  const jsFiles = findFiles(staticDir, '.js');
  if (jsFiles.length === 0) {
    const msg = 'NOT VERIFIED: No .js files found in .next/static. Build output appears incomplete.';
    console.error(`[Secret Bundle Audit] ✗ ${msg}`);
    return { passed: false, violations: [msg] };
  }
  console.log(`[Secret Bundle Audit] Inspecting ${jsFiles.length} client JavaScript bundle files in .next/static...`);

  // Secret patterns that must NEVER appear in client bundles
  const prohibitedPatterns = [
    { name: 'GEMINI_API_KEY name', regex: /GEMINI_API_KEY/ },
    { name: 'Gemini Server API Key', regex: /AQ\.Ab8RN[A-Za-z0-9_-]+/ },
    { name: 'Service Account Private Key', regex: /-----BEGIN PRIVATE KEY-----/ },
    { name: 'Service Account client_email', regex: /"client_email"\s*:\s*"[^"]+@gen-lang-client/ },
    { name: 'APP_SECRET name', regex: /APP_SECRET/ },
  ];

  const violations: string[] = [];

  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of prohibitedPatterns) {
      if (pattern.regex.test(content)) {
        const relativePath = path.relative(process.cwd(), file);
        violations.push(`Violation in ${relativePath}: Leaked pattern '${pattern.name}'`);
      }
    }
  }

  if (violations.length > 0) {
    console.error('❌ CRITICAL SECURITY ERROR: Secrets detected in client JavaScript bundle!');
    violations.forEach((v) => console.error(`  - ${v}`));
    return { passed: false, violations };
  }

  console.log(`✓ Bundle Inspection Passed: Checked ${jsFiles.length} files. ZERO secrets or credentials detected.`);
  return { passed: true, violations: [] };
}

// Standalone execution if run directly
if (require.main === module) {
  verifyClientBundlesForSecretLeakage().then(({ passed }) => {
    if (!passed) {
      process.exit(1);
    }
    process.exit(0);
  });
}
