from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/thaioml"
    openrouter_api_key_rag: str = ""
    openrouter_model_rag: str = "qwen/qwen-2.5-72b-instruct:free"
    huggingface_api_key_embedding: str = ""

    # SNOMED Lookup Feature
    openrouter_api_key_lookup: str = ""
    openrouter_model_lookup: str = "qwen/qwen-2.5-72b-instruct:free"

    model_config = SettingsConfigDict(
        env_file="../.env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
