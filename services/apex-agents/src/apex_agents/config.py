"""Configuration for apex-agents, loaded from environment / .env."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APEX_AGENTS_", env_file=".env", extra="ignore")

    host: str = "0.0.0.0"
    port: int = 8003
    db_url: str = "sqlite:///./apex_agents.db"
    gateway_url: str = "http://localhost:8002"
    rag_url: str = "http://localhost:8000"
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    # Stored as a comma-separated string so .env doesn't need JSON syntax.
    # Use .cors_origins_list() wherever a list is needed.
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
