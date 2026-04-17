import { useEffect, useState } from 'react'
import { BloomSpinner } from './Spinners'

const STEP_CONFIGS = {
  rag: [
    { id: 'keywords', label: 'Extracting keywords', icon: '⌬' },
    { id: 'query_kb', label: 'Querying knowledge base', icon: '◈' },
    { id: 'context',  label: 'Building LLM context', icon: '⟐' },
    { id: 'generate', label: 'Generating response', icon: '✦' },
  ],
  agent: [
    { id: 'context',  label: 'Preparing context', icon: '◈' },
    { id: 'agent',    label: 'Running agent', icon: '⬡' },
    { id: 'tools',    label: 'Executing tools', icon: '⌬' },
    { id: 'generate', label: 'Generating response', icon: '✦' },
  ],
  direct: [
    { id: 'context',  label: 'Building context', icon: '◈' },
    { id: 'generate', label: 'Generating response', icon: '✦' },
  ],
}

export default function ActiveRunSteps({ mode = 'direct', activeStep = null, visible = true }) {
  const steps = STEP_CONFIGS[mode] || STEP_CONFIGS.direct
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    setFadeOut(!visible)
  }, [visible])

  const activeIdx = steps.findIndex(s => s.id === activeStep)

  return (
    <div className={`run-steps ${fadeOut ? 'run-steps--fade-out' : ''}`}>
      {/* Left col — step rows */}
      <div className="run-steps__steps">
        {steps.map((step, i) => {
          let status = 'pending'
          if (activeIdx >= 0) {
            if (i < activeIdx) status = 'done'
            else if (i === activeIdx) status = 'active'
          }
          return (
            <div key={step.id} className={`run-steps__step run-steps__step--${status}`}>
              <span className="run-steps__icon">{step.icon}</span>
              <span className="run-steps__label">{step.label}</span>
              {status === 'done' && <span className="run-steps__check">✓</span>}
            </div>
          )
        })}
      </div>

      {/* Right col — bloom spinner */}
      <div className="run-steps__bloom">
        <BloomSpinner size={72} />
      </div>
    </div>
  )
}
