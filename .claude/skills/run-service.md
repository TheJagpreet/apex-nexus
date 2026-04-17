---
name: run-service
description: Start a specific Apex Nexus service by name (rag, identity, gateway, agents, portal)
---

# Run Service

Start a named apex-nexus service in development mode.

## Usage

```
/run-service <name>
```

Where `<name>` is one of: `rag`, `identity`, `gateway`, `agents`, `portal`

## Behavior

1. Verify the service directory exists under `services/<name>` or `apps/<name>`
2. Check that the virtualenv / node_modules are installed (prompt if not)
3. Run the appropriate start command:

| Service | Command |
|---------|---------|
| rag | `cd services/apex-rag && .venv/bin/python server.py` |
| identity | `cd services/apex-identity && .venv/bin/python -m apex_identity.main` |
| gateway | `cd services/apex-gateway && .venv/bin/python server.py` |
| agents | `cd services/apex-agents && .venv/bin/python server.py` |
| portal | `cd apps/apex-portal && npm run dev` |

## Shortcuts

- `make dev-rag` / `make dev-identity` / `make dev-gateway` / `make dev-agents` / `make dev-portal`
- `make dev` — start all five in parallel
