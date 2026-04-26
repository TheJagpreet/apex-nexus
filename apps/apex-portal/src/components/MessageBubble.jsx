import { useState } from 'react'
import Markdown from './Markdown'

function stripToolCalls(text) {
  if (!text) return text
  return text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim()
}

function FolderIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9 9 2 12l7 3 3 7 3-7 7-3-7-3z" />
    </svg>
  )
}

export default function MessageBubble({ message }) {
  const { role, content, files, sources, agent, collection, tools_called } = message
  const [showSources, setShowSources] = useState(false)
  const displayContent = role === 'assistant' ? stripToolCalls(content) : content

  if (role === 'user') {
    return (
      <div className="message message--user fade-in">
        <div className="message__avatar">
          {message.userInitial || 'J'}
        </div>
        <div className="message__stack">
          <div className="message__header">
            <span className="message__name">You</span>
            <span className="message__time mono">{formatTime()}</span>
          </div>
          <div className="message__body">
            {files && files.length > 0 && (
              <div className="message__files">
                {files.map(name => (
                  <span key={name} className="message__file-tag">[{name}]</span>
                ))}
              </div>
            )}
            {displayContent}
          </div>
        </div>
      </div>
    )
  }

  if (role === 'system' || role === 'error') {
    return (
      <div className={`message message--${role}`}>
        <div className="message__stack">
          <div className="message__bubble">{displayContent}</div>
        </div>
      </div>
    )
  }

  // assistant
  return (
    <div className="message message--assistant fade-in">
      {/* Sparkle avatar — no color */}
      <div className="message__avatar message__avatar--apex">
        <SparkleIcon />
      </div>
      <div className="message__stack">
        {/* Header: Apex · tag · time */}
        <div className="message__header">
          <span className="message__name">Apex</span>
          {agent && (
            <span className="tag dot" style={{ color: 'var(--accent)', borderColor: 'var(--accent-line)' }}>
              {agent.name}
            </span>
          )}
          {collection && !agent && (
            <span className="tag">
              <FolderIcon /> {collection}
            </span>
          )}
          {!agent && !collection && (
            <span className="tag dot" style={{ color: 'var(--accent)', borderColor: 'var(--accent-line)' }}>
              RAG
            </span>
          )}
          <span className="message__time mono" style={{ marginLeft: 'auto' }}>
            {/* timing shown in sources line if available */}
          </span>
        </div>

        {/* Body */}
        <div className="message__body">
          <Markdown>{displayContent}</Markdown>

          {tools_called && tools_called.length > 0 && (
            <div className="message__tool-chips">
              {[...new Set(tools_called)].map(tool => (
                <span key={tool} className="message__tool-chip">
                  <WrenchIcon /> {tool}
                </span>
              ))}
            </div>
          )}

          {sources && sources.length > 0 && (
            <div className="message__sources">
              <button
                className="message__sources-toggle"
                onClick={() => setShowSources(s => !s)}
              >
                {showSources ? 'hide sources' : `${sources.length} source${sources.length > 1 ? 's' : ''}`}
              </button>
              {showSources && (
                <div className="message__sources-list">
                  {sources.map((src, i) => {
                    const label = src.source || src.id || `chunk ${i + 1}`
                    const score = typeof src.score === 'number' ? ` (${src.score.toFixed(3)})` : ''
                    return (
                      <div key={src.id ?? i} className="message__source-item">
                        {label}{score}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

