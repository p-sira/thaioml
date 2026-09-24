from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    openrouter_api_key_rag: str = ""
    openrouter_model_rag: str = "qwen/qwen-2.5-72b-instruct:free"
    huggingface_api_key_embedding: str = ""

    # SNOMED Lookup Feature
    openrouter_api_key_lookup: str = ""
    openrouter_model_lookup: str = "qwen/qwen-2.5-72b-instruct:free"
    snomed_db_download_url: str = ""
    snomed_db_auth_token: str = ""
    clerk_jwks_url: str = (
        "https://amused-hermit-586.clerk.accounts.dev/.well-known/jwks.json"
    )

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
