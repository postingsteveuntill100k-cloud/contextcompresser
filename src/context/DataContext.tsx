'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CanonicalConversation, RawImport, ContextPackage, StructuredMemory } from '@/types';
import { fetchWithAuth } from '@/lib/security/client_auth';
import { useAuth } from './AuthContext';

interface DataContextType {
  conversations: CanonicalConversation[];
  rawImports: RawImport[];
  memory: StructuredMemory | null;
  packages: ContextPackage[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const [conversations, setConversations] = useState<CanonicalConversation[]>([]);
  const [rawImports, setRawImports] = useState<RawImport[]>([]);
  const [memory, setMemory] = useState<StructuredMemory | null>(null);
  const [packages, setPackages] = useState<ContextPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    setError(null);

    try {
      const [convResult, impResult, memResult, pkgResult] = await Promise.allSettled([
        fetchWithAuth('/api/conversations').then((res) => (res.ok ? res.json() : null)),
        fetchWithAuth('/api/import').then((res) => (res.ok ? res.json() : null)),
        fetchWithAuth('/api/memory').then((res) => (res.ok ? res.json() : null)),
        fetchWithAuth('/api/generate-context').then((res) => (res.ok ? res.json() : null)),
      ]);

      if (convResult.status === 'fulfilled' && convResult.value) {
        setConversations(convResult.value.conversations || []);
      }
      if (impResult.status === 'fulfilled' && impResult.value) {
        setRawImports(impResult.value.imports || []);
      }
      if (memResult.status === 'fulfilled' && memResult.value) {
        setMemory(memResult.value.memory || null);
      }
      if (pkgResult.status === 'fulfilled' && pkgResult.value) {
        setPackages(pkgResult.value.packages || []);
      }
    } catch (err: unknown) {
      console.error('Failed to load user workspace data:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    let active = true;
    if (status === 'authenticated') {
      const timer = setTimeout(() => {
        if (active) void refreshData();
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    } else {
      const timer = setTimeout(() => {
        if (active) {
          setConversations([]);
          setRawImports([]);
          setMemory(null);
          setPackages([]);
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [status, user?.id, refreshData]);

  return (
    <DataContext.Provider
      value={{
        conversations,
        rawImports,
        memory,
        packages,
        loading,
        error,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
