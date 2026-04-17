"""Configuration for apex-gateway, loaded from environment / .env."""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    ollama_host: str = field(
        default_factory=lambda: os.getenv("APEX_GW_OLLAMA_HOST", "http://localhost:11434")
    )
    ollama_model: str = field(
        default_factory=lambda: os.getenv("APEX_GW_OLLAMA_MODEL", "gemma4:e2b")
    )
    host: str = field(default_factory=lambda: os.getenv("APEX_GW_HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("APEX_GW_PORT", "8002")))
    cors_origins: list[str] = field(
        default_factory=lambda: os.getenv(
            "APEX_GW_CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
        ).split(",")
    )
    # URL of the apex-agents service (informational; gateway does not proxy to it)
    agents_url: str = field(
        default_factory=lambda: os.getenv("APEX_GW_AGENTS_URL", "http://localhost:8003")
    )


settings = Settings()
