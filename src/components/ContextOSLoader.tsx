'use client';

import React, { useState, useEffect } from 'react';

interface ContextOSLoaderProps {
  size?: 'sm' | 'md' | 'lg' | number;
  status?: string;
  statusSequence?: string[];
  subtext?: string;
  intervalMs?: number;
  className?: string;
}

/**
 * ContextOS Animated Looping Spinner & Progress Component
 *
 * Lightweight, GPU-accelerated, responsive, and respects prefers-reduced-motion.
 * Features an animated dual-orbit terracotta gradient loop and pulsing context node.
 */
export default function ContextOSLoader({
  size = 'md',
  status,
  statusSequence,
  subtext,
  intervalMs = 2400,
  className = '',
}: ContextOSLoaderProps) {
  const [sequenceIndex, setSequenceIndex] = useState(0);

  useEffect(() => {
    if (!statusSequence || statusSequence.length <= 1) return;
    const timer = setInterval(() => {
      setSequenceIndex((prev) => (prev + 1) % statusSequence.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [statusSequence, intervalMs]);

  const activeMessage = statusSequence && statusSequence.length > 0
    ? statusSequence[sequenceIndex]
    : status || 'Analyzing your history...';

  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 24
      : size === 'lg'
      ? 48
      : 36;

  return (
    <div
      className={`contextos-loader-container ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: pixelSize >= 36 ? '14px' : '8px',
        textAlign: 'center',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          position: 'relative',
          width: `${pixelSize}px`,
          height: `${pixelSize}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 50 50"
          style={{
            animation: 'contextOSSpin 1.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
          }}
        >
          <defs>
            <linearGradient id="cos-loader-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97746" />
              <stop offset="60%" stopColor="#c85a2b" />
              <stop offset="100%" stopColor="#a34319" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="cos-glow-grad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffb694" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#d97746" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            cx="25"
            cy="25"
            r="20"
            stroke="var(--hairline-strong)"
            strokeWidth="3.2"
            fill="none"
            opacity="0.35"
          />

          {/* Primary Rotating Gradient Arc */}
          <circle
            cx="25"
            cy="25"
            r="20"
            stroke="url(#cos-loader-grad)"
            strokeWidth="3.6"
            strokeLinecap="round"
            fill="none"
            strokeDasharray="95 35"
          />

          {/* Secondary Counter-rotating Subtle Halo */}
          <circle
            cx="25"
            cy="25"
            r="14"
            stroke="url(#cos-glow-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            strokeDasharray="40 50"
          />
        </svg>

        {/* Central Pulsing Context Crystal Core */}
        <div
          style={{
            position: 'absolute',
            width: `${Math.max(6, Math.round(pixelSize * 0.2))}px`,
            height: `${Math.max(6, Math.round(pixelSize * 0.2))}px`,
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            boxShadow: '0 0 8px rgba(217, 119, 70, 0.6)',
            animation: 'contextOSPulse 1.8s ease-in-out infinite',
          }}
        />
      </div>

      {activeMessage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span
            style={{
              fontSize: pixelSize >= 36 ? '13.5px' : '12px',
              fontWeight: 500,
              color: 'var(--on-surface)',
              letterSpacing: '-0.01em',
              fontFamily: 'var(--font-sans)',
              transition: 'opacity 0.2s ease',
            }}
          >
            {activeMessage}
          </span>
          {subtext && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontWeight: 450,
              }}
            >
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
