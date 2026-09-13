'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import ProjectsView from '@/components/ProjectsView';
import { Skeleton, ConversationCardSkeleton } from '@/components/SkeletonLoader';

export default function ProjectsPage() {
  const router = useRouter();
  const { conversations, memory, loading } = useData();

  const handleOpenProject = (projectName: string) => {
    router.push(`/ask?q=${encodeURIComponent(`What did we discuss and decide regarding ${projectName}?`)}`);
  };

  const handleGenerateForProject = (projectName: string) => {
    router.push(`/generate?topic=${encodeURIComponent(projectName)}`);
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
        </div>
      </div>
    );
  }

  return (
    <ProjectsView
      conversations={conversations}
      memory={memory}
      onOpenProject={handleOpenProject}
      onGenerateForProject={handleGenerateForProject}
      onNavigateToImport={handleNavigateToImport}
    />
  );
}
