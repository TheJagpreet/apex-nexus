const BASE = import.meta.env.VITE_RAG_URL || 'http://localhost:8000'

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  return res.json()
}

// Health
export async function ragHealth() {
  return handleResponse(await fetch(`${BASE}/health`))
}

// Query — returns { question, context, sources }
export async function query(question, topK = 5, collection = null) {
  return handleResponse(await fetch(`${BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, top_k: topK, collection }),
  }))
}

// Query a specific collection
export async function queryCollection(name, question, topK = 5) {
  return handleResponse(await fetch(`${BASE}/collections/${encodeURIComponent(name)}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, top_k: topK }),
  }))
}

// Collections (KB folders)
export async function listCollections() {
  return handleResponse(await fetch(`${BASE}/collections`))
}

export async function createCollection(name) {
  return handleResponse(await fetch(`${BASE}/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }))
}

export async function deleteCollection(name) {
  const res = await fetch(`${BASE}/collections/${encodeURIComponent(name)}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
}

export async function listFiles(collectionName) {
  return handleResponse(await fetch(`${BASE}/collections/${encodeURIComponent(collectionName)}/files`))
}

export async function deleteFile(collectionName, source) {
  const res = await fetch(`${BASE}/collections/${encodeURIComponent(collectionName)}/files`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
}

/**
 * Ingest a file into a collection with SSE progress.
 * onProgress(event) receives parsed JSON events from the server.
 * Returns total chunks ingested.
 */
export async function ingestToCollection(collectionName, file, onProgress) {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(
    `${BASE}/collections/${encodeURIComponent(collectionName)}/ingest`,
    { method: 'POST', body: form }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let chunks = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data: ')) {
        try {
          const event = JSON.parse(trimmed.slice(6))
          onProgress?.(event)
          if (event.stage === 'done') chunks = event.chunks ?? 0
          if (event.stage === 'error') throw new Error(event.message)
        } catch (e) {
          if (!(e instanceof SyntaxError)) throw e
        }
      }
    }
  }
  return chunks
}
