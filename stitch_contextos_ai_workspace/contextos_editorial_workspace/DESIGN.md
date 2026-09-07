---
name: ContextOS Editorial Workspace
colors:
  surface: '#131312'
  surface-dim: '#131312'
  surface-bright: '#3a3938'
  surface-container-lowest: '#0e0e0d'
  surface-container-low: '#1c1c1a'
  surface-container: '#20201e'
  surface-container-high: '#2a2a29'
  surface-container-highest: '#353533'
  on-surface: '#e5e2e0'
  on-surface-variant: '#dbc1b6'
  inverse-surface: '#e5e2e0'
  inverse-on-surface: '#31302f'
  outline: '#a38c82'
  outline-variant: '#55433b'
  surface-tint: '#ffb694'
  primary: '#ffb694'
  on-primary: '#571f00'
  primary-container: '#d97746'
  on-primary-container: '#4d1b00'
  inverse-primary: '#994619'
  secondary: '#c8c6c0'
  on-secondary: '#30312c'
  secondary-container: '#474742'
  on-secondary-container: '#b7b5af'
  tertiary: '#5fd7e3'
  on-tertiary: '#00363b'
  tertiary-container: '#00a1ac'
  on-tertiary-container: '#003034'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb694'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a2f01'
  secondary-fixed: '#e5e2db'
  secondary-fixed-dim: '#c8c6c0'
  on-secondary-fixed: '#1b1c18'
  on-secondary-fixed-variant: '#474742'
  tertiary-fixed: '#80f4ff'
  tertiary-fixed-dim: '#5fd7e3'
  on-tertiary-fixed: '#002022'
  on-tertiary-fixed-variant: '#004f55'
  background: '#131312'
  on-background: '#e5e2e0'
  surface-variant: '#353533'
typography:
  display:
    fontFamily: outfit
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: outfit
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: outfit
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: outfit
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: outfit
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  title:
    fontFamily: outfit
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: outfit
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.005em
  body-md:
    fontFamily: outfit
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: outfit
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.005em
  label-md:
    fontFamily: outfit
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: outfit
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4.5rem
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 3rem
  content-max-width: 720px
  canvas-max-width: 1280px
---

## Brand & Style

This design system establishes an architectural, editorial canvas engineered for deep synthesis, thought assembly, and complex knowledge architecture. Drawing from high-end Swiss typographic journals, mid-century architectural manifests, and functionalist product design, the environment is purposefully stark, silent, and contemplative.

The visual style merges **Radical Minimalism** with **Editorial Precision**:
- **Content as Architecture**: Interface chrome dissolves; the hierarchy of user thoughts, prose, and networked nodes dictates the page structure.
- **Warm Restraint**: Replaces clinical, cold tech-gray monochromes with warm carbon, stone charcoals, and bleached paper ivories to prevent cognitive fatigue during multi-hour writing sessions.
- **Deliberate Accentuation**: A solitary, warm terracotta/amber serves as the exclusive point of visual tension—signaling critical intent, active execution, or primary momentum, strictly devoid of frivolous decoration or gamified tags.
- **Subtlety over Ornament**: Absence of diffuse drop shadows, glassy textures, or nested card enclosures; spatial grouping is achieved solely through proportional negative space and precise 1px hairline rules.

## Colors

The color system operates on an absolute discipline of tonality and restraint, refusing multi-hued status signifiers in favor of tonal weighting and a singular focal accent.

