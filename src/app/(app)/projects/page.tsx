'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import ProjectsView from '@/components/ProjectsView';

export default function ProjectsPage() {
  const router = useRouter();
  const { conversations, memory } = useData();

  const handleOpenProject = (projectName: string) => {
    router.push(`/ask?q=${encodeURIComponent(`What did we discuss and decide regarding ${projectName}?`)}`);
  };

  const handleGenerateForProject = (projectName: string) => {
    router.push(`/generate?topic=${encodeURIComponent(projectName)}`);
  };

  const handleNavigateToImport = () => {
    router.push('/import');
  };

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
