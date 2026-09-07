---
name: ContextOS Design System
colors:
  surface: '#131312'
  surface-dim: '#131312'
  surface-bright: '#3a3937'
  surface-container-lowest: '#0e0e0c'
  surface-container-low: '#1c1c1a'
  surface-container: '#20201e'
  surface-container-high: '#2a2a28'
  surface-container-highest: '#353532'
  on-surface: '#e5e2de'
  on-surface-variant: '#dbc1b6'
  inverse-surface: '#e5e2de'
  inverse-on-surface: '#31302e'
  outline: '#a38c82'
  outline-variant: '#55433b'
  surface-tint: '#ffb694'
  primary: '#ffb694'
  on-primary: '#571f00'
  primary-container: '#d97746'
  on-primary-container: '#4d1b00'
  inverse-primary: '#994619'
  secondary: '#efbe7d'
  on-secondary: '#452b00'
  secondary-container: '#614009'
  on-secondary-container: '#dcad6e'
  tertiary: '#b6ccbe'
  on-tertiary: '#22342b'
  tertiary-container: '#82968a'
  on-tertiary-container: '#1c2e25'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb694'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a2f01'
  secondary-fixed: '#ffddb4'
  secondary-fixed-dim: '#efbe7d'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#614009'
  tertiary-fixed: '#d2e8da'
  tertiary-fixed-dim: '#b6ccbe'
  on-tertiary-fixed: '#0d1f17'
  on-tertiary-fixed-variant: '#384b41'
  background: '#131312'
  on-background: '#e5e2de'
  surface-variant: '#353532'
  surface-canvas: '#141413'
  surface-panel: '#1E1E1C'
  surface-elevated: '#262624'
  surface-inset: '#0D0D0C'
  hairline: '#2C2C29'
  hairline-subtle: '#222220'
  text-primary: '#F3F1ED'
  text-secondary: '#B5B3AD'
  text-muted: '#75746E'
  terracotta-accent: '#D97746'
  terracotta-glow: '#E08354'
  amber-subtle: '#2A211B'
  sage-utility: '#768A7E'
  sage-subtle: '#1B221E'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 44px
    fontWeight: '400'
    lineHeight: 52px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  title-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.005em
  title-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-snippet:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit-1: 0.25rem
  unit-2: 0.5rem
  unit-3: 0.75rem
  unit-4: 1rem
  unit-5: 1.25rem
  unit-6: 1.5rem
  unit-8: 2rem
  unit-10: 2.5rem
  unit-12: 3rem
  unit-16: 4rem
  unit-20: 5rem
  sidebar-w: 16.5rem
  context-tray-w: 22rem
  reading-max-w: 48rem
  input-box-max-w: 46rem
---

## Brand & Style

This design system establishes an intellectual, calm, and deeply focused environment for personal AI memory management, prompt history, and cross-model context orchestration. Drawing direct inspiration from the warm literary restraint of Claude and the razor-sharp mechanical utility of ChatGPT, the visual atmosphere balances warm scholarly deliberation with high-speed productivity.

The target audience includes power AI users, researchers, writers, and software engineers who accumulate vast intellectual trails across multiple models and require an unhurried, durable space to organize, review, and port their personal context. The emotional signature is studious, permanent, and respectful: zero decorative distraction, generous macro-whitespace, whisper-quiet borders, and an amber terracotta spark representing accumulated insight.

The movement is an **Editorial Neo-Minimalism**: typography-led structure, rich near-black ink tones, warm limestone paper tints, and crisp utilitarian affordances that recede until needed.

## Colors

The palette is rooted in Claude's distinctive warm-charcoal foundation rather than cold digital blue-blacks. The primary canvas rests on `#141413`, paired with `#1E1E1C` for sidebars and docked panels. 

The primary chromatic accent is a warm terracotta amber (`#D97746`), derived directly from the editorial memory motif. It serves exclusively for active anchors, key memory pins, active prompt tokens, and high-value contextual triggers. Secondary accents include dry ochre (`#C4975A`) for metadata tags and muted sage (`#768A7E`) for system verification states and external sync badges.

Text hierarchy strictly avoids pure `#FFFFFF`. Primary reading text is rendered in `#F3F1ED` (a warm ivory), secondary metadata in `#B5B3AD`, and tertiary utility labels in `#75746E`. Separation is achieved via hairlines (`#2C2C29`) with zero harsh dropshadows.

## Typography

The type system blends literary tradition with clinical, high-throughput utility:

- **Newsreader** commands the editorial narrative. Used for workspace greetings, session titles, memory summaries, and synthesis chapters. It lends the product an enduring, bookish gravity reminiscent of Claude's centered intros.
- **Hanken Grotesk** provides an ultra-legible, warm, low-distortion sans-serif for high-density reading, multi-turn dialogue transcripts, context tree nodes, and metadata descriptions.
- **JetBrains Mono** anchors telemetry, prompt token counts, model identifiers (`Sonnet 3.5`, `GPT-4o`, `O1`), timestamps, and portable JSON export blocks.

