import { useEffect, useRef, useState, useCallback } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { runAgent } from './api/agents'
import { extractKeywords, generate } from './api/gateway'
import { ingestToCollection, query, queryCollection } from './api/rag'
import ActiveRunSteps from './components/ActiveRunSteps'
import ChatBar from './components/ChatBar'
import MessageBubble from './components/MessageBubble'
import ScrambledText from './components/ScrambledText'
import ServiceHealthCheck from './components/ServiceHealthCheck'
import Sidebar from './components/Sidebar'
import { MembraneSpinner } from './components/Spinners'
import ThemeToggle from './components/ThemeToggle'
import { useAuth } from './context/AuthContext'
import { useSession } from './context/SessionContext'
import AgentsPage from './pages/AgentsPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

// ---------------------------------------------------------------------------
// Chat view
// ---------------------------------------------------------------------------

// Strips <tool_call> XML so raw markup never shows in the live bubble.
function stripToolCalls(text) {
  return text ? text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim() : ''
}

// Duration (ms) for the scrambled-text decode effect on streaming tokens
const SCRAMBLE_DURATION_MS = 40

const THINKING_PHRASES = [
  'Thinking…',
  'Consulting the oracle…',
  'Reticulating splines…',
  'Asking the void…',
  'Summoning neurons…',
  'Herding tokens…',
  'Calculating vibes…',
  'Brewing ideas…',
  'Untangling context…',
  'Loading wisdom…',
]

function ThinkingBubble() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % THINKING_PHRASES.length)
        setVisible(true)
      }, 300)
    }, 2200)
    return () => clearInterval(cycle)
  }, [])

  return (
    <div className="message message--thinking">
      <div className="message__bubble">
        <span className={`thinking-label thinking-label--cycling${visible ? ' thinking-label--in' : ' thinking-label--out'}`}>
          {THINKING_PHRASES[index]}
        </span>
      </div>
    </div>
  )
}

function ChatView() {
  const { activeSession, messages, setMessages, createSession, saveMessage, addLocalMessage, renameSession } = useSession()
  const [loading, setLoading] = useState(false)
  // streamingAgent: { content, agent } | null — live agent response shown while SSE is in flight
  const [streamingAgent, setStreamingAgent] = useState(null)
  // Active run steps state
  const [runMode, setRunMode] = useState('direct')
  const [runStep, setRunStep] = useState(null)
  const [showRunSteps, setShowRunSteps] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, streamingAgent])

  async function handleSend({ text, files, collection, agent }) {
    if (!text.trim() && files.length === 0) return

    // Ensure a session exists; capture its id immediately (don't rely on
    // context state which won't flush until after this render cycle).
    const isNewSession = !activeSession
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
          const history = messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
          let streamedAnswer = ''
          const toolsCalled = []

          // Show a live streaming bubble for this agent
          setStreamingAgent({ content: '', agent })

          try {
            for await (const event of runAgent(agent.id, {
              message: userContent,
              history,
              context: ragContext,
              collection: collection || undefined,
              session_id: sessionId,
            })) {
              if (event.type === 'token') {
                // Hide run steps as soon as we get content
                if (!streamedAnswer && showRunSteps) setShowRunSteps(false)
                streamedAnswer += event.content
                setStreamingAgent({ content: streamedAnswer, agent })
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
            streamedAnswer = `Could not reach apex-agents. Is it running on port 8003? (${err.message})`
            setStreamingAgent({ content: streamedAnswer, agent })
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
            setShowRunSteps(false)
            const gen = await generate(userContent, ragResult.context ?? '', history)
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
          setShowRunSteps(false)
          try {
            const gen = await generate(userContent, ragResult.context ?? '', history)
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
            setShowRunSteps(false)
            const gen = await generate(userContent, '', history)
            answer = gen.answer
          } catch {
            setShowRunSteps(false)
            answer = 'Could not reach the LLM gateway. Is apex-gateway running on port 8002?'
          }
          await saveMessage('assistant', answer, undefined, undefined, sessionId)
        }
      }

      // Auto-title the session from the first message
      if (isNewSession && userContent) {
        renameSession(sessionId, userContent.slice(0, 60)).catch(() => {})
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

  return (
    <div className="chat-view">
      <div className="messages">
        <div className="messages-inner">
          {messages.length === 0 && !loading && (
            <div className="chat-empty-membrane">
              <MembraneSpinner size={80} />
              <p className="chat-empty-membrane__label">
                Ask anything. Attach a KB folder to ground answers in your documents.
              </p>
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
          {loading && !streamingAgent && !showRunSteps && <ThinkingBubble />}
          {streamingAgent && (
            <div className="message message--assistant">
              <div className="message__stack">
                <div className="message__context-label">
                  <span className="message__context-label__item" style={{ color: streamingAgent.agent.color }}>
                    <span className="message__context-dot" style={{ background: streamingAgent.agent.color }} />
                    {streamingAgent.agent.name}
                  </span>
                </div>
                <div className="message__bubble"
                  style={{ '--agent-color': streamingAgent.agent.color, borderColor: streamingAgent.agent.color }}>
                  {stripToolCalls(streamingAgent.content)
                    ? <ScrambledText text={stripToolCalls(streamingAgent.content)} scrambleDuration={SCRAMBLE_DURATION_MS} />
                    : <span className="thinking-label">Using tools…</span>}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="chat-bar-outer">
        <ChatBar onSend={handleSend} loading={loading} />
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
        <ThemeToggle theme={theme} onToggle={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} />
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
  const [healthChecked, setHealthChecked] = useState(false)
  const [showHealthCheck, setShowHealthCheck] = useState(true)

  // Show health check on first visit (regardless of auth state)
  useEffect(() => {
    const checked = sessionStorage.getItem('apex_health_checked')
    if (checked) {
      setHealthChecked(true)
      setShowHealthCheck(false)
    }
  }, [])

  function handleHealthReady() {
    setHealthChecked(true)
    setShowHealthCheck(false)
    sessionStorage.setItem('apex_health_checked', '1')
  }

  if (loading) return <div className="app-loading">Loading…</div>

  // Show health check overlay before anything else
  if (showHealthCheck && !healthChecked) {
    return <ServiceHealthCheck onReady={handleHealthReady} />
  }

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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
