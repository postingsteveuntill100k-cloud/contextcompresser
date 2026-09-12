'use client';

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style = {},
}: SkeletonProps) {
  return (
    <div
      className={`contextos-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--surface-container-high)',
        animation: 'contextOSShimmer 1.8s ease-in-out infinite',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function ConversationCardSkeleton() {
  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: 'var(--surface-container-low)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <Skeleton width="45%" height="18px" />
        <Skeleton width="60px" height="14px" />
      </div>
      <Skeleton width="85%" height="14px" />
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <Skeleton width="70px" height="20px" borderRadius="var(--radius-sm)" />
        <Skeleton width="90px" height="20px" borderRadius="var(--radius-sm)" />
      </div>
    </div>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Skeleton width="220px" height="28px" />
        <Skeleton width="380px" height="16px" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <ConversationCardSkeleton />
        <ConversationCardSkeleton />
        <ConversationCardSkeleton />
      </div>
    </div>
  );
}
