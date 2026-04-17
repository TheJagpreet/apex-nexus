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

export default function MessageBubble({ message }) {
  const { role, content, files, sources, agent, collection, tools_called } = message
  const [showSources, setShowSources] = useState(false)
  const displayContent = role === 'assistant' ? stripToolCalls(content) : content

  const agentColor = agent?.color
  const hasContext = agent || collection

  return (
    <div className={`message message--${role}`}>
      <div className="message__stack">
        {/* Agent / collection label — dot + name above the bubble */}
        {hasContext && (
          <div className="message__context-label">
            {agent && (
              <span className="message__context-label__item" style={{ color: agentColor }}>
                <span className="message__context-dot" style={{ background: agentColor }} />
                {agent.name}
              </span>
            )}
            {collection && (
              <span className="message__context-label__item message__context-label__item--collection">
                <FolderIcon />
                {collection}
              </span>
            )}
          </div>
        )}

        {/* Bubble — outlined in agent color when an agent/collection is active */}
        <div
          className="message__bubble"
          style={agentColor ? { '--agent-color': agentColor, borderColor: agentColor } : undefined}
        >
          {/* File tags — shown inside user messages when files were attached */}
          {role === 'user' && files && files.length > 0 && (
            <div className="message__files">
              {files.map(name => (
                <span key={name} className="message__file-tag">
                  [{name}]
                </span>
              ))}
            </div>
          )}

          {/* Message text — markdown-rendered for assistant, plain for user */}
          {role === 'assistant'
            ? <Markdown>{displayContent}</Markdown>
            : displayContent}

          {/* Tools called — small chips below assistant message */}
          {role === 'assistant' && tools_called && tools_called.length > 0 && (
            <div className="message__tool-chips">
              {[...new Set(tools_called)].map(tool => (
                <span key={tool} className="message__tool-chip">
                  <WrenchIcon />
                  {tool}
                </span>
              ))}
            </div>
          )}

          {/* Sources disclosure — assistant messages only */}
          {role === 'assistant' && sources && sources.length > 0 && (
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
        </div>{/* end message__bubble */}
      </div>{/* end message__stack */}
    </div>
  )
}
