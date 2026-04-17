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
          transform-box: fill-box;
          transform-origin: center;
          animation: synapse-fire 2.4s ease-in-out infinite;
        }
        .spinner-synapse .synapse-pulse:nth-child(1) { animation-delay: 0s; }
        .spinner-synapse .synapse-pulse:nth-child(2) { animation-delay: 0.4s; }
        .spinner-synapse .synapse-pulse:nth-child(3) { animation-delay: 0.8s; }
        .spinner-synapse .synapse-pulse:nth-child(4) { animation-delay: 1.2s; }
        .spinner-synapse .synapse-pulse:nth-child(5) { animation-delay: 1.6s; }
        .spinner-synapse .synapse-pulse:nth-child(6) { animation-delay: 2.0s; }
        @keyframes synapse-fire {
          0%   { opacity: 0;   transform: scale(1); }
          15%  { opacity: 1;   transform: scale(2.5); }
          40%  { opacity: 0.4; transform: scale(1.5); }
          100% { opacity: 0;   transform: scale(1); }
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
          20%      { opacity: 0.8; }
          50%      { opacity: 0.2; }
        }
      `}</style>
      {nodes.map((n, i) =>
        nodes.slice(i + 1).map((m, j) => (
          <line key={`${i}-${j}`} className="synapse-line"
            x1={n.cx} y1={n.cy} x2={m.cx} y2={m.cy} />
        ))
      )}
      {[0, 1, 2].map(i => (
        <line key={`glow-${i}`} className="synapse-glow"
          x1={nodes[i].cx} y1={nodes[i].cy}
          x2={nodes[(i + 3) % 6].cx} y2={nodes[(i + 3) % 6].cy} />
      ))}
      {nodes.map((n, i) => (
        <circle key={`node-${i}`} className="synapse-node"
          cx={n.cx} cy={n.cy} r={nodeR} />
      ))}
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
  const count = 10
  const cx = size / 2
  const travel = size * 0.34
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="spinner-dna">
      <style>{`
        .spinner-dna .dna-dot-a {
          fill: ${ACCENT};
          animation: dnaA 2.2s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .spinner-dna .dna-dot-b {
          fill: ${AMBER};
          animation: dnaB 2.2s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .spinner-dna .dna-rung {
          stroke: ${ACCENT_DIM};
          stroke-width: 1;
          animation: dnaRung 2.2s ease-in-out infinite;
          stroke-dasharray: ${travel * 2};
        }
        @keyframes dnaA {
          0%, 100% { transform: translateX(${-travel}px) scale(1);   opacity: 0.9; }
          50%      { transform: translateX(${travel}px)  scale(0.65); opacity: 0.4; }
        }
        @keyframes dnaB {
          0%, 100% { transform: translateX(${travel}px)  scale(0.65); opacity: 0.4; }
          50%      { transform: translateX(${-travel}px) scale(1);    opacity: 0.9; }
        }
        @keyframes dnaRung {
          0%, 100% { stroke-dashoffset: 0;            opacity: 0.5; }
          50%      { stroke-dashoffset: ${travel};    opacity: 0.1; }
        }
      `}</style>
      {Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1)
        const y = size * 0.1 + t * size * 0.8
        const delay = -i * 0.22
        return (
          <g key={i}>
            <line className="dna-rung"
              x1={cx - travel} y1={y} x2={cx + travel} y2={y}
              style={{ animationDelay: `${delay}s` }} />
            <circle className="dna-dot-a" cx={cx} cy={y} r={2.5}
              style={{ animationDelay: `${delay}s` }} />
            <circle className="dna-dot-b" cx={cx} cy={y} r={2.5}
              style={{ animationDelay: `${delay}s` }} />
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

// ───────────────────────────────────────────────
// 13. JELLYFISH — pulsing bell with tentacles. Tool invocation.
// ───────────────────────────────────────────────
export function JellyfishSpinner({ size = 64 }) {
  const tentacles = Array.from({ length: 7 }, (_, i) => i)
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="jelly-bell" cx="50%" cy="35%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.9" />
          <stop offset="60%" stopColor={ACCENT} stopOpacity="0.3" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="jelly-body">
        <path
          d="M 25 55 Q 25 25 60 25 Q 95 25 95 55 Q 95 62 85 62 Q 75 60 75 55 Q 72 58 60 58 Q 48 58 45 55 Q 45 60 35 62 Q 25 62 25 55 Z"
          fill="url(#jelly-bell)" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.7" />
        <ellipse cx="50" cy="38" rx="3" ry="2" fill={ACCENT} opacity="0.7" />
        <ellipse cx="70" cy="38" rx="3" ry="2" fill={ACCENT} opacity="0.7" />
        {tentacles.map(i => {
          const x = 30 + i * 10
          const delay = -i * 0.1
          return (
            <path key={i} className="jelly-tent"
              d={`M ${x} 58 Q ${x - 2} 75 ${x} 90 Q ${x + 2} 100 ${x} 108`}
              fill="none" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round"
              style={{ animationDelay: `${delay}s` }} />
          )
        })}
      </g>
      <style>{`
        .jelly-body { animation: jelly 2.4s cubic-bezier(.4,0,.2,1) infinite; transform-origin: 60px 45px; }
        @keyframes jelly {
          0%,100% { transform: scale(1, 1) translateY(0); }
          30%     { transform: scale(1.1, 0.85) translateY(-4px); }
          60%     { transform: scale(0.9, 1.15) translateY(4px); }
        }
        .jelly-tent { animation: jellyTent 2.4s ease-in-out infinite; transform-origin: center top; }
        @keyframes jellyTent {
          0%,100% { transform: skewX(0deg) scaleY(1); }
          50%     { transform: skewX(4deg) scaleY(0.92); }
        }
      `}</style>
    </svg>
  )
}

// ───────────────────────────────────────────────
// 14. MYCELIUM — branching fungal network. Agent graph.
// ───────────────────────────────────────────────
export function MyceliumSpinner({ size = 64 }) {
  const branches = [
    { from: [60, 60], to: [20, 30], d: 0 },
    { from: [60, 60], to: [100, 30], d: 0.15 },
    { from: [60, 60], to: [100, 90], d: 0.3 },
    { from: [60, 60], to: [20, 90], d: 0.45 },
    { from: [60, 60], to: [60, 10], d: 0.6 },
    { from: [60, 60], to: [110, 60], d: 0.75 },
    { from: [60, 60], to: [60, 110], d: 0.9 },
    { from: [60, 60], to: [10, 60], d: 1.05 },
  ]
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: 'block' }}>
      <g>
        {branches.map((b, i) => (
          <g key={i}>
            <line className="myc-branch"
              x1={b.from[0]} y1={b.from[1]} x2={b.to[0]} y2={b.to[1]}
              stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round"
              style={{ animationDelay: `${b.d}s` }} />
            <circle className="myc-tip"
              cx={b.to[0]} cy={b.to[1]} r="2" fill={ACCENT}
              style={{ animationDelay: `${b.d + 0.4}s` }} />
          </g>
        ))}
        <circle cx="60" cy="60" r="5" fill={ACCENT} />
        <circle className="myc-pulse" cx="60" cy="60" r="5" fill="none" stroke={ACCENT} strokeWidth="1" />
      </g>
      <style>{`
        .myc-branch { stroke-dasharray: 60; stroke-dashoffset: 60; animation: mycGrow 2.4s ease-out infinite; }
        @keyframes mycGrow {
          0%    { stroke-dashoffset: 60; opacity: 0; }
          20%   { opacity: 1; }
          60%   { stroke-dashoffset: 0; opacity: 0.8; }
          100%  { stroke-dashoffset: 0; opacity: 0; }
        }
        .myc-tip { opacity: 0; animation: mycTip 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes mycTip {
          0%,30%   { opacity: 0; transform: scale(0); }
          50%      { opacity: 1; transform: scale(1.4); }
          70%,100% { opacity: 0; transform: scale(1); }
        }
        .myc-pulse { animation: mycPulse 2.4s ease-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes mycPulse {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(6); opacity: 0; }
        }
      `}</style>
    </svg>
  )
}

// ───────────────────────────────────────────────
// 15. AMOEBA — organism breathing. Idle loading.
// ───────────────────────────────────────────────
export function AmoebaSpinner({ size = 64 }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="amoeba-g" cx="50%" cy="50%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.4" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g style={{ transformOrigin: '60px 60px' }}>
        <circle cx="60" cy="60" r="40" fill="url(#amoeba-g)" />
        <path className="amoeba-a" fill="none" stroke={ACCENT} strokeWidth="1.5"
          d="M 60,25 C 80,25 95,40 95,60 C 95,80 80,95 60,95 C 40,95 25,80 25,60 C 25,40 40,25 60,25 Z" />
        <path className="amoeba-b" fill="none" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.5"
          d="M 60,30 C 82,30 90,45 90,60 C 90,78 82,90 60,90 C 38,90 30,75 30,60 C 30,45 38,30 60,30 Z" />
        <circle cx="60" cy="60" r="6" fill={ACCENT} />
        <circle className="amoeba-nuc" cx="60" cy="60" r="3" fill="white" />
      </g>
      <style>{`
        .amoeba-a, .amoeba-b { transform-box: fill-box; transform-origin: center; animation: blob 3.6s ease-in-out infinite; }
        .amoeba-b { animation-duration: 4.8s; animation-direction: reverse; }
        @keyframes blob {
          0%,100% { d: path("M 60,25 C 80,25 95,40 95,60 C 95,80 80,95 60,95 C 40,95 25,80 25,60 C 25,40 40,25 60,25 Z"); }
          33%     { d: path("M 60,22 C 85,28 92,42 93,62 C 94,82 78,98 58,93 C 38,88 22,78 27,58 C 32,38 40,20 60,22 Z"); }
          66%     { d: path("M 60,28 C 78,22 98,42 92,62 C 86,82 82,97 62,92 C 42,87 24,76 28,58 C 32,40 42,34 60,28 Z"); }
        }
        .amoeba-nuc { animation: nucPulse 1.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes nucPulse {
          0%,100% { transform: scale(1); opacity: 1; }
          50%     { transform: scale(1.6); opacity: 0.6; }
        }
      `}</style>
    </svg>
  )
}

// ───────────────────────────────────────────────
// 16. CILIA — ring of undulating hairs. Data streaming.
// ───────────────────────────────────────────────
export function CiliaSpinner({ size = 64 }) {
  const count = 24
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: 'block' }}>
      <g>
        <circle cx="60" cy="60" r="22" fill="none" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.5" />
        <circle cx="60" cy="60" r="28" fill="none" stroke={ACCENT} strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="1 3" />
        {Array.from({ length: count }).map((_, i) => {
          const angle = (i / count) * 360
          const delay = -(i / count) * 1.2
          return (
            <g key={i} style={{ transform: `rotate(${angle}deg)`, transformOrigin: '60px 60px' }}>
              <line className="cilium" x1="60" y1="38" x2="60" y2="24"
                stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"
                style={{ animationDelay: `${delay}s` }} />
            </g>
          )
        })}
        <circle cx="60" cy="60" r="10" fill={ACCENT} opacity="0.2" />
        <circle cx="60" cy="60" r="4" fill={ACCENT} />
      </g>
      <style>{`
        .cilium { transform-origin: 60px 38px; animation: cilia 1.2s ease-in-out infinite; }
        @keyframes cilia {
          0%,100% { transform: rotate(-18deg) scaleY(1); opacity: 0.4; }
          50%     { transform: rotate(18deg) scaleY(1.15); opacity: 1; }
        }
      `}</style>
    </svg>
  )
}

// ───────────────────────────────────────────────
// 17. NEURON FIRING — synaptic pulse along axon. Agent thinking.
// ───────────────────────────────────────────────
export function NeuronSpinner({ size = 64 }) {
  const dendrites = [
    'M 20 20 Q 35 35 50 50',
    'M 100 25 Q 80 40 55 52',
    'M 15 60 Q 32 58 50 55',
    'M 105 65 Q 88 60 58 56',
    'M 25 100 Q 38 80 52 58',
    'M 95 100 Q 82 78 58 58',
  ]
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="neuron-g" cx="50%" cy="50%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.9" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <g>
        {dendrites.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={ACCENT} strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round" />
            <circle className="neuron-pulse" r="2" fill={ACCENT}
              style={{
                animationDelay: `${-i * 0.2}s`,
                offsetPath: `path('${d}')`,
                offsetDistance: '0%',
              }} />
          </g>
        ))}
        <circle cx="54" cy="54" r="10" fill="url(#neuron-g)" />
        <circle cx="54" cy="54" r="6" fill="none" stroke={ACCENT} strokeWidth="1.2" />
        <circle cx="54" cy="54" r="3" fill={ACCENT} className="neuron-soma" />
        <path d="M 60 58 Q 80 70 100 100" fill="none" stroke={ACCENT} strokeWidth="1.2" strokeOpacity="0.7" />
        <circle className="neuron-axon-pulse" r="2.5" fill={AMBER} />
      </g>
      <style>{`
        .neuron-pulse { animation: neuronP 2.4s ease-in-out infinite; }
        @keyframes neuronP {
          0%   { offset-distance: 0%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { offset-distance: 100%; opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        .neuron-soma { transform-box: fill-box; transform-origin: center; animation: soma 2.4s ease-in-out infinite; }
        @keyframes soma {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.6); }
        }
        .neuron-axon-pulse {
          offset-path: path('M 60 58 Q 80 70 100 100');
          animation: axon 1.8s ease-in infinite;
        }
        @keyframes axon {
          0%   { offset-distance: 0%; opacity: 0; }
          20%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
      `}</style>
    </svg>
  )
}

// ───────────────────────────────────────────────
// 18. FLOCK — starling murmuration. Tool orchestration.
// ───────────────────────────────────────────────
export function FlockSpinner({ size = 64 }) {
  const birds = Array.from({ length: 14 })
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: 'block' }}>
      <g>
        <ellipse cx="60" cy="60" rx="40" ry="28" fill="none" stroke={ACCENT_DIM} strokeWidth="0.5" strokeOpacity="0.3" />
        {birds.map((_, i) => {
          const delay = -(i / birds.length) * 3
          const r = 28 + (i % 3) * 6
          return (
            <g key={i} className="flock-b"
              style={{ animationDelay: `${delay}s`, '--r': `${r}px` }}>
              <path d="M -2 0 L 0 -1 L 2 0 L 0 1 Z" fill={ACCENT} opacity="0.85" />
            </g>
          )
        })}
      </g>
      <style>{`
        .flock-b {
          transform-origin: 60px 60px;
          animation: flock 3.2s linear infinite;
        }
        @keyframes flock {
          0%   { transform: rotate(0deg) translateX(var(--r)) rotate(0deg); }
          50%  { transform: rotate(180deg) translateX(calc(var(--r) * 0.6)) rotate(-180deg); }
          100% { transform: rotate(360deg) translateX(var(--r)) rotate(-360deg); }
        }
      `}</style>
    </svg>
  )
}

// ───────────────────────────────────────────────
// 19. PROTEIN FOLDING — bead assembly chain. Generation.
// ───────────────────────────────────────────────
export function ProteinSpinner({ size = 64 }) {
  const beads = Array.from({ length: 16 })
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="protein-g" x1="0" x2="1">
          <stop offset="0" stopColor={ACCENT} />
          <stop offset="1" stopColor={AMBER} />
        </linearGradient>
      </defs>
      <g className="protein-rot">
        <path className="protein-chain"
          d="M 30 60 Q 40 40 50 60 T 70 60 T 90 60"
          fill="none" stroke="url(#protein-g)" strokeWidth="2" strokeLinecap="round" />
        {beads.map((_, i) => {
          const offset = i / (beads.length - 1)
          return (
            <circle key={i} className="protein-bead" r="2.5"
              fill={i % 2 ? AMBER : ACCENT}
              style={{
                offsetPath: "path('M 10 60 Q 25 30 40 60 T 70 60 T 100 60 Q 115 80 110 60')",
                offsetDistance: `${offset * 100}%`,
                animationDelay: `${-offset * 3}s`,
              }} />
          )
        })}
      </g>
      <style>{`
        .protein-rot { animation: proteinRot 8s linear infinite; transform-origin: 60px 60px; }
        @keyframes proteinRot { to { transform: rotate(360deg); } }
        .protein-chain { stroke-dasharray: 6 3; animation: proteinDash 1.6s linear infinite; }
        @keyframes proteinDash { to { stroke-dashoffset: -18; } }
        .protein-bead { animation: proteinBob 2.4s ease-in-out infinite; }
        @keyframes proteinBob {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.4); }
        }
      `}</style>
    </svg>
  )
}

// ───────────────────────────────────────────────
// 20. BLOOM — opening petals. Success transition.
// ───────────────────────────────────────────────
export function BloomSpinner({ size = 64 }) {
  const petals = 6
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: 'block' }}>
      <g>
        {Array.from({ length: petals }).map((_, i) => {
          const angle = (i / petals) * 360
          const delay = -i * 0.12
          return (
            <g key={i} style={{ transform: `rotate(${angle}deg)`, transformOrigin: '60px 60px' }}>
              <path className="bloom-petal"
                d="M 60 60 Q 52 40 60 20 Q 68 40 60 60 Z"
                fill={ACCENT} fillOpacity="0.5" stroke={ACCENT} strokeWidth="0.8"
                style={{ animationDelay: `${delay}s` }} />
            </g>
          )
        })}
        <circle cx="60" cy="60" r="5" fill={AMBER} />
        <circle className="bloom-center" cx="60" cy="60" r="5" fill="none" stroke={AMBER} strokeWidth="1" />
      </g>
      <style>{`
        .bloom-petal { transform-origin: 60px 60px; animation: bloom 3s ease-in-out infinite; }
        @keyframes bloom {
          0%,100% { transform: scale(0.3) rotate(0deg); opacity: 0.3; }
          50%     { transform: scale(1) rotate(15deg); opacity: 0.9; }
        }
        .bloom-center { transform-box: fill-box; transform-origin: center; animation: bloomC 3s ease-out infinite; }
        @keyframes bloomC {
          0%,100% { transform: scale(1); opacity: 0.8; }
          50%     { transform: scale(3); opacity: 0; }
        }
      `}</style>
    </svg>
  )
}

// ───────────────────────────────────────────────
// 21. SLIME MOLD — Physarum pathfinding network. RAG retrieval.
// ───────────────────────────────────────────────
export function SlimeMoldSpinner({ size = 64 }) {
  const nodes = [
    { x: 20, y: 20, id: 0 },
    { x: 100, y: 30, id: 1 },
    { x: 90, y: 95, id: 2 },
    { x: 25, y: 95, id: 3 },
    { x: 60, y: 60, id: 4 },
    { x: 60, y: 20, id: 5 },
    { x: 100, y: 65, id: 6 },
  ]
  const edges = [
    [0, 5], [5, 1], [1, 6], [6, 2], [2, 4], [4, 3], [3, 0], [0, 4], [4, 1], [4, 6],
  ]
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: 'block' }}>
      <g>
        {edges.map(([a, b], i) => (
          <line key={i} className="slime-edge"
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
            stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round"
            style={{ animationDelay: `${-i * 0.25}s` }} />
        ))}
        {nodes.map(n => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r="3" fill={ACCENT} />
            <circle className="slime-node-pulse" cx={n.x} cy={n.y} r="3"
              fill="none" stroke={ACCENT}
              style={{ animationDelay: `${-n.id * 0.3}s` }} />
          </g>
        ))}
      </g>
      <style>{`
        .slime-edge { stroke-dasharray: 80; animation: slimeFlow 2.8s ease-in-out infinite; }
        @keyframes slimeFlow {
          0%   { stroke-dashoffset: 80; opacity: 0.15; }
          50%  { stroke-dashoffset: 0; opacity: 0.9; }
          100% { stroke-dashoffset: -80; opacity: 0.15; }
        }
        .slime-node-pulse { transform-box: fill-box; transform-origin: center; animation: slimeNode 2s ease-out infinite; }
        @keyframes slimeNode {
          0%   { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>
    </svg>
  )
}

// ───────────────────────────────────────────────
// 22. OCTOPUS ARMS — coordinated tentacles. Multi-tool parallel.
// ───────────────────────────────────────────────
export function OctopusSpinner({ size = 64 }) {
  const arms = 8
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="octo-body" cx="50%" cy="50%">
          <stop offset="0%" stopColor={MAGENTA} stopOpacity="0.9" />
          <stop offset="100%" stopColor={MAGENTA} stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <g>
        {Array.from({ length: arms }).map((_, i) => {
          const angle = (i / arms) * 360
          const delay = -(i / arms) * 2
          return (
            <g key={i} style={{ transform: `rotate(${angle}deg)`, transformOrigin: '60px 60px' }}>
              <path className="octo-arm"
                d="M 60 60 Q 70 70 68 85 Q 66 98 72 108"
                fill="none" stroke={MAGENTA} strokeWidth="1.8" strokeLinecap="round"
                style={{ animationDelay: `${delay}s` }} />
            </g>
          )
        })}
        <circle cx="60" cy="60" r="14" fill="url(#octo-body)" />
        <circle cx="60" cy="60" r="14" fill="none" stroke={MAGENTA} strokeWidth="1" strokeOpacity="0.8" />
        <circle cx="56" cy="57" r="1.5" fill="white" opacity="0.9" />
        <circle cx="64" cy="57" r="1.5" fill="white" opacity="0.9" />
      </g>
      <style>{`
        .octo-arm { transform-origin: 60px 60px; animation: octoArm 2.2s ease-in-out infinite; }
        @keyframes octoArm {
          0%,100% { d: path("M 60 60 Q 70 70 68 85 Q 66 98 72 108"); }
          50%     { d: path("M 60 60 Q 72 68 74 82 Q 76 96 68 106"); }
        }
      `}</style>
    </svg>
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
  JellyfishSpinner,
  MyceliumSpinner,
  AmoebaSpinner,
  CiliaSpinner,
  NeuronSpinner,
  FlockSpinner,
  ProteinSpinner,
  BloomSpinner,
  SlimeMoldSpinner,
  OctopusSpinner,
}
