import { useCallback, useEffect, useRef, useState } from 'react'

const KB_MIN = 140
const KB_MAX = 380
const KB_DEFAULT = 220
import { createCollection, deleteCollection, deleteFile, ingestToCollection, listCollections, listFiles } from '../api/rag'

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  )
}

const STAGE_LABELS = { loading: 'Loading…', chunking: 'Chunking…', embedding: 'Embedding…', storing: 'Storing…', done: 'Done', error: 'Error' }

export default function KnowledgeBasePage() {
  const [collections, setCollections] = useState([])
  const [selected, setSelected] = useState(null)
  const [files, setFiles] = useState([])
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [uploads, setUploads] = useState([]) // { id, filename, stage, progress }
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)
  const [folderWidth, setFolderWidth] = useState(() => {
    const s = localStorage.getItem('apex_kb_folder_width')
    return s ? parseInt(s, 10) : KB_DEFAULT
  })
  const isDraggingPane = useRef(false)
  const startPaneX = useRef(0)
  const startPaneWidth = useRef(folderWidth)

  function onPaneResizeDown(e) {
    e.preventDefault()
    isDraggingPane.current = true
    startPaneX.current = e.clientX
    startPaneWidth.current = folderWidth
    const onMove = e => {
      if (!isDraggingPane.current) return
      const newW = Math.min(KB_MAX, Math.max(KB_MIN, startPaneWidth.current + e.clientX - startPaneX.current))
      setFolderWidth(newW)
      localStorage.setItem('apex_kb_folder_width', String(newW))
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

  const loadCollections = useCallback(async () => {
    try {
      const data = await listCollections()
      setCollections(data)
    } catch {}
  }, [])

  const loadFiles = useCallback(async (name) => {
    try {
      const data = await listFiles(name)
      setFiles(data)
    } catch { setFiles([]) }
  }, [])

  useEffect(() => { loadCollections() }, [loadCollections])

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
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingFolder(false)
    }
  }

  async function handleDeleteCollection(e, name) {
    e.stopPropagation()
    if (!confirm(`Delete folder "${name}" and all its files? This cannot be undone.`)) return
    try {
      await deleteCollection(name)
      if (selected === name) setSelected(null)
      await loadCollections()
    } catch (err) { alert(err.message) }
  }

  async function handleDeleteFile(source) {
    if (!confirm(`Remove "${source}" from this folder?`)) return
    try {
      await deleteFile(selected, source)
      await loadFiles(selected)
      await loadCollections()
    } catch (err) { alert(err.message) }
  }

  async function handleFiles(fileList) {
    if (!selected) return alert('Select a folder first.')
    const newUploads = Array.from(fileList).map(f => ({
      id: `${f.name}-${Date.now()}`,
      filename: f.name,
      stage: 'loading',
      progress: 0,
    }))
    setUploads(prev => [...prev, ...newUploads])

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const uploadId = newUploads[i].id
      try {
        await ingestToCollection(selected, file, event => {
          setUploads(prev => prev.map(u =>
            u.id === uploadId
              ? { ...u, stage: event.stage, progress: event.progress ?? u.progress }
              : u
          ))
        })
        await loadFiles(selected)
        await loadCollections()
      } catch (err) {
        setUploads(prev => prev.map(u =>
          u.id === uploadId ? { ...u, stage: 'error', progress: 0 } : u
        ))
      }
    }

    // Clear completed/errored uploads after 3s
    setTimeout(() => {
      setUploads(prev => prev.filter(u => !newUploads.some(n => n.id === u.id)))
    }, 3000)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="kb-page">
      {/* Left: folder list */}
      <aside className="kb-folders" style={{ width: folderWidth }}>
        <div className="kb-folders__header">
          <span className="kb-folders__title">Folders</span>
          <button className="kb-icon-btn" onClick={() => setShowNewFolder(v => !v)} title="New folder">+</button>
        </div>

        {showNewFolder && (
          <form className="kb-new-folder" onSubmit={handleCreateFolder}>
            <input
              className="kb-new-folder__input"
              placeholder="folder-name"
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

        <div className="kb-folders__list">
          {collections.length === 0 && (
            <p className="kb-hint">No folders yet. Create one to start uploading.</p>
          )}
          {collections.map(c => (
            <div
              key={c.name}
              className={`kb-folder${selected === c.name ? ' kb-folder--active' : ''}`}
              onClick={() => setSelected(c.name)}
            >
              <FolderIcon />
              <span className="kb-folder__name">{c.name}</span>
              <span className="kb-folder__meta">{c.file_count} file{c.file_count !== 1 ? 's' : ''}</span>
              <button
                className="kb-icon-btn kb-icon-btn--danger"
                onClick={e => handleDeleteCollection(e, c.name)}
                title="Delete folder"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
        {/* Resize handle */}
        <div className="kb-folders__resize-handle" onMouseDown={onPaneResizeDown} />
      </aside>

      {/* Right: file list + upload */}
      <main className="kb-content">
        {!selected ? (
          <div className="kb-empty">
            <p>Select a folder to view files, or create a new folder.</p>
          </div>
        ) : (
          <>
            <div className="kb-content__header">
              <span className="kb-content__title">{selected}</span>
            </div>

            {/* Drop zone */}
            <div
              className={`kb-dropzone${dragging ? ' kb-dropzone--active' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon />
              <span>Drop files here or click to upload</span>
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

            {/* Active uploads */}
            {uploads.length > 0 && (
              <div className="kb-uploads">
                {uploads.map(u => (
                  <div key={u.id} className={`kb-upload${u.stage === 'error' ? ' kb-upload--error' : ''}`}>
                    <div className="kb-upload__info">
                      <span className="kb-upload__name">{u.filename}</span>
                      <span className="kb-upload__stage">{STAGE_LABELS[u.stage] ?? u.stage}</span>
                    </div>
                    <div className="kb-upload__bar">
                      <div
                        className={`kb-upload__fill${u.stage === 'done' ? ' kb-upload__fill--done' : ''}`}
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* File list */}
            <div className="kb-files">
              {files.length === 0 && (
                <p className="kb-hint">No files in this folder yet.</p>
              )}
              {files.map(f => (
                <div key={f.source} className="kb-file">
                  <span className="kb-file__name">{f.source}</span>
                  <span className="kb-file__meta">{f.chunk_count} chunk{f.chunk_count !== 1 ? 's' : ''}</span>
                  <button
                    className="kb-icon-btn kb-icon-btn--danger"
                    onClick={() => handleDeleteFile(f.source)}
                    title="Remove file"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
