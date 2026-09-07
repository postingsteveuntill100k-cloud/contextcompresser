'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import ContextPackagesView from '@/components/ContextPackagesView';
import ContextResult from '@/components/ContextResult';

export default function PackagesPage() {
  const router = useRouter();
  const { packages } = useData();
  const [activeDoc, setActiveDoc] = useState<{ title: string; content: string } | null>(null);

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
