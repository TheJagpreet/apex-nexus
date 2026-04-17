# CLAUDE.md — apex-portal

React 18 + Vite chat interface. Auth, chat sessions, knowledge base management, agent interactions.

## Commands

```bash
# From this directory (apps/apex-portal/)
npm install
npm run dev       # port 5173
npm run build
npm run preview
```

Or from repo root: `make dev-portal` / `make build`

## Architecture

React 18 + react-router-dom v6. Four top-level routes:

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `LoginPage` | JWT auth |
| `/signup` | `SignupPage` | Registration |
| `/` | Chat layout | Sidebar + ChatArea + ChatBar |
| `/kb` | `KnowledgeBasePage` | Collections + file upload (SSE progress) |
| `/agents` | `AgentsPage` | Agent list + editor |

## State Management

- `AuthContext` (`src/context/AuthContext.jsx`) — JWT token + user profile
- `SessionContext` (`src/context/SessionContext.jsx`) — active session + messages

## API Layer

All service calls go through `src/api/`:

| Module | Service | Port |
|--------|---------|------|
| `identity.js` | apex-identity | 8001 |
| `rag.js` | apex-rag | 8000 |
| `gateway.js` | apex-gateway | 8002 |
| `agents.js` | apex-agents | 8003 |

Service URLs come from `VITE_*` env vars. Never hardcode service URLs in components.

## ChatBar — @mention

Typing `@` opens an agent picker with colored dots. Selecting an agent:
1. Adds a chip to the input
2. Routes the message through `agents.js` → `runAgent()` SSE stream
3. Streams tokens into the chat area

## Design System

All UI decisions (colors, typography, spacing) are in [../../docs/DESIGN.md](../../docs/DESIGN.md). **Every UI change must reference this file.**

## Key Files

- `src/App.jsx` — router setup
- `src/main.jsx` — React entry point
- `src/index.css` — global styles + CSS variables
- `src/components/ChatBar.jsx` — message input + @mention picker
- `src/components/Sidebar.jsx` — session list
- `src/components/MessageBubble.jsx` — chat message renderer
- `src/components/Markdown.jsx` — markdown renderer for assistant responses
- `src/components/ThemeToggle.jsx` — light/dark mode

## Environment

Copy `.env.example` → `.env`. All four `VITE_*` URLs must be set.

## Code Quality

No linter or test suite configured. Consider ESLint + Vitest for future additions.
