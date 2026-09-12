'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import HomeDashboard from '@/components/HomeDashboard';

import { DashboardOverviewSkeleton } from '@/components/SkeletonLoader';

export default function HomePage() {
  const router = useRouter();
  const { conversations, packages, memory, loading } = useData();

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

  if (loading && conversations.length === 0) {
    return (
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <DashboardOverviewSkeleton />
      </div>
    );
  }

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
