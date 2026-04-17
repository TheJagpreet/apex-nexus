/**
 * ScrambledText — shows incoming text with a scrambled "decoding" effect.
 * Characters that haven't settled yet show random symbols, creating the
 * illusion of an LLM generating meaning from randomness.
 */
import { useEffect, useRef, useState } from 'react'

const GLYPHS = '░▒▓█▀▄▌▐│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌αβγδεζηθλμξπσφψω∂∆∑∏∫≈≠≤≥⊕⊗⊂⊃∈∉∀∃¿¬¶§†‡°•◊※⌘⌥⏎⌫✦✧❖⟐⟑⬡⬢⎔⎕⌬'

function getRandomGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
}

export default function ScrambledText({ text, scrambleDuration = 60, className = '' }) {
  const [displayed, setDisplayed] = useState('')
  const prevLenRef = useRef(0)
  const settledRef = useRef(0)
  const frameRef = useRef(null)
  const scrambleMapRef = useRef(new Map()) // index -> { target, remaining }

  useEffect(() => {
    if (!text) {
      setDisplayed('')
      prevLenRef.current = 0
      settledRef.current = 0
      scrambleMapRef.current.clear()
      return
    }

    const prevLen = prevLenRef.current
    const newLen = text.length

    // Mark newly arrived characters for scrambling
    for (let i = prevLen; i < newLen; i++) {
      // scrambleDuration in ms per character, converted to frames (~16ms each)
      const frames = Math.max(2, Math.floor(scrambleDuration / 16))
      scrambleMapRef.current.set(i, { target: text[i], remaining: frames })
    }
    prevLenRef.current = newLen

    function tick() {
      const map = scrambleMapRef.current
      const chars = text.split('')

      let anyActive = false
      for (const [idx, entry] of map.entries()) {
        if (entry.remaining > 0) {
          chars[idx] = getRandomGlyph()
          entry.remaining--
          anyActive = true
        } else {
          chars[idx] = entry.target
          // Don't delete — keep for reference
        }
      }

      setDisplayed(chars.join(''))

      if (anyActive) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        // Clean settled entries
        for (const [idx, entry] of map.entries()) {
          if (entry.remaining <= 0) {
            settledRef.current = Math.max(settledRef.current, idx + 1)
          }
        }
      }
    }

    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [text, scrambleDuration])

  return <span className={`scrambled-text ${className}`}>{displayed || text}</span>
}
