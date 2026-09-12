'use client';

import React from 'react';

interface ContextOSLogoProps {
  size?: number;
  className?: string;
  variant?: 'mark' | 'full';
  showText?: boolean;
}

/**
 * Original ContextOS Brand Identity Mark
 *
 * Design Concept:
 * Two interlocking isometric hexagonal lenses converging at a central focal node,
 * symbolizing raw streams of multi-turn AI history focusing into structured,
 * permanent, reusable context.
 *
 * Avoids generic AI brains, stock robots, or off-the-shelf icons.
 */
export default function ContextOSLogo({
  size = 28,
  className = '',
  showText = false,
}: ContextOSLogoProps) {
  return (
    <div
      className={`contextos-brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        verticalAlign: 'middle',
      }}
    >
      <svg
        className="contextos-logo-mark"
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ContextOS Logo"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="cos-primary-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#d97746" />
            <stop offset="50%" stopColor="#c85a2b" />
            <stop offset="100%" stopColor="#a34319" />
          </linearGradient>
          <linearGradient id="cos-secondary-grad" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffb694" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d97746" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="cos-core-grad" x1="20" y1="20" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fbeee7" />
          </linearGradient>
        </defs>

        {/* Outer Context Hexagonal Layer */}
        <path
          d="M24 4L41.3205 14V34L24 44L6.67949 34V14L24 4Z"
          stroke="url(#cos-primary-grad)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          fill="rgba(217, 119, 70, 0.08)"
        />

        {/* Inner Intersecting Lens / Data Stream Lines */}
        <path
          d="M24 4V24M41.3205 14L24 24M41.3205 34L24 24M24 44V24M6.67949 34L24 24M6.67949 14L24 24"
          stroke="url(#cos-secondary-grad)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Focused Context Crystal (Center Polygon) */}
        <polygon
          points="24,16 31,20 31,28 24,32 17,28 17,20"
          fill="url(#cos-primary-grad)"
        />

        {/* Core Focal Synthesis Node */}
        <circle cx="24" cy="24" r="3.2" fill="url(#cos-core-grad)" />
      </svg>

      {showText && (
        <span
          style={{
            fontSize: `${Math.max(15, Math.round(size * 0.62))}px`,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--on-surface)',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1,
          }}
        >
          ContextOS
        </span>
      )}
    </div>
  );
}
