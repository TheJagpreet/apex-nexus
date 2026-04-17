# Apex Portal

React 18 + Vite frontend for the Apex platform — a local-first RAG chat UI backed by [apex-rag](../apex-rag), [apex-identity](../apex-identity), [apex-gateway](../apex-gateway), and [apex-agents](../apex-agents).

## Demo

<video src="https://github.com/user-attachments/assets/6c94c5e6-35c1-46ca-8d57-44900bfd7c77" controls width="100%"></video>

## Features

- **Auth** — Login / signup via apex-identity (JWT stored in localStorage)
- **Session sidebar** — Create, switch, and delete chat conversations; messages persisted server-side
- **Chat** — Direct LLM answers with no KB attached; keyword-expanded RAG when a KB folder is scoped
- **@ Agent mention** — Type `@` in the chat input to pick an agent; the message is routed to apex-agents and streamed back token-by-token with a colored agent badge and name
- **Agent metadata persistence** — Agent badge, KB collection, and tools-called chips are stored in message sources and restored correctly when reopening a past session
- **Markdown rendering** — Assistant messages are rendered as formatted markdown (headings, bold/italic, code blocks, lists, blockquotes)
- **Tools called chips** — Small chips below each assistant response show which tools were invoked (e.g. `rag_query`, `web_fetch`)
- **Animated thinking indicator** — Cycles through a set of playful phrases while waiting for a response
- **Agents tab** — Two sub-tabs: **Agents** (view built-ins, create/edit custom agents, color picker, tools, handoffs) and **Tools** (write, test in sandbox, and save custom Python tools)
- **Knowledge Base tab** — Manage ChromaDB collections: create folders, drag-drop or click-to-upload files with live SSE progress bars, delete files
- **Collection scoping** — Attach a KB folder to a chat session; the portal extracts search keywords via the gateway before querying the vector store
- **Resizable panels** — Sidebar, KB folder pane, and Agents list pane all drag-to-resize, widths persisted to localStorage
- **Theme toggle** — Dark (default) / light; OpenCode-inspired terminal aesthetic

**Design reference:** [docs/DESIGN.md](docs/DESIGN.md) — all UI decisions (colors, typography, spacing, components) must reference this file.

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 |
| Routing | react-router-dom v6 |
| Build Tool | Vite 5 |
| Styling | Vanilla CSS with custom properties (no CSS framework) |
| Font | IBM Plex Mono / Berkeley Mono |

## Setup

```bash
npm install
```

Create `.env` in `apex-portal/`:

```
VITE_RAG_URL=http://localhost:8000
VITE_IDENTITY_URL=http://localhost:8001
VITE_GATEWAY_URL=http://localhost:8002
VITE_AGENTS_URL=http://localhost:8003
```

## Run

```bash
npm run dev      # dev server → http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build
```

## Service Dependencies

| Service | Port | Used for |
|---------|------|----------|
| apex-rag | 8000 | Document ingest, semantic search, collection management |
| apex-identity | 8001 | Auth, session and message persistence |
| apex-gateway | 8002 | LLM answer generation, keyword extraction |
| apex-agents | 8003 | Agent registry, @ mention execution, SSE streaming |

## Project Layout

```
src/
  api/
    identity.js        — auth, session, message calls (apex-identity)
    rag.js             — query, collection CRUD, SSE ingest (apex-rag)
    gateway.js         — LLM generate + keyword extraction (apex-gateway)
    agents.js          — agent CRUD, tool list, runAgent SSE generator (apex-agents)
  context/
    AuthContext.jsx    — JWT token, user info, login/logout/signup
    SessionContext.jsx — active session, messages, CRUD
  pages/
    LoginPage.jsx          — login form
    SignupPage.jsx          — registration form
    KnowledgeBasePage.jsx  — folder list + file upload with SSE progress
    AgentsPage.jsx         — agent list + editor (color, system prompt, tools, handoffs)
  components/
    Sidebar.jsx        — session list, new chat, Agents + KB links, user/logout, resizable
    ChatBar.jsx        — textarea + @ agent picker + KB collection picker + file attach
    MessageBubble.jsx  — message rendering: markdown, agent badge, tools chips, sources, collection label
    Markdown.jsx       — lightweight zero-dependency markdown → HTML renderer (XSS-safe)
    ThemeToggle.jsx
  App.jsx    — routing (/, /kb, /agents, /login, /signup) + auth gating + chat logic + ThinkingBubble
  main.jsx   — BrowserRouter + AuthProvider + SessionProvider
docs/
  DESIGN.md  — design system and component guidelines
  demo.mp4   — screen recording of the platform in action
```
