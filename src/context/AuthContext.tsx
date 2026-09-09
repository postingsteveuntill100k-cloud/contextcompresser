'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  getClientAuth,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearStoredAuth,
  signInWithGooglePopup,
  clientSignOut,
  authenticateClientIdentity,
  fetchWithAuth,
} from '@/lib/security/client_auth';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  loginAsDevUser: (userId: string, email?: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => {
    if (typeof window !== 'undefined') {
      const hasStored = getStoredToken() || getStoredUser();
      return hasStored ? 'loading' : 'unauthenticated';
    }
    return 'unauthenticated';
  });
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async (): Promise<AuthUser | null> => {
    try {
      console.log('[Auth Lifecycle] fetchUserProfile: fetching profile from /api/auth...');
      const res = await fetchWithAuth('/api/auth');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email || '',
            displayName: data.user.displayName || data.user.email?.split('@')[0] || `User (${data.user.id.slice(0, 8)})`,
          };
          setUser(authUser);
          setStoredUser(authUser.id);
          console.log('[Auth Lifecycle] fetchUserProfile: profile synced for user', authUser.id);
          return authUser;
        }
      }
    } catch (err) {
      console.warn('[Auth Lifecycle] fetchUserProfile notice (non-fatal):', err);
    }
    return null;
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    let mounted = true;
    let unsubscribeAuth: (() => void) | null = null;

    console.log('[Auth Lifecycle] AuthProvider mounted, initializing auth listeners...');

    // Safety timeout: only fallback to unauthenticated if still loading after 12s
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setStatus((curr) => {
          if (curr === 'loading') {
            console.warn('[Auth Lifecycle] Safety timer expired while loading; setting unauthenticated');
            return 'unauthenticated';
          }
          return curr;
        });
      }
    }, 12000);

    const initAuth = async () => {
      const existingToken = getStoredToken();
      const existingUser = getStoredUser();

      const auth = getClientAuth();
      if (auth) {
        // 1. Immediately register onAuthStateChanged listener (official Firebase primary mechanism)
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (!mounted) return;
          console.log('[Auth Lifecycle] onAuthStateChanged fired, fbUser =', fbUser ? fbUser.uid : 'null');
          if (fbUser) {
            try {
              const idToken = await fbUser.getIdToken();
              if (!mounted) return;
              setStoredToken(idToken);
              setStoredUser(fbUser.uid);
              setToken(idToken);
              const authUser: AuthUser = {
                id: fbUser.uid,
                email: fbUser.email || '',
                displayName: fbUser.displayName || fbUser.email?.split('@')[0] || `User (${fbUser.uid.slice(0, 8)})`,
              };
              setUser(authUser);
              setStatus('authenticated');
              clearTimeout(safetyTimer);
              console.log('[Auth Lifecycle] onAuthStateChanged: authenticated state active for', fbUser.uid);
              // Asynchronously enrich user profile in background
              void fetchUserProfile();
            } catch (err: unknown) {
              console.error('[Auth Lifecycle] Error extracting Firebase token in listener:', err);
              if (mounted) setStatus('unauthenticated');
            }
          } else if (existingToken && existingUser) {
            // Check stored token validity via /api/auth
            try {
              const res = await fetchWithAuth('/api/auth');
              if (res.ok && mounted) {
                const data = await res.json();
                setUser({
                  id: data.user.id,
                  email: data.user.email || '',
                  displayName: data.user.displayName || `User (${data.user.id.slice(0, 8)})`,
                });
                setToken(existingToken);
                setStatus('authenticated');
                clearTimeout(safetyTimer);
                console.log('[Auth Lifecycle] Stored session validated via API for', data.user.id);
                return;
              }
            } catch {
              // Ignore failure, fall through to unauthenticated
            }
            if (mounted) {
              clearStoredAuth();
              setStatus('unauthenticated');
            }
          } else {
            if (mounted) {
              setStatus('unauthenticated');
            }
          }
        });
        unsubscribeAuth = unsubscribe;

        // 2. In parallel, inspect getRedirectResult without blocking onAuthStateChanged
        getRedirectResult(auth)
          .then(async (redirectRes) => {
            if (!mounted) return;
            if (redirectRes && redirectRes.user) {
              console.log('[Auth Lifecycle] getRedirectResult: resolved user', redirectRes.user.uid);
              const idToken = await redirectRes.user.getIdToken();
              if (!mounted) return;
              setStoredToken(idToken);
              setStoredUser(redirectRes.user.uid);
              setToken(idToken);
              const authUser: AuthUser = {
                id: redirectRes.user.uid,
                email: redirectRes.user.email || '',
                displayName:
                  redirectRes.user.displayName ||
                  redirectRes.user.email?.split('@')[0] ||
                  `User (${redirectRes.user.uid.slice(0, 8)})`,
              };
              setUser(authUser);
              setStatus('authenticated');
              clearTimeout(safetyTimer);
              void fetchUserProfile();
            }
          })
          .catch((redirectErr) => {
            console.warn('[Auth Lifecycle] getRedirectResult notice:', redirectErr?.message || redirectErr);
          });
        return;
      }

      // If no client Firebase SDK configured, check stored credentials
      if (existingToken && existingUser) {
        try {
          const res = await fetchWithAuth('/api/auth');
          if (res.ok && mounted) {
            const data = await res.json();
            setUser({
              id: data.user.id,
              email: data.user.email || '',
              displayName: data.user.displayName || `User (${data.user.id.slice(0, 8)})`,
            });
            setToken(existingToken);
            setStatus('authenticated');
            clearTimeout(safetyTimer);
            return;
          }
        } catch {
          // Ignore
        }
      }

      if (mounted) {
        setStatus('unauthenticated');
      }
    };

    void initAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [fetchUserProfile]);

  const loginWithGoogle = async () => {
    try {
      console.log('[Auth Lifecycle] AuthContext: loginWithGoogle called');
      setError(null);
      setStatus('loading');
      const res = await signInWithGooglePopup();
      if (!res || !res.idToken || !res.user) {
        console.warn('[Auth Lifecycle] AuthContext: signInWithGooglePopup returned incomplete result');
        return;
      }
      const { idToken, user: fbUser } = res;
      console.log('[Auth Lifecycle] AuthContext: popup completed, setting authenticated user', fbUser.uid);
      setToken(idToken);
      const authUser: AuthUser = {
        id: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || `User (${fbUser.uid.slice(0, 8)})`,
      };
      setUser(authUser);
      setStatus('authenticated');
      console.log('[Auth Lifecycle] AuthContext: status set to authenticated for user', authUser.id);
      // Enrich profile asynchronously without blocking UI navigation
      void fetchUserProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Auth Lifecycle] AuthContext: loginWithGoogle failed:', msg);
      setError(msg);
      setStatus('unauthenticated');
      throw err;
    }
  };

  const loginAsDevUser = async (userId: string, email?: string, displayName?: string) => {
    try {
      setError(null);
      setStatus('loading');
      const authData = await authenticateClientIdentity(userId);
      setToken(authData.token);
      setStoredUser(userId);
      setUser({
        id: userId,
        email: email || `${userId}@geminicontext.internal`,
        displayName: displayName || `User (${userId.slice(0, 8)})`,
      });
      setStatus('authenticated');
      await fetchUserProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('unauthenticated');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await clientSignOut();
    } finally {
      setUser(null);
      setToken(null);
      setError(null);
      setStatus('unauthenticated');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        status,
        error,
        loginWithGoogle,
        loginAsDevUser,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
