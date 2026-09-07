'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import HomeDashboard from '@/components/HomeDashboard';

export default function HomePage() {
  const router = useRouter();
  const { conversations, packages, memory } = useData();

  const handleAskQuery = (query: string) => {
    router.push(`/ask?q=${encodeURIComponent(query)}`);
  };

  const handleSelectProject = (projectName: string) => {
    router.push(`/projects?project=${encodeURIComponent(projectName)}`);
  };

  const handleOpenPackage = (packageName: string) => {
    router.push(`/packages?package=${encodeURIComponent(packageName)}`);
  };

  const handleNavigateToImport = () => {
    router.push('/import');
  };

  return (
    <HomeDashboard
      conversations={conversations}
      packages={packages}
      memory={memory}
      onAskQuery={handleAskQuery}
      onSelectProject={handleSelectProject}
      onOpenPackage={handleOpenPackage}
      onNavigateToImport={handleNavigateToImport}
    />
  );
}
