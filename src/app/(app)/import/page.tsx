'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import ImportHub from '@/components/ImportHub';

export default function ImportPage() {
  const router = useRouter();
  const { rawImports, refreshData } = useData();

  return (
    <ImportHub
      rawImports={rawImports}
      onImportComplete={refreshData}
      onExploreConversations={() => router.push('/conversations')}
      onAskHistory={() => router.push('/ask')}
    />
  );
}
