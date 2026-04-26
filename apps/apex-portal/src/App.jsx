import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { runAgent } from './api/agents'
import { extractKeywords, generate } from './api/gateway'
import { ingestToCollection, query, queryCollection } from './api/rag'
import ActiveRunSteps from './components/ActiveRunSteps'
import BgPattern from './components/BgPattern'
import ChatBar from './components/ChatBar'
import MessageBubble from './components/MessageBubble'
import ScrambledText from './components/ScrambledText'
import Sidebar from './components/Sidebar'
import { useAuth } from './context/AuthContext'
import { useSession } from './context/SessionContext'
import AgentsPage from './pages/AgentsPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import ToolsPage from './pages/ToolsPage'
import LoginPage from './pages/LoginPage'
import SettingsPage from './pages/SettingsPage'
import SignupPage from './pages/SignupPage'

function HistoryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
    </svg>
  )
}

function PlusIconSm() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

const CHAT_PROMPTS = [
  { eyebrow: 'Synthesize', text: 'Summarize this quarter\'s product brief and surface contradictions.' },
  { eyebrow: 'Compare', text: 'Compare hybrid retrieval strategies across our knowledge base.' },
  { eyebrow: 'Draft', text: 'Draft an architecture decision record for the migration plan.' },
  { eyebrow: 'Audit', text: 'Audit the onboarding docs for outdated references.' },
]

// ---------------------------------------------------------------------------
// Chat view
// ---------------------------------------------------------------------------

// Strips <tool_call> XML so raw markup never shows in the live bubble.
// Handles both complete tags AND incomplete ones mid-stream (no closing tag yet).
function stripToolCalls(text) {
  if (!text) return ''
  return text
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')  // complete
    .replace(/<tool_call>[\s\S]*/g, '')                 // still streaming — cut from opening tag onwards
    .trim()
}

// Duration (ms) for the scrambled-text decode effect on streaming tokens
const SCRAMBLE_DURATION_MS = 40