Display and headline styles must never be used with heavy uppercase styling. They rely on soft, natural casing and generous vertical leading to maintain a serene, book-like pacing.

## Layout & Spacing

The layout model is structured around a three-tier hybrid workspace:
1. **Collapsible Left Nav Rail** (`16.5rem` / `264px`): Holds context spaces, persistent vaults, pinned models, and recents list. Replicates the quiet, minimal density of modern AI sidebars.
2. **Central Editorial Stage** (Max width `48rem` / `768px`): Fluid within bounds, horizontally centered. Accommodates prompt orchestration, conversation distillation, and context editing with expansive line spacing.
3. **Collapsible Context Inspector** (`22rem` / `352px`): Positioned on the right for raw memory graphs, system instructions, and vector embeddings.

### Responsive Behavior
- **Desktop (> 1280px)**: Three panels side-by-side with hairline borders.
- **Tablet (768px – 1279px)**: Left rail collapses into an icon shelf or slide-over drawer; contextual inspector defaults to a docked bottom sheet or overlay drawer.
- **Mobile (< 768px)**: Single column view. Fixed top navigation bar (`3.25rem`) with sidebar drawer trigger. The central input bar anchors to the bottom with keyboard-safe margins (`unit-3` safe area).

## Elevation & Depth

This design system avoids loud, artificial skeuomorphic drop shadows. Depth is communicated strictly via **tonal stratification** and **subtle hairline bounding**:

- **Canvas Base (`#141413`)**: The lowest plane. Houses main conversational threads and document backgrounds.
- **Surface Panel (`#1E1E1C`)**: Side navigation, context inspectors, and persistent headers. Separated from the base by a 1px hairline border (`#2C2C29`).
- **Surface Elevated (`#262624`)**: Floating input bars, contextual popovers, dropdown action menus, and hover highlights. When elevated elements float above busy text, they employ a subtle ambient occlusion shadow: `0 4px 20px -2px rgba(0, 0, 0, 0.45)`, tinted with deep charcoal.
- **Surface Inset (`#0D0D0C`)**: Token-count meters, code blocks, and context variable editors, giving an indented, focused desk feel.
- **Active Focus Rings**: Subtle double outline composed of a 1px transparent spacer and a 1px `#D97746` terracotta ring at 80% opacity.

## Shapes

The design balances the friendly pill-shaped utility pills of ChatGPT with the calm, soft-rectangular cards of Claude:

- **Large Interactive Containers (Inputs, Cards, Dialogs)**: Standard `0.75rem` to `1rem` radius (`rounded-lg` / `rounded-xl`). The primary prompt bar and context cards use `1rem` (16px) with smooth corner curvature.
- **Navigation Items & Action Buttons**: `0.5rem` (8px) for maximum spatial efficiency and crisp alignment in high-density lists.
- **Utility Badges & Quick-Pills (Context Tags, Model Switches)**: Fully rounded `9999px` pill contours, ensuring they read instantly as distinct atomic metadata units.

## Components

### Buttons
- **Primary Action**: Terracotta solid (`#D97746`) with near-black text (`#141413`) in semi-bold sans-serif. Subtle hover tint to `#E08354`. Used sparingly for primary operations (e.g., "Export Context", "Save to Vault").
- **Secondary / Ghost**: Surface `#1E1E1C` with hairline `#2C2C29` border and `#F3F1ED` text. Hover shifts to `#262624` with `#D97746` border accent.
- **Icon / Utility**: Compact 32x32px or 36x36px squares with `rounded-md`, transparent background, muted icon tint (`#B5B3AD`), shifting to `#F3F1ED` on hover.

### Central Input Dock
- Centerpiece anchored in the editorial column.
- Background in elevated surface `#262624` with a gentle 1px border `#2C2C29`. Contains multi-line autosizing textarea, bottom control tray with contextual pill switches (`Chat`, `Distill`, `Inject Context`), model selector dropdown, token counter badge, and an oval submit trigger button.

### Memory & Context Chips
- Pill-shaped badges using `#1E1E1C` background, 1px border `#2C2C29`, and `JetBrains Mono` 11px font.
- Active memory tokens feature an amber indicator dot (`#D97746`) preceding the label. System or vector tokens use a muted sage indicator (`#768A7E`).

### History & Thread Lists
- Frameless vertical rows with 8px internal padding.
- Clean typography with single-line truncation. Selected thread displays an indicator hairline on the left edge in terracotta `#D97746` and a subtle surface shift to `#262624`.

### Context Cards & Document Blocks
- Framed in 1px `#2C2C29` with `0.75rem` corners.
- Header displays Newsreader headline (`headline-sm`) followed by compact metadata chips. Body features `Hanken Grotesk` at `15px` with generous `24px` line height for extended review.

### Checkboxes & Form Controls
- Checkboxes are 16x16px squares with soft 4px corners, `#141413` fill, and `#2C2C29` stroke. When checked, fill shifts to `#D97746` with a crisp ivory checkmark.