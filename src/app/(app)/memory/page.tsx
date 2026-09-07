'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import MemoryView from '@/components/MemoryView';

export default function MemoryPage() {
  const router = useRouter();
  const { memory, conversations } = useData();

  const handleInspectItem = (item: string) => {
    router.push(`/ask?q=${encodeURIComponent(`What did we decide about ${item}?`)}`);
  };

  const handleNavigateToImport = () => {
    router.push('/import');
  };

  return (
    <MemoryView
      memory={memory}
      conversations={conversations}
      onInspectItem={handleInspectItem}
      onNavigateToImport={handleNavigateToImport}
    />
  );
}
