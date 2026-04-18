# /playwright — Apex Nexus UI Testing

Use this skill to test the Apex Portal UI with Playwright. All screenshots and snapshots are saved to `.playwright-mcp/` (git-ignored).

## How to use

Invoke this skill with a description of what to test:

```
/playwright test the agent @mention flow and verify SSE streaming works
/playwright check that KB file upload shows progress and completes
/playwright verify login, signup, and sign-out work correctly
```

## What to do when invoked

1. **Navigate** to `http://localhost:5173` (start `make dev` or `.\scripts\dev.ps1` first if not running)
2. **Log in** as `testuser` / `testpass` — create the account via the signup page if it doesn't exist
3. **Test the described feature** using the Playwright MCP tools
4. **Take screenshots** with `browser_take_screenshot` to document results — they land in `.playwright-mcp/`
5. **Report** pass/fail with specific observations and any bugs found

## Services that must be running

| Service | Port | Start |
|---------|------|-------|
| apex-portal | 5173 | `make dev-portal` |
| apex-identity | 8001 | `make dev-identity` |
| apex-gateway | 8002 | `make dev-gateway` |
| apex-agents | 8003 | `make dev-agents` |
| apex-rag | 8000 | `make dev-rag` |

Or start all at once: `make dev` / `.\scripts\dev.ps1`

## Artifact locations

All Playwright output goes to `.playwright-mcp/` (configured in `.mcp.json` via `--output-dir`):

- **Screenshots**: `browser_take_screenshot` → `.playwright-mcp/<filename>.png`
- **Snapshots**: `browser_snapshot` → `.playwright-mcp/<filename>.yml`

This folder is git-ignored so test artifacts never pollute commits.

## Key test flows

### Auth
- Sign up with a new user → should redirect to chat
- Log in with existing user → should show session list
- Sign out → should return to login page

### Chat
- Send a direct message → gateway streams a response
- Attach a KB folder (paperclip) → RAG-scoped response with sources
- Type `@` → agent picker appears; select Research Assistant → agent chip added; send → SSE stream with `tool_use` tags

### Knowledge Base (`/kb`)
- Create a collection, upload a `.txt` file → ingest progress SSE shown
- Switch to collection in chat → RAG response with citations

### Agents (`/agents`)
- View built-in agents (cannot delete)
- Create a custom agent → appears in list and `@mention` picker
- Edit tools/system prompt → changes persist after reload

### web_search (Research Assistant)
- Select Research Assistant, ask a current-events question
- Expect: `web_search` tool tag + factual answer (not "unable to find")

## Bug reporting

For each bug found, report:
- **What**: the observed behaviour
- **Expected**: what should happen
- **Screenshot**: path in `.playwright-mcp/`
- **Fix applied** (if fixed inline): file + line changed
