import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'
import { MeshSpinner } from './Spinners'

function PlusIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
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

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

function ToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function AgentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <line x1="12" y1="15" x2="12" y2="17" />
    </svg>
  )
}

const MIN_WIDTH = 160
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 248

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { sessions, sessionsLoading, activeSession, createSession, loadSession, deleteSession } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const isChat = location.pathname === '/'
  const [deletingId, setDeletingId] = useState(null)
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('apex_sidebar_width')
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH
  })
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(width)

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`)
    localStorage.setItem('apex_sidebar_width', String(width))
  }, [width])

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
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + e.clientX - startX.current)))
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

  const navItems = [
    { to: '/', end: true, icon: <ChatIcon />, label: 'Chat', count: sessions.length || null },
    { to: '/kb', icon: <KBIcon />, label: 'Knowledge Base' },
    { to: '/agents', icon: <AgentIcon />, label: 'Agents' },
    { to: '/tools', icon: <ToolIcon />, label: 'Tools' },
    { to: '/settings', icon: <SettingsIcon />, label: 'Settings' },
  ]

  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (!showUserMenu) return
    function handler(e) {
      if (!userMenuRef.current?.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUserMenu])

  const avatarChar = (user?.display_name || user?.username || '?')[0].toUpperCase()

  return (
    <aside className="sidebar" style={{ width }}>
      {/* ── Brand ── */}
      <div className="brand">
        <div className="brand-mark"><MeshSpinner size={18} /></div>
        <div className="brand-name">Apex Nexus</div>
        <div className="brand-meta">v1.4</div>
      </div>

      {/* ── Workspace nav ── */}
      <div className="nav-section">
        <div className="eyebrow">Workspace</div>
        {navItems.map(({ to, end, icon, label, count }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="ico">{icon}</span>
            <span>{label}</span>
            {count != null && <span className="count">{count}</span>}
          </NavLink>
        ))}
      </div>

      {/* ── Recent sessions (chat only) ── */}
      {isChat && (
        <>
          <div className="nav-section" style={{ paddingTop: 22 }}>
            <div className="eyebrow" style={{ display: 'flex', alignItems: 'center' }}>
              <span>Recent Sessions</span>
              <button
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}
                onClick={handleNewChat}
                title="New session"
              >
                <PlusIcon size={12} />
              </button>
            </div>
          </div>
          <div className="session-list">
            {sessionsLoading && <p className="sidebar__hint">Loading…</p>}
            {!sessionsLoading && sessions.length === 0 && (
              <p className="sidebar__hint">No sessions yet.</p>
            )}
            {sessions.map(s => (
              <div
                key={s.id}
                className={`session${activeSession?.id === s.id ? ' active' : ''}`}
                onClick={() => handleSelectSession(s.id)}
              >
                <div className="title">{s.title}</div>
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
          </div>
        </>
      )}

      {!isChat && <div style={{ flex: 1 }} />}

      {/* ── User strip ── */}
      <div className="user-strip" ref={userMenuRef} style={{ position: 'relative' }}>
        <div className="avatar">{avatarChar}</div>
        <div>
          <div className="who">{user?.display_name || user?.username}</div>
          <div className="role">Admin</div>
        </div>
        <button
          className="more"
          onClick={() => setShowUserMenu(v => !v)}
          title="User menu"
        >
          <DotsIcon />
        </button>

        {showUserMenu && (
          <div className="user-menu">
            <button className="user-menu__item user-menu__item--danger" onClick={() => { setShowUserMenu(false); logout() }}>
              <SignOutIcon />
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div className="sidebar__resize-handle" onMouseDown={onResizeMouseDown} title="Drag to resize" />
    </aside>
  )
}
