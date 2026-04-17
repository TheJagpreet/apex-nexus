import { useEffect, useState, useRef } from 'react'
import { identityHealth } from '../api/identity'
import { ragHealth } from '../api/rag'
import { gatewayHealth } from '../api/gateway'
import { agentsHealth } from '../api/agents'
import { SynapseSpinner } from './Spinners'

const SERVICES = [
  { id: 'identity', name: 'Apex Identity', port: 8001, check: identityHealth },
  { id: 'rag',      name: 'Apex RAG',      port: 8000, check: ragHealth },
  { id: 'gateway',  name: 'Apex Gateway',   port: 8002, check: gatewayHealth },
  { id: 'agents',   name: 'Apex Agents',    port: 8003, check: agentsHealth },
]

export default function ServiceHealthCheck({ onReady }) {
  const [statuses, setStatuses] = useState(
    () => Object.fromEntries(SERVICES.map(s => [s.id, 'checking']))
  )
  const [allGreen, setAllGreen] = useState(false)
  const [fadeRows, setFadeRows] = useState(false)
  const [centerSpinner, setCenterSpinner] = useState(false)
  const [done, setDone] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function checkAll() {
      const results = {}
      await Promise.all(
        SERVICES.map(async (s) => {
          try {
            await s.check()
            results[s.id] = 'online'
          } catch {
            results[s.id] = 'offline'
          }
        })
      )
      if (!cancelled) {
        setStatuses(results)
      }
    }

    checkAll()
    intervalRef.current = setInterval(checkAll, 3000)

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Detect all services green
  useEffect(() => {
    const allOnline = SERVICES.every(s => statuses[s.id] === 'online')
    if (allOnline && !allGreen) {
      setAllGreen(true)
      if (intervalRef.current) clearInterval(intervalRef.current)
      // Fade out the service rows
      setTimeout(() => setFadeRows(true), 600)
      // Center the spinner
      setTimeout(() => setCenterSpinner(true), 1200)
      // Redirect
      setTimeout(() => {
        setDone(true)
        onReady?.()
      }, 2400)
    }
  }, [statuses, allGreen, onReady])

  if (done) return null

  return (
    <div className="health-check">
      <div className={`health-check__content ${centerSpinner ? 'health-check__content--centered' : ''}`}>
        <div className="health-check__spinner">
          <SynapseSpinner size={80} />
        </div>

        <div className={`health-check__services ${fadeRows ? 'health-check__services--hidden' : ''}`}>
          {SERVICES.map(s => (
            <div key={s.id} className="health-check__row">
              <span className="health-check__name">
                {s.name}
                <span className="health-check__port">:{s.port}</span>
              </span>
              <span className={`health-check__dot health-check__dot--${statuses[s.id]}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
