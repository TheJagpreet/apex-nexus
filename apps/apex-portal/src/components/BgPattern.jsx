/**
 * BgPattern — SVG background patterns per page.
 * Renders inside .bg-pattern with mask-image fade applied by CSS.
 */

const GRID_SQUARES = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <pattern id="p-grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
      <rect x="0.5" y="0.5" width="79" height="79" fill="none" stroke="#1a1a1e" stroke-width="0.5"/>
      <rect x="14" y="14" width="52" height="52" fill="none" stroke="#16161a" stroke-width="0.5"/>
      <rect x="28" y="28" width="24" height="24" fill="none" stroke="#222226" stroke-width="0.5"/>
      <circle cx="40" cy="40" r="1.5" fill="#2a2a30"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#p-grid)"/>
</svg>`

const WAVEFORM = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <pattern id="p-wave" x="0" y="0" width="120" height="60" patternUnits="userSpaceOnUse">
      <path d="M0 30 Q15 10 30 30 Q45 50 60 30 Q75 10 90 30 Q105 50 120 30" fill="none" stroke="#1f1f23" stroke-width="0.8"/>
      <path d="M0 40 Q15 24 30 40 Q45 56 60 40 Q75 24 90 40 Q105 56 120 40" fill="none" stroke="#1a1a1e" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#p-wave)"/>
</svg>`

const DOC_GRID = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <pattern id="p-doc" x="0" y="0" width="64" height="80" patternUnits="userSpaceOnUse">
      <rect x="8" y="8" width="48" height="64" rx="3" fill="none" stroke="#1f1f23" stroke-width="0.8"/>
      <line x1="16" y1="22" x2="48" y2="22" stroke="#1a1a1e" stroke-width="0.5"/>
      <line x1="16" y1="30" x2="44" y2="30" stroke="#1a1a1e" stroke-width="0.5"/>
      <line x1="16" y1="38" x2="40" y2="38" stroke="#1a1a1e" stroke-width="0.5"/>
      <line x1="16" y1="46" x2="48" y2="46" stroke="#1a1a1e" stroke-width="0.5"/>
      <line x1="16" y1="54" x2="36" y2="54" stroke="#1a1a1e" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#p-doc)"/>
</svg>`

const GRAPH = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <pattern id="p-graph" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="3" fill="none" stroke="#1f1f23" stroke-width="0.8"/>
      <circle cx="80" cy="20" r="3" fill="none" stroke="#1f1f23" stroke-width="0.8"/>
      <circle cx="50" cy="60" r="3" fill="none" stroke="#1f1f23" stroke-width="0.8"/>
      <circle cx="20" cy="80" r="2" fill="none" stroke="#1a1a1e" stroke-width="0.6"/>
      <line x1="20" y1="20" x2="80" y2="20" stroke="#1a1a1e" stroke-width="0.5"/>
      <line x1="20" y1="20" x2="50" y2="60" stroke="#1a1a1e" stroke-width="0.5"/>
      <line x1="80" y1="20" x2="50" y2="60" stroke="#1a1a1e" stroke-width="0.5"/>
      <line x1="50" y1="60" x2="20" y2="80" stroke="#1a1a1e" stroke-width="0.4"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#p-graph)"/>
</svg>`

const SCHEMA = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <pattern id="p-schema" x="0" y="0" width="96" height="64" patternUnits="userSpaceOnUse">
      <rect x="4" y="8" width="40" height="20" rx="2" fill="none" stroke="#1f1f23" stroke-width="0.8"/>
      <line x1="8" y1="15" x2="40" y2="15" stroke="#1a1a1e" stroke-width="0.4"/>
      <rect x="52" y="36" width="40" height="20" rx="2" fill="none" stroke="#1f1f23" stroke-width="0.8"/>
      <line x1="56" y1="43" x2="88" y2="43" stroke="#1a1a1e" stroke-width="0.4"/>
      <line x1="44" y1="18" x2="52" y2="46" stroke="#1a1a1e" stroke-width="0.4" stroke-dasharray="2,2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#p-schema)"/>
</svg>`

const patterns = {
  login:    GRID_SQUARES,
  chat:     WAVEFORM,
  rag:      DOC_GRID,
  agents:   GRAPH,
  settings: SCHEMA,
}

export default function BgPattern({ name, opacity }) {
  const svg = patterns[name] || patterns.login
  return (
    <div
      className="bg-pattern"
      style={opacity != null ? { '--pattern-opacity': opacity } : undefined}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