// Fake-stream a complete string frame-by-frame.
// flushSync forces React to paint each chunk immediately — React 18 automatic
// batching would otherwise collapse all setState calls into one final render.
function simulateStream(text, onChunk, charsPerFrame = 3) {
  return new Promise(resolve => {
    let pos = 0
    const tick = () => {
      pos = Math.min(pos + charsPerFrame, text.length)
      flushSync(() => onChunk(text.slice(0, pos)))
      if (pos < text.length) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

function ChatView() {
  const {
    sessions,
    sessionsLoading,
    activeSession,
    messages,
    setMessages,
    createSession,
    loadSession,
    saveMessage,
    addLocalMessage,
    renameSession,
  } = useSession()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  // streamingAgent: { content, agent } | null — live agent SSE response
  const [streamingAgent, setStreamingAgent] = useState(null)
  // streamingText: string | null — fake-streamed response for direct/RAG paths
  const [streamingText, setStreamingText] = useState(null)
  // Active run steps state
  const [runMode, setRunMode] = useState('direct')
  const [runStep, setRunStep] = useState(null)
  const [showRunSteps, setShowRunSteps] = useState(false)
  // Prefill text for prompt cards
  const [prefillText, setPrefillText] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const bottomRef = useRef(null)
  // AbortController for the active SSE agent stream — allows cleanup on unmount or re-send
  const agentAbortRef = useRef(null)

  const isEmpty = messages.length === 0

  async function handleNewSession() {
    await createSession()
    navigate('/')
  }

  async function handleSelectSessionFromHistory(sessionId) {
    await loadSession(sessionId)
    setShowHistory(false)
    navigate('/')
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, streamingAgent])

  useEffect(() => {
    if (!showHistory) return
    function onKeyDown(e) {
      if (e.key === 'Escape') setShowHistory(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showHistory])

  // Abort any in-flight agent SSE stream when the component unmounts
  useEffect(() => {
    return () => { agentAbortRef.current?.abort() }
  }, [])

  async function handleSend({ text, files, collection, agent }) {
    if (!text.trim() && files.length === 0) return

    // Ensure a session exists; capture its id immediately (don't rely on
    // context state which won't flush until after this render cycle).
    const isNewSession = !activeSession || messages.length === 0
    let sessionId = activeSession?.id
    if (!sessionId) {
      const title = text.trim().slice(0, 60) || 'New conversation'
      const session = await createSession(title)
      sessionId = session.id
    }

    const userContent = text.trim()
    const fileNames = files.map(f => f.name)

    // Persist user message; embed agent/collection into sources so they survive reload
    const userSources = (agent || collection)
      ? {
          agent: agent ? { id: agent.id, name: agent.name, color: agent.color } : undefined,
          collection: collection || undefined,
        }
      : undefined
    await saveMessage('user', userContent, userSources, fileNames.length ? fileNames : undefined, sessionId)

    setLoading(true)

    // Determine run mode and show run steps
    if (agent) {
      setRunMode('agent')
    } else if (collection || files.length > 0) {
      setRunMode('rag')
    } else {
      setRunMode('direct')
    }
    setShowRunSteps(true)
    setRunStep(null)

    try {
      // 1. Ingest directly-attached files into the default collection
      if (files.length > 0) {
        for (const file of files) {
          await ingestToCollection('default', file, () => {})
        }
        addLocalMessage({
          role: 'system',
          content: `Ingested ${files.length} file${files.length > 1 ? 's' : ''} into the knowledge base.`,
        })
      }

      if (userContent) {
        let answer = ''
        let sources = []

        const history = messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .slice(-20)
          .map(m => ({ role: m.role, content: m.content }))

        if (agent) {
          // ── Agent path — stream via apex-agents ─────────────────────────
          setRunStep('context')
          // Optionally pull RAG context first if a collection is also selected
          let ragContext = ''
          if (collection) {
            let ragResult = { context: '', sources: [] }
            try {
              setRunStep('context')
              const { keywords } = await extractKeywords(userContent)
              ragResult = await queryCollection(collection, keywords?.trim() || userContent)
            } catch { /* empty */ }
            ragContext = ragResult.context ?? ''
            sources = ragResult.sources ?? []
          }

          setRunStep('agent')
          const agentHistory = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-20)
            .map(m => ({ role: m.role, content: m.content }))
          let streamedAnswer = ''
          const toolsCalled = []

          // Abort any prior agent stream before starting a new one
          agentAbortRef.current?.abort()
          const abortCtrl = new AbortController()
          agentAbortRef.current = abortCtrl

          // Show a live streaming bubble for this agent
          setStreamingAgent({ content: '', agent })

          try {
            for await (const event of runAgent(agent.id, {
              message: userContent,
              history: agentHistory,
              context: ragContext,
              collection: collection || undefined,
              session_id: sessionId,
            }, abortCtrl.signal)) {
              if (event.type === 'token') {
                flushSync(() => {
                  streamedAnswer += event.content
                  setStreamingAgent({ content: streamedAnswer, agent })
                  // Only drop run steps when visible (non-tool-call) text exists
                  if (showRunSteps && stripToolCalls(streamedAnswer)) {
                    setShowRunSteps(false)
                  }
                })
              } else if (event.type === 'tool_use') {
                setRunStep('tools')
                toolsCalled.push(event.tool)
              } else if (event.type === 'handoff') {
                addLocalMessage({
                  role: 'system',
                  content: `↪ Handing off to ${event.to}${event.prompt ? ': ' + event.prompt : ''}`,
                })
              } else if (event.type === 'done') {
                streamedAnswer = event.answer || stripToolCalls(streamedAnswer)
                setStreamingAgent({ content: streamedAnswer, agent })
                setShowRunSteps(false)
              } else if (event.type === 'error') {
                streamedAnswer = `Agent error: ${event.detail}`
                setStreamingAgent({ content: streamedAnswer, agent })
                setShowRunSteps(false)
              }
            }
          } catch (err) {
            if (err.name === 'AbortError') {
              // Stream was intentionally cancelled — don't show an error
            } else {
              streamedAnswer = `Could not reach apex-agents. Is it running on port 8003? (${err.message})`
              setStreamingAgent({ content: streamedAnswer, agent })
            }
            setShowRunSteps(false)
          }

          setStreamingAgent(null)
          // Strip any tool-call XML that leaked into the stream before using as saved answer
          answer = stripToolCalls(streamedAnswer)

          // Persist assistant message with structured sources so metadata survives reload
          const structuredSources = {
            chunks: sources.length ? sources : undefined,
            agent: { id: agent.id, name: agent.name, color: agent.color },
            collection: collection || undefined,
            tools_called: toolsCalled.length ? toolsCalled : undefined,
          }
          await saveMessage('assistant', answer, structuredSources, undefined, sessionId)

        } else if (collection) {
          // ── RAG-scoped to selected KB folder ────────────────────────────
          let ragResult = { context: '', sources: [] }
          try {
            setRunStep('keywords')
            const { keywords } = await extractKeywords(userContent)
            setRunStep('query_kb')
            const searchQuery = keywords?.trim() || userContent
            ragResult = await queryCollection(collection, searchQuery)
          } catch { /* no docs yet or keyword extraction failed — fall back to raw question */ }
          if (!ragResult.context) {
            try { ragResult = await queryCollection(collection, userContent) } catch { /* empty */ }
          }
          sources = ragResult.sources ?? []
          setRunStep('context')
          try {
            setRunStep('generate')
            const gen = await generate(userContent, ragResult.context ?? '', history)
            setShowRunSteps(false)
            setStreamingText('')
            await simulateStream(gen.answer, chunk => setStreamingText(chunk))
            setStreamingText(null)
            answer = gen.answer
          } catch {
            setShowRunSteps(false)
            answer = ragResult.sources?.length
              ? 'Could not reach the LLM gateway. Is apex-gateway running?'
              : `No relevant documents found in "${collection}".`
          }
          await saveMessage('assistant', answer, {
            chunks: sources.length ? sources : undefined,
            collection,
          }, undefined, sessionId)

        } else if (files.length > 0) {
          // ── Files were just ingested — search the default collection ────
          let ragResult = { context: '', sources: [] }
          setRunStep('query_kb')
          try { ragResult = await query(userContent) } catch { /* empty */ }
          sources = ragResult.sources ?? []
          setRunStep('generate')
          try {
            const gen = await generate(userContent, ragResult.context ?? '', history)
            setShowRunSteps(false)
            setStreamingText('')
            await simulateStream(gen.answer, chunk => setStreamingText(chunk))
            setStreamingText(null)
            answer = gen.answer
          } catch {
            setShowRunSteps(false)
            answer = 'Could not reach the LLM gateway. Is apex-gateway running?'
          }
          await saveMessage('assistant', answer, sources.length ? sources : undefined, undefined, sessionId)

        } else {
          // ── No RAG context — send straight to LLM ───────────────────────
          setRunStep('context')
          try {
            setRunStep('generate')
            const gen = await generate(userContent, '', history)
            setShowRunSteps(false)
            setStreamingText('')
            await simulateStream(gen.answer, chunk => setStreamingText(chunk))
            setStreamingText(null)
            answer = gen.answer
          } catch {
            setShowRunSteps(false)
            answer = 'Could not reach the LLM gateway. Is apex-gateway running on port 8002?'
          }
          await saveMessage('assistant', answer, undefined, undefined, sessionId)
        }
      }

      // Auto-title: first 5 words of the user's message
      if (isNewSession && userContent) {
        const title = userContent.trim().split(/\s+/).slice(0, 5).join(' ')
        renameSession(sessionId, title)
      }
    } catch (err) {
      addLocalMessage({ role: 'error', content: err.message || 'Something went wrong.' })
      setShowRunSteps(false)
    } finally {
      setLoading(false)
      setShowRunSteps(false)
      setRunStep(null)
    }
  }

  const today = new Date()
  const dateCrumb = `${String(today.getMonth() + 1).padStart(2, '0')} / ${String(today.getDate()).padStart(2, '0')} / ${String(today.getFullYear()).slice(-2)}`

  return (
    <div className="chat-view">
      <BgPattern name="chat" />

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="crumbs">
          <span>Workspace</span>
          <span className="sep">/</span>
          <span>Chat</span>
          <span className="sep">/</span>
          <span className="here">{activeSession?.title || 'New session'}</span>
        </div>
        <div className="topbar-actions">
          <button className="btn ghost" onClick={() => setShowHistory(true)}>
            <HistoryIcon /> History
          </button>
          <button className="btn" onClick={handleNewSession}>
            <PlusIconSm /> New session <span className="kbd">⌘N</span>
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="chat-history-overlay" onClick={() => setShowHistory(false)}>
          <div className="chat-history-modal fade-in" onClick={e => e.stopPropagation()}>
            <div className="chat-history-modal__header">
              <div>
                <div className="eyebrow">Session History</div>
                <h2 className="serif chat-history-modal__title">All chats</h2>
              </div>
              <button className="btn ghost" onClick={() => setShowHistory(false)}>Close</button>
            </div>

            <div className="chat-history-modal__list">
              {sessionsLoading && <p className="sidebar__hint">Loading sessions...</p>}
              {!sessionsLoading && sessions.length === 0 && (
                <p className="sidebar__hint">No sessions yet.</p>
              )}
              {!sessionsLoading && sessions.map(s => (
                <button
                  key={s.id}
                  className={`chat-history-item${activeSession?.id === s.id ? ' chat-history-item--active' : ''}`}
                  onClick={() => handleSelectSessionFromHistory(s.id)}
                  title={s.title}
                >
                  <div className="chat-history-item__title">{s.title}</div>
                  <div className="chat-history-item__meta mono">
                    {activeSession?.id === s.id ? 'CURRENT' : s.id.slice(0, 8).toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="messages">
        <div className="messages-inner">
          {isEmpty && (
            <div className="chat-empty-state fade-in">
              <div className="eyebrow" style={{ marginBottom: 18 }}>New session · {dateCrumb}</div>
              <h1 className="chat-empty-state__heading serif">
                What would you like<br />
                <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>to know today?</span>
              </h1>
              <p className="chat-empty-state__lede">
                Ask grounded questions across your indexed knowledge base, or summon an agent with{' '}
                <span className="mono" style={{ color: 'var(--text)', fontSize: 12 }}>@</span>{' '}
                to run a workflow.
              </p>
              <div className="chat-empty-state__grid">
                {CHAT_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    className="chat-prompt-card"
                    onClick={() => setPrefillText(p.text)}
                  >
                    <div className="eyebrow" style={{ marginBottom: 8 }}>{p.eyebrow}</div>
                    <div className="serif" style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.4 }}>{p.text}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {/* Active run steps — shown before content streams in */}
          {loading && showRunSteps && (
            <div className="message message--assistant">
              <div className="message__stack">
                <ActiveRunSteps mode={runMode} activeStep={runStep} visible={showRunSteps} />
              </div>
            </div>
          )}
          {/* Fake-streamed response for direct/RAG paths */}
          {streamingText !== null && (
            <div className="message message--assistant fade-in">
              <div className="message__avatar message__avatar--apex">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L9 9 2 12l7 3 3 7 3-7 7-3-7-3z" />
                </svg>
              </div>
              <div className="message__stack">
                <div className="message__header">
                  <span className="message__name">Apex</span>
                  <span className="tag dot" style={{ color: 'var(--accent)', borderColor: 'var(--accent-line)' }}>
                    {runMode === 'rag' ? 'RAG' : 'Direct'}
                  </span>
                </div>
                <div className="message__body">
                  {streamingText
                    ? <ScrambledText text={streamingText} />
                    : <span className="thinking-label">Generating…</span>}
                </div>
              </div>
            </div>
          )}
          {/* Simple fallback indicator while waiting for first SSE event */}
          {loading && !streamingAgent && streamingText === null && !showRunSteps && (
            <div className="message message--assistant fade-in">
              <div className="message__avatar message__avatar--apex">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L9 9 2 12l7 3 3 7 3-7 7-3-7-3z" />
                </svg>
              </div>
              <div className="message__stack">
                <div className="message__header"><span className="message__name">Apex</span></div>
                <div className="message__body"><span className="thinking-label">Thinking…</span></div>
              </div>
            </div>
          )}
          {/* Agent streaming bubble — only render once run steps have faded */}
          {streamingAgent && !showRunSteps && (
            <div className="message message--assistant fade-in">
              <div className="message__avatar message__avatar--apex">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L9 9 2 12l7 3 3 7 3-7 7-3-7-3z" />
                </svg>
              </div>
              <div className="message__stack">
                <div className="message__header">
                  <span className="message__name">Apex</span>
                  <span className="tag dot" style={{ color: 'var(--accent)', borderColor: 'var(--accent-line)' }}>
                    {streamingAgent.agent.name}
                  </span>
                </div>
                <div className="message__body">
                  {stripToolCalls(streamingAgent.content)
                    ? <ScrambledText text={stripToolCalls(streamingAgent.content)} />
                    : <span className="thinking-label">Generating…</span>}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="chat-bar-outer">
        <ChatBar onSend={handleSend} loading={loading} prefillText={prefillText} onPrefillConsumed={() => setPrefillText('')} />
        <div className="chat-bar-meta">
          <span>GEMMA4:E2B · CONTEXT 8K · TEMP 0.4</span>
          <span><span className="kbd">⏎</span> SEND · <span className="kbd">⇧⏎</span> NEW LINE · <span className="kbd">@</span> AGENT</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Protected layout (sidebar + content)
// ---------------------------------------------------------------------------

function AppLayout({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('apex_theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('apex_theme', theme)
  }, [theme])

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__main">
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root — handles auth gating
// ---------------------------------------------------------------------------

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <div className="app-loading">Loading…</div>

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route path="/" element={<AppLayout><ChatView /></AppLayout>} />
      <Route path="/kb" element={<AppLayout><KnowledgeBasePage /></AppLayout>} />
      <Route path="/agents" element={<AppLayout><AgentsPage /></AppLayout>} />
      <Route path="/tools" element={<AppLayout><ToolsPage /></AppLayout>} />
      <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
