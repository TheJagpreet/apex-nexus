# Design System — Bioluminescent Deep-Sea Aesthetic

## 1. Visual Theme & Atmosphere

The Apex portal embodies a bioluminescent deep-sea aesthetic — dark oceanic backgrounds with glowing cyan, amber, and magenta accents inspired by deep-ocean organisms. The visual system creates an immersive feeling of exploring a living neural network beneath the surface.

The background palette is built on near-black oceanic tones (`#080c10` primary) with raised surfaces in progressively lighter blue-blacks (`#0e1319`, `#151c24`). This isn't a generic dark theme — it's specifically calibrated to evoke deep water, with cool blue undertones throughout.

IBM Plex Mono is the primary typeface, maintaining the monospace identity from earlier iterations while providing excellent readability on dark backgrounds. The monospace grid naturally enforces alignment and rhythm across the layout.

The color system centers on bioluminescent cyan (`oklch(0.82 0.16 178)`) as the primary accent, complemented by warm amber (`oklch(0.78 0.14 70)`) and rare magenta (`oklch(0.72 0.18 340)`). These colors appear with subtle glow effects (`text-shadow`, `box-shadow`) that reinforce the bioluminescent feel.

**Key Characteristics:**
- IBM Plex Mono as the sole typeface — monospace everywhere
- Deep oceanic dark primary (`#080c10`) with cool blue undertone
- Bioluminescent text (`#e8f4f0`) with subtle cyan warmth
- Bioluminescent cyan accent (`oklch(0.82 0.16 178)`) with glow effects
- Minimal 4px border radius throughout
- 8px base spacing system
- Biology-inspired spinners and animations (Synapse, Membrane, DNA, Mitosis, etc.)
- Subtle glow borders using `rgba(0, 255, 200, 0.08)` - `rgba(0, 255, 200, 0.18)`
- CSS custom properties (`--glow-cyan`, `--glow-amber`, `--glow-magenta`) for glow utilities

## 2. Color Palette & Roles

### Bioluminescent Palette (oklch)
- **Bio Cyan** (`oklch(0.82 0.16 178)`): Primary accent, interactive highlights, logo glow
- **Bio Cyan Dim** (`oklch(0.55 0.12 178)`): Muted accent, secondary indicators
- **Bio Amber** (`oklch(0.78 0.14 70)`): Warm accent, warnings, secondary highlights
- **Bio Magenta** (`oklch(0.72 0.18 340)`): Rare third accent, special indicators
- **Bio Foreground** (`oklch(0.95 0.01 90)`): Near-white for highest contrast text

### Primary Surfaces
- **Deep Ocean** (`#080c10`): Primary background — near-black with cool blue
- **Mid Ocean** (`#0e1319`): Surface backgrounds, sidebar, inputs
- **Shallow Ocean** (`#151c24`): Raised surfaces, code blocks, hover states

### Text
- **Primary Text** (`#e8f4f0`): Main body text — warm bioluminescent white
- **Secondary Text** (`#7eaba0`): Labels, descriptions — muted cyan-green
- **Muted Text** (`#4a7a70`): Placeholders, disabled — deeper muted

### Borders
- **Border Subtle** (`rgba(0, 255, 200, 0.08)`): Default borders — barely visible glow
- **Border Strong** (`rgba(0, 255, 200, 0.18)`): Interactive borders — noticeable glow

### Semantic
- **Accent** (`oklch(0.82 0.16 178)` / cyan): Primary interactive color
- **Danger** (`#ff4060`): Error states, destructive actions — warm red
- **Success** (`#30ffb0`): Success states — bright bio-green
- **Warning** (`oklch(0.78 0.14 70)` / amber): Warning states

### Glow Utilities (CSS Custom Properties)
- **`--glow-cyan`**: `0 0 20px rgba(0, 255, 200, 0.15), 0 0 60px rgba(0, 255, 200, 0.05)` — large glow
- **`--glow-cyan-sm`**: `0 0 8px rgba(0, 255, 200, 0.12)` — subtle glow for buttons/inputs
- **`--glow-amber`**: `0 0 20px rgba(255, 200, 60, 0.12)` — amber element glow
- **`--glow-magenta`**: `0 0 20px rgba(255, 80, 200, 0.12)` — magenta accent glow

## 3. Typography Rules

### Font Family
- **Universal**: `IBM Plex Mono`, with fallbacks: `Berkeley Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace`

### Hierarchy

| Role | Size | Weight | Line Height | Notes |
|------|------|--------|-------------|-------|
| Heading 1 | 38px (2.38rem) | 700 | 1.50 | Hero headlines, page titles |
| Heading 2 | 16px (1.00rem) | 700 | 1.50 | Section titles, bold emphasis |
| Body | 16px (1.00rem) | 400 | 1.50 | Standard body text, paragraphs |
| Body Medium | 16px (1.00rem) | 500 | 1.50 | Links, button text, nav items |
| Body Tight | 16px (1.00rem) | 500 | 1.00 (tight) | Compact labels, tab items |
| Caption | 14px (0.88rem) | 400 | 2.00 (relaxed) | Footnotes, metadata, small labels |

### Principles
- **One font, one voice**: IBM Plex Mono exclusively. Hierarchy through size and weight alone.
- **Weight as hierarchy**: 700 for headings, 500 for interactive/medium emphasis, 400 for body text.
- **Generous line-height**: 1.50 standard, 2.00 for captions.

## 4. Biology-Inspired Spinners

All spinners are pure CSS + SVG, using the bioluminescent accent palette. Located in `src/components/Spinners.jsx`.

