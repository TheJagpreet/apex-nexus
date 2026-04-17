/**
 * Biology-inspired spinners for Apex — agents, tools, RAG.
 * All pure CSS + SVG. Dark canvas, bioluminescent accents.
 */

const ACCENT = 'oklch(0.82 0.16 178)'       // bioluminescent cyan
const ACCENT_DIM = 'oklch(0.55 0.12 178)'
const AMBER = 'oklch(0.78 0.14 70)'         // warm accent
const MAGENTA = 'oklch(0.72 0.18 340)'      // rare third
const FG = 'oklch(0.95 0.01 90)'

// ───────────────────────────────────────────────
// 1. MITOSIS — a cell dividing. Represents agent spawning.
// ───────────────────────────────────────────────
export function MitosisSpinner({ size = 48 }) {
  return (
    <div className="spinner-mitosis" style={{ width: size, height: size }}>
      <style>{`
        .spinner-mitosis {
          position: relative;
        }
        .spinner-mitosis__cell {
          position: absolute;
          width: 50%;
          height: 50%;
          border-radius: 50%;
          background: ${ACCENT};
          opacity: 0.7;
          animation: mitosis-split 2s ease-in-out infinite;
        }
        .spinner-mitosis__cell:nth-child(1) {
          top: 25%;
          left: 25%;
          animation-name: mitosis-left;
        }
        .spinner-mitosis__cell:nth-child(2) {
          top: 25%;
          left: 25%;
          animation-name: mitosis-right;
        }
        @keyframes mitosis-left {
          0%, 100% { transform: translateX(0) scale(1); opacity: 0.7; }
          30% { transform: translateX(0) scale(1.1); opacity: 1; }
          50% { transform: translateX(-40%) scaleX(0.8); opacity: 0.8; }
          70% { transform: translateX(-50%) scale(0.7); opacity: 0.6; }
          85% { transform: translateX(-30%) scale(0.85); opacity: 0.65; }
        }
        @keyframes mitosis-right {
          0%, 100% { transform: translateX(0) scale(1); opacity: 0.7; }
          30% { transform: translateX(0) scale(1.1); opacity: 1; }
          50% { transform: translateX(40%) scaleX(0.8); opacity: 0.8; }
          70% { transform: translateX(50%) scale(0.7); opacity: 0.6; }
          85% { transform: translateX(30%) scale(0.85); opacity: 0.65; }
        }
      `}</style>
      <div className="spinner-mitosis__cell" />
      <div className="spinner-mitosis__cell" />
    </div>
  )
}

// ───────────────────────────────────────────────
// 2. SYNAPSE — electrical pulse traveling between nodes.
// ───────────────────────────────────────────────
export function SynapseSpinner({ size = 64 }) {
  const r = size / 2
  const nodeR = size * 0.06
  const pulseR = size * 0.04
  // 6 nodes in a circle
  const nodes = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 - 90) * (Math.PI / 180)
    return {
      cx: r + Math.cos(angle) * r * 0.7,
      cy: r + Math.sin(angle) * r * 0.7,
    }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="spinner-synapse">
      <style>{`
        .spinner-synapse .synapse-line {
          stroke: ${ACCENT_DIM};
          stroke-width: 1;
          opacity: 0.3;
        }
        .spinner-synapse .synapse-node {
          fill: ${ACCENT};
          opacity: 0.6;
        }
        .spinner-synapse .synapse-pulse {
          fill: ${ACCENT};
          opacity: 0;
          animation: synapse-fire 2.4s ease-in-out infinite;
        }
        .spinner-synapse .synapse-pulse:nth-child(1) { animation-delay: 0s; }
        .spinner-synapse .synapse-pulse:nth-child(2) { animation-delay: 0.4s; }
        .spinner-synapse .synapse-pulse:nth-child(3) { animation-delay: 0.8s; }
        .spinner-synapse .synapse-pulse:nth-child(4) { animation-delay: 1.2s; }
        .spinner-synapse .synapse-pulse:nth-child(5) { animation-delay: 1.6s; }
        .spinner-synapse .synapse-pulse:nth-child(6) { animation-delay: 2.0s; }
        @keyframes synapse-fire {
          0% { opacity: 0; r: ${pulseR}; }
          15% { opacity: 1; r: ${pulseR * 2.5}; }
          40% { opacity: 0.4; r: ${pulseR * 1.5}; }
          100% { opacity: 0; r: ${pulseR}; }
        }
        .spinner-synapse .synapse-glow {
          fill: none;
          stroke: ${ACCENT};
          stroke-width: 1.5;
          opacity: 0;
          animation: synapse-glow-pulse 2.4s ease-in-out infinite;
        }
        .spinner-synapse .synapse-glow:nth-child(1) { animation-delay: 0s; }
        .spinner-synapse .synapse-glow:nth-child(2) { animation-delay: 0.4s; }
        .spinner-synapse .synapse-glow:nth-child(3) { animation-delay: 0.8s; }
        @keyframes synapse-glow-pulse {
          0%, 100% { opacity: 0; }
          20% { opacity: 0.8; }
          50% { opacity: 0.2; }
        }
      `}</style>
      {/* Connection lines */}
      {nodes.map((n, i) =>
        nodes.slice(i + 1).map((m, j) => (
          <line key={`${i}-${j}`} className="synapse-line"
            x1={n.cx} y1={n.cy} x2={m.cx} y2={m.cy} />
        ))
      )}
      {/* Glow lines on some connections */}
      {[0, 1, 2].map(i => (
        <line key={`glow-${i}`} className="synapse-glow"
          x1={nodes[i].cx} y1={nodes[i].cy}
          x2={nodes[(i + 3) % 6].cx} y2={nodes[(i + 3) % 6].cy} />
      ))}
      {/* Static nodes */}
      {nodes.map((n, i) => (
        <circle key={`node-${i}`} className="synapse-node"
          cx={n.cx} cy={n.cy} r={nodeR} />
      ))}
      {/* Pulses at each node */}
      {nodes.map((n, i) => (
        <circle key={`pulse-${i}`} className="synapse-pulse"
          cx={n.cx} cy={n.cy} r={pulseR} />
      ))}
    </svg>
  )
}

