import { useEffect, useRef, useState } from 'react'
import { listAgents } from '../api/agents'
import { listCollections } from '../api/rag'
import { IndexSpinner } from './Spinners'

const ACCEPTED = '.txt,.md,.pdf,.html,.htm,.csv'

function PaperclipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export default function ChatBar({ onSend, loading, prefillText, onPrefillConsumed }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])

  // Accept prefill from parent (prompt cards)
  useEffect(() => {
    if (prefillText) {
      setText(prefillText)
      onPrefillConsumed?.()
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
          textareaRef.current.focus()
        }
      })
    }
  }, [prefillText]) // eslint-disable-line react-hooks/exhaustive-deps

  // KB collection
  const [collection, setCollection] = useState(null)
  const [collections, setCollections] = useState([])
  const [showCollections, setShowCollections] = useState(false)

  // Agent @ mention
  const [agent, setAgent] = useState(null)
  const [agents, setAgents] = useState([])
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [atQuery, setAtQuery] = useState('')
  const [atStartIdx, setAtStartIdx] = useState(-1)   // caret position where @ was typed

  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const collectionPickerRef = useRef(null)
  const agentPickerRef = useRef(null)

  // Load collections and agents for the pickers
  useEffect(() => {
    listCollections().then(setCollections).catch(() => {})
    listAgents().then(setAgents).catch(() => {})
  }, [])

  // Refresh collections when their picker is opened
  useEffect(() => {
    if (showCollections) listCollections().then(setCollections).catch(() => {})
  }, [showCollections])

  // Close collection picker on outside click
  useEffect(() => {
    if (!showCollections) return
    function handler(e) {
      if (!collectionPickerRef.current?.contains(e.target)) setShowCollections(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCollections])

  // Close agent picker on outside click
  useEffect(() => {
    if (!showAgentPicker) return
    function handler(e) {
      if (!agentPickerRef.current?.contains(e.target) && !textareaRef.current?.contains(e.target)) {
        setShowAgentPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAgentPicker])

  // ── File handling ─────────────────���───────────────────────────────────────

  function handleFileChange(e) {
    const picked = Array.from(e.target.files || [])
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...picked.filter(f => !existing.has(f.name))]
    })
    e.target.value = ''
  }

  function removeFile(name) { setFiles(prev => prev.filter(f => f.name !== name)) }

  // ── @ mention detection ──────────────────────────────��────────────────────

  function handleInput(e) {
    const newText = e.target.value
    setText(newText)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`

    const caret = e.target.selectionStart ?? newText.length

    // Find the last @ before the caret that is at a word boundary
    const slice = newText.slice(0, caret)
    const atMatch = slice.match(/@([a-zA-Z0-9_-]*)$/)

    if (atMatch) {
      setAtQuery(atMatch[1].toLowerCase())
      setAtStartIdx(atMatch.index)
      setShowAgentPicker(true)
    } else {
      setShowAgentPicker(false)
      setAtQuery('')
      setAtStartIdx(-1)
    }
  }

  function selectAgent(a) {
    // Replace @<query> in the textarea with nothing (agent goes to chip)
    if (atStartIdx >= 0) {
      const before = text.slice(0, atStartIdx)
      const after = text.slice(atStartIdx + 1 + atQuery.length) // 1 for @
      const newText = before + after
      setText(newText)
      // Restore height
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
      })
    }
    setAgent(a)
    setShowAgentPicker(false)
    setAtQuery('')
    setAtStartIdx(-1)
    textareaRef.current?.focus()
  }

  // ── Key handling ──────────────────────────────────────────────────────────

  function handleKeyDown(e) {
    if (showAgentPicker && filteredAgents.length > 0) {
      if (e.key === 'Tab' || e.key === 'ArrowRight') {
        e.preventDefault()
        selectAgent(filteredAgents[0])
        return
      }
    }
    if (e.key === 'Escape' && showAgentPicker) {
      setShowAgentPicker(false)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey && !showAgentPicker) {
      e.preventDefault()
      submit()
    }
  }

  // ── Submit ──────────────────────────────────���─────────────────────────��───

  function submit() {
    if (loading) return
    if (!text.trim() && files.length === 0) return
    onSend({ text, files, collection, agent })
    setText('')
    setFiles([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  // ── Filtered agents for picker ────────────────────────────────────────────

  const filteredAgents = atQuery
    ? agents.filter(a =>
        a.name.toLowerCase().includes(atQuery) ||
        a.id.toLowerCase().includes(atQuery)
      )
    : agents

  const canSend = !loading && (text.trim().length > 0 || files.length > 0)

  // ── Placeholder text ──────────────────────────────────────────────────────

  let placeholder = 'Ask a question, attach a KB folder, or type @ to use an agent…'
  if (agent) placeholder = `Asking ${agent.name}…`
  else if (collection) placeholder = `Ask about "${collection}"…`

  return (
    <div className="chat-bar">
      {/* Chips row: agent + attached files + selected collection */}
      {(agent || files.length > 0 || collection) && (
        <div className="chat-bar__files">
          {agent && (
            <span className="file-chip file-chip--agent" style={{ '--agent-color': agent.color }}>
              <span className="file-chip__dot" />
              {agent.name}
              <button className="file-chip__remove" onClick={() => setAgent(null)} title="Remove agent">×</button>
            </span>
          )}
          {collection && (
            <span className="file-chip file-chip--collection">
              <FolderIcon />
              {collection}
              <button className="file-chip__remove" onClick={() => setCollection(null)} title="Remove">×</button>
            </span>
          )}
          {files.map(file => (
            <span key={file.name} className="file-chip">
              {file.name}
              <button className="file-chip__remove" onClick={() => removeFile(file.name)} title="Remove" aria-label={`Remove ${file.name}`}>×</button>
            </span>
          ))}
        </div>
      )}

      <div className="chat-bar__row">
        {/* Attach button — KB collection OR file */}
        <div style={{ position: 'relative' }}>
          <button
            className="chat-bar__attach"
            onClick={() => setShowCollections(v => !v)}
            title="Attach from Knowledge Base or file"
            disabled={loading}
          >
            <PaperclipIcon />
          </button>

          {showCollections && (
            <div ref={collectionPickerRef} className="collection-picker">
              <div className="collection-picker__header">Attach from KB</div>
              {collections.length === 0 && (
                <div className="collection-picker__empty">No KB folders yet.</div>
              )}
              {collections.map(c => (
                <button
                  key={c.name}
                  className={`collection-picker__item${collection === c.name ? ' collection-picker__item--active' : ''}`}
                  onClick={() => { setCollection(c.name); setShowCollections(false) }}
                >
                  <FolderIcon /> {c.name}
                  <span className="collection-picker__meta">{c.file_count} file{c.file_count !== 1 ? 's' : ''}</span>
                </button>
              ))}
              <div className="collection-picker__divider" />
              <button
                className="collection-picker__item"
                onClick={() => { setShowCollections(false); fileInputRef.current?.click() }}
              >
                Upload file directly
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Textarea + agent picker */}
        <div style={{ flex: 1, position: 'relative' }}>
          {showAgentPicker && filteredAgents.length > 0 && (
            <div ref={agentPickerRef} className="agent-picker">
              <div className="agent-picker__header">Agents</div>
              {filteredAgents.map(a => (
                <button
                  key={a.id}
                  className="agent-picker__item"
                  onMouseDown={e => { e.preventDefault(); selectAgent(a) }}
                >
                  <span className="agent-picker__dot" style={{ background: a.color }} />
                  <span className="agent-picker__name">{a.name}</span>
                  <span className="agent-picker__desc">{a.description}</span>
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="chat-bar__input"
            rows={1}
            placeholder={placeholder}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </div>

        <button
          className="chat-bar__send"
          onClick={submit}
          disabled={!canSend}
          style={loading ? { opacity: 1, cursor: 'default' } : undefined}
          title={loading ? 'Generating…' : 'Send'}
          aria-label="Send"
        >
          {loading ? <IndexSpinner size={18} /> : <SendIcon />}
        </button>
      </div>
    </div>
  )
}
