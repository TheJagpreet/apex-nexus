"""Entry point — run with: python server.py"""
import uvicorn
from apex_agents.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "apex_agents.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
