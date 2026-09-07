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
      // 1. Conversations
      const convRes = await fetchWithAuth('/api/conversations');
      if (convRes.ok) {
        const convData = await convRes.json();
        setConversations(convData.conversations || []);
      }

      // 2. Raw Imports
      const impRes = await fetchWithAuth('/api/import');
      if (impRes.ok) {
        const impData = await impRes.json();
        setRawImports(impData.imports || []);
      }

      // 3. Memory
      const memRes = await fetchWithAuth('/api/memory');
      if (memRes.ok) {
        const memData = await memRes.json();
        setMemory(memData.memory || null);
      }

      // 4. Packages
      const pkgRes = await fetchWithAuth('/api/generate-context');
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        setPackages(pkgData.packages || []);
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
