import { useCallback, useEffect, useRef, useState } from 'react'
import { createTool, deleteTool, listTools, testTool, updateTool } from '../api/agents'
import BgPattern from '../components/BgPattern'

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

// ── Icons ─────────────────────────────────────────────────────────────────────

function ToolIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
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
function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
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
function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function ToolsEmpty({ onNew }) {
  return (
    <div className="kb-empty-state">
      <div className="kb-empty-state__icon"><ToolIcon size={28} /></div>
      <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>No custom tools yet.</h2>
      <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: 420, textAlign: 'center' }}>
        Write a Python <code className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>run(input)</code> function.
        Apex sandboxes it, registers it, and lets any agent call it by name.
      </p>
      <button className="btn primary" style={{ marginTop: 20 }} onClick={onNew}>
        <PlusIcon /> Create tool
      </button>
    </div>
  )
}

// ── Tool type badge ───────────────────────────────────────────────────────────

function toolCategory(tool) {
  if (tool.is_builtin) return 'Built-in'
  return 'Custom'
}

function blankToolForm() {
  return { id: '', name: '', description: '', code: TOOL_TEMPLATE }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [tools, setTools] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [testInput, setTestInput] = useState('{"query": "hello world"}')
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [testInputError, setTestInputError] = useState(null)

  const loadTools = useCallback(async () => {
    try {
      const list = await listTools()
      setTools(list)
      // Auto-select first tool if none selected
      if (list.length > 0 && !selectedId && !isNew) {
        const first = list[0]
        setSelectedId(first.id)
        setForm({ id: first.id, name: first.name, description: first.description,
          code: first.code, is_builtin: first.is_builtin })
      }
    } catch (err) { setError(err.message) }
  }, [selectedId, isNew])

  useEffect(() => { loadTools() }, [])

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

  const customCount = tools.filter(t => !t.is_builtin).length
  const builtinCount = tools.filter(t => t.is_builtin).length

  return (
    <div className="agents-page-v2">
      <BgPattern name="agents" />

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="crumbs">
          <span>Workspace</span>
          <span className="sep">/</span>
          <span>Tools</span>
          {form && !isNew && (
            <>
              <span className="sep">/</span>
              <span className="here">{form.name}</span>
            </>
          )}
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn primary" onClick={handleNew}><PlusIcon /> New tool</button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="ag-scroll">
        {/* Page head */}
        <div className="page-head">
          <div className="eyebrow">Custom Tool Runtime</div>
          <h1>Extend agent capabilities.</h1>
          <p className="lede">
            Write a Python <span className="mono" style={{ color: 'var(--text)', fontSize: 13 }}>run(input)</span> function.
            Apex sandboxes it, registers it as a callable tool, and lets any agent invoke it — with live playground testing.
          </p>
        </div>

        {/* Two-col body */}
        <div className="ag-body">

          {/* ── Left: tool list ── */}
          <aside className="ag-aside">
            <div className="ag-aside__header">
              <div className="eyebrow">Registered · {tools.length}</div>
            </div>

            {/* Built-in tools */}
            {builtinCount > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8, paddingLeft: 4, color: 'var(--text-faint)' }}>
                  Built-in · {builtinCount}
                </div>
                {tools.filter(t => t.is_builtin).map(t => (
                  <div key={t.id}
                    className={`ag-list-item${selectedId === t.id && !isNew ? ' ag-list-item--active' : ''}`}
                    onClick={() => handleSelect(t)}
                    style={{ opacity: 0.75 }}
                  >
                    {selectedId === t.id && !isNew && <div className="ag-list-item__accent" />}
                    <div className="ag-list-item__top">
                      <ToolIcon size={12} />
                      <span className="ag-list-item__name">{t.name}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}><LockIcon /></span>
                    </div>
                    <div className="ag-list-item__desc">{t.description}</div>
                    <div className="ag-list-item__meta mono">BUILT-IN</div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom tools */}
            <div>
              {customCount > 0 && builtinCount > 0 && (
                <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8, paddingLeft: 4, color: 'var(--text-faint)' }}>
                  Custom · {customCount}
                </div>
              )}
              {tools.filter(t => !t.is_builtin).length === 0 && (
                <p className="kb-hint" style={{ paddingLeft: 4 }}>No custom tools yet.</p>
              )}
              {tools.filter(t => !t.is_builtin).map(t => (
                <div key={t.id}
                  className={`ag-list-item${selectedId === t.id && !isNew ? ' ag-list-item--active' : ''}`}
                  onClick={() => handleSelect(t)}
                >
                  {selectedId === t.id && !isNew && <div className="ag-list-item__accent" />}
                  <div className="ag-list-item__top">
                    <ToolIcon size={12} />
                    <span className="ag-list-item__name">{t.name}</span>
                    <span className="tag" style={{ marginLeft: 'auto', padding: '1px 5px', fontSize: 9 }}>Custom</span>
                  </div>
                  <div className="ag-list-item__desc">{t.description}</div>
                  <div className="ag-list-item__meta mono">— CALLS</div>
                </div>
              ))}
            </div>
          </aside>

          {/* ── Right: tool detail / editor ── */}
          <section className="ag-main">
            {!form ? (
              <ToolsEmpty onNew={handleNew} />
            ) : form.is_builtin ? (
              <BuiltinToolView tool={form} />
            ) : (
              <form className="ag-detail" onSubmit={handleSave}>
                {/* Header */}
                <div className="ag-detail__header">
                  <div className="ag-detail__avatar" style={{
                    background: 'oklch(0.78 0.08 70 / 0.12)',
                    borderColor: 'oklch(0.78 0.08 70 / 0.3)',
                  }}>
                    <ToolIcon size={20} />
                  </div>
                  <div className="ag-detail__name-block">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h2 className="serif ag-detail__name">
                        {isNew ? 'New Tool' : form.name}
                      </h2>
                      {!isNew && <span className="tag ok dot">Active</span>}
                    </div>
                    {!isNew && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        {form.description || 'No description'}
                      </div>
                    )}
                  </div>
                  {!isNew && (
                    <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
                      <button type="button" className="btn ghost icon"
                        onClick={handleDelete} disabled={deleting} title="Delete tool">
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                </div>

                {error && <p className="agent-form__error">{error}</p>}

                {/* New-tool fields */}
                {isNew && (
                  <div className="ag-new-fields">
                    <div className="agent-field">
                      <label className="agent-field__label">ID <span className="agent-field__hint">(slug)</span></label>
                      <input className="agent-field__input" value={form.id}
                        onChange={e => setField('id', e.target.value.replace(/[^a-z0-9_-]/g, ''))}
                        placeholder="my-tool" required pattern="[a-z0-9_\-]+" />
                    </div>
                    <div className="agent-field">
                      <label className="agent-field__label">Name</label>
                      <input className="agent-field__input" value={form.name}
                        onChange={e => setField('name', e.target.value)} required />
                    </div>
                  </div>
                )}

                {/* Description */}
                {!isNew && (
                  <div className="agent-field" style={{ margin: '24px 0 0' }}>
                    <label className="agent-field__label">Description
                      <span className="agent-field__hint"> — the agent reads this to decide when to call the tool</span>
                    </label>
                    <input className="agent-field__input" value={form.description}
                      onChange={e => setField('description', e.target.value)}
                      placeholder="What does this tool do and what input does it expect?" />
                  </div>
                )}
                {isNew && (
                  <div className="agent-field">
                    <label className="agent-field__label">Description
                      <span className="agent-field__hint"> — the agent reads this to decide when to call the tool</span>
                    </label>
                    <input className="agent-field__input" value={form.description}
                      onChange={e => setField('description', e.target.value)}
                      placeholder="What does this tool do and what input does it expect?" />
                  </div>
                )}

                {/* Code + Playground side by side */}
                <div className="ag-cards" style={{ marginTop: 24 }}>
                  {/* Code editor */}
                  <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
                    <div className="eyebrow" style={{ marginBottom: 14 }}>Tool Code</div>
                    <textarea className="agent-prompt-textarea tool-code-editor" value={form.code}
                      onChange={e => setField('code', e.target.value)}
                      placeholder={TOOL_TEMPLATE} rows={16} spellCheck={false}
                      style={{ flex: 1, minHeight: 260 }} />
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 14, display: 'flex', gap: 14 }}>
                      <span>PYTHON · SANDBOXED</span>
                      <span>TIMEOUT · 30s</span>
                    </div>
                  </div>

                  {/* Playground */}
                  <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="eyebrow" style={{ marginBottom: 0 }}>Test Playground</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      Run your tool code live before saving.
                    </div>

                    <div className="agent-field">
                      <label className="agent-field__label" style={{ fontSize: 11 }}>Input JSON</label>
                      <textarea className="agent-prompt-textarea tool-playground__json"
                        value={testInput} onChange={e => setTestInput(e.target.value)}
                        rows={5} spellCheck={false} placeholder='{"query": "hello"}' />
                      {testInputError && <p className="agent-form__error" style={{ marginTop: 4, fontSize: 11 }}>{testInputError}</p>}
                    </div>

                    <button type="button"
                      className="btn accent-btn"
                      onClick={handleTest} disabled={testing}
                      style={{ alignSelf: 'flex-start' }}>
                      <PlayIcon />
                      {testing ? 'Running…' : 'Run Test'}
                    </button>

                    {testResult && (
                      <div className={`tool-playground__result${testResult.success ? ' tool-playground__result--ok' : ' tool-playground__result--err'}`}>
                        <div className="tool-playground__result-label">
                          {testResult.success ? '✓ Output' : '✗ Error'}
                        </div>
                        <pre className="tool-playground__result-pre">
                          {testResult.success ? testResult.output : testResult.error}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save footer */}
                <div className="agent-form__footer" style={{ marginTop: 8 }}>
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
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Built-in tool read-only view ───────────────────────────────────────────────

function BuiltinToolView({ tool }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="ag-detail__header">
        <div className="ag-detail__avatar" style={{
          background: 'var(--bg-raised)',
          borderColor: 'var(--border-strong)',
        }}>
          <ToolIcon size={20} />
        </div>
        <div className="ag-detail__name-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h2 className="serif ag-detail__name">{tool.name}</h2>
            <span className="agent-builtin-badge">built-in</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{tool.description}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>About this tool</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
          Built-in tools are provided by apex-agents and run natively inside the agent runtime.
          They cannot be edited here. To enable this tool for an agent, open the agent&apos;s detail
          panel on the <strong>Agents</strong> page and check it in the Tools list.
        </p>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 16, display: 'flex', gap: 14 }}>
          <span>RUNTIME · APEX-AGENTS</span>
          <span>PORT · 8003</span>
        </div>
      </div>
    </div>
  )
}
