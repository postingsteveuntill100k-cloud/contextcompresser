# ContextOS — Personal AI Context Layer

**ContextOS** transforms months of conversational AI history (Google Takeout / Gemini exports) into searchable, structured, compressed, and portable context packages. It enables engineers and creators to ask grounded questions about past AI deliberations, retrieve lost architecture decisions, and compile prompt-ready dossiers to resume AI work in fresh sessions without starting over.

🌐 **Production Application:** [https://compresscontext.web.app](https://compresscontext.web.app)  
🚀 **Cloud Run Backend:** `https://contextos-izseyvxihq-uc.a.run.app`  
📦 **Repository:** [https://github.com/postingsteveuntill100k-cloud/contextcompresser](https://github.com/postingsteveuntill100k-cloud/contextcompresser)

---

## Core Capabilities

### 1. Ask My History (Grounded Retrieval)
- Search across your past Gemini conversations using hybrid BM25 lexical ranking and semantic indexing.
- Generates answers grounded strictly in retrieved historical facts with source citations and provenance.
- Built-in zero-hallucination guard: explicitly admits when past discussions do not contain sufficient evidence.

### 2. Generate Context (Hierarchical Compression)
- Synthesizes long-form AI discussions into compact, prompt-ready markdown context packages.
- Preserves architectural decisions, lessons learned, failed approaches, rationale, and open questions.
- Portable: copy and paste directly into any fresh Gemini, Claude, or ChatGPT conversation to restore project state.

### 3. Explore & Recover Decisions
- Automatic extraction and chronological tracking of technical decisions and pivots.
- Identifies decision evolutions, supersessions, and contradictions across multiple conversation sessions.
- Ingestion pipeline with Takeout archive parsing, deduplication (SHA-256 idempotency), and crash-resumable checkpoints.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Client                         │
│   (Next.js 16 + React 19 Client SPA on Firebase Hosting)    │
│              https://compresscontext.web.app                │
└──────────────┬───────────────────────────────┬──────────────┘
               │ (Google OAuth Sign-In)        │ (Bearer ID Token)
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   Firebase Auth / Google     │ │   Cloud Run API Backend    │
│   Identity Platform          │ │   (Stateless Next.js Server│
│   (gen-lang-client-0175818220)│ │    Container on GCP)       │
└──────────────────────────────┘ └─────────────┬──────────────┘
                                               │
               ┌───────────────────────────────┼──────────────────────────────┐
               ▼                               ▼                              ▼
┌─────────────────────────────┐ ┌────────────────────────────┐ ┌────────────────────────────┐
│    Cloud Firestore (GCP)    │ │    Cloud Storage (GCP)     │ │   Gemini 3.5 Flash Lite    │
│  User-scoped subcollections │ │  Raw Takeout ZIP archives  │ │  Via Secret Manager & ADC  │
│    `/users/{uid}/...`       │ │  Byte-for-byte fidelity    │ │  Prompt-injection guarded  │
└─────────────────────────────┘ └────────────────────────────┘ └────────────────────────────┘
```

---

## Security & Privacy Invariants

1. **Zero Client-Trusted Identity:**
   - The backend strictly verifies Firebase ID tokens via `firebase-admin` `verifyIdToken()`.
   - Headers like `x-user-id` or client-supplied body UIDs are never trusted in production.
2. **Strict Multi-Tenant Isolation:**
   - All Firestore documents, retrieval indices, and Cloud Storage archives are stored in paths scoped by the verified user UID (`/users/{uid}/*`). Cross-user read or mutation attempts are strictly rejected with HTTP 403 / 401.
3. **Prompt Injection Containment:**
   - Imported user data is treated as untrusted content and wrapped in strict cryptographic/structural delimiter sandboxes. Imported directives cannot override system synthesis instructions.
4. **Secret Manager Isolation:**
   - Zero credentials or server API keys are bundled into client code. Production builds are validated via automated static scanners (`tests/verify_bundle_secrets.ts`).

---

## Verification & Test Suite

The repository includes a comprehensive 89-point automated test suite:

```bash
# Run complete test suite (Security, Retrieval, Compression, Portability Benchmark)
npm test

# Run Next.js production build and TypeScript check
npm run build

# Run ESLint validation
npm run lint

# Run client bundle secret inspection
npx tsx tests/verify_bundle_secrets.ts

# Run Live Server End-to-End verification against Cloud Run
TARGET_URL=https://contextos-izseyvxihq-uc.a.run.app npx tsx tests/e2e_http_suite.ts
```

### Benchmark Results
- **Held-Out Fresh-Gemini Portability Benchmark:** 100% score across 7 key architectural probes (Inception decision, buried specs, failed approaches, supersessions, prompt injection containment, deep-buried facts, and decision evolution).
- **Test Suite Pass Rate:** 89/89 passed (0 failures).
- **Client Bundle Secrets:** 0 server secrets or credentials detected.

---

## Deployment

Deployments to Firebase Hosting:

```bash
# Build production bundle
npm run build

# Sync prerendered HTML and static chunks to hosting directory
mkdir -p .firebase/compresscontext/hosting/_next
cp -r .next/server/app/*.html .firebase/compresscontext/hosting/
rm -rf .firebase/compresscontext/hosting/_next/static
cp -r .next/static .firebase/compresscontext/hosting/_next/
cp -r public/* .firebase/compresscontext/hosting/

# Deploy to Firebase Hosting
npx -y firebase-tools deploy --only hosting:compresscontext --project=gen-lang-client-0175818220
```

---

## License

Apache-2.0. Built for the Google Cloud & Gemini AI Hackathon.
