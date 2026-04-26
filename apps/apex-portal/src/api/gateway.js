const BASE = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8002'

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(parseDetail(err.detail, res.statusText))
  }
  return res.json()
}

function parseDetail(detail, fallback) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(d => {
      const field = Array.isArray(d.loc) ? d.loc.filter(p => p !== 'body').join('.') : ''
      return field ? `${field}: ${d.msg}` : d.msg
    }).join('; ')
  }
  return fallback || 'Request failed'
}

/**
 * Generate an LLM answer from retrieved context.
 * Returns { question, answer, model }
 */
export async function generate(question, context, history = []) {
  return handleResponse(await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context, history }),
  }))
}

/**
 * Extract search keywords from a user question for RAG retrieval.
 * Returns { keywords: "keyword1 keyword2 ..." }
 */
export async function extractKeywords(question) {
  return handleResponse(await fetch(`${BASE}/keywords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  }))
}

export async function gatewayHealth() {
  return handleResponse(await fetch(`${BASE}/health`))
}
