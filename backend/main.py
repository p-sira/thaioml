from fastapi import FastAPI
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/thaioml"
    openai_api_key: str = ""

settings = Settings()
app = FastAPI(title="ThaiOML RAG API")

@app.get("/")
def read_root():
    return {"message": "Welcome to ThaiOML RAG API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
