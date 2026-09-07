---
name: rag-pipeline-runbook
description: >-
  Instructions for starting and interacting with the FastAPI Retrieval-Augmented Generation (RAG) backend.
  Use this when tasked with testing the vector database, ingestion, or search APIs.
---

# RAG Pipeline Runbook

The ThaiOML RAG pipeline operates entirely independently of the static frontend. It uses `FastAPI`, `LangChain`, and `pgvector`.

## 1. Local Environment Requirements
To test the pipeline locally, you need the PostgreSQL `pgvector` container running.
If you are inside the VS Code Devcontainer, it is already running.
If you are operating directly on a host, start it via:
```bash
docker compose -f .devcontainer/docker-compose.yml up db -d
```
*Note: Connection string is always `postgresql://postgres:postgres@localhost:5432/thaioml`*

## 2. Running the Backend Server
The backend is managed with `uv`. To start the FastAPI server:
```bash
make dev-backend
```
*(This translates to `cd backend && uv run uvicorn main:app --reload`)*

The server will be available at `http://localhost:8000`. You can access the interactive Swagger UI at `http://localhost:8000/docs` to test ingestion and retrieval endpoints manually if needed.

## 3. Ingestion Rules
When building or debugging the ingestion scripts (which chunk markdown and send to pgvector), ensure:
- Chunk boundaries respect Markdown headings and clinical subsections.
- Chunk sizes are between 300-800 tokens.
- All YAML frontmatter metadata (doc_id, title, specialty, type) is injected into the vector metadata payload so it can be used for filtering during search.
