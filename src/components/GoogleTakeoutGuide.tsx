'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Info,
  X,
} from 'lucide-react';

interface GoogleTakeoutGuideProps {
  onClose?: () => void;
  onGoToDropZone?: () => void;
}

export default function GoogleTakeoutGuide({ onClose, onGoToDropZone }: GoogleTakeoutGuideProps) {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      step: 1,
      title: 'Click "Deselect all"',
      shortTitle: 'Deselect All',
      description:
        'By default, Google selects all 60+ products. Click "Deselect all" near the top right of the Products list so you do not accidentally export hundreds of gigabytes of unrelated data.',
      actionNote: 'Crucial: Never export your entire account just for AI history.',
      imageSrc: '/guide/takeout-step1-deselect.png',
      imageAlt: 'Google Takeout interface showing Deselect all button',
      arrowCoords: { top: '38%', right: '23%' }, // points to "Deselect all"
      arrowLabel: 'Click "Deselect all" here',
    },
    {
      step: 2,
      title: 'Scroll down and select "My Activity"',
      shortTitle: 'Select My Activity',
      description:
        'Scroll down through the list until you find "My Activity" and check the box. "My Activity" contains your Gemini chat history, prompts, YouTube research, and web activity.',
      actionNote: 'Contains Gemini, YouTube watch/search, and Chrome history.',
      imageSrc: '/guide/takeout-step2-myactivity.png',
      imageAlt: 'Google Takeout showing My Activity checkbox selected',
      arrowCoords: { top: '69%', right: '18%' }, // points to "My Activity" checkbox
      arrowLabel: 'Check "My Activity" box',
    },
    {
      step: 3,
      title: 'Scroll down and click "Next step"',
      shortTitle: 'Click Next step',
      description:
        'Scroll to the bottom of Step 1 and click the blue "Next step" button to proceed to the export frequency and file format configuration.',
      actionNote: 'Moves you to destination & file format settings.',
      imageSrc: '/guide/takeout-step3-nextstep.png',
      imageAlt: 'Google Takeout showing Next step button',
      arrowCoords: { bottom: '38%', right: '18%' }, // points to "Next step" blue button
      arrowLabel: 'Click "Next step"',
    },
    {
      step: 4,
      title: 'Under Frequency, choose "Export once"',
      shortTitle: 'Export once',
      description:
        'Leave the transfer destination set to "Send download link via email" and verify that the radio button "Export once" (1 export) is selected.',
      actionNote: 'One-time export created immediately.',
      imageSrc: '/guide/takeout-step4-exportonce.png',
      imageAlt: 'Google Takeout showing Export once radio button',
      arrowCoords: { top: '59%', left: '22%' }, // points to "Export once" radio
      arrowLabel: 'Select "Export once"',
    },
    {
      step: 5,
      title: 'Select ".zip" and "2 GB", then click "Create export"',
      shortTitle: '.zip & 2 GB',
      description:
        'Set File type to ".zip" and File size to "2 GB", then click the blue "Create export" button. If your history exceeds 2 GB, Google will provide multiple parts (e.g. takeout-001.zip, takeout-002.zip)—ContextOS supports uploading all parts at once!',
      actionNote: 'Multi-part archives (001.zip, 002.zip) are 100% supported.',
      imageSrc: '/guide/takeout-step5-zip2gb.png',
      imageAlt: 'Google Takeout showing .zip and 2 GB selection with Create export button',
      arrowCoords: { top: '48%', left: '20%' }, // points to .zip and 2 GB dropdowns
      arrowLabel: 'Choose .zip & 2 GB',
      secondaryArrow: { bottom: '8%', right: '16%', label: 'Click "Create export"' },
    },
  ];

  const currentStepData = steps[activeStep - 1];

  return (
    <div
      style={{
        backgroundColor: 'var(--surface-container-low)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      }}
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Visual Export Guide
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Step {activeStep} of {steps.length}
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--on-surface)', margin: 0, letterSpacing: '-0.01em' }}>
            How to Get Your Google Takeout History
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '6px 0 0 0', maxWidth: '640px', lineHeight: 1.5 }}>
            Follow these 5 simple steps on Google Takeout to export only your AI and research history.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href="https://takeout.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              padding: '8px 14px',
              textDecoration: 'none',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span>Open Google Takeout</span>
            <ExternalLink size={13} />
          </a>

          {onGoToDropZone && (
            <button
              onClick={onGoToDropZone}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span>I Have My ZIP &rarr;</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="btn-secondary"
              aria-label="Close guide"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Distinction Callout Banner */}
      <div
        style={{
          padding: '12px 18px',
          backgroundColor: 'var(--surface-container)',
          borderLeft: '4px solid var(--primary)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <ShieldCheck size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--on-surface)' }}>Important Distinction:</strong> Google Takeout controls{' '}
          <em>what data is included in the ZIP file</em>. ContextOS then inspects the ZIP{' '}
          <strong style={{ color: 'var(--primary)' }}>100% locally on your computer</strong> so you can select only the exact conversations you want processed.
        </div>
      </div>

      {/* Step Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        {steps.map((s) => {
          const isActive = s.step === activeStep;
          return (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'var(--surface-container-high)' : 'transparent',
                border: isActive ? '1px solid var(--hairline-strong)' : '1px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: isActive ? 'var(--primary)' : 'var(--surface-container-highest)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                {s.step}
              </span>
              <span>{s.shortTitle}</span>
            </button>
          );
        })}
      </div>

      {/* Active Step Content */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 360px) 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left: Step Explanations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Step {currentStepData.step} of 5
            </span>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--on-surface)', margin: '4px 0 8px 0', lineHeight: 1.3 }}>
              {currentStepData.title}
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              {currentStepData.description}
            </p>
          </div>

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--surface-container-highest)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--hairline)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Info size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span>{currentStepData.actionNote}</span>
          </div>

          {currentStepData.step === 5 && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(217, 90, 48, 0.08)',
                border: '1px solid rgba(217, 90, 48, 0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>
                Multi-File Takeout Archives Supported:
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                If your history exceeds 2 GB, Google will split it into multiple parts (e.g. <code>takeout-001.zip</code> and <code>takeout-002.zip</code>). You can select or drop <strong>all parts simultaneously</strong> into ContextOS!
              </span>
            </div>
          )}

          {/* Step Pagination Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={() => setActiveStep((p) => Math.max(1, p - 1))}
              disabled={activeStep === 1}
              className="btn-secondary"
              style={{
                padding: '8px 14px',
                fontSize: '12.5px',
                borderRadius: 'var(--radius-md)',
                opacity: activeStep === 1 ? 0.4 : 1,
                cursor: activeStep === 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={14} />
              <span>Previous</span>
            </button>

            {activeStep < 5 ? (
              <button
                onClick={() => setActiveStep((p) => Math.min(5, p + 1))}
                className="btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '12.5px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Next Step</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={onGoToDropZone}
                className="btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '12.5px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--primary)',
                }}
              >
                <span>Go to Drop Zone &rarr;</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Visual Annotated Screenshot Container */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#000',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--hairline)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10' }}>
            <Image
              src={currentStepData.imageSrc}
              alt={currentStepData.imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              style={{ objectFit: 'contain' }}
              priority
            />

            {/* Primary Visual Callout Arrow & Badge */}
            <div
              style={{
                position: 'absolute',
                ...currentStepData.arrowCoords,
                transform: 'translate(0, 0)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 10,
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))',
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: '2px solid #ffffff',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  letterSpacing: '0.01em',
                }}
              >
                <span>👉 {currentStepData.arrowLabel}</span>
              </div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginTop: '-2px' }}>
                <path d="M12 21L5 11H19L12 21Z" fill="var(--primary)" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Optional Secondary Arrow for Step 5 (Create Export) */}
            {currentStepData.secondaryArrow && (
              <div
                style={{
                  position: 'absolute',
                  ...currentStepData.secondaryArrow,
                  transform: 'translate(0, 0)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pointerEvents: 'none',
                  zIndex: 10,
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#1a73e8',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '16px',
                    border: '2px solid #ffffff',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>👉 {currentStepData.secondaryArrow.label}</span>
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginTop: '-2px' }}>
                  <path d="M12 21L5 11H19L12 21Z" fill="#1a73e8" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>

          <div
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--surface-container-high)',
              borderTop: '1px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Screenshot Reference: Google Takeout {currentStepData.step <= 3 ? 'Step 1' : 'Step 2'}
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--primary)', fontWeight: 500 }}>
              {currentStepData.actionNote}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