// ───────────────────────────────────────────────
// 3. MEMBRANE BREATHING — gentle organic pulse. For idle/empty states.
// ───────────────────────────────────────────────
export function MembraneSpinner({ size = 64 }) {
  return (
    <div className="spinner-membrane" style={{ width: size, height: size }}>
      <style>{`
        .spinner-membrane {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spinner-membrane__ring {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid ${ACCENT};
          animation: membrane-breathe 3s ease-in-out infinite;
        }
        .spinner-membrane__ring:nth-child(1) {
          width: 100%;
          height: 100%;
          opacity: 0.15;
          animation-delay: 0s;
        }
        .spinner-membrane__ring:nth-child(2) {
          width: 70%;
          height: 70%;
          opacity: 0.25;
          animation-delay: 0.5s;
        }
        .spinner-membrane__ring:nth-child(3) {
          width: 40%;
          height: 40%;
          opacity: 0.4;
          animation-delay: 1s;
        }
        .spinner-membrane__core {
          width: 12%;
          height: 12%;
          border-radius: 50%;
          background: ${ACCENT};
          opacity: 0.6;
          animation: membrane-core-pulse 3s ease-in-out infinite;
        }
        @keyframes membrane-breathe {
          0%, 100% { transform: scale(1); opacity: var(--ring-opacity, 0.2); }
          50% { transform: scale(1.15); opacity: calc(var(--ring-opacity, 0.2) + 0.15); }
        }
        @keyframes membrane-core-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 0.9; }
        }
      `}</style>
      <div className="spinner-membrane__ring" />
      <div className="spinner-membrane__ring" />
      <div className="spinner-membrane__ring" />
      <div className="spinner-membrane__core" />
    </div>
  )
}

