"""Basic smoke tests for apex-gateway (no Ollama required)."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from apex_gateway.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_generate_calls_llm():
    mock_llm = MagicMock(return_value="42 is the answer.")
    with patch("apex_gateway.main.get_llm", return_value=mock_llm):
        resp = client.post(
            "/generate",
            json={"question": "What is the answer?", "context": "The answer is 42."},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "42 is the answer."
    assert data["question"] == "What is the answer?"


def test_generate_missing_question():
    resp = client.post("/generate", json={"context": "some context"})
    assert resp.status_code == 422
