"""
Apex Gateway entry point.

Run (from inside apex-gateway/ with venv active):
  python server.py
  # or:
  python -m uvicorn server:app --reload --port 8002
"""
from apex_gateway.main import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    from apex_gateway.config import settings

    uvicorn.run("server:app", host=settings.host, port=settings.port, reload=True)
