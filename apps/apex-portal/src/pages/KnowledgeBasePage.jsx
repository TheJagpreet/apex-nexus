import { useCallback, useEffect, useRef, useState } from 'react'
import { createCollection, deleteCollection, deleteFile, ingestToCollection, listCollections, listFiles } from '../api/rag'
import BgPattern from '../components/BgPattern'

// ── Icons ────────────────────────────────────────────────────────────────────

function FolderIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  )
}
function UploadIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  )
}
function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
function GridIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}
function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fileExt(name) {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop().toUpperCase().slice(0, 4) : 'FILE'
}

const STAGE_LABELS = {
  uploading: 'Uploading',
  loading: 'Uploading',
  chunking: 'Chunking',
  tagging: 'Tagging',
  embedding: 'Embedding',
  storing: 'Storing',
  done: 'Indexed',
  error: 'Error',
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function KbMetric({ label, value, sub }) {
  return (
    <div className="kb-metric">
      <div className="eyebrow" style={{ marginBottom: 10 }}>{label}</div>
      <div className="kb-metric__value serif">{value}</div>
      {sub && <div className="kb-metric__sub mono">{sub}</div>}
    </div>
  )
}

// ── Document card (grid) ───────────────────────────────────────────────────────

function DocCard({ name, chunks, status, stageText, onDelete, effortLabel }) {
  const ext = fileExt(name)
  const isIndexing = status === 'indexing'
  const isUploading = status === 'uploading'
  const isError = status === 'error'

  return (
    <div className={`kb-doc-card${isIndexing ? ' kb-doc-card--indexing' : ''}${isError ? ' kb-doc-card--error' : ''}`}>
      <div className="kb-doc-card__top">
        <div className="kb-doc-card__type mono">{ext}</div>
        {isUploading && <span className="tag accent dot pulse-dot" style={{ marginLeft: 'auto' }}>{stageText || 'Uploading'}</span>}
        {isIndexing && <span className="tag accent dot pulse-dot" style={{ marginLeft: 'auto' }}>{stageText || 'Indexing'}</span>}
        {status === 'indexed' && <span className="tag ok dot" style={{ marginLeft: 'auto' }}>Indexed</span>}
        {isError && <span className="tag" style={{ marginLeft: 'auto', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}>Error</span>}
      </div>
      <div className="kb-doc-card__name">{name}</div>
      <div className="kb-doc-card__meta mono" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>{chunks != null ? `${chunks} chunks` : '—'}</span>
        {effortLabel && <span className="tag" style={{ fontSize: 10, padding: '1px 5px', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7 }}>{effortLabel}</span>}
      </div>
      {onDelete && !isUploading && !isIndexing && (
        <button className="kb-doc-card__del" onClick={onDelete} title="Remove file">
          <TrashIcon />
        </button>
      )}
    </div>
  )
}

// ── Document row (list) ───────────────────────────────────────────────────────

function DocRow({ name, chunks, status, stageText, onDelete, index, effortLabel }) {
  const ext = fileExt(name)
  const isIndexing = status === 'indexing'
  const isUploading = status === 'uploading'
  const isError = status === 'error'

  return (
    <div className={`kb-doc-row${index > 0 ? ' kb-doc-row--border' : ''}`}>
      <FileIcon />
      <span className="kb-doc-row__name">{name}</span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ext}</span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{chunks != null ? chunks : '—'}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {isUploading && <span className="tag accent dot pulse-dot">{stageText || 'Uploading'}</span>}
        {isIndexing && <span className="tag accent dot pulse-dot">{stageText || 'Indexing'}</span>}
        {status === 'indexed' && <span className="tag ok dot">Indexed</span>}
        {isError && <span className="tag" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}>Error</span>}
        {effortLabel && <span className="tag" style={{ fontSize: 10, padding: '1px 5px', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7 }}>{effortLabel}</span>}
      </div>
      {onDelete && !isUploading && !isIndexing && (
        <button className="kb-icon-btn kb-icon-btn--danger" onClick={onDelete} title="Remove">
          <TrashIcon />
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const [collections, setCollections] = useState([])
  const [selected, setSelected] = useState(null)
  const [files, setFiles] = useState([])
  const [uploads, setUploads] = useState([])   // { id, filename, stage }
  const [dragging, setDragging] = useState(false)
  const [effort, setEffort] = useState('low')
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [p50Ms, setP50Ms] = useState(null)
  const [effortMap, setEffortMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('apex_kb_effort_map') || '{}') } catch { return {} }
  })
  const fileInputRef = useRef(null)
  const newFolderRef = useRef(null)
  const timingSamples = useRef([])

  // Click-outside: close new-folder form
  useEffect(() => {
    if (!showNewFolder) return
    function onDown(e) {
      if (newFolderRef.current && !newFolderRef.current.contains(e.target)) {
        setShowNewFolder(false)
        setNewFolderName('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showNewFolder])

  const loadCollections = useCallback(async () => {
    try { setCollections(await listCollections()) } catch {}
  }, [])

  const loadFiles = useCallback(async (name) => {
    try {
      const t0 = performance.now()
      const data = await listFiles(name)
      const elapsed = performance.now() - t0
      timingSamples.current = [...timingSamples.current.slice(-9), elapsed]
      const sorted = [...timingSamples.current].sort((a, b) => a - b)
      setP50Ms(Math.round(sorted[Math.floor(sorted.length / 2)]))
      setFiles(data)
    } catch { setFiles([]) }
  }, [])

  useEffect(() => { loadCollections() }, [loadCollections])
  // Auto-select first collection when none is active
  useEffect(() => {
    if (selected == null && collections.length > 0) setSelected(collections[0].name)
  }, [collections, selected])
  useEffect(() => {
    if (selected) loadFiles(selected)
    else setFiles([])
  }, [selected, loadFiles])

  async function handleCreateFolder(e) {
    e.preventDefault()
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      await createCollection(newFolderName.trim())
      setNewFolderName('')
      setShowNewFolder(false)
      await loadCollections()
      setSelected(newFolderName.trim())
    } catch (err) { alert(err.message) }
    finally { setCreatingFolder(false) }
  }

  async function handleDeleteCollection(e, name) {
    e.stopPropagation()
    if (!confirm(`Delete collection "${name}" and all its files?`)) return
    try {
      await deleteCollection(name)
      if (selected === name) setSelected(null)
      await loadCollections()
    } catch (err) { alert(err.message) }
  }

  async function handleDeleteFile(source) {
    if (!confirm(`Remove "${source}" from this collection?`)) return
    try {
      await deleteFile(selected, source)
      await loadFiles(selected)
      await loadCollections()
    } catch (err) { alert(err.message) }
  }

  async function handleFiles(fileList) {
    if (!selected) return alert('Select a collection first.')
    const newUploads = Array.from(fileList).map(f => ({
      id: `${f.name}-${Date.now()}`,
      filename: f.name,
      stage: 'uploading',
      effort,
    }))
    setUploads(prev => [...prev, ...newUploads])

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const uploadId = newUploads[i].id
      try {
        await ingestToCollection(selected, file, event => {
          setUploads(prev => prev.map(u =>
            u.id === uploadId ? { ...u, stage: event.stage } : u
          ))
        }, effort)
        // Store effort for this file in localStorage
        const effortKey = `${selected}/${file.name}`
        setEffortMap(prev => {
          const next = { ...prev, [effortKey]: effort }
          localStorage.setItem('apex_kb_effort_map', JSON.stringify(next))
          return next
        })
        await loadFiles(selected)
        await loadCollections()
        // Mark as done briefly, then remove
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, stage: 'done' } : u))
        setTimeout(() => {
          setUploads(prev => prev.filter(u => u.id !== uploadId))
        }, 2000)
      } catch {
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, stage: 'error' } : u))
        setTimeout(() => {
          setUploads(prev => prev.filter(u => u.id !== uploadId))
        }, 4000)
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  // Merge active uploads with indexed files — uploads appear at top
  const ACTIVE_STAGES = new Set(['uploading', 'loading', 'chunking', 'tagging', 'embedding', 'storing'])
  const uploadCards = uploads.map(u => ({
    source: u.filename,
    chunk_count: null,
    status: u.stage === 'error' ? 'error'
      : u.stage === 'done' ? 'indexed'
      : u.stage === 'uploading' || u.stage === 'loading' ? 'uploading'
      : 'indexing',
    stageText: STAGE_LABELS[u.stage] || u.stage,
    effortLabel: u.effort,
    isUpload: true,
    id: u.id,
  }))

  const indexedFiles = files.map(f => ({
    ...f,
    status: 'indexed',
    stageText: 'Indexed',
    effortLabel: effortMap[`${selected}/${f.source}`],
    isUpload: false,
  }))
  const allDocs = [...uploadCards, ...indexedFiles]

  const filtered = search.trim()
    ? allDocs.filter(d => d.source.toLowerCase().includes(search.toLowerCase()))
    : allDocs

  const totalDocs = collections.reduce((s, c) => s + (c.file_count ?? 0), 0)
  const totalChunks = files.reduce((s, f) => s + (f.chunk_count ?? 0), 0)

  return (
    <div className="kb-page-v2">
      <BgPattern name="rag" />

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="crumbs">
          <span>Workspace</span>
          <span className="sep">/</span>
          <span>Knowledge Base</span>
          {selected && <>
            <span className="sep">/</span>
            <span className="here">{selected}</span>
          </>}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="kb-scroll">
        {/* Page head */}
        <div className="page-head">
          <div className="eyebrow">Retrieval-Augmented Knowledge Base</div>
          <h1>The corpus, indexed.</h1>
          <p className="lede">
            A hybrid BM25 + semantic index across {totalDocs.toLocaleString()} document{totalDocs !== 1 ? 's' : ''}.
            Drop files in. Ask questions. Get cited answers.
          </p>
        </div>

        {/* Stats strip */}
        <div className="kb-stats">
          <KbMetric label="Documents" value={totalDocs.toLocaleString() || '0'} sub={totalDocs > 0 ? `across ${collections.length} collections` : null} />
          <KbMetric label="Chunks" value={totalChunks > 0 ? totalChunks.toLocaleString() : '—'} sub={totalChunks > 0 ? `in ${selected || 'selected collection'}` : null} />
          <KbMetric label="Embedding dim" value="768d" sub="NOMIC-EMBED-TEXT" />
          <KbMetric label="P50 retrieval" value={p50Ms != null ? `${p50Ms} ms` : '—'} sub="TOP-50 · HNSW" />
        </div>

        {/* Two-col layout */}
        <div className="kb-body">

          {/* ── Collections sidebar ── */}
          <aside className="kb-aside">
            <div className="kb-aside__section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="eyebrow">Collections</div>
                <button className="kb-icon-btn" onClick={() => setShowNewFolder(v => !v)} title="New collection">
                  <PlusIcon />
                </button>
              </div>

              {showNewFolder && (
                <form ref={newFolderRef} className="kb-new-folder" onSubmit={handleCreateFolder} style={{ marginBottom: 8 }}>
                  <input
                    className="kb-new-folder__input"
                    placeholder="collection-name"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    autoFocus
                    pattern="[a-zA-Z0-9_\-]+"
                    required
                  />
                  <button className="kb-new-folder__btn" type="submit" disabled={creatingFolder}>
                    {creatingFolder ? '…' : 'Create'}
                  </button>
                </form>
              )}

              {collections.length === 0 && (
                <p className="kb-hint">No collections yet.</p>
              )}

              {collections.map(c => (
                <div
                  key={c.name}
                  className={`kb-col-item${selected === c.name ? ' kb-col-item--active' : ''}`}
                  onClick={() => setSelected(c.name)}
                >
                  <FolderIcon />
                  <span className="kb-col-item__name">{c.name}</span>
                  <span className="kb-col-item__count mono">{c.file_count ?? 0}</span>
                  <button
                    className="kb-icon-btn kb-icon-btn--danger kb-col-item__del"
                    onClick={e => handleDeleteCollection(e, c.name)}
                    title="Delete collection"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>

            {/* Index health */}
            <div className="kb-aside__section">
              <div className="eyebrow" style={{ marginBottom: 14 }}>Index Health</div>
              <div className="kb-health-card">
                <div className="kb-health-card__row">
                  <span style={{ fontSize: 12.5 }}>Embedding queue</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>
                    {uploads.length > 0 ? `${uploads.length} active` : '0 pending'}
                  </span>
                </div>
                <div className="kb-health-card__bar">
                  <div className="kb-health-card__fill" style={{
                    width: uploads.length > 0 ? '60%' : '0%',
                    background: uploads.length > 0 ? 'var(--accent)' : 'var(--border)',
                  }} />
                </div>
                <div className="mono kb-health-card__meta">
                  BACKEND · OLLAMA<br />
                  RERANKER · BGE-LARGE
                </div>
              </div>
            </div>
          </aside>

          {/* ── Document area ── */}
          <section className="kb-main">
            {!selected ? (
              <div className="kb-empty-state">
                <div className="kb-empty-state__icon">
                  <UploadIcon size={28} />
                </div>
                <h2 className="serif" style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Start with a collection.</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: 380, textAlign: 'center' }}>
                  Create a collection then drop files in. Apex chunks, embeds and indexes them automatically.
                </p>
                <button className="btn primary" style={{ marginTop: 20 }} onClick={() => setShowNewFolder(true)}>
                  <PlusIcon /> New collection
                </button>
              </div>
            ) : (
              <>
                {/* Collection header */}
                <div className="kb-main__header">
                  <h2 className="serif kb-main__title">{selected}</h2>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {files.length} document{files.length !== 1 ? 's' : ''}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                    {/* Effort selector */}
                    <div className="kb-effort">
                      <span className="kb-effort__label">Mode</span>
                      <div className="kb-effort__options">
                        <button className={`kb-effort__btn${effort === 'low' ? ' kb-effort__btn--active' : ''}`} onClick={() => setEffort('low')}>Low</button>
                        <button className="kb-effort__btn kb-effort__btn--disabled" disabled title="High-effort tagging coming soon">High</button>
                      </div>
                    </div>
                    {/* Search */}
                    <div className="kb-search">
                      <SearchIcon />
                      <input
                        className="kb-search__input"
                        placeholder="Search documents…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                    <button className={`btn icon${view === 'grid' ? '' : ' ghost'}`} onClick={() => setView('grid')} title="Grid view"><GridIcon /></button>
                    <button className={`btn icon${view === 'list' ? '' : ' ghost'}`} onClick={() => setView('list')} title="List view"><ListIcon /></button>
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  className={`kb-dropzone kb-dropzone--compact${dragging ? ' kb-dropzone--active' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon size={18} />
                  <span style={{ fontSize: 13 }}>Drop files here or click to upload</span>
                  <span className="kb-dropzone__hint">.txt  .md  .pdf  .html  .csv</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.md,.pdf,.html,.htm,.csv"
                    style={{ display: 'none' }}
                    onChange={e => handleFiles(e.target.files)}
                  />
                </div>

                {/* Document grid / list */}
                {filtered.length === 0 ? (
                  <p className="kb-hint">No files in this collection yet.</p>
                ) : view === 'grid' ? (
                  <div className="kb-doc-grid">
                    {filtered.map((doc, i) => (
                      <DocCard
                        key={doc.id ?? doc.source}
                        name={doc.source}
                        chunks={doc.chunk_count}
                        status={doc.status}
                        stageText={doc.stageText}
                        effortLabel={doc.effortLabel}
                        onDelete={!doc.isUpload ? () => handleDeleteFile(doc.source) : null}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="kb-doc-list">
                    <div className="kb-doc-list__header eyebrow">
                      <span style={{ width: 18 }} />
                      <span>Document</span>
                      <span>Type</span>
                      <span>Chunks</span>
                      <span>Status</span>
                      <span />
                    </div>
                    {filtered.map((doc, i) => (
                      <DocRow
                        key={doc.id ?? doc.source}
                        name={doc.source}
                        chunks={doc.chunk_count}
                        status={doc.status}
                        stageText={doc.stageText}
                        index={i}
                        effortLabel={doc.effortLabel}
                        onDelete={!doc.isUpload ? () => handleDeleteFile(doc.source) : null}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
