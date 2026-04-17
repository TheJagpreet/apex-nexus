import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
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

function KBIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function AgentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

const MIN_WIDTH = 160
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 240

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { sessions, sessionsLoading, activeSession, createSession, loadSession, deleteSession } = useSession()
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState(null)
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('apex_sidebar_width')
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH
  })
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(width)

  // Persist width
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`)
    localStorage.setItem('apex_sidebar_width', String(width))
  }, [width])

  // Set CSS variable on mount
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function onResizeMouseDown(e) {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = width

    function onMouseMove(e) {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setWidth(newW)
    }

    function onMouseUp() {
      isDragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  async function handleNewChat() {
    await createSession()
    navigate('/')
  }

  async function handleSelectSession(id) {
    await loadSession(id)
    navigate('/')
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    setDeletingId(id)
    try { await deleteSession(id) } finally { setDeletingId(null) }
  }

  return (
    <aside className="sidebar" style={{ width }}>
      {/* Header — "Apex Portal" clickable → home */}
      <div className="sidebar__header">
        <button className="sidebar__logo" onClick={() => navigate('/')} title="Go to home">
          Apex Portal
        </button>
        <button className="sidebar__new-btn" onClick={handleNewChat} title="New chat">
          <PlusIcon />
        </button>
      </div>

      {/* Session list */}
      <nav className="sidebar__sessions">
        {sessionsLoading && <p className="sidebar__hint">Loading…</p>}
        {!sessionsLoading && sessions.length === 0 && (
          <p className="sidebar__hint">No conversations yet.</p>
        )}
        {sessions.map(s => (
          <div
            key={s.id}
            className={`sidebar__session${activeSession?.id === s.id ? ' sidebar__session--active' : ''}`}
            onClick={() => handleSelectSession(s.id)}
          >
            <span className="sidebar__session-title">{s.title}</span>
            <button
              className="sidebar__session-delete"
              onClick={e => handleDelete(e, s.id)}
              disabled={deletingId === s.id}
              title="Delete"
              aria-label="Delete session"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="sidebar__bottom">
        <NavLink to="/agents" className={({ isActive }) => `sidebar__nav-link${isActive ? ' sidebar__nav-link--active' : ''}`}>
          <AgentIcon />
          <span>Agents</span>
        </NavLink>
        <NavLink to="/kb" className={({ isActive }) => `sidebar__kb-link${isActive ? ' sidebar__kb-link--active' : ''}`}>
          <KBIcon />
          <span>Knowledge Base</span>
        </NavLink>
        <div className="sidebar__user">
          <span className="sidebar__username">{user?.display_name || user?.username}</span>
          <button className="sidebar__logout" onClick={logout}>Sign out</button>
        </div>
      </div>

      {/* Resize handle */}
      <div className="sidebar__resize-handle" onMouseDown={onResizeMouseDown} title="Drag to resize" />
    </aside>
  )
}
