from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    huggingface_api_key_embedding: str = ""

    # OpenAI-compatible LiteLLM Proxy. Provider model names stay in LiteLLM config;
    # application code uses only these stable product aliases.
    litellm_api_base: str = ""
    litellm_api_key: str = ""
    litellm_model_fast: str = "fast"
    litellm_model_think: str = "think"

    # SNOMED Lookup Feature
    snomed_db_download_url: str = ""
    snomed_db_auth_token: str = ""
    clerk_jwks_url: str = (
        "https://amused-hermit-586.clerk.accounts.dev/.well-known/jwks.json"
    )

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore"
    )


# Values required by Settings are supplied from the deployment environment.
settings = Settings()  # pyright: ignore[reportCallIssue]
