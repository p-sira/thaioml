from typing import Literal

from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from backend.core.config import settings

ModelCapability = Literal["fast", "think"]


def create_chat_model(
    capability: ModelCapability, *, temperature: float | None = None
) -> ChatOpenAI:
    """Create a chat client for a stable capability exposed by LiteLLM."""
    if not settings.litellm_api_base or not settings.litellm_api_key:
        raise RuntimeError(
            "LiteLLM configuration missing. Set LITELLM_API_BASE and "
            "LITELLM_API_KEY."
        )

    models = {
        "fast": settings.litellm_model_fast,
        "think": settings.litellm_model_think,
    }
    model = models[capability]
    if not model:
        raise RuntimeError(f"LiteLLM model alias is empty for capability: {capability}")

    kwargs: dict = {
        "base_url": settings.litellm_api_base.rstrip("/"),
        "api_key": SecretStr(settings.litellm_api_key),
        "model": model,
    }
    if temperature is not None:
        kwargs["temperature"] = temperature

    return ChatOpenAI(**kwargs)
