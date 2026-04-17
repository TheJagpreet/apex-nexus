const BASE = import.meta.env.VITE_AGENTS_URL || 'http://localhost:8003'

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

/** List all agents (summary). Returns AgentSummary[]. */
export async function listAgents() {
  return handleResponse(await fetch(`${BASE}/agents`))
}

/** Get full agent detail including system_prompt, tools, handoffs. */
export async function getAgent(id) {
  return handleResponse(await fetch(`${BASE}/agents/${id}`))
}

/** Create a new agent. data: { id, name, description, color, system_prompt, tools, handoffs } */
export async function createAgent(data) {
  return handleResponse(await fetch(`${BASE}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }))
}

/** Update an existing agent. data: partial AgentUpdate fields. */
export async function updateAgent(id, data) {
  return handleResponse(await fetch(`${BASE}/agents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }))
}

/** Delete a custom agent. Throws if it's a built-in. */
export async function deleteAgent(id) {
  return handleResponse(await fetch(`${BASE}/agents/${id}`, { method: 'DELETE' }))
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

/** List all tools (built-in + custom). Returns ToolInfo[]. */
export async function listTools() {
  return handleResponse(await fetch(`${BASE}/tools`))
}

/** Save a new custom tool. data: { id, name, description, code } */
export async function createTool(data) {
  return handleResponse(await fetch(`${BASE}/tools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }))
}

/** Update a custom tool. data: { name?, description?, code? } */
export async function updateTool(id, data) {
  return handleResponse(await fetch(`${BASE}/tools/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }))
}

/** Delete a custom tool. Throws if it's a built-in. */
export async function deleteTool(id) {
  return handleResponse(await fetch(`${BASE}/tools/${id}`, { method: 'DELETE' }))
}

/**
 * Test a tool code snippet in the backend sandbox.
 * Returns { success: bool, output: string, error: string }
 */
export async function testTool(code, input = {}) {
  return handleResponse(await fetch(`${BASE}/tools/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, input }),
  }))
}

// ---------------------------------------------------------------------------
// Agent run — SSE streaming
// ---------------------------------------------------------------------------

/**
 * Run an agent and return an async generator of parsed SSE event objects.
 *
 * Usage:
 *   for await (const event of runAgent('research-assistant', { message: '...' })) {
 *     if (event.type === 'token') ...
 *     if (event.type === 'done')  ...
 *   }
 *
 * Event shapes:
 *   { type: 'token',    content: string }
 *   { type: 'tool_use', tool: string, input: object }
 *   { type: 'handoff',  to: string, prompt: string }
 *   { type: 'done',     answer: string }
 *   { type: 'error',    detail: string }
 */
export async function* runAgent(agentId, payload) {
  const res = await fetch(`${BASE}/agents/${agentId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''   // keep incomplete last line

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim()
        if (!raw || raw === '[DONE]') continue
        try {
          yield JSON.parse(raw)
        } catch {
          // malformed line — skip
        }
      }
    }
  }
}

export async function agentsHealth() {
  return handleResponse(await fetch(`${BASE}/health`))
}
