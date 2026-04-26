"""Unit tests for the LLM-powered semantic tagger."""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from apex_rag.ingestion.tagger import OllamaTagger, enrich_text_with_tags


def _make_ollama_response(tags: list[str]) -> MagicMock:
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {"response": json.dumps(tags)}
    return mock_resp


class TestEnrichTextWithTags:
    def test_appends_tags_to_text(self):
        result = enrich_text_with_tags("Hello world", ["greetings", "english"])
        assert result == "Hello world\n\nTopics: greetings, english"

    def test_empty_tags_returns_original(self):
        result = enrich_text_with_tags("Hello world", [])
        assert result == "Hello world"

    def test_single_tag(self):
        result = enrich_text_with_tags("text", ["nlp"])
        assert "Topics: nlp" in result


class TestOllamaTagger:
    @patch("apex_rag.ingestion.tagger.httpx.post")
    def test_tag_chunk_returns_list(self, mock_post):
        mock_post.return_value = _make_ollama_response(["machine-learning", "python", "data-science"])
        tagger = OllamaTagger(model="test-model", host="http://localhost:11434")
        tags = tagger.tag_chunk("Some text about machine learning in Python.")
        assert isinstance(tags, list)
        assert "machine-learning" in tags
        assert all(isinstance(t, str) for t in tags)

    @patch("apex_rag.ingestion.tagger.httpx.post")
    def test_tag_chunk_lowercases(self, mock_post):
        mock_post.return_value = _make_ollama_response(["MachineLearning", "PYTHON"])
        tagger = OllamaTagger(model="test-model", host="http://localhost:11434")
        tags = tagger.tag_chunk("text")
        assert all(t == t.lower() for t in tags)

    @patch("apex_rag.ingestion.tagger.httpx.post")
    def test_tag_chunk_returns_empty_on_network_error(self, mock_post):
        mock_post.side_effect = Exception("connection refused")
        tagger = OllamaTagger(model="test-model", host="http://localhost:11434")
        tags = tagger.tag_chunk("Some text")
        assert tags == []

    @patch("apex_rag.ingestion.tagger.httpx.post")
    def test_tag_chunk_handles_malformed_json(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {"response": "not valid json at all"}
        mock_post.return_value = mock_resp
        tagger = OllamaTagger(model="test-model", host="http://localhost:11434")
        tags = tagger.tag_chunk("text")
        assert tags == []

    @patch("apex_rag.ingestion.tagger.httpx.post")
    def test_tag_chunk_extracts_json_from_prose(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {"response": 'Here are the tags: ["nlp", "retrieval", "rag"]'}
        mock_post.return_value = mock_resp
        tagger = OllamaTagger(model="test-model", host="http://localhost:11434")
        tags = tagger.tag_chunk("text")
        assert "nlp" in tags
        assert "retrieval" in tags

    @patch("apex_rag.ingestion.tagger.httpx.post")
    def test_tag_chunks_batches_correctly(self, mock_post):
        mock_post.return_value = _make_ollama_response(["tag1", "tag2"])
        tagger = OllamaTagger(model="test-model", host="http://localhost:11434")
        results = tagger.tag_chunks(["chunk one", "chunk two", "chunk three"])
        assert len(results) == 3
        assert mock_post.call_count == 3

    @patch("apex_rag.ingestion.tagger.httpx.post")
    def test_tag_chunk_truncates_long_text(self, mock_post):
        mock_post.return_value = _make_ollama_response(["tag"])
        tagger = OllamaTagger(model="test-model", host="http://localhost:11434")
        long_text = "word " * 2000  # 10000 chars
        tagger.tag_chunk(long_text)
        called_json = mock_post.call_args[1]["json"]
        # Prompt should contain at most 3000 chars of the chunk
        assert len(called_json["prompt"]) < 10000 + 500  # prompt template overhead
