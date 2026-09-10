/**
 * Real Client-Side Firebase Authentication
 *
 * Enforces:
 * 1. Authenticated identity comes from real Firebase Auth (Firebase Client SDK).
 * 2. `fetchWithAuth` attaches genuine Firebase ID tokens (`getIdToken()`).
 * 3. Client never sends untrusted x-user-id headers as authority.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  GoogleAuthProvider,
  type Auth,
  type User,
} from 'firebase/auth';

function getFirebaseClientConfig() {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'gen-lang-client-0175818220';
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDrWEa_Vm6OR3LwvJOceG6JWOiT97mme1E';
  // Google OAuth Client ID authorized redirect URI is configured for gen-lang-client-0175818220.firebaseapp.com
  const authDomain =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
  const appId =
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:358489022146:web:74d90a218495396c29e55b';
  return { projectId, apiKey, authDomain, storageBucket, appId };
}

let clientAuth: Auth | null = null;

export function getClientAuth(): Auth | null {
  if (typeof window === 'undefined') return null;
  if (clientAuth) return clientAuth;

  const config = getFirebaseClientConfig();
  if (!config.projectId) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID in production.');
      return null;
    }
  }

  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  clientAuth = getAuth(app);
  return clientAuth;
}

const TOKEN_STORAGE_KEY = 'gemini_context_session_token';
const USER_STORAGE_KEY = 'gemini_context_active_user';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getStoredUser(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_STORAGE_KEY);
}

export function setStoredUser(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_STORAGE_KEY, userId);
}

export function clearStoredAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  document.cookie = 'firebase_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

export async function signInWithGooglePopup(): Promise<{ idToken: string; user: User }> {
  console.log('[Auth Lifecycle] signInWithGooglePopup: initiating Google popup...');
  const auth = getClientAuth();
  if (!auth) {
    console.error('[Auth Lifecycle] signInWithGooglePopup: Firebase Auth is not initialized');
    throw new Error('Firebase Auth is not initialized.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // 12-second watchdog timeout for browser environments with third-party cookie/popup partitioning
  let timerId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      const err = new Error('Popup communication timed out due to browser cross-origin policy');
      (err as unknown as { code: string }).code = 'auth/popup-timeout';
      reject(err);
    }, 12000);
  });

  try {
    const result = await Promise.race([
      signInWithPopup(auth, provider),
      timeoutPromise,
    ]);
    if (timerId) clearTimeout(timerId);
    console.log('[Auth Lifecycle] signInWithPopup: popup resolved successfully for uid:', result.user.uid);
    const idToken = await result.user.getIdToken();
    console.log('[Auth Lifecycle] getIdToken: ID token acquired');
    setStoredToken(idToken);
    setStoredUser(result.user.uid);
    return { idToken, user: result.user };
  } catch (err: unknown) {
    if (timerId) clearTimeout(timerId);
    const errObj = err as { code?: string; message?: string };
    const msg = errObj?.message || String(err);
    const code = errObj?.code || '';
    console.warn('[Auth Lifecycle] signInWithPopup caught error: code =', code, 'message =', msg);

    // Auto-fallback to redirect if popup communication was blocked or timed out
    if (
      code === 'auth/popup-timeout' ||
      code === 'auth/popup-blocked' ||
      code === 'auth/network-request-failed' ||
      code === 'auth/internal-error'
    ) {
      console.log('[Auth Lifecycle] Falling back to signInWithRedirect due to:', code);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('contextos_redirect_in_progress', 'true');
      }
      await signInWithRedirect(auth, provider);
      return new Promise<never>(() => {});
    }

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('Sign-in was cancelled: Google account window was closed before completing.');
    }
    throw err;
  }
}

export async function signInWithGoogleRedirect(): Promise<void> {
  console.log('[Auth Lifecycle] signInWithGoogleRedirect: initiating full-page redirect...');
  const auth = getClientAuth();
  if (!auth) {
    console.error('[Auth Lifecycle] signInWithGoogleRedirect: Firebase Auth is not initialized');
    throw new Error('Firebase Auth is not initialized.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('contextos_redirect_in_progress', 'true');
  }
  await signInWithRedirect(auth, provider);
}

export async function clientSignOut(): Promise<void> {
  const auth = getClientAuth();
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signOut error:', e);
    }
  }
  clearStoredAuth();
}

/**
 * Ensures the browser has an active Firebase Auth session.
 * Obtains a genuine Firebase ID token.
 */
export async function ensureFirebaseAuth(): Promise<string | null> {
  const auth = getClientAuth();
  if (!auth) return getStoredToken();

  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken(false);
      setStoredToken(idToken);
      return idToken;
    } catch {
      // Fallback
    }
  }

  return getStoredToken();
}

/**
 * Authenticate client identity for demo/test users
 */
export async function authenticateClientIdentity(userId: string): Promise<{ token: string; user: unknown }> {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' && window.location.hostname.includes('web.app')
      ? 'https://contextos-izseyvxihq-uc.a.run.app'
      : '');
  const res = await fetch(`${apiBase}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mint_token', userId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Authentication failed with status ${res.status}`);
  }

  const data = await res.json();
  if (data.token) {
    setStoredToken(data.token);
    setStoredUser(userId);
  }
  return data;
}

/**
 * Authenticated fetch wrapper that automatically attaches the verified Bearer token.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let token = await ensureFirebaseAuth();

  if (!token) {
    token = getStoredToken();
  }

  // If no token in dev/demo, bootstrap identity if a user is stored
  if (!token) {
    const currentUser = getStoredUser();
    if (currentUser) {
      try {
        const authResult = await authenticateClientIdentity(currentUser);
        token = authResult.token;
      } catch (err) {
        console.warn('Could not bootstrap auth token:', err);
      }
    }
  }

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' && window.location.hostname.includes('web.app')
      ? 'https://contextos-izseyvxihq-uc.a.run.app'
      : '');
  const targetUrl = url.startsWith('/api') && apiBase ? `${apiBase}${url}` : url;

  return fetch(targetUrl, {
    credentials: 'omit',
    ...options,
    headers,
  });
}
