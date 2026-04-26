# Design System — Apex Nexus Editorial Dark

> Reference implementation: `nexus/styles.css` · Applied in: `apps/apex-portal/src/index.css`

## 1. Visual Theme

Apex Nexus uses an **editorial dark** aesthetic — dense, typographic, and information-rich. Inspired by technical publications and professional dashboards. No glow effects, no neon. Precision and legibility above all.

**Key characteristics:**
- Serif headlines (Newsreader) paired with mono eyebrows and sans body copy
- Near-black background stack with subtle warm undertones
- Warm amber accent (`oklch(0.78 0.08 70)`) — editorial, not glowing
- 1px border lines as the primary structural element
- Compact spacing; information-dense layouts

---

## 2. Color Tokens

All tokens are defined in `:root` in `apps/apex-portal/src/index.css`.

### Surfaces (dark → light)
| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#0a0a0b` | Page background |
| `--bg-surface` | `#0e0e10` | Sidebar, cards |
| `--bg-raised` | `#131316` | Inputs, dropdowns |
| `--bg-3` | `#18181c` | Hover overlays |

### Text
| Token | Value | Role |
|-------|-------|------|
| `--text` | `#e8e6e0` | Primary body copy |
| `--text-secondary` | `#a8a59c` | Labels, descriptions |
| `--text-muted` | `#6e6c64` | Placeholders, eyebrows |
| `--text-faint` | `#45433d` | Disabled, separators |

### Borders
| Token | Value | Role |
|-------|-------|------|
| `--border` | `#1f1f23` | Default dividers |
| `--border-strong` | `#2a2a30` | Active/hover borders |

### Accent
| Token | Value | Role |
|-------|-------|------|
| `--accent` | `oklch(0.78 0.08 70)` | Warm amber — primary interactive |
| `--accent-dim` | `oklch(0.78 0.08 70 / 0.18)` | Accent backgrounds |
| `--accent-line` | `oklch(0.78 0.08 70 / 0.4)` | Accent borders |

### Semantic
| Token | Value | Role |
|-------|-------|------|
| `--ok` / `--success` | `oklch(0.78 0.06 150)` | Indexed, healthy, active |
| `--warn` / `--warning` | `oklch(0.80 0.10 50)` | Draft, stale |
| `--danger` / `--error` | `oklch(0.70 0.12 25)` | Error, destructive |

---

## 3. Typography

### Typefaces
| Role | Font | Token |
|------|------|-------|
| Display / headings | Newsreader (serif) | `--font-serif` |
| Body / UI | Inter (sans) | `--font` |
| Code / mono labels | JetBrains Mono | `--font-mono` |

### Scale

**Page title (`.page-head h1`)**
```css
font-family: var(--font-serif);
font-size: 44px;
font-weight: 400;
letter-spacing: -0.02em;
line-height: 1.05;
```

**Eyebrow (`.eyebrow`)**
```css
font-family: var(--font-mono);
font-size: 10.5px;
letter-spacing: 0.18em;
text-transform: uppercase;
color: var(--text-muted);
```

**Body**
```css
font-size: 14px;
line-height: 1.55;
letter-spacing: -0.005em;
```

**Lede (`.page-head .lede`)**
```css
font-size: 15px;
color: var(--text-secondary);
max-width: 560px;
line-height: 1.55;
```

---

## 4. Layout

### App shell
```
┌──────────────────────────────────────────────┐
│  Sidebar (248px)  │  Main content (flex: 1)  │
│                   │  ┌── Topbar ────────────┐│
│  Brand mark       │  │ Crumbs  /  Actions   ││
│  Nav items        │  └──────────────────────┘│
│  Session list     │  ┌── Page head ─────────┐│
│  User strip       │  │ Eyebrow / H1 / Lede  ││
└───────────────────┘  └──────────────────────┘│
                        Page body content        │
                       └────────────────────────┘
```

### Page structure
Every content page uses this pattern:

```jsx
<div className="[page]-page-v2">       {/* flex col, height 100%, overflow hidden */}
  <BgPattern name="..." />
  <div className="topbar">...</div>    {/* breadcrumbs + actions */}
  <div className="[page]-scroll">      {/* flex: 1, overflow-y auto */}
    <div className="page-head">        {/* eyebrow + h1 + lede */}
    <div className="[page]-body">      {/* 2-col grid or single col content */}
  </div>
</div>
```

### Two-column body (Agents / Tools / KB)
```css
/* Agents / Tools */
.ag-body {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 28px;
  padding: 0 64px 60px;
}

/* Knowledge Base */
.kb-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 40px;
}
```

---

## 5. Components

### Topbar (`.topbar`)
- `background: rgba(10,10,11,0.6)` with `backdrop-filter: blur(8px)`
- Breadcrumbs: mono, 11px, uppercase, `letter-spacing: 0.08em`
  - Separators: `.sep` → `color: var(--text-faint)`
  - Current page: `.here` → `color: var(--text)`
