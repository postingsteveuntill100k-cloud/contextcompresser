'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import ConversationsView from '@/components/ConversationsView';

export default function ConversationsPage() {
  const router = useRouter();
  const { conversations } = useData();

  const handleGenerateFromConversations = (convoIds: string[]) => {
    router.push(`/generate?convos=${encodeURIComponent(convoIds.join(','))}`);
  };

  const handleNavigateToImport = () => {
    router.push('/import');
  };

  return (
    <ConversationsView
      conversations={conversations}
      onGenerateFromConversations={handleGenerateFromConversations}
      onNavigateToImport={handleNavigateToImport}
    />
  );
}
