"""Logging settings — read from environment with APEX_LOG_ prefix."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class LoggingSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APEX_LOG_", env_file=".env", extra="ignore")

    level: str = "INFO"
    format: str = "console"        # "console" | "json"
    otlp_endpoint: str = ""        # e.g. "http://localhost:4318" — empty disables OTel
    otlp_insecure: bool = True
    service_version: str = "0.1.0"
