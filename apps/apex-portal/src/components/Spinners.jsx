// Nexus-style spinners — keyframes (sp-spin, sp-bars, sp-embed) live in index.css.

export function MeshSpinner({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
      <g style={{ transformOrigin: '12px 12px', animation: 'sp-spin 2.4s linear infinite' }}>
        <polygon points="12,3 21,18 3,18" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        <circle cx="12" cy="3" r="1.8" fill="var(--accent)" />
        <circle cx="21" cy="18" r="1.8" fill="#0a0a0b" stroke="currentColor" strokeWidth="0.8" />
        <circle cx="3" cy="18" r="1.8" fill="#0a0a0b" stroke="currentColor" strokeWidth="0.8" />
      </g>
      <circle cx="12" cy="12" r="1.2" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

export function EmbedSpinner({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
      <line x1="12" y1="12" x2="20" y2="12" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="20" cy="12" r="1.4" fill="var(--accent)" />
      {[{ x: 4, y: 4 }, { x: 4, y: 12 }, { x: 4, y: 20 }, { x: 8, y: 8 }, { x: 8, y: 16 }].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="1.1" fill="currentColor" opacity="0.7"
          style={{ animation: `sp-embed 1.8s ease-in-out ${i * 0.12}s infinite` }} />
      ))}
    </svg>
  )
}

export function IndexSpinner({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'block' }} aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => (
        <rect key={i} x={3 + i * 4} y="6" width="2.2" height="12" rx="1" fill="currentColor"
          style={{ transformOrigin: `${4.1 + i * 4}px 12px`, animation: `sp-bars 1.2s ease-in-out ${i * 0.12}s infinite` }} />
      ))}
    </svg>
  )
}
