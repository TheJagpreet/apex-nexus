const BASE = import.meta.env.VITE_IDENTITY_URL || 'http://localhost:8001'

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  return res.json()
}

// Auth
export async function login(username, password) {
  return handleResponse(await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }))
}

export async function register(username, email, password, displayName) {
  return handleResponse(await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, display_name: displayName }),
  }))
}

export async function getMe(token) {
  return handleResponse(await fetch(`${BASE}/auth/me`, { headers: authHeaders(token) }))
}

// Sessions
export async function listSessions(token) {
  return handleResponse(await fetch(`${BASE}/sessions`, { headers: authHeaders(token) }))
}

export async function createSession(token, title = 'New conversation') {
  return handleResponse(await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  }))
}

export async function getSession(token, sessionId) {
  return handleResponse(await fetch(`${BASE}/sessions/${sessionId}`, {
    headers: authHeaders(token),
  }))
}

export async function updateSessionTitle(token, sessionId, title) {
  return handleResponse(await fetch(`${BASE}/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  }))
}

export async function deleteSession(token, sessionId) {
  const res = await fetch(`${BASE}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(res.statusText)
}

// Messages
export async function addMessage(token, sessionId, role, content, sources, files) {
  return handleResponse(await fetch(`${BASE}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ role, content, sources: sources ?? null, files: files ?? null }),
  }))
}
