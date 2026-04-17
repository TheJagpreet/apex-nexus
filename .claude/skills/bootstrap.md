---
name: bootstrap
description: First-time developer setup for apex-nexus — install deps, configure env, verify services start
---

# Bootstrap

Complete first-time setup for a new developer on apex-nexus.

## Usage

```
/bootstrap
```

## Steps

1. **Check prerequisites**
   - `uv` installed? → `uv --version`
   - `node` ≥ 20? → `node --version`
   - `ollama` running? → `curl http://localhost:11434/api/tags`

2. **Install dependencies**
   ```bash
   make setup
   ```

3. **Configure environment files**
   - Copy each `.env.example` → `.env` for all services and apps
   - Prompt user to set `SECRET_KEY` in `services/apex-identity/.env`
   - Show the secret generation command: `python -c "import secrets; print(secrets.token_urlsafe(64))"`

4. **Pull Ollama models** (if not already present)
   ```bash
   ollama pull gemma4:e4b
   ollama pull nomic-embed-text
   ```

5. **Verify health endpoints**
   - Start each service in background
   - Poll `/health` for each service
   - Report status

6. **Open portal**
   - `http://localhost:5173`

## Troubleshooting

- See [docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md) for common issues
- Ports: 8000 (rag), 8001 (identity), 8002 (gateway), 8003 (agents), 5173 (portal)
