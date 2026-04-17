import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createAgent, createTool, deleteAgent, deleteTool,
  getAgent, listAgents, listTools, testTool, updateAgent, updateTool,
} from '../api/agents'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIST_MIN = 160
const LIST_MAX = 380
const LIST_DEFAULT = 240

const COLOR_SWATCHES = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#f97316',
  '#14b8a6', '#3b82f6', '#a855f7', '#84cc16',
]

const TOOL_TEMPLATE = `def run(input: dict) -> str:
    """
    Called by the agent when it uses this tool.
    'input' is a dict the LLM passes based on your description.
    Return a plain string — the agent sees this as the tool result.
    """
    value = input.get("query", "")
    # TODO: implement your logic here
    return f"Result for: {value}"
`

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function AgentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
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

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
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

// ---------------------------------------------------------------------------
// Blank forms
// ---------------------------------------------------------------------------

function blankAgentForm() {
  return { id: '', name: '', description: '', color: '#6366f1', system_prompt: '', tools: [], handoffs: [] }
}

function blankToolForm() {
  return { id: '', name: '', description: '', code: TOOL_TEMPLATE }
}

// ---------------------------------------------------------------------------
// HandoffRow
// ---------------------------------------------------------------------------

function HandoffRow({ handoff, agents, onChange, onRemove }) {
  return (
    <div className="agent-handoff-row">
      <input className="agent-field__input" placeholder="Button label"
        value={handoff.label} onChange={e => onChange({ ...handoff, label: e.target.value })} />
      <select className="agent-field__select" value={handoff.agent_id}
        onChange={e => onChange({ ...handoff, agent_id: e.target.value })}>
        <option value="">— target agent —</option>
        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <input className="agent-field__input" placeholder="Prompt (optional)"
        value={handoff.prompt} onChange={e => onChange({ ...handoff, prompt: e.target.value })} />
      <button className="kb-icon-btn kb-icon-btn--danger" onClick={onRemove} title="Remove">
        <TrashIcon />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AgentsTab
// ---------------------------------------------------------------------------

function AgentsTab({ tools }) {
  const [agents, setAgents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [listWidth, setListWidth] = useState(() => {
    const s = localStorage.getItem('apex_agents_list_width')
    return s ? parseInt(s, 10) : LIST_DEFAULT
  })
  const isDraggingPane = useRef(false)
  const startPaneX = useRef(0)
  const startPaneWidth = useRef(listWidth)

  const loadAgents = useCallback(async () => {
    try { setAgents(await listAgents()) } catch (err) { setError(err.message) }
  }, [])

  useEffect(() => { loadAgents() }, [loadAgents])

  function onPaneResizeDown(e) {
    e.preventDefault()
    isDraggingPane.current = true
    startPaneX.current = e.clientX
    startPaneWidth.current = listWidth
    const onMove = e => {
      if (!isDraggingPane.current) return
      const newW = Math.min(LIST_MAX, Math.max(LIST_MIN, startPaneWidth.current + e.clientX - startPaneX.current))
      setListWidth(newW)
      localStorage.setItem('apex_agents_list_width', String(newW))
    }
    const onUp = () => {
      isDraggingPane.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  async function handleSelect(id) {
    setError(null); setIsNew(false); setSelectedId(id)
    try {
      const d = await getAgent(id)
      setForm({ id: d.id, name: d.name, description: d.description, color: d.color,
        system_prompt: d.system_prompt, tools: d.tools, handoffs: d.handoffs, is_builtin: d.is_builtin })
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

  function addHandoff() {
    setForm(f => ({ ...f, handoffs: [...f.handoffs, { label: '', agent_id: '', prompt: '' }] }))
  }

  function updateHandoff(i, val) {
    setForm(f => { const hs = [...f.handoffs]; hs[i] = val; return { ...f, handoffs: hs } })
  }

  function removeHandoff(i) {
    setForm(f => ({ ...f, handoffs: f.handoffs.filter((_, idx) => idx !== i) }))
  }

  async function handleSave(e) {
    e.preventDefault(); setError(null); setSaving(true)
    try {
      if (isNew) {
        await createAgent({ id: form.id, name: form.name, description: form.description,
          color: form.color, system_prompt: form.system_prompt, tools: form.tools, handoffs: form.handoffs })
        setIsNew(false); setSelectedId(form.id)
      } else {
        await updateAgent(selectedId, { name: form.name, description: form.description,
          color: form.color, system_prompt: form.system_prompt, tools: form.tools, handoffs: form.handoffs })
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
    <div className="agents-split">
      {/* Left pane */}
      <aside className="agents-list" style={{ width: listWidth }}>
        <div className="agents-list__header">
          <span className="agents-list__title">Agents</span>
          <button className="kb-icon-btn" onClick={handleNew} title="New agent"><PlusIcon /></button>
        </div>
        <div className="agents-list__items">
          {agents.length === 0 && <p className="kb-hint">No agents yet.</p>}
          {agents.map(a => (
            <div key={a.id}
              className={`agents-list__item${selectedId === a.id && !isNew ? ' agents-list__item--active' : ''}`}
              onClick={() => handleSelect(a.id)}>
              <span className="agents-list__dot" style={{ background: a.color }} />
              <div className="agents-list__info">
                <span className="agents-list__name">{a.name}</span>
                <span className="agents-list__desc">{a.description}</span>
              </div>
              {a.is_builtin && <span className="agents-list__lock" title="Built-in"><LockIcon /></span>}
            </div>
          ))}
        </div>
        <div className="agents-list__resize-handle" onMouseDown={onPaneResizeDown} />
      </aside>

      {/* Right pane — editor */}
      <main className="agents-editor">
        {!form ? (
          <div className="kb-empty">
            <p>Select an agent to configure, or <button className="agent-link-btn" onClick={handleNew}>create a new one</button>.</p>
          </div>
        ) : (
          <form className="agent-form" onSubmit={handleSave}>
            <div className="agent-form__header">
              <div className="agents-list__dot agents-list__dot--lg" style={{ background: form.color }} />
              <h2 className="agent-form__title">{isNew ? 'New Agent' : form.name}</h2>
              {form.is_builtin && <span className="agent-builtin-badge">built-in</span>}
            </div>

            {error && <p className="agent-form__error">{error}</p>}

            {isNew && (
              <div className="agent-field">
                <label className="agent-field__label">ID <span className="agent-field__hint">(slug, e.g. my-agent)</span></label>
                <input className="agent-field__input" value={form.id}
                  onChange={e => setField('id', e.target.value.replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="my-agent" required pattern="[a-z0-9_\-]+" />
              </div>
            )}

            <div className="agent-field">
              <label className="agent-field__label">Name</label>
              <input className="agent-field__input" value={form.name}
                onChange={e => setField('name', e.target.value)} required />
            </div>

            <div className="agent-field">
              <label className="agent-field__label">Description</label>
              <input className="agent-field__input" value={form.description}
                onChange={e => setField('description', e.target.value)} placeholder="One-line purpose" />
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

            <div className="agent-field agent-field--grow">
              <label className="agent-field__label">System Prompt</label>
              <textarea className="agent-prompt-textarea" value={form.system_prompt}
                onChange={e => setField('system_prompt', e.target.value)}
                placeholder="You are a helpful agent..." rows={12} />
            </div>

            <div className="agent-field">
              <label className="agent-field__label">Tools</label>
              <div className="agent-tools">
                {tools.map(t => (
                  <label key={t.id} className="agent-tool">
                    <input type="checkbox" checked={form.tools.includes(t.id)}
                      onChange={() => toggleTool(t.id)} />
                    <span className="agent-tool__name">{t.name}</span>
                    <span className="agent-tool__desc">{t.description}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="agent-field">
              <div className="agent-field__row">
                <label className="agent-field__label">Handoffs</label>
                <button type="button" className="kb-icon-btn" onClick={addHandoff} title="Add handoff"><PlusIcon /></button>
              </div>
              {form.handoffs.length === 0 && <p className="kb-hint" style={{ padding: '4px 0' }}>No handoffs configured.</p>}
              <div className="agent-handoffs">
                {form.handoffs.map((h, i) => (
                  <HandoffRow key={i} handoff={h}
                    agents={agents.filter(a => a.id !== (isNew ? '' : selectedId))}
                    onChange={v => updateHandoff(i, v)} onRemove={() => removeHandoff(i)} />
                ))}
              </div>
            </div>

            <div className="agent-form__footer">
              <button type="submit" className="agent-btn agent-btn--primary" disabled={saving}>
                {saving ? 'Saving…' : isNew ? 'Create Agent' : 'Save Changes'}
              </button>
              {!isNew && (
                <button type="button" className="agent-btn agent-btn--danger"
                  onClick={handleDelete} disabled={deleting || form.is_builtin}
                  title={form.is_builtin ? 'Built-in agents cannot be deleted' : 'Delete agent'}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ToolsTab
// ---------------------------------------------------------------------------

function ToolsTab() {
  const [tools, setTools] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)       // null = nothing selected
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  // Test panel
  const [testInput, setTestInput] = useState('{}')
  const [testResult, setTestResult] = useState(null)   // { success, output, error }
  const [testing, setTesting] = useState(false)
  const [testInputError, setTestInputError] = useState(null)
  const [listWidth, setListWidth] = useState(() => {
    const s = localStorage.getItem('apex_tools_list_width')
    return s ? parseInt(s, 10) : LIST_DEFAULT
  })
  const isDraggingPane = useRef(false)
  const startPaneX = useRef(0)
  const startPaneWidth = useRef(listWidth)

  const loadTools = useCallback(async () => {
    try { setTools(await listTools()) } catch (err) { setError(err.message) }
  }, [])

  useEffect(() => { loadTools() }, [loadTools])

  function onPaneResizeDown(e) {
    e.preventDefault()
    isDraggingPane.current = true
    startPaneX.current = e.clientX
    startPaneWidth.current = listWidth
    const onMove = e => {
      if (!isDraggingPane.current) return
      const newW = Math.min(LIST_MAX, Math.max(LIST_MIN, startPaneWidth.current + e.clientX - startPaneX.current))
      setListWidth(newW)
      localStorage.setItem('apex_tools_list_width', String(newW))
    }
    const onUp = () => {
      isDraggingPane.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function handleSelect(tool) {
    setError(null); setIsNew(false); setSelectedId(tool.id)
    setTestResult(null); setTestInputError(null)
    setForm({ id: tool.id, name: tool.name, description: tool.description,
      code: tool.code, is_builtin: tool.is_builtin })
  }

  function handleNew() {
    setError(null); setSelectedId(null); setIsNew(true)
    setTestResult(null); setTestInputError(null)
    setForm(blankToolForm())
  }

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleTest() {
    setTestInputError(null); setTestResult(null)
    let parsed = {}
    try { parsed = JSON.parse(testInput) } catch {
      setTestInputError('Invalid JSON — fix the input and try again.')
      return
    }
    setTesting(true)
    try {
      const res = await testTool(form.code, parsed)
      setTestResult(res)
    } catch (err) {
      setTestResult({ success: false, output: '', error: err.message })
    } finally { setTesting(false) }
  }

  async function handleSave(e) {
    e.preventDefault(); setError(null); setSaving(true)
    try {
      if (isNew) {
        await createTool({ id: form.id, name: form.name, description: form.description, code: form.code })
        setIsNew(false); setSelectedId(form.id)
      } else {
        await updateTool(selectedId, { name: form.name, description: form.description, code: form.code })
      }
      await loadTools()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!selectedId || form?.is_builtin) return
    if (!confirm(`Delete tool "${form.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteTool(selectedId); setSelectedId(null); setForm(null); await loadTools()
    } catch (err) { setError(err.message) } finally { setDeleting(false) }
  }

  return (
    <div className="agents-split">
      {/* Left pane */}
      <aside className="agents-list" style={{ width: listWidth }}>
        <div className="agents-list__header">
          <span className="agents-list__title">Tools</span>
          <button className="kb-icon-btn" onClick={handleNew} title="New tool"><PlusIcon /></button>
        </div>
        <div className="agents-list__items">
          {tools.length === 0 && <p className="kb-hint">No tools yet.</p>}
          {tools.map(t => (
            <div key={t.id}
              className={`agents-list__item${selectedId === t.id && !isNew ? ' agents-list__item--active' : ''}${t.is_builtin ? ' agents-list__item--builtin' : ''}`}
              onClick={() => handleSelect(t)}>
              <span className="agents-list__dot agents-list__dot--tool"
                style={{ background: t.is_builtin ? '#475569' : '#6366f1' }} />
              <div className="agents-list__info">
                <span className="agents-list__name">{t.name}</span>
                <span className="agents-list__desc">{t.description}</span>
              </div>
              {t.is_builtin && <span className="agents-list__lock" title="Built-in tool"><LockIcon /></span>}
            </div>
          ))}
        </div>
        <div className="agents-list__resize-handle" onMouseDown={onPaneResizeDown} />
      </aside>

      {/* Right pane — tool editor + playground */}
      <main className="agents-editor">
        {!form ? (
          <div className="kb-empty">
            <p>Select a tool to view it, or <button className="agent-link-btn" onClick={handleNew}>add a custom tool</button>.</p>
          </div>
        ) : form.is_builtin ? (
          /* Built-in tool — read-only info */
          <div className="tool-builtin-info">
            <div className="agent-form__header">
              <span className="agents-list__dot" style={{ background: '#475569' }} />
              <h2 className="agent-form__title">{form.name}</h2>
              <span className="agent-builtin-badge">built-in</span>
            </div>
            <p className="tool-builtin-desc">{form.description}</p>
            <p className="kb-hint" style={{ marginTop: '1rem' }}>
              Built-in tools are provided by apex-agents and cannot be edited. Enable them on any agent via the Agents tab.
            </p>
          </div>
        ) : (
          /* Custom tool editor + playground */
          <form className="agent-form" onSubmit={handleSave}>
            <div className="agent-form__header">
              <span className="agents-list__dot" style={{ background: '#6366f1' }} />
              <h2 className="agent-form__title">{isNew ? 'New Tool' : form.name}</h2>
            </div>

            {error && <p className="agent-form__error">{error}</p>}

            {isNew && (
              <div className="agent-field">
                <label className="agent-field__label">ID <span className="agent-field__hint">(slug, e.g. my-tool)</span></label>
                <input className="agent-field__input" value={form.id}
                  onChange={e => setField('id', e.target.value.replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="my-tool" required pattern="[a-z0-9_\-]+" />
              </div>
            )}

            <div className="agent-field">
              <label className="agent-field__label">Name</label>
              <input className="agent-field__input" value={form.name}
                onChange={e => setField('name', e.target.value)} required />
            </div>

            <div className="agent-field">
              <label className="agent-field__label">
                Description
                <span className="agent-field__hint"> — the agent reads this to decide when to call the tool</span>
              </label>
              <input className="agent-field__input" value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="What does this tool do and what input does it expect?" />
            </div>

            {/* Code editor */}
            <div className="agent-field agent-field--grow">
              <label className="agent-field__label">
                Tool Code
                <span className="agent-field__hint"> — Python · define <code>def run(input: dict) -&gt; str</code></span>
              </label>
              <textarea className="agent-prompt-textarea tool-code-editor" value={form.code}
                onChange={e => setField('code', e.target.value)}
                placeholder={TOOL_TEMPLATE} rows={14} spellCheck={false} />
            </div>

            {/* Test playground */}
            <div className="tool-playground">
              <div className="tool-playground__header">
                <span className="tool-playground__title">Test Playground</span>
                <span className="tool-playground__hint">Run your tool code before saving</span>
              </div>

              <div className="tool-playground__input-row">
                <div className="tool-playground__input-col">
                  <label className="agent-field__label">Input JSON</label>
                  <textarea className="agent-prompt-textarea tool-playground__json"
                    value={testInput} onChange={e => setTestInput(e.target.value)}
                    rows={4} spellCheck={false} placeholder='{"query": "hello"}' />
                  {testInputError && <p className="agent-form__error" style={{ marginTop: 4 }}>{testInputError}</p>}
                </div>
              </div>

              <button type="button" className="tool-playground__run-btn"
                onClick={handleTest} disabled={testing}>
                <PlayIcon />
                {testing ? 'Running…' : 'Run Test'}
              </button>

              {testResult && (
                <div className={`tool-playground__result${testResult.success ? ' tool-playground__result--ok' : ' tool-playground__result--err'}`}>
                  <span className="tool-playground__result-label">
                    {testResult.success ? 'Output' : 'Error'}
                  </span>
                  <pre className="tool-playground__result-pre">
                    {testResult.success ? testResult.output : testResult.error}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="agent-form__footer">
              <button type="submit" className="agent-btn agent-btn--primary" disabled={saving}>
                {saving ? 'Saving…' : isNew ? 'Save Tool' : 'Save Changes'}
              </button>
              {!isNew && (
                <button type="button" className="agent-btn agent-btn--danger"
                  onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page — tabs
// ---------------------------------------------------------------------------

export default function AgentsPage() {
  const [tab, setTab] = useState('agents')   // 'agents' | 'tools'
  const [tools, setTools] = useState([])

  // Load tools once so AgentsTab can show checkboxes immediately
  useEffect(() => {
    listTools().then(setTools).catch(() => {})
  }, [])

  return (
    <div className="agents-page">
      {/* Tab bar */}
      <div className="agents-tabs">
        <button
          className={`agents-tab${tab === 'agents' ? ' agents-tab--active' : ''}`}
          onClick={() => setTab('agents')}>
          <AgentIcon /> Agents
        </button>
        <button
          className={`agents-tab${tab === 'tools' ? ' agents-tab--active' : ''}`}
          onClick={() => setTab('tools')}>
          <ToolIcon /> Tools
        </button>
      </div>

      {/* Tab content */}
      <div className="agents-tab-content">
        {tab === 'agents' ? <AgentsTab tools={tools} /> : <ToolsTab />}
      </div>
    </div>
  )
}
