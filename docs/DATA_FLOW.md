# Data Flow — Apex Nexus

Detailed request lifecycle for every major user action.

## 1. Login

```
POST /auth/login  →  apex-identity
  Body: { username, password }
  Response: { access_token, token_type, user }
  Portal stores token in AuthContext (memory only — no localStorage)
```

## 2. Load Chat Session

```
GET /sessions           →  apex-identity  (list sessions)
GET /sessions/{id}      →  apex-identity  (messages for selected session)
```

## 3. Send a Chat Message (RAG flow)

```
User → ChatBar.submit()
  │
  ├─1─ POST /sessions/{id}/messages   apex-identity
  │    { role: "user", content: "..." }
  │
  ├─2─ POST /query                    apex-rag
  │    { question, top_k, collection? }
  │    ← { question, context: "chunk1\nchunk2...", sources: [{source, score}] }
  │
  ├─3─ POST /generate                 apex-gateway
  │    { question, context }
  │    ← { question, answer, model }
  │
  └─4─ POST /sessions/{id}/messages   apex-identity
       { role: "assistant", content: answer, sources: [...] }
```

## 4. Send a Message with @mention (Agent flow)

```
User types "@Planner explain the architecture"
ChatBar detects agent chip → routes to agents.js

  ├─1─ POST /sessions/{id}/messages   apex-identity  (save user msg)

  ├─2─ POST /agents/{id}/run          apex-agents    (SSE stream)
  │    { message, session_id, ... }
  │    
  │    apex-agents internal loop (LangGraph):
  │      LLM generates tokens → stream to portal
  │      LLM emits <tool_call>{"tool":"rag_query","input":{"query":"..."}}
  │        → POST /query  apex-rag   (internal)
  │        → result injected back to LLM context
  │      LLM emits <tool_call>{"tool":"llm_generate","input":{"prompt":"..."}}
  │        → POST /generate  apex-gateway  (internal)
  │      LLM emits <tool_call>{"tool":"handoff","input":{"to":"Architect"}}
  │        → restart loop with new agent
  │      LLM finishes → emit { type: "done", answer }
  │
  └─3─ POST /sessions/{id}/messages   apex-identity  (save agent response)

SSE event shapes:
  { type: "token",    content: "..." }           # streamed token
  { type: "tool_use", tool: "...", input: {} }   # tool dispatch notification
  { type: "handoff",  to: "...", prompt: "..." } # agent handoff
  { type: "done",     answer: "..." }            # final answer
  { type: "error",    detail: "..." }            # error
```

## 5. Upload a File (Knowledge Base)

```
User selects file + collection → KnowledgeBasePage.upload()

  POST /collections/{name}/ingest   apex-rag   (multipart/form-data)
  
  SSE progress stream:
    { stage: "loading",   progress: 10, filename }
    { stage: "chunking",  progress: 35, filename }
    { stage: "embedding", progress: 60, filename }
    { stage: "storing",   progress: 80, filename }
    { stage: "done",      progress: 100, chunks: N, filename }
    { stage: "error",     message: "..." }           # on failure
```

## 6. Create/Edit an Agent

```
POST /agents             apex-agents   (create)
PUT  /agents/{id}        apex-agents   (update)
DELETE /agents/{id}      apex-agents   (delete custom only)
```

## 7. Keyword Extraction (optional pre-search)

```
POST /keywords    apex-gateway
  { question }
  ← { keywords: "keyword1 keyword2 ..." }
  
Portal can use this to refine the RAG query before calling /query.
```