| Spinner | Purpose | Visual |
|---------|---------|--------|
| **MitosisSpinner** | Agent spawning | Two cells dividing and merging |
| **SynapseSpinner** | Service health check | Neural nodes with firing pulses |
| **MembraneSpinner** | Idle/empty states | Concentric rings breathing |
| **DNASpinner** | RAG file ingestion | Double helix dots unwinding |
| **EnzymeSpinner** | Tool execution | Rotating catalytic complex |
| **NeuralNetSpinner** | LLM inference | Pulsing network graph |
| **BiolumPulseSpinner** | General loading | Radial glow pulse |
| **RibosomeSpinner** | Chunking/embedding | Particles along a track |
| **OrganelleSpinner** | Multi-service coordination | Orbiting particles |
| **PhageSpinner** | Code injection/tools | Virus-like injector |
| **FlagellumSpinner** | Linear indicator | Whip-like tail motion |
| **PhotonScatterSpinner** | General scatter | Particles emitting from center |

## 5. Component Stylings

### Buttons

**Primary (Accent Fill)**
- Background: `var(--accent)` (bioluminescent cyan)
- Text: `#080c10` (deep ocean)
- Padding: 10px 20px
- Radius: 4px
- Box-shadow: `var(--glow-cyan-sm)`
- Font: 16px IBM Plex Mono, weight 500

### Inputs
- Background: `var(--bg-input)` (`#0e1319`)
- Text: `var(--text)` (`#e8f4f0`)
- Border: `1px solid var(--border-strong)`
- Padding: 10px 14px
- Radius: 6px
- Focus: `border-color: var(--accent)`

### Links
- Color: `var(--accent)` (bioluminescent cyan)
- Decoration: underline 1px
- Text-shadow: `0 0 8px rgba(0, 255, 200, 0.15)`

### Logo Text
- Color: `var(--accent)`
- Text-shadow: `0 0 20px rgba(0, 255, 200, 0.3), 0 0 40px rgba(0, 255, 200, 0.1)`

## 6. Special UI Components

### Service Health Check
Shown on first visit before login/signup. Centered synapse spinner with service status rows (green/red dots). Rows fade out when all green, spinner centers with ease-in animation, then redirects.

### Scrambled Text Effect
During LLM streaming, incoming characters show as random Unicode symbols/glyphs before settling to their final value. Creates the visual of meaning emerging from randomness.

### Active Run Steps
Pipeline visualization shown before output streams in. Steps like "Querying knowledge base", "Building LLM context", "Executing tools" appear with status indicators (pending/active/done). Fades out when actual content begins streaming.

### Ingest Overlay
Centered modal overlay with DNA transcription spinner shown during RAG file upload. Displays current stage (uploading, chunking, embedding, storing) with filename.

### DesignCanvas
Figma-like infinite canvas with pan/zoom (trackpad pinch, mouse wheel, drag). Includes DCSection, DCArtboard, and DCPostIt sub-components.

## 7. Layout Principles

### Spacing System
- Base unit: 8px
- Fine scale: 1px, 2px, 4px
- Standard scale: 8px, 12px, 16px, 20px, 24px
- Extended scale: 32px, 40px, 48px, 64px, 80px, 96px

### Border Radius Scale
- Micro (4px): Default for all elements
- Input (6px): Form inputs
- Overlay (8px): Modal cards, toasts

## 8. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow, no border | Default state |
| Border Subtle (Level 1) | `rgba(0, 255, 200, 0.08)` | Section dividers, input borders |
| Border Strong (Level 2) | `rgba(0, 255, 200, 0.18)` | Interactive borders, active elements |
| Glow Small (Level 3) | `var(--glow-cyan-sm)` | Buttons, active inputs |
| Glow Large (Level 4) | `var(--glow-cyan)` | Modals, hero elements |

**Shadow Philosophy**: Depth is communicated through glow effects rather than traditional box-shadows. The bioluminescent theme uses radial glows that reinforce the undersea aesthetic.

## 9. Theme Modes

The system supports both dark (default, bioluminescent) and light modes via `[data-theme]`:

**Dark (default)**: Deep oceanic backgrounds with glowing accents
**Light**: Soft sage/seafoam backgrounds with muted accents — still ocean-inspired but for bright environments

## 10. Agent Prompt Guide

### Quick Color Reference
- Page background: `#080c10` (deep ocean)
- Primary text: `#e8f4f0` (bioluminescent white)
- Secondary text: `#7eaba0` (muted cyan)
- Muted text: `#4a7a70`
- Accent: `oklch(0.82 0.16 178)` (bio cyan)
- Danger: `#ff4060`
- Success: `#30ffb0`
- Warning: `oklch(0.78 0.14 70)` (bio amber)
- Button bg: `var(--accent)`, button text: `#080c10`
- Border: `rgba(0, 255, 200, 0.08)` (subtle glow)
- Input bg: `#0e1319`, input border: `rgba(0, 255, 200, 0.18)`

### Iteration Guide
1. IBM Plex Mono is the only font. Size and weight create all hierarchy.
2. Use glow effects instead of traditional shadows. `--glow-cyan-sm` for subtle, `--glow-cyan` for prominent.
3. The cool blue undertone matters: use `#080c10` not `#000000`, use `#e8f4f0` not `#ffffff`.
4. Border radius is 4px everywhere except inputs (6px) and overlays (8px).
5. Semantic colors: cyan accent, `#ff4060` red, `#30ffb0` green, amber orange.
6. Borders use `rgba(0, 255, 200, 0.08)` — a barely-visible cyan glow.
7. Spacing follows an 8px grid.
8. Use biology-inspired spinners from `Spinners.jsx` for all loading states.
