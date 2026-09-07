'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import DecisionsView from '@/components/DecisionsView';

export default function DecisionsPage() {
  const router = useRouter();
  const { memory, conversations, refreshData } = useData();

  const handleInspectDecision = (query: string) => {
    router.push(`/ask?q=${encodeURIComponent(query)}`);
  };

  const handleNavigateToImport = () => {
    router.push('/import');
  };

  return (
    <DecisionsView
      conversations={conversations}
      initialDecisions={memory?.decisions || []}
      onInspectDecision={handleInspectDecision}
      onNavigateToImport={handleNavigateToImport}
      onDecisionAdded={refreshData}
    />
  );
}
