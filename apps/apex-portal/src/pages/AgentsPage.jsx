// ─────────────────────────────────────────────────────────────────────────────
// AgentsPage — nexus-style list + detail layout
// Tools have been moved to ToolsPage (/tools)
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react'
import {
  createAgent, deleteAgent,
  getAgent, listAgents, listTools, updateAgent,
} from '../api/agents'
import BgPattern from '../components/BgPattern'

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_SWATCHES = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#f97316',
  '#14b8a6', '#3b82f6', '#a855f7', '#84cc16',
]

// ── Icons ─────────────────────────────────────────────────────────────────────

function AgentIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function ToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
function HistoryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
    </svg>
  )
}
function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

// ── Graph diagram (nexus-style) ───────────────────────────────────────────────

function GraphDiagram({ tools = [] }) {
  const nodes = [
    { x: 60, y: 80, label: 'start', kind: 'io' },
    { x: 210, y: 80, label: 'decompose', kind: 'llm' },
    { x: 380, y: 30, label: tools[0] || 'kb.query', kind: 'tool' },
    { x: 380, y: 130, label: tools[1] || 'web.search', kind: 'tool' },
    { x: 540, y: 80, label: 'synthesize', kind: 'llm' },
    { x: 680, y: 80, label: 'end', kind: 'io' },
  ]
  const edges = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5]]
  const N = k => nodes[k]
  return (
    <svg viewBox="0 0 740 200" width="100%" height="160" style={{ display: 'block' }}>
      {edges.map(([a, b], i) => {
        const A = N(a), B = N(b)
        return (
          <path key={i}
            d={`M ${A.x + 54} ${A.y + 18} C ${(A.x + B.x) / 2 + 54} ${A.y + 18}, ${(A.x + B.x) / 2} ${B.y + 18}, ${B.x} ${B.y + 18}`}
            fill="none" stroke="#2a2a30" strokeWidth="1" />
        )
      })}
      {nodes.map((n, i) => (
        <g key={i}>
          <rect x={n.x} y={n.y} width="54" height="36" rx="5"
            fill="#0e0e10"
            stroke={n.kind === 'llm' ? 'oklch(0.78 0.08 70 / 0.45)' : '#2a2a30'}
            strokeWidth="1" />
          <text x={n.x + 27} y={n.y + 22} textAnchor="middle"
            fill="#6e6c64" fontSize="9" fontFamily="JetBrains Mono, monospace">
            {n.label.length > 9 ? n.label.slice(0, 9) : n.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── Stat cell ─────────────────────────────────────────────────────────────────

function AgStat({ label, value }) {
  return (
    <div className="ag-stat">
      <div className="eyebrow">{label}</div>
      <div className="ag-stat__value serif">{value}</div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function AgentsEmpty({ onNew }) {
  return (
    <div className="kb-empty-state">
      <div className="kb-empty-state__icon"><AgentIcon size={28} /></div>
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>No agents yet.</h2>
      <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: 400, textAlign: 'center' }}>
        Compose a graph of tools and prompts. Apex registers the{' '}
        <code className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>@mention</code>,
        exposes an SSE endpoint, and streams every step.
      </p>
      <button className="btn primary" style={{ marginTop: 20 }} onClick={onNew}>
        <PlusIcon /> Create agent
      </button>
    </div>
  )
}

function blankAgentForm() {
  return { id: '', name: '', description: '', color: '#6366f1', system_prompt: '', tools: [], handoffs: [] }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents, setAgents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [tools, setTools] = useState([])

  const loadAgents = useCallback(async () => {
    try {
      const list = await listAgents()
      setAgents(list)
      // Auto-select first agent if none selected and not creating new
      if (list.length > 0 && !selectedId && !isNew) {
        const first = list[0]
        setSelectedId(first.id)
        try {
          const d = await getAgent(first.id)
          setForm({ id: d.id, name: d.name, description: d.description, color: d.color,
            system_prompt: d.system_prompt, tools: d.tools, handoffs: d.handoffs, is_builtin: d.is_builtin })
        } catch { /* ignore */ }
      }
    } catch (err) { setError(err.message) }
  }, [selectedId, isNew])

  useEffect(() => { loadAgents() }, [])
  useEffect(() => { listTools().then(setTools).catch(() => {}) }, [])

  async function handleSelect(id) {
    setError(null); setIsNew(false); setSelectedId(id)
    try {
      const d = await getAgent(id)
      setForm({
        id: d.id, name: d.name, description: d.description, color: d.color,
        system_prompt: d.system_prompt, tools: d.tools, handoffs: d.handoffs,
        is_builtin: d.is_builtin,
      })
    } catch (err) { setError(err.message) }
  }

  function handleNew() {
    setError(null); setSelectedId(null); setIsNew(true); setForm(blankAgentForm())
  }

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function toggleTool(toolId) {
    setForm(f => ({
      ...f,
      tools: f.tools.includes(toolId) ? f.tools.filter(t => t !== toolId) : [...f.tools, toolId],
    }))
  }

  async function handleSave(e) {
    e.preventDefault(); setError(null); setSaving(true)
    try {
      if (isNew) {
        await createAgent({
          id: form.id, name: form.name, description: form.description,
          color: form.color, system_prompt: form.system_prompt, tools: form.tools, handoffs: form.handoffs,
        })
        setIsNew(false); setSelectedId(form.id)
      } else {
        await updateAgent(selectedId, {
          name: form.name, description: form.description, color: form.color,
          system_prompt: form.system_prompt, tools: form.tools, handoffs: form.handoffs,
        })
      }
      await loadAgents()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!selectedId || form?.is_builtin) return
    if (!confirm(`Delete agent "${form.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteAgent(selectedId); setSelectedId(null); setForm(null); await loadAgents()
    } catch (err) { setError(err.message) } finally { setDeleting(false) }
  }

  return (
    <div className="agents-page-v2">
      <BgPattern name="agents" />

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="crumbs">
          <span>Workspace</span>
          <span className="sep">/</span>
          <span>Agents</span>
          {form && !isNew && (
            <>
              <span className="sep">/</span>
              <span className="here">{form.name}</span>
            </>
          )}
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn ghost"><HistoryIcon /> Run history</button>
          <button type="button" className="btn primary" onClick={handleNew}><PlusIcon /> New agent</button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="ag-scroll">
        {/* Page head */}
        <div className="page-head">
          <div className="eyebrow">LangGraph Agent Runtime</div>
          <h1>Workflows that reason.</h1>
          <p className="lede">
            Each agent is a graph of tools, prompts, and decision nodes — composed once,
            summoned with{' '}
            <span className="mono" style={{ color: 'var(--text)', fontSize: 13 }}>@</span>,
            streamed live over SSE.
          </p>
        </div>

        {/* Two-col body */}
        <div className="ag-body">

          {/* ── Left: agent list ── */}
          <aside className="ag-aside">
            <div className="ag-aside__header">
              <div className="eyebrow">Registered · {agents.length}</div>
            </div>
            {agents.length === 0 && <p className="kb-hint">No agents yet.</p>}
            {agents.map(a => (
              <div
                key={a.id}
                className={`ag-list-item${selectedId === a.id && !isNew ? ' ag-list-item--active' : ''}`}
                onClick={() => handleSelect(a.id)}
              >
                {selectedId === a.id && !isNew && <div className="ag-list-item__accent" />}
                <div className="ag-list-item__top">
                  <AgentIcon size={13} />
                  <span className="ag-list-item__name">@{a.id}</span>
                  {a.is_builtin && (
                    <span className="agents-list__lock" style={{ marginLeft: 'auto' }} title="Built-in">
                      <LockIcon />
                    </span>
                  )}
                </div>
                <div className="ag-list-item__desc">{a.description}</div>
                <div className="ag-list-item__meta mono">— RUNS</div>
              </div>
            ))}
          </aside>

          {/* ── Right: detail / edit form ── */}
          <section className="ag-main">
            {!form ? (
              <AgentsEmpty onNew={handleNew} />
            ) : (
              <form className="ag-detail" onSubmit={handleSave}>

                {/* Header row */}
                <div className="ag-detail__header">
                  <div className="ag-detail__avatar" style={{
                    background: (form.color || '#6366f1') + '22',
                    borderColor: (form.color || '#6366f1') + '55',
                  }}>
                    <AgentIcon size={20} />
                  </div>
                  <div className="ag-detail__name-block">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h2 className="serif ag-detail__name">
                        {isNew ? 'New Agent' : `@${form.name}`}
                      </h2>
                      {!isNew && <span className="tag ok dot">Active</span>}
                      {form.is_builtin && <span className="agent-builtin-badge">built-in</span>}
                    </div>
                    {!isNew && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        {form.description || 'No description'}
                      </div>
                    )}
                  </div>
                  {!isNew && (
                    <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
                      {!form.is_builtin && (
                        <button type="button" className="btn ghost icon"
                          onClick={handleDelete} disabled={deleting} title="Delete agent">
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {error && <p className="agent-form__error">{error}</p>}

                {/* Stats strip */}
                {!isNew && (
                  <div className="ag-stats">
                    <AgStat label="Total runs" value="—" />
                    <AgStat label="Success rate" value="—" />
                    <AgStat label="Avg duration" value="—" />
                    <AgStat label="Avg tokens" value="—" />
                  </div>
                )}


                {/* New-agent fields */}
                {isNew && (
                  <div className="ag-new-fields">
                    <div className="agent-field">
                      <label className="agent-field__label">ID <span className="agent-field__hint">(slug)</span></label>
                      <input className="agent-field__input" value={form.id}
                        onChange={e => setField('id', e.target.value.replace(/[^a-z0-9_-]/g, ''))}
                        placeholder="my-agent" required pattern="[a-z0-9_\-]+" />
                    </div>
                    <div className="agent-field">
                      <label className="agent-field__label">Name</label>
                      <input className="agent-field__input" value={form.name}
                        onChange={e => setField('name', e.target.value)} required />
                    </div>
                    <div className="agent-field">
                      <label className="agent-field__label">Description</label>
                      <input className="agent-field__input" value={form.description}
                        onChange={e => setField('description', e.target.value)}
                        placeholder="One-line purpose" />
                    </div>
                    <div className="agent-field">
                      <label className="agent-field__label">Color</label>
                      <div className="agent-swatches">
                        {COLOR_SWATCHES.map(c => (
                          <button key={c} type="button"
                            className={`agent-swatch${form.color === c ? ' agent-swatch--active' : ''}`}
                            style={{ background: c }} onClick={() => setField('color', c)} title={c} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* System prompt + Tools side by side */}
                <div className="ag-cards">
                  <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
                    <div className="eyebrow" style={{ marginBottom: 14 }}>System Prompt</div>
                    <textarea
                      className="agent-prompt-textarea"
                      value={form.system_prompt}
                      onChange={e => setField('system_prompt', e.target.value)}
                      disabled={form.is_builtin}
                      placeholder="You are a helpful agent..."
                      style={{ flex: 1, minHeight: 200 }}
                    />
                    {!isNew && (
                      <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 14, display: 'flex', gap: 14 }}>
                        <span>MODEL · GEMMA4:E2B</span>
                        <span>TEMP · 0.4</span>
                        <span>MAX · 2,048</span>
                      </div>
                    )}
                  </div>

                  <div className="card" style={{ padding: 22 }}>
                    <div className="eyebrow" style={{ marginBottom: 14 }}>
                      Tools · {tools.filter(t => form.tools.includes(t.id)).length}
                    </div>
                    {tools.length === 0 && <p className="kb-hint">No tools registered.</p>}
                    {tools.map((t, i) => {
                      const checked = form.tools.includes(t.id)
                      return (
                        <label key={t.id} className={`agent-tool${checked ? ' agent-tool--checked' : ''}`} style={{
                          display: 'flex', gap: 10, alignItems: 'flex-start',
                          paddingTop: i > 0 ? 10 : 0,
                          borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                          marginTop: i > 0 ? 10 : 0,
                        }}>
                          <input type="checkbox" style={{ marginTop: 2, flexShrink: 0 }}
                            checked={checked}
                            onChange={() => !form.is_builtin && toggleTool(t.id)}
                            disabled={form.is_builtin} />
                          <div>
                            <div className={`agent-tool__name${checked ? ' agent-tool__name--checked' : ''}`}>{t.name}</div>
                            <div className="agent-tool__desc">{t.description}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Save footer */}
                {!form.is_builtin && (
                  <div className="agent-form__footer">
                    <button type="submit" className="agent-btn agent-btn--primary" disabled={saving}>
                      {saving ? 'Saving…' : isNew ? 'Create Agent' : 'Save Changes'}
                    </button>
                    {!isNew && (
                      <button type="button" className="agent-btn agent-btn--danger"
                        onClick={handleDelete} disabled={deleting}>
                        {deleting ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </div>
                )}
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
