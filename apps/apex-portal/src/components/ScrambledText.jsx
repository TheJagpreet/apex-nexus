/**
 * ScrambledText — settled text + a window of randomly flickering glyphs at the frontier.
 * Creates the illusion of an LLM generating meaning out of randomness.
 *
 * Props:
 *   text        — the settled text so far (grows as tokens arrive)
 *   lookahead   — how many scrambled chars to show past the settled frontier (default 5)
 *   streaming   — set false when stream is complete to drop the lookahead (default true)
 *   className
 */
import { useEffect, useRef, useState } from 'react'

const GLYPHS = '░▒▓█▀▄▌▐│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌αβγδεζηθλμξπσφψω∂∆∑∏∫≈≠≤≥⊕⊗⊂⊃∈∉∀∃¿¬¶§†‡°•◊※⌘⌥⏎⌫✦✧❖⟐⟑⬡⬢⎔⎕⌬01010110100101'

function rand() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
}

export default function ScrambledText({ text = '', lookahead = 5, streaming = true, className = '' }) {
  const [displayed, setDisplayed] = useState(text)
  const rafRef = useRef(null)
  const textRef = useRef(text)
  const streamingRef = useRef(streaming)

  // Update refs synchronously during render so the rAF tick always reads the
  // latest values (useEffect would be one paint too late).
  textRef.current = text
  streamingRef.current = streaming

  useEffect(() => {
    function tick() {
      const t = textRef.current
      const s = streamingRef.current
      if (s && t.length > 0) {
        // settled text + lookahead random chars flickering at the frontier
        const extra = Array.from({ length: lookahead }, rand).join('')
        setDisplayed(t + extra)
      } else {
        setDisplayed(t)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  // lookahead is stable; only re-mount if it changes
  }, [lookahead])

  return <span className={`scrambled-text ${className}`}>{displayed || text}</span>
}