### Dark Mode (Default System State)
- **Base Canvas (`#0C0C0B`)**: Deep matte carbon floor, setting a distraction-free baseline.
- **Surface Elevation (`#121211` / `#181817`)**: Subtle background shifts for sidebars, floating toolstrips, and active panes.
- **Subtle Surface Container (`#20201F`)**: Soft hover states, selected rows, and contextual pill fills.
- **Hairline Border (`#2A2A28`)**: Architectural perimeter separator with strict 1px physical definition.
- **Text Primary (`#F5F4F0`)**: Unbleached chalk ivory offering stark, high-contrast legibility without ocular glare.
- **Text Secondary & Icons (`#8E8D87`)**: Muted dry stone for structural metadata, breadcrumbs, and inactive controls.
- **Text Muted / Disabled (`#5A5955`)**: Receded labels and empty indicators.
- **Terracotta Accent (`#D97746` / `#E07A4A`)**: Sparing use reserved for primary conversion triggers, focused active states, and structural system alerts.

### Light Mode (Secondary Paper Mode)
- **Base Canvas (`#FAF9F5`)**: Natural milled paper tone.
- **Surface Elevation (`#F2F0EB` / `#EBE8E1`)**: Warm stone sheets for sidebars and contextual docks.
- **Hairline Border (`#E2DFD6`)**: Muted sand line, defining regions without optical heaviness.
- **Text Primary (`#141413`)**: Deep soot ink.
- **Text Secondary (`#6E6D67`)**: Weathered slate.
- **Terracotta Accent (`#C65D2E`)**: Recalibrated deeper terracotta providing balanced optical weight and WCAG AAA compliance against warm paper tones.

## Typography

Typography drives the compositional hierarchy of the workspace. Outfit provides geometric discipline paired with open, editorial proportions. Monospace fonts are completely banned from standard user interfaces, navigation, badges, and readouts, maintaining an immaculate humanistic publication feel throughout.

### Application Rules
- **Display & Headlines**: Tightly tracked (`-0.03em` to `-0.01em`), authoritative weight, with generous vertical margins. Never clipped or compressed into tight bounding boxes.
- **Longform Body**: Sized at an intentional `15px` to `17px` with an expanded `1.65` line height multiplier (`28px` on `17px` font size) to cultivate an immersive reading experience.
- **Labels & Microcopy**: Formatted in medium weight with relaxed positive tracking (`+0.04em` to `+0.06em`) for effortless scanning at tiny dimensions without requiring uppercase heavy stamping.
- **Inline Links & Citations**: Underlined with an offset hairline rule in `#8E8D87`; transitions to `#F5F4F0` on hover, completely eschewing standard hyper-saturated link blues.

## Layout & Spacing

The layout model relies on expansive breathing room, variable margins, and structured planar zones rather than dense visual compartmentalization.

### Grid & Compositional Rhythm
- **Editorial Writing Well**: The central knowledge artifact is constrained to a bespoke readability boundary (`max-width: 720px`), centered within an infinite, borderless reading stage.
- **Workspace Tooling**: Side panels and secondary contextual inspectors flank the reading well as edge-pinned drawers or border-separated strips (`280px` to `340px` wide).
- **Hairline Partitioning**: Spatial divisions between sidebars, reading channels, and metadata bars are enforced via crisp vertical rules (`1px solid #2A2A28`), eliminating chunky gutter blocks.

### Breakpoint Matrix & Reflow
- **Mobile (<768px)**: 1-column responsive canvas; lateral margins set to `16px` (`space-md`). Sidebars collapse into an off-canvas slideover or modal bottom-sheet.
- **Tablet (768px - 1024px)**: Single sidebar dock (`240px`) plus fluid central reading column. Lateral margins set to `24px` (`space-lg`).
- **Desktop (>1024px)**: Full dual-rail configuration (Navigation + Main Well + Contextual Inspector). Central area expands symmetrically with a minimum gutter clearance of `48px` (`space-2xl`).

## Elevation & Depth

This system intentionally rejects skeuomorphic drop shadows, ambient blur halos, and multi-layered translucent glassmorphism. Depth is created through planar layering and tonal shifts.