- Actions right-aligned via `margin-left: auto`

### Buttons (`.btn`)
| Variant | Usage |
|---------|-------|
| default | Secondary — bordered, `--bg-raised` bg |
| `.ghost` | Tertiary — transparent border, `--text-secondary` |
| `.primary` | Primary CTA — `--text` bg, `--bg` text |
| `.accent-btn` | Amber CTA — accent-dim bg, accent text |
| `.icon` | 32×32 square icon button |

### Tags (`.tag`)
```
.tag          base: mono 10px, uppercase, 3px radius
.tag.ok       green — Active, Indexed, Healthy
.tag.warn     amber — Draft, Stale
.tag.accent   amber accent — Indexing (pulsing)
.tag.dot      adds colored dot ::before pseudo
```

### Cards (`.card`)
```css
background: var(--bg-surface);
border: 1px solid var(--border);
border-radius: var(--radius-lg);  /* 10px */
padding: 24px;
```

### Stats strip
4-col grid with 1px gap acting as dividers:
```css
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 1px;
background: var(--border);
border: 1px solid var(--border);
border-radius: 10px;
overflow: hidden;
/* each cell: background: var(--bg-surface); padding: 18-20px */
```

### Nav items (`.nav-item.active`)
Active left-border accent rule:
```css
.nav-item.active::before {
  content: "";
  position: absolute;
  left: -14px; top: 8px; bottom: 8px;
  width: 2px;
  background: var(--accent);
}
```

---

## 6. Page Designs

### Chat (`/`)
- Topbar: `WORKSPACE / CHAT / session-title` + History + New session
- Empty state: serif 52px heading, subtitle, 4 prompt cards (2×2 grid, max-width 720px)
- Messages: max-width 860px, centered, gap 16px
- Chat bar: sticky bottom, blurred backdrop, meta row below

### Knowledge Base (`/kb`)
- Topbar: breadcrumbs only — **no Upload/Reindex buttons** (intentionally removed)
- Stats strip: Documents · Chunks · Embedding dim · P50 retrieval
- Left aside (240px): Collections list + Index health card
- Right: collection header (name + doc count + Mode toggle + search + grid/list buttons)
- Drop zone above document grid
- Document cards show: type badge, filename, chunk count, effort tag (LOW only), status badge
- **High-effort ingestion is disabled** — button shown dimmed/disabled, LOW is the only active mode

### Agents (`/agents`)
- Topbar: crumbs + Run history (ghost) + New agent (primary)
- Page head: "LangGraph Agent Runtime" / "Workflows that reason."
- Left aside (300px): agent list with accent left-border on active row
- Right: agent detail — avatar header, 4-stat strip (runs/success/duration/tokens), graph SVG, system prompt + tools cards side-by-side
- **Auto-selects first agent on load**

### Tools (`/tools`)
- Topbar: crumbs + New tool (primary)
- Page head: "Custom Tool Runtime" / "Extend agent capabilities."
- Left aside: built-in section (dimmed, lock icon) above custom section
- Right main:
  - Built-in: read-only "About this tool" card
  - Custom: edit form — code editor (`tool-code-editor`) + playground side-by-side
- Playground: JSON input textarea + "Run Test" (`.btn.accent-btn`) + result panel (green/red)
- **Auto-selects first tool on load**

### Settings (`/settings`)
- Three nav sections: Services · Models & Embeddings · Appearance
- Services: live health-check list (green dot = HEALTHY, fetches `/health`)
- Setting rows: 2-col grid (260px label + hint / control)
- Toggle: 38×22px pill, accent color when on

---

## 7. Background Patterns

`<BgPattern name="..." />` renders SVG into `position: absolute; inset: 0` with:
- `opacity: 0.55`
- radial gradient mask (ellipse 80% 70% at 50% 30%)

Pattern names: `chat`, `rag`, `agents`

---

## 8. Animations

| Class/Element | Duration | Use |
|---------------|----------|-----|
| `.fade-in` | 240ms ease-out | Element entrance |
| `.pulse-dot` | 1.4s infinite | Live indexing status |
| `.shimmer` | 1.6s infinite | Loading skeletons |
| `.thinking-label` | 1.6s shimmer | "Generating…" |

---

## 9. Rules

| Do | Don't |
|----|-------|
| Use `.page-head h1` (serif 44px) for page titles | Use bold sans for page titles |
| Use `.eyebrow` for section labels above headings | Invent new label patterns |
| Use `1px solid var(--border)` for all dividers | Use thick or colored borders |
| Use `--text-secondary` / `--text-muted` tokens | Hardcode gray hex values |
| Keep topbar to ≤ 2 action buttons | Overload the topbar |
| Disable not-yet-ready features (dimmed btn) | Silently hide future features |
| Auto-select first item in list+detail pages | Start with empty right panel |
