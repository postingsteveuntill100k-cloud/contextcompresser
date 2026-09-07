'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AskHistory from '@/components/AskHistory';

function AskContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const handleGenerateFromTopic = (topic: string) => {
    router.push(`/generate?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <AskHistory
      key={initialQuery}
      initialQuery={initialQuery}
      onGenerateFromTopic={handleGenerateFromTopic}
    />
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<div style={{ padding: '36px', color: 'var(--text-muted)' }}>Loading search...</div>}>
      <AskContent />
    </Suspense>
  );
}
