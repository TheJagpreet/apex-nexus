import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  addMessage as apiAddMessage,
  createSession as apiCreateSession,
  deleteSession as apiDeleteSession,
  getSession,
  listSessions,
  updateSessionTitle,
} from '../api/identity'
import { useAuth } from './AuthContext'

const SessionContext = createContext(null)

// ---------------------------------------------------------------------------
// Sources normalisation
//
// Messages are persisted with a structured `sources` JSON object:
//   { chunks, agent, collection, tools_called }
//
// Older messages may have a bare array (just RAG chunks).  Both formats are
// handled here so the rest of the UI always gets a flat, typed message object.
// ---------------------------------------------------------------------------

function parseSources(raw) {
  if (!raw) return {}
  if (Array.isArray(raw)) {
    return { chunks: raw.length ? raw : undefined }
  }
  if (typeof raw === 'object') {
    return {
      chunks:       raw.chunks?.length  ? raw.chunks       : undefined,
      agent:        raw.agent           ?? undefined,
      collection:   raw.collection      ?? undefined,
      tools_called: raw.tools_called?.length ? raw.tools_called : undefined,
    }
  }
  return {}
}

function toMsg(m) {
  const { chunks, agent, collection, tools_called } = parseSources(m.sources)
  return {
    id:          m.id,
    role:        m.role,
    content:     m.content,
    sources:     chunks,
    agent,
    collection,
    tools_called,
    files:       m.files ?? undefined,
  }
}

// ---------------------------------------------------------------------------

export function SessionProvider({ children }) {
  const { token } = useAuth()
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null) // { id, title }
  const [messages, setMessages] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // Load session list whenever token changes
  useEffect(() => {
    if (!token) { setSessions([]); setActiveSession(null); setMessages([]); return }
    setSessionsLoading(true)
    listSessions(token)
      .then(data => setSessions(data))
      .catch(() => {})
      .finally(() => setSessionsLoading(false))
  }, [token])

  const refreshSessions = useCallback(async () => {
    if (!token) return
    const data = await listSessions(token)
    setSessions(data)
  }, [token])

  const createSession = useCallback(async (title = 'New conversation') => {
    const session = await apiCreateSession(token, title)
    await refreshSessions()
    setActiveSession(session)
    setMessages([])
    return session
  }, [token, refreshSessions])

  const loadSession = useCallback(async (sessionId) => {
    const data = await getSession(token, sessionId)
    setActiveSession({ id: data.id, title: data.title })
    setMessages(data.messages.map(toMsg))
  }, [token])

  const deleteSession = useCallback(async (sessionId) => {
    await apiDeleteSession(token, sessionId)
    if (activeSession?.id === sessionId) {
      setActiveSession(null)
      setMessages([])
    }
    await refreshSessions()
  }, [token, activeSession, refreshSessions])

  const renameSession = useCallback(async (sessionId, title) => {
    await updateSessionTitle(token, sessionId, title)
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s))
    if (activeSession?.id === sessionId) setActiveSession(prev => ({ ...prev, title }))
  }, [token, activeSession])

  // sessionIdOverride lets callers pass a freshly-created session ID before
  // React has flushed the activeSession state update.
  const saveMessage = useCallback(async (role, content, sources, files, sessionIdOverride) => {
    const sid = sessionIdOverride ?? activeSession?.id
    if (!sid) return
    const msg = await apiAddMessage(token, sid, role, content, sources, files)
    const newMsg = toMsg(msg)
    setMessages(prev => [...prev, newMsg])
    return newMsg
  }, [token, activeSession])

  const addLocalMessage = useCallback((msg) => {
    const entry = { id: Date.now() + Math.random(), ...msg }
    setMessages(prev => [...prev, entry])
    return entry
  }, [])

  return (
    <SessionContext.Provider value={{
      sessions,
      sessionsLoading,
      activeSession,
      messages,
      setMessages,
      createSession,
      loadSession,
      deleteSession,
      renameSession,
      saveMessage,
      addLocalMessage,
      refreshSessions,
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