### Architectural Flat Tonal Stacking
- **Floor 0 (Canvas Base)**: `#0C0C0B` — the uninterrupted document arena.
- **Floor 1 (Sub-Surfaces & Rails)**: `#121211` — sidebars, bottom status docks, and inactive panels anchored to the edges.
- **Floor 2 (Contextual Overlays & Popovers)**: `#181817` — command palettes, drop-down menus, and tooltips, framed with a 1px solid `#2A2A28` hairline rule.
- **Floor 3 (Active Interactions & Hover States)**: `#20201F` — selected list elements, hovered table rows, and pill containers.

### Boundary Principles
- **No Shadows**: Drop shadows (`box-shadow`) are set to `none` across the system, including modals and floating palettes.
- **Hairline Outlines**: Elements requiring distinct floating separation rely on a single `#2A2A28` outer stroke combined with a sharp background tint shift (`#181817`), grounding overlays without simulated lighting tricks.

## Shapes

The geometry reflects architectural restraint: precise, clean, and understated.

### Geometric Rules
- **Base Rounding (6px to 8px)**: Interactive controls (inputs, buttons, chip selectors, flyout menus) employ subtle 6px to 8px radii, matching modern typography metrics without veering into playful bubbled curvature.
- **Sharp Layout Edges (0px)**: Sidebars, split panels, document headers, and screen partitions feature completely unrounded, continuous structural joins (`0px`).
- **Pill Exceptions**: Small status dots and pure keyboard command tags can adopt full radial curvature (`9999px`) only when indicating atomic states or metadata tokens.

## Components

### Buttons
- **Primary Action**: Solid warm terracotta fill (`#D97746`), high-contrast off-white text (`#FFFFFF`), `6px` radius, medium font weight (`outfit` 14px), 0px border. Hover transitions smoothly to `#E07A4A`.
- **Secondary / Ghost Action**: `#121211` surface or transparent background with a 1px `#2A2A28` hairline perimeter stroke, `#F5F4F0` text. Hover shifts background to `#20201F`.
- **Tertiary / Subtle**: Transparent base, `#8E8D87` text. Hover shifts text color to `#F5F4F0` with zero outline or background footprint.

### Chips & Metadata Tags
- Devoid of neon status fills. Structured as subtle flat pills or softly rounded rectangles (`4px` radius).
- Background: `#181817`; border: `1px solid #2A2A28`; text: `#8E8D87` at `12px` medium weight.
- Active/Selected state: Text shifts to `#F5F4F0`, border highlights in `#D97746` (terracotta) or solid `#20201F` fill.

### Text Inputs & Form Fields
- Single-line and multi-line inputs sit on a `#121211` foundation with a `1px solid #2A2A28` perimeter.
- Focus State: Replaces standard high-glow outer halos with an exact, razor-sharp `1px solid #D97746` border stroke.
- Placeholder text: Set in `#5A5955`. Value text: Crisp `#F5F4F0`.

### Selection Controls (Checkboxes & Radios)
- Custom minimal boxes (`16px × 16px`), `4px` radius for checkboxes, circular for radios.
- Unchecked: Transparent background, `1px solid #5A5955`.
- Checked: Solid `#D97746` background with a crisp off-white (`#F5F4F0`) geometric checkmark or central core pip.

### Lists & Navigation Trees
- Unenclosed rows with generous vertical padding (`10px 12px`).
- Inactive rows have no border or card enclosure.
- Hover: Soft flat fill `#181817`.
- Active Row: `#20201F` flat fill, with a vertical terracotta bar (`2px` wide) positioned flush against the left boundary edge.

### Cards & Grouping
- Standard cards with thick dropshadows or heavy borders are strictly avoided.
- Grouping occurs through generous spacing intervals (`32px` to `48px`) separated by an optional full-bleed `1px solid #2A2A28` hairline divider.

### Command Palette & Quick Switcher
- Floating centered modal overlay (`max-width: 600px`).
- Background `#141413`, enclosed in a 1px `#2A2A28` perimeter line.
- Search input is borderless, set in large `18px` editorial body type, followed by an unbordered, spaced search result list.