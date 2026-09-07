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
          return authUser;
        }
      } else if (res.status === 401 || res.status === 403) {
        clearStoredAuth();
        setUser(null);
        setToken(null);
        setStatus('unauthenticated');
      }
    } catch (err) {
      console.warn('Could not fetch user profile:', err);
    }
    return null;
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    let mounted = true;
    let unsubscribeAuth: (() => void) | null = null;

    // Strict 1000ms safety timeout: NEVER allow app to hang in loading state
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setStatus((curr) => (curr === 'loading' ? 'unauthenticated' : curr));
      }
    }, 1000);

    const initAuth = async () => {
      const existingToken = getStoredToken();
      const existingUser = getStoredUser();

      // Check Firebase Client SDK auth state
      const auth = getClientAuth();
      if (auth) {
        // Check if user is returning from a Google redirect sign-in
        try {
          const redirectRes = await getRedirectResult(auth);
          if (redirectRes && redirectRes.user) {
            const idToken = await redirectRes.user.getIdToken();
            setStoredToken(idToken);
            setStoredUser(redirectRes.user.uid);
            setToken(idToken);
            const profile = await fetchUserProfile();
            if (mounted) {
              if (profile) {
                setUser(profile);
              } else {
                setUser({
                  id: redirectRes.user.uid,
                  email: redirectRes.user.email || '',
                  displayName:
                    redirectRes.user.displayName ||
                    redirectRes.user.email?.split('@')[0] ||
                    `User (${redirectRes.user.uid.slice(0, 8)})`,
                });
              }
              setStatus('authenticated');
              return;
            }
          }
        } catch (redirectErr) {
          console.warn('getRedirectResult notice:', redirectErr);
        }

        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (!mounted) return;
          if (fbUser) {
            try {
              const idToken = await fbUser.getIdToken();
              setStoredToken(idToken);
              setStoredUser(fbUser.uid);
              setToken(idToken);
              const profile = await fetchUserProfile();
              if (mounted) {
                if (profile) {
                  setStatus('authenticated');
                } else {
                  setUser({
                    id: fbUser.uid,
                    email: fbUser.email || '',
                    displayName: fbUser.displayName || fbUser.email?.split('@')[0] || `User (${fbUser.uid.slice(0, 8)})`,
                  });
                  setStatus('authenticated');
                }
              }
            } catch (err: unknown) {
              console.error('Error establishing Firebase session:', err);
              if (mounted) setStatus('unauthenticated');
            }
          } else if (existingToken && existingUser) {
            // Verify with /api/auth
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
                return;
              }
            } catch {
              // fallback below
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

    initAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [fetchUserProfile]);

  const loginWithGoogle = async () => {
    try {
      setError(null);
      setStatus('loading');
      const res = await signInWithGooglePopup();
      if (!res || !res.idToken) {
        // Redirect navigation may be in progress
        return;
      }
      const { idToken, user: fbUser } = res;
      setToken(idToken);
      const profile = await fetchUserProfile();
      if (profile) {
        setUser(profile);
      } else {
        setUser({
          id: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || `User (${fbUser.uid.slice(0, 8)})`,
        });
      }
      setStatus('authenticated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
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
