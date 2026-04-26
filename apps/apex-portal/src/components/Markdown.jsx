/**
 * Lightweight markdown renderer — zero external dependencies.
 *
 * Supported syntax:
 *   # ## ###  headings
 *   **bold**  *italic*  ***bold-italic***
 *   `inline code`
 *   ```fenced code blocks```
 *   - / * bullet lists   1. numbered lists
 *   > blockquote
 *   --- horizontal rule
 *   Blank lines → paragraph breaks
 *
 * Safety: input HTML is escaped before any rendering, so injected tags
 * from user/LLM content cannot reach the DOM.
 */

const T = '\x00' // placeholder delimiter (never appears in normal text)

function escape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function mdToHtml(raw) {
  if (!raw) return ''

  // 1 — escape user HTML first
  let s = escape(raw)

  // 2 — fenced code blocks  ``` ... ```  (preserve newlines inside)
  s = s.replace(/```(?:\w*)\n([\s\S]*?)```/g, (_, code) =>
    `${T}PRE${T}${code.trimEnd()}${T}/PRE${T}`)

  // 3 — inline code
  s = s.replace(/`([^`\n]+)`/g, `${T}CODE${T}$1${T}/CODE${T}`)

  // 4 — bold + italic, bold, italic
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, `${T}B${T}${T}I${T}$1${T}/I${T}${T}/B${T}`)
  s = s.replace(/\*\*(.+?)\*\*/g,     `${T}B${T}$1${T}/B${T}`)
  s = s.replace(/\*([^*\n]+)\*/g,     `${T}I${T}$1${T}/I${T}`)

  // 5 — headings (must come after inline so ** inside headings work)
  s = s.replace(/^### (.+)$/gm, `${T}H3${T}$1${T}/H3${T}`)
  s = s.replace(/^## (.+)$/gm,  `${T}H2${T}$1${T}/H2${T}`)
  s = s.replace(/^# (.+)$/gm,   `${T}H1${T}$1${T}/H1${T}`)

  // 6 — blockquote  (> was already escaped to &gt;)
  s = s.replace(/^&gt; (.+)$/gm, `${T}BQ${T}$1${T}/BQ${T}`)

  // 7 — horizontal rule
  s = s.replace(/^---+$/gm, `${T}HR${T}`)

  // 8 — bullet lists  (group consecutive lines)
  s = s.replace(/((?:^[-*] .+(?:\n|$))+)/gm, (match) => {
    const items = match.trim().split('\n').filter(Boolean)
      .map(l => `${T}LI${T}${l.replace(/^[-*] /, '')}${T}/LI${T}`)
      .join('')
    return `${T}UL${T}${items}${T}/UL${T}\n`
  })

  // 9 — numbered lists
  s = s.replace(/((?:^\d+\. .+(?:\n|$))+)/gm, (match) => {
    const items = match.trim().split('\n').filter(Boolean)
      .map(l => `${T}LI${T}${l.replace(/^\d+\. /, '')}${T}/LI${T}`)
      .join('')
    return `${T}OL${T}${items}${T}/OL${T}\n`
  })

  // 10 — paragraphs: split on blank lines, skip already-block content
  const BLOCK_RE = new RegExp(`^${T}(?:H[1-3]|UL|OL|PRE|HR|BQ)`)
  s = s.split(/\n{2,}/)
    .map(para => {
      para = para.trim()
      if (!para) return ''
      if (BLOCK_RE.test(para)) return para
      // Soft line breaks within a paragraph
      return `${T}P${T}${para.replace(/\n/g, `${T}BR${T}`)}${T}/P${T}`
    })
    .filter(Boolean)
    .join('\n')

  // 11 — resolve placeholders → real HTML
  s = s
    .replace(new RegExp(`${T}PRE${T}([\\s\\S]*?)${T}\\/PRE${T}`, 'g'), '<pre><code>$1</code></pre>')
    .replace(new RegExp(`${T}CODE${T}(.*?)${T}\\/CODE${T}`, 'g'),      '<code>$1</code>')
    .replace(new RegExp(`${T}B${T}([\\s\\S]*?)${T}\\/B${T}`, 'g'),     '<strong>$1</strong>')
    .replace(new RegExp(`${T}I${T}([\\s\\S]*?)${T}\\/I${T}`, 'g'),     '<em>$1</em>')
    .replace(new RegExp(`${T}H3${T}(.*?)${T}\\/H3${T}`, 'g'),          '<h3>$1</h3>')
    .replace(new RegExp(`${T}H2${T}(.*?)${T}\\/H2${T}`, 'g'),          '<h2>$1</h2>')
    .replace(new RegExp(`${T}H1${T}(.*?)${T}\\/H1${T}`, 'g'),          '<h1>$1</h1>')
    .replace(new RegExp(`${T}BQ${T}(.*?)${T}\\/BQ${T}`, 'g'),          '<blockquote>$1</blockquote>')
    .replace(new RegExp(`${T}HR${T}`, 'g'),                             '<hr>')
    .replace(new RegExp(`${T}UL${T}([\\s\\S]*?)${T}\\/UL${T}`, 'g'),   '<ul>$1</ul>')
    .replace(new RegExp(`${T}OL${T}([\\s\\S]*?)${T}\\/OL${T}`, 'g'),   '<ol>$1</ol>')
    .replace(new RegExp(`${T}LI${T}([\\s\\S]*?)${T}\\/LI${T}`, 'g'),   '<li>$1</li>')
    .replace(new RegExp(`${T}P${T}([\\s\\S]*?)${T}\\/P${T}`, 'g'),     '<p>$1</p>')
    .replace(new RegExp(`${T}BR${T}`, 'g'),                             '<br>')

  return s
}

import { useEffect, useRef } from 'react'

const COPY_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
const CHECK_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`

export default function Markdown({ children }) {
  const ref = useRef(null)
  const html = mdToHtml(typeof children === 'string' ? children : String(children ?? ''))

  useEffect(() => {
    if (!ref.current) return
    ref.current.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.md-copy')) return
      const btn = document.createElement('button')
      btn.className = 'md-copy'
      btn.title = 'Copy'
      btn.innerHTML = COPY_SVG
      btn.addEventListener('click', () => {
        const text = pre.querySelector('code')?.innerText || pre.innerText
        navigator.clipboard.writeText(text).then(() => {
          btn.innerHTML = CHECK_SVG
          btn.classList.add('md-copy--ok')
          setTimeout(() => { btn.innerHTML = COPY_SVG; btn.classList.remove('md-copy--ok') }, 1600)
        }).catch(() => {})
      })
      pre.appendChild(btn)
    })
  }, [html])

  return <div className="md" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
}
