import { useEffect, useState } from 'react'
import BgPattern from '../components/BgPattern'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Row({ label, hint, children }) {
  return (
    <div className="settings-row">
      <div>
        <div style={{ fontSize: 13.5 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Toggle({ defaultOn = false }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      className={`settings-toggle${on ? ' settings-toggle--on' : ''}`}
      onClick={() => setOn(v => !v)}
      aria-pressed={on}
      type="button"
    />
  )
}

// ---------------------------------------------------------------------------
// Services panel — pings real health endpoints
// ---------------------------------------------------------------------------

const SERVICE_DEFS = [
  { name: 'apex-rag',      port: 8000, lang: 'Python 3.11', url: 'http://localhost:8000/health', desc: 'Ingestion, chunking, embedding, hybrid search' },
  { name: 'apex-identity', port: 8001, lang: 'Python 3.11', url: 'http://localhost:8001/health', desc: 'JWT auth, user management, sessions' },
  { name: 'apex-gateway',  port: 8002, lang: 'Python 3.11', url: 'http://localhost:8002/health', desc: 'Thin Ollama LLM wrapper — streaming' },
  { name: 'apex-agents',   port: 8003, lang: 'Python 3.11', url: 'http://localhost:8003/health', desc: 'LangGraph runtime, SSE streaming' },
  { name: 'apex-portal',   port: 5173, lang: 'React 18 / Vite', url: null, desc: 'Chat UI, sessions, knowledge base, agents' },
]

function ServicesPanel() {
  const [statuses, setStatuses] = useState({})

  useEffect(() => {
    SERVICE_DEFS.forEach(svc => {
      if (!svc.url) {
        setStatuses(s => ({ ...s, [svc.name]: 'ok' }))
        return
      }
      fetch(svc.url, { method: 'GET' })
        .then(r => setStatuses(s => ({ ...s, [svc.name]: r.ok ? 'ok' : 'warn' })))
        .catch(() => setStatuses(s => ({ ...s, [svc.name]: 'error' })))
    })
  }, [])

  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, margin: '0 0 4px', letterSpacing: '-0.015em' }}>Services</h2>
      <p style={{ color: 'var(--fg-2)', margin: '0 0 24px', fontSize: 13.5 }}>Five independently deployable microservices. All Python services use FastAPI + uvicorn.</p>
      <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {SERVICE_DEFS.map((svc, i) => {
          const status = statuses[svc.name]
          return (
            <div key={svc.name} style={{
              display: 'grid',
              gridTemplateColumns: '12px 1fr 80px 1fr 80px',
              gap: 20,
              alignItems: 'center',
              padding: '16px 22px',
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: status === 'ok' ? 'var(--ok)' : status === 'warn' ? 'var(--warn)' : status === 'error' ? 'var(--error)' : 'var(--fg-3)',
              }} />
              <div>
                <div className="mono" style={{ fontSize: 13 }}>{svc.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 3 }}>{svc.desc}</div>
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>:{svc.port}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{svc.lang}</div>
              <div>
                {status === 'ok' && <span className="tag" style={{ color: 'var(--ok)', borderColor: 'color-mix(in srgb, var(--ok) 30%, transparent)' }}>Healthy</span>}
                {status === 'warn' && <span className="tag" style={{ color: 'var(--warn)', borderColor: 'color-mix(in srgb, var(--warn) 30%, transparent)' }}>Degraded</span>}
                {status === 'error' && <span className="tag" style={{ color: 'var(--error)', borderColor: 'color-mix(in srgb, var(--error) 30%, transparent)' }}>Down</span>}
                {!status && <span className="tag" style={{ color: 'var(--fg-3)' }}>Checking…</span>}
              </div>
            </div>
          )
        })}
      </div>

      <h3 className="serif" style={{ fontSize: 18, fontWeight: 400, margin: '40px 0 14px' }}>Architecture</h3>
      <div className="card" style={{ padding: 24 }}>
        <pre className="mono" style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--fg-2)', margin: 0, whiteSpace: 'pre', overflowX: 'auto' }}>{`User
 └── apps/apex-portal           React 18 + Vite          :5173
        │
        ├── services/apex-identity   Auth · JWT · sessions          :8001
        ├── services/apex-rag        Ingest · embed · hybrid search :8000
        ├── services/apex-gateway    LLM generation (Ollama)        :8002
        └── services/apex-agents     LangGraph · SSE streaming      :8003
                 └── services/apex-gateway   (internal LLM calls)`}
        </pre>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Models panel
// ---------------------------------------------------------------------------

function ModelsPanel() {
  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, margin: '0 0 4px', letterSpacing: '-0.015em' }}>Models & Embeddings</h2>
      <p style={{ color: 'var(--fg-2)', margin: '0 0 28px', fontSize: 13.5 }}>Generation, embedding, and reranking backends. All local via Ollama.</p>

      <Row label="Generation model" hint="Used by apex-gateway and apex-agents.">
        <select className="auth-input" style={{ maxWidth: 320 }} defaultValue="gemma4:e2b">
          <option>gemma4:e2b</option>
          <option>llama3.1:8b</option>
          <option>mistral:7b</option>
        </select>
      </Row>
      <Row label="Embedding model" hint="768-dimensional vectors via nomic-embed-text.">
        <input className="auth-input" style={{ maxWidth: 320 }} defaultValue="nomic-embed-text" />
      </Row>
      <Row label="Default temperature" hint="Generation creativity. 0 = deterministic.">
        <input className="auth-input" style={{ maxWidth: 100 }} defaultValue="0.4" type="number" min="0" max="2" step="0.1" />
      </Row>
      <Row label="BM25 / Semantic balance" hint="Hybrid search weight α applied at query time.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 360 }}>
          <span className="eyebrow" style={{ fontSize: 10 }}>BM25</span>
          <input type="range" min="0" max="100" defaultValue="35" style={{ flex: 1, accentColor: 'var(--accent)' }} />
          <span className="eyebrow" style={{ fontSize: 10 }}>SEMANTIC</span>
        </div>
      </Row>
    </>
  )
}

// ---------------------------------------------------------------------------
// Appearance panel
// ---------------------------------------------------------------------------

function AppearancePanel() {
  return (
    <>
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, margin: '0 0 4px', letterSpacing: '-0.015em' }}>Appearance</h2>
      <p style={{ color: 'var(--fg-2)', margin: '0 0 28px', fontSize: 13.5 }}>Theme and density preferences.</p>

      <Row label="Theme">
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn" style={{ background: 'var(--bg-raised)', borderColor: 'var(--accent)', color: 'var(--accent)' }}>Editorial Dark</button>
          <button className="btn" disabled style={{ opacity: 0.4 }}>Light (coming)</button>
        </div>
      </Row>
      <Row label="Background patterns" hint="Subtle per-page SVG motifs at low opacity.">
        <Toggle defaultOn={true} />
      </Row>
      <Row label="Reduced motion" hint="Disables scramble animations and transitions.">
        <Toggle defaultOn={false} />
      </Row>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: 'services',    label: 'Services' },
  { id: 'models',      label: 'Models & Embeddings' },
  { id: 'appearance',  label: 'Appearance' },
]

export default function SettingsPage() {
  const [section, setSection] = useState('services')
  const active = SECTIONS.find(s => s.id === section)

  return (
    <div className="settings-page">
      <BgPattern name="settings" />

      <div className="page-head">
        <div className="eyebrow">System Configuration</div>
        <h1>Settings</h1>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 40, alignItems: 'start' }}>
          <aside>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Configure</div>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
                  padding: '9px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: section === s.id ? 'var(--bg-raised)' : 'transparent',
                  color: section === s.id ? 'var(--fg)' : 'var(--fg-2)',
                  border: 'none', fontSize: 13, fontFamily: 'var(--font)',
                  transition: 'background 120ms, color 120ms',
                }}
              >
                {s.label}
              </button>
            ))}
          </aside>

          <div>
            {section === 'services'   && <ServicesPanel />}
            {section === 'models'     && <ModelsPanel />}
            {section === 'appearance' && <AppearancePanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