// ───────────────────────────────────────────────
// 4. DNA TRANSCRIPTION — double helix unwinding. For RAG ingestion.
// ───────────────────────────────────────────────
export function DNASpinner({ size = 64 }) {
  const w = size
  const h = size
  const count = 8
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="spinner-dna">
      <style>{`
        .spinner-dna .dna-dot-a,
        .spinner-dna .dna-dot-b {
          animation: dna-helix 2s ease-in-out infinite;
        }
        .spinner-dna .dna-dot-a { fill: ${ACCENT}; }
        .spinner-dna .dna-dot-b { fill: ${AMBER}; }
        .spinner-dna .dna-link {
          stroke: ${ACCENT_DIM};
          stroke-width: 1;
          opacity: 0.3;
          animation: dna-link-pulse 2s ease-in-out infinite;
        }
        ${Array.from({ length: count }, (_, i) => `
          .spinner-dna .dna-dot-a:nth-of-type(${i + 1}) {
            animation-delay: ${i * 0.15}s;
          }
          .spinner-dna .dna-dot-b:nth-of-type(${i + 1}) {
            animation-delay: ${i * 0.15}s;
          }
          .spinner-dna .dna-link:nth-of-type(${i + 1}) {
            animation-delay: ${i * 0.15}s;
          }
        `).join('')}
        @keyframes dna-helix {
          0%, 100% { opacity: 0.4; r: 2; }
          50% { opacity: 1; r: 3.5; }
        }
        @keyframes dna-link-pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.5; }
        }
      `}</style>
      {Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1)
        const y = h * 0.1 + t * h * 0.8
        const cx = w / 2
        const offset = Math.sin(t * Math.PI * 2) * w * 0.3
        return (
          <g key={i}>
            <line className="dna-link"
              x1={cx - offset} y1={y}
              x2={cx + offset} y2={y} />
            <circle className="dna-dot-a"
              cx={cx - offset} cy={y} r={2.5} />
            <circle className="dna-dot-b"
              cx={cx + offset} cy={y} r={2.5} />
          </g>
        )
      })}
    </svg>
  )
}

// ───────────────────────────────────────────────
// 5. ENZYME — rotating catalytic complex. For tool execution.
// ───────────────────────────────────────────────
export function EnzymeSpinner({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="spinner-enzyme">
      <style>{`
        .spinner-enzyme .enzyme-arm {
          fill: none;
          stroke: ${ACCENT};
          stroke-width: 2;
          stroke-linecap: round;
          animation: enzyme-rotate 3s linear infinite;
          transform-origin: 24px 24px;
        }
        .spinner-enzyme .enzyme-arm:nth-child(1) { animation-delay: 0s; opacity: 0.9; }
        .spinner-enzyme .enzyme-arm:nth-child(2) { animation-delay: -1s; opacity: 0.6; }
        .spinner-enzyme .enzyme-arm:nth-child(3) { animation-delay: -2s; opacity: 0.3; }
        .spinner-enzyme .enzyme-core {
          fill: ${ACCENT};
          opacity: 0.5;
          animation: enzyme-pulse 1.5s ease-in-out infinite;
        }
        @keyframes enzyme-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes enzyme-pulse {
          0%, 100% { r: 3; opacity: 0.5; }
          50% { r: 4.5; opacity: 0.8; }
        }
      `}</style>
      <path className="enzyme-arm" d="M24 8 C30 14, 36 18, 40 24 C36 30, 30 34, 24 40 C18 34, 12 30, 8 24 C12 18, 18 14, 24 8Z" />
      <path className="enzyme-arm" d="M24 8 C30 14, 36 18, 40 24 C36 30, 30 34, 24 40 C18 34, 12 30, 8 24 C12 18, 18 14, 24 8Z" />
      <path className="enzyme-arm" d="M24 8 C30 14, 36 18, 40 24 C36 30, 30 34, 24 40 C18 34, 12 30, 8 24 C12 18, 18 14, 24 8Z" />
      <circle className="enzyme-core" cx="24" cy="24" r="3" />
    </svg>
  )
}

