from unittest.mock import patch

import pytest

from backend.core.config import settings
from backend.core.llm import create_chat_model


def test_create_chat_model_uses_fast_litellm_alias(monkeypatch):
    monkeypatch.setattr(settings, "litellm_api_base", "https://litellm.example.test/")
    monkeypatch.setattr(settings, "litellm_api_key", "test-master-key")
    monkeypatch.setattr(settings, "litellm_model_fast", "fast")

    with patch("backend.core.llm.ChatOpenAI") as chat_openai:
        create_chat_model("fast", temperature=0.0)

    kwargs = chat_openai.call_args.kwargs
    assert kwargs["base_url"] == "https://litellm.example.test"
    assert kwargs["api_key"].get_secret_value() == "test-master-key"
    assert kwargs["model"] == "fast"
    assert kwargs["temperature"] == 0.0


def test_create_chat_model_uses_think_litellm_alias(monkeypatch):
    monkeypatch.setattr(settings, "litellm_api_base", "https://litellm.example.test")
    monkeypatch.setattr(settings, "litellm_api_key", "test-master-key")
    monkeypatch.setattr(settings, "litellm_model_think", "think")

    with patch("backend.core.llm.ChatOpenAI") as chat_openai:
        create_chat_model("think")

    assert chat_openai.call_args.kwargs["model"] == "think"
    assert "temperature" not in chat_openai.call_args.kwargs


@pytest.mark.parametrize("missing", ["base", "key"])
def test_create_chat_model_requires_litellm_configuration(monkeypatch, missing):
    monkeypatch.setattr(
        settings,
        "litellm_api_base",
        "" if missing == "base" else "https://litellm.example.test",
    )
    monkeypatch.setattr(
        settings, "litellm_api_key", "" if missing == "key" else "test-master-key"
    )

    with pytest.raises(RuntimeError, match="LiteLLM configuration missing"):
        create_chat_model("fast")
