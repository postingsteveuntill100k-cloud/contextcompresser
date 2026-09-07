'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useData } from '@/context/DataContext';
import ContextGenerator from '@/components/ContextGenerator';
import ContextResult from '@/components/ContextResult';

function GenerateContent() {
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get('topic') || '';
  const { conversations, refreshData } = useData();
  const [resultDoc, setResultDoc] = useState<{ title: string; content: string } | null>(null);

  if (resultDoc) {
    return (
      <ContextResult
        title={resultDoc.title}
        content={resultDoc.content}
        onBack={() => setResultDoc(null)}
      />
    );
  }

  return (
    <ContextGenerator
      initialTopic={initialTopic}
      conversations={conversations}
      onOpenResultDoc={(doc) => setResultDoc(doc)}
      onPackageSaved={refreshData}
    />
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div style={{ padding: '36px', color: 'var(--text-muted)' }}>Loading generator...</div>}>
      <GenerateContent />
    </Suspense>
  );
}