// ───────────────────────────────────────────────
// 6. NEURAL NETWORK — pulsing network graph. For LLM inference.
// ───────────────────────────────────────────────
export function NeuralNetSpinner({ size = 64 }) {
  const layers = [
    [{ x: 10, y: 16 }, { x: 10, y: 32 }, { x: 10, y: 48 }],
    [{ x: 32, y: 12 }, { x: 32, y: 28 }, { x: 32, y: 44 }, { x: 32, y: 56 }],
    [{ x: 54, y: 20 }, { x: 54, y: 40 }],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="spinner-neural">
      <style>{`
        .spinner-neural .neural-edge {
          stroke: ${ACCENT_DIM};
          stroke-width: 0.8;
          opacity: 0.2;
          animation: neural-edge-pulse 2s ease-in-out infinite;
        }
        .spinner-neural .neural-node {
          fill: ${ACCENT};
          animation: neural-node-pulse 2s ease-in-out infinite;
        }
        @keyframes neural-edge-pulse {
          0%, 100% { opacity: 0.1; stroke-width: 0.5; }
          50% { opacity: 0.5; stroke-width: 1.2; }
        }
        @keyframes neural-node-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      {/* Edges */}
      {layers.slice(0, -1).map((layer, li) =>
        layer.map((n, ni) =>
          layers[li + 1].map((m, mi) => (
            <line key={`${li}-${ni}-${mi}`} className="neural-edge"
              x1={n.x} y1={n.y} x2={m.x} y2={m.y}
              style={{ animationDelay: `${(li * 0.3 + ni * 0.15)}s` }} />
          ))
        )
      )}
      {/* Nodes */}
      {layers.map((layer, li) =>
        layer.map((n, ni) => (
          <circle key={`n-${li}-${ni}`} className="neural-node"
            cx={n.x} cy={n.y} r={2.5}
            style={{ animationDelay: `${(li * 0.4 + ni * 0.2)}s` }} />
        ))
      )}
    </svg>
  )
}

// ───────────────────────────────────────────────
// 7. BIOLUMINESCENT PULSE — simple radial glow. General loading.
// ───────────────────────────────────────────────
export function BiolumPulseSpinner({ size = 48, color = ACCENT }) {
  return (
    <div className="spinner-biolum" style={{ width: size, height: size }}>
      <style>{`
        .spinner-biolum {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spinner-biolum__glow {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(circle, ${color} 0%, transparent 70%);
          animation: biolum-pulse 2s ease-in-out infinite;
        }
        .spinner-biolum__core {
          width: 20%;
          height: 20%;
          border-radius: 50%;
          background: ${color};
          z-index: 1;
          animation: biolum-core 2s ease-in-out infinite;
        }
        @keyframes biolum-pulse {
          0%, 100% { transform: scale(0.6); opacity: 0.2; }
          50% { transform: scale(1); opacity: 0.5; }
        }
        @keyframes biolum-core {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
      <div className="spinner-biolum__glow" />
      <div className="spinner-biolum__core" />
    </div>
  )
}

// ───────────────────────────────────────────────
// 8. RIBOSOME — particle assembly line. For chunking/embedding.
// ───────────────────────────────────────────────
export function RibosomeSpinner({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 28" className="spinner-ribosome">
      <style>{`
        .spinner-ribosome .ribo-particle {
          fill: ${ACCENT};
          animation: ribo-travel 2.5s ease-in-out infinite;
        }
        .spinner-ribosome .ribo-track {
          stroke: ${ACCENT_DIM};
          stroke-width: 1;
          opacity: 0.2;
          fill: none;
        }
        ${Array.from({ length: 5 }, (_, i) => `
          .spinner-ribosome .ribo-particle:nth-of-type(${i + 1}) {
            animation-delay: ${i * 0.5}s;
          }
        `).join('')}
        @keyframes ribo-travel {
          0% { cx: 4; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { cx: 52; opacity: 0; }
        }
      `}</style>
      <path className="ribo-track" d="M4 14 C16 4, 28 24, 40 14 C44 10, 48 12, 52 14" />
      {Array.from({ length: 5 }, (_, i) => (
        <circle key={i} className="ribo-particle" cx={4} cy={14} r={2} />
      ))}
    </svg>
  )
}

// ───────────────────────────────────────────────
// 9. ORGANELLE — orbiting particles. For multi-service coordination.
// ───────────────────────────────────────────────
export function OrganelleSpinner({ size = 48 }) {
  return (
    <div className="spinner-organelle" style={{ width: size, height: size }}>
      <style>{`
        .spinner-organelle {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spinner-organelle__orbit {
          position: absolute;
          width: 100%;
          height: 100%;
          animation: organelle-orbit 3s linear infinite;
        }
        .spinner-organelle__orbit:nth-child(1) { animation-duration: 3s; }
        .spinner-organelle__orbit:nth-child(2) { animation-duration: 4s; animation-direction: reverse; }
        .spinner-organelle__orbit:nth-child(3) { animation-duration: 5s; }
        .spinner-organelle__particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
        }
        .spinner-organelle__orbit:nth-child(1) .spinner-organelle__particle { background: ${ACCENT}; }
        .spinner-organelle__orbit:nth-child(2) .spinner-organelle__particle { background: ${AMBER}; width: 5px; height: 5px; }
        .spinner-organelle__orbit:nth-child(3) .spinner-organelle__particle { background: ${MAGENTA}; width: 4px; height: 4px; }
        .spinner-organelle__center {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${ACCENT};
          opacity: 0.5;
          animation: organelle-center-pulse 2s ease-in-out infinite;
        }
        @keyframes organelle-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes organelle-center-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
      `}</style>
      <div className="spinner-organelle__orbit"><div className="spinner-organelle__particle" /></div>
      <div className="spinner-organelle__orbit"><div className="spinner-organelle__particle" /></div>
      <div className="spinner-organelle__orbit"><div className="spinner-organelle__particle" /></div>
      <div className="spinner-organelle__center" />
    </div>
  )
}

// ───────────────────────────────────────────────
// 10. PHAGE — virus-like injector animation. For code injection/tools.
// ───────────────────────────────────────────────
export function PhageSpinner({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 60" className="spinner-phage">
      <style>{`
        .spinner-phage .phage-head {
          fill: none;
          stroke: ${ACCENT};
          stroke-width: 1.5;
          animation: phage-bob 2s ease-in-out infinite;
        }
        .spinner-phage .phage-tail {
          stroke: ${ACCENT_DIM};
          stroke-width: 1.5;
          fill: none;
          animation: phage-inject 2s ease-in-out infinite;
        }
        .spinner-phage .phage-legs {
          stroke: ${ACCENT_DIM};
          stroke-width: 1;
          fill: none;
          opacity: 0.5;
          animation: phage-legs-spread 2s ease-in-out infinite;
        }
        @keyframes phage-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes phage-inject {
          0%, 100% { stroke-dashoffset: 0; }
          50% { stroke-dashoffset: 8; }
        }
        @keyframes phage-legs-spread {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.15); }
        }
      `}</style>
      <polygon className="phage-head" points="24,4 36,16 24,28 12,16" />
      <line className="phage-tail" x1="24" y1="28" x2="24" y2="48" strokeDasharray="4 3" />
      <g className="phage-legs" style={{ transformOrigin: '24px 48px' }}>
        <line x1="24" y1="48" x2="14" y2="56" />
        <line x1="24" y1="48" x2="34" y2="56" />
        <line x1="24" y1="48" x2="10" y2="52" />
        <line x1="24" y1="48" x2="38" y2="52" />
      </g>
    </svg>
  )
}

// ───────────────────────────────────────────────
// 11. FLAGELLUM — whip-like tail motion. Simple linear indicator.
// ───────────────────────────────────────────────
export function FlagellumSpinner({ size = 48 }) {
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 60 20" className="spinner-flagellum">
      <style>{`
        .spinner-flagellum .flagellum-body {
          fill: ${ACCENT};
          opacity: 0.6;
        }
        .spinner-flagellum .flagellum-tail {
          fill: none;
          stroke: ${ACCENT};
          stroke-width: 1.5;
          stroke-linecap: round;
        }
      `}</style>
      <ellipse className="flagellum-body" cx="10" cy="10" rx="8" ry="5" />
      <path className="flagellum-tail" d="M 16 10 C 24 4, 36 16, 48 10 C 52 8, 56 10, 58 10">
        <animate attributeName="d"
          values="M 16 10 C 24 4, 36 16, 48 10 C 52 8, 56 10, 58 10;M 16 10 C 24 16, 36 4, 48 10 C 52 12, 56 10, 58 10;M 16 10 C 24 4, 36 16, 48 10 C 52 8, 56 10, 58 10"
          dur="1s" repeatCount="indefinite" />
      </path>
    </svg>
  )
}

// ───────────────────────────────────────────────
// 12. PHOTON SCATTER — particles emitting from a center point.
// ───────────────────────────────────────────────
export function PhotonScatterSpinner({ size = 48 }) {
  const count = 8
  return (
    <div className="spinner-photon" style={{ width: size, height: size }}>
      <style>{`
        .spinner-photon {
          position: relative;
        }
        .spinner-photon__particle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: ${ACCENT};
          top: 50%;
          left: 50%;
          animation: photon-scatter 2s ease-out infinite;
        }
        ${Array.from({ length: count }, (_, i) => {
          const angle = (i * 360 / count) * (Math.PI / 180)
          const dx = Math.cos(angle) * size * 0.4
          const dy = Math.sin(angle) * size * 0.4
          return `
            .spinner-photon__particle:nth-child(${i + 1}) {
              animation-delay: ${i * 0.25}s;
              --dx: ${dx}px;
              --dy: ${dy}px;
            }
          `
        }).join('')}
        @keyframes photon-scatter {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)); opacity: 0; }
        }
      `}</style>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="spinner-photon__particle" />
      ))}
    </div>
  )
}

export default {
  MitosisSpinner,
  SynapseSpinner,
  MembraneSpinner,
  DNASpinner,
  EnzymeSpinner,
  NeuralNetSpinner,
  BiolumPulseSpinner,
  RibosomeSpinner,
  OrganelleSpinner,
  PhageSpinner,
  FlagellumSpinner,
  PhotonScatterSpinner,
}
