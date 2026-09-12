'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import ConversationsView from '@/components/ConversationsView';

import { Skeleton, ConversationCardSkeleton } from '@/components/SkeletonLoader';

export default function ConversationsPage() {
  const router = useRouter();
  const { conversations, loading } = useData();

  const handleGenerateFromConversations = (convoIds: string[]) => {
    router.push(`/generate?convos=${encodeURIComponent(convoIds.join(','))}`);
  };

  const handleNavigateToImport = () => {
    router.push('/import');
  };

  if (loading && conversations.length === 0) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton width="220px" height="28px" />
          <Skeleton width="340px" height="16px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <ConversationCardSkeleton />
          <ConversationCardSkeleton />
          <ConversationCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <ConversationsView
      conversations={conversations}
      onGenerateFromConversations={handleGenerateFromConversations}
      onNavigateToImport={handleNavigateToImport}
    />
  );
}
