import { type App, initializeApp, getApps, cert } from 'firebase-admin/app';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';
import { type Auth, getAuth } from 'firebase-admin/auth';
import { type Storage, getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';

let app: App | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let adminStorage: Storage | null = null;

function getFirebaseProjectId(): string {
  const pid = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!pid) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Firebase Admin] Critical Production Security Error: Neither FIREBASE_PROJECT_ID nor GOOGLE_CLOUD_PROJECT is set. System failing closed.');
    }
    return 'gen-lang-client-0175818220';
  }
  return pid;
}

function getFirestoreDbId(): string {
  return process.env.FIRESTORE_DATABASE_ID || 'ai-studio-75bf52e5-ed24-4c6b-9fc6-068f9fc80e3a';
}

export function initializeFirebaseAdmin(): App | null {
  if (app) return app;
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    return app;
  }

  const projectId = getFirebaseProjectId();

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
      app = initializeApp({
        credential: cert(sa),
        projectId: sa.project_id || projectId,
      });
      console.log(`[Firebase Admin] Authenticated with Cloud Project via base64 key: ${sa.project_id || projectId}`);
      return app;
    } catch (err) {
      console.warn('[Firebase Admin] Service account base64 key initialization error:', err);
    }
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      app = initializeApp({
        credential: cert(sa),
        projectId: sa.project_id || projectId,
      });
      console.log(`[Firebase Admin] Authenticated with Cloud Project via env key: ${sa.project_id || projectId}`);
      return app;
    } catch (err) {
      console.warn('[Firebase Admin] Service account env key initialization error:', err);
    }
  }

  const candidatePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(process.cwd(), 'service-account.json'),
    path.resolve(process.cwd(), '..', '..', 'service-account.json'),
    path.resolve(__dirname, '..', '..', 'service-account.json'),
    path.resolve(__dirname, 'service-account.json'),
  ].filter(Boolean) as string[];

  for (const candPath of candidatePaths) {
    if (fs.existsSync(candPath)) {
      try {
        const sa = JSON.parse(fs.readFileSync(candPath, 'utf8'));
        app = initializeApp({
          credential: cert(sa),
          projectId: sa.project_id || projectId,
        });
        console.log(`[Firebase Admin] Authenticated with Cloud Project via '${candPath}': ${sa.project_id || projectId}`);
        return app;
      } catch (err) {
        console.warn(`[Firebase Admin] Service account parse error for '${candPath}':`, err);
      }
    }
  }

  // Support Application Default Credentials (ADC) in Google Cloud runtime (Cloud Run / App Hosting)
  try {
    app = initializeApp({
      projectId,
    });
    console.log(`[Firebase Admin] Authenticated via Application Default Credentials (ADC) for project: ${projectId}`);
    return app;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[Firebase Admin] Critical: Unable to initialize Firebase Admin SDK via ADC or service account: ${err instanceof Error ? err.message : String(err)}`);
    }
    console.warn('[Firebase Admin] Dev fallback initialization warning:', err);
  }

  return null;
}

export function getAdminFirestore(): Firestore | null {
  if (firestoreDb) return firestoreDb;
  const currentApp = initializeFirebaseAdmin();
  if (!currentApp) return null;

  try {
    firestoreDb = getFirestore(currentApp, getFirestoreDbId());
    return firestoreDb;
  } catch (err) {
    console.warn('[Firebase Admin] Cloud Firestore instance fallback:', err);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  if (firebaseAuth) return firebaseAuth;
  const currentApp = initializeFirebaseAdmin();
  if (!currentApp) return null;

  try {
    firebaseAuth = getAuth(currentApp);
    return firebaseAuth;
  } catch (err) {
    console.warn('[Firebase Admin] Auth instance fallback:', err);
    return null;
  }
}

export function getAdminStorage(): Storage | null {
  if (adminStorage) return adminStorage;
  const currentApp = initializeFirebaseAdmin();
  if (!currentApp) return null;

  try {
    adminStorage = getStorage(currentApp);
    return adminStorage;
  } catch (err) {
    console.warn('[Firebase Admin] Storage instance fallback:', err);
    return null;
  }
}

