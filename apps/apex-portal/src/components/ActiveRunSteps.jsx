import { useEffect, useRef, useState } from 'react'

const STEP_CONFIGS = {
  rag: [
    { id: 'keywords',  label: 'Extract keywords' },
    { id: 'query_kb',  label: 'Query knowledge base' },
    { id: 'context',   label: 'Build LLM context' },
    { id: 'generate',  label: 'Generate response' },
  ],
  agent: [
    { id: 'context',   label: 'Prepare context' },
    { id: 'agent',     label: 'Run agent' },
    { id: 'tools',     label: 'Execute tools' },
    { id: 'generate',  label: 'Generate response' },
  ],
  direct: [
    { id: 'context',   label: 'Build context' },
    { id: 'generate',  label: 'Generate response' },
  ],
}

function StepDot({ state }) {
  if (state === 'done') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (state === 'active') {
    return (
      <span style={{
        display: 'block', width: 8, height: 8, borderRadius: '50%',
        border: '1.5px solid var(--accent)',
        animation: 'run-steps-pulse 1.1s ease-in-out infinite',
      }} />
    )
  }
  // pending
  return (
    <span style={{
      display: 'block', width: 8, height: 8, borderRadius: '50%',
      border: '1.5px solid var(--border-strong)',
    }} />
  )
}

export default function ActiveRunSteps({ mode = 'direct', activeStep = null, visible = true }) {
  const steps = STEP_CONFIGS[mode] || STEP_CONFIGS.direct
  const [fadeOut, setFadeOut] = useState(false)
  // Track elapsed time per completed step
  const [times, setTimes] = useState({})
  const startTimes = useRef({})

  useEffect(() => {
    setFadeOut(!visible)
  }, [visible])

  // Record when a step starts; record elapsed when it finishes
  useEffect(() => {
    if (!activeStep) return
    if (!startTimes.current[activeStep]) {
      startTimes.current[activeStep] = Date.now()
    }
    // Finish the previous step
    const activeIdx = steps.findIndex(s => s.id === activeStep)
    if (activeIdx > 0) {
      const prevId = steps[activeIdx - 1].id
      if (startTimes.current[prevId] && !times[prevId]) {
        const elapsed = ((Date.now() - startTimes.current[prevId]) / 1000).toFixed(1) + 's'
        setTimes(prev => ({ ...prev, [prevId]: elapsed }))
      }
    }
  }, [activeStep]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeIdx = steps.findIndex(s => s.id === activeStep)

  return (
    <div className={`run-steps ${fadeOut ? 'run-steps--fade-out' : ''}`}>
      {steps.map((step, i) => {
        let state = 'pending'
        if (activeIdx >= 0) {
          if (i < activeIdx) state = 'done'
          else if (i === activeIdx) state = 'active'
        }
        return (
          <div key={step.id} className={`run-steps__step run-steps__step--${state}`}>
            <div className="run-steps__dot"><StepDot state={state} /></div>
            <span className="run-steps__num mono">{String(i + 1).padStart(2, '0')}</span>
            <span className="run-steps__label">{step.label}</span>
            {times[step.id] && (
              <span className="run-steps__time mono">{times[step.id]}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

