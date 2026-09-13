'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import ContextPackagesView from '@/components/ContextPackagesView';
import ContextResult from '@/components/ContextResult';
import { Skeleton, ConversationCardSkeleton } from '@/components/SkeletonLoader';

export default function PackagesPage() {
  const router = useRouter();
  const { packages, loading } = useData();
  const [activeDoc, setActiveDoc] = useState<{ title: string; content: string } | null>(null);

  if (loading && packages.length === 0) {
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

  if (activeDoc) {
    return (
      <ContextResult
        title={activeDoc.title}
        content={activeDoc.content}
        onBack={() => setActiveDoc(null)}
      />
    );
  }

  return (
    <ContextPackagesView
      packages={packages}
      onNavigateToGenerate={() => router.push('/generate')}
      onOpenPackageDoc={(doc) => setActiveDoc(doc)}
    />
  );
}
