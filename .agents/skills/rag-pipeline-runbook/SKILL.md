---
name: rag-pipeline-runbook
description: Run, test, or debug ThaiOML's FastAPI RAG, ingestion, vector search, and SNOMED terminology services.
---

# RAG Pipeline Runbook

Before changing backend integration or deployment behavior, read [reference/architecture-stack.md](../../../reference/architecture-stack.md). The FastAPI backend is decoupled from the statically generated frontend, which must remain publishable when the backend is unavailable.

## Local operation

- Manage Python dependencies with `uv` only.
- Configure secrets and service URLs through environment variables. Never embed a local or production database URL in code or instructions.
- Start the API from the repository root with `make dev-backend`.
- Run backend tests with `make test-backend`, or a focused test with `cd backend && uv run pytest <path>`.
- Use the configured `DATABASE_URL`; confirm the target before migrations, ingestion, or destructive database operations.

The current terminology endpoints are `POST /snomed-suggest` and `POST /auto-link`. Inspect `backend/src/backend/api/routes.py` for request models, authentication, and response contracts rather than relying on copied examples.

## Database and ingestion work

Apply `supabase` for Supabase-specific operations and `supabase-postgres-best-practices` before changing Postgres schemas, migrations, queries, indexes, RLS, or pgvector behavior.

For document ingestion:

- Preserve Markdown heading boundaries where practical.
- Carry the metadata fields used by current retrieval filters and record management.
- Keep stable source identifiers so incremental cleanup can replace changed chunks.
- Derive chunk sizing from the embedding model and retrieval tests rather than treating a fixed token range as a repository invariant.

Verify API changes with focused tests. Verify ingestion changes against a disposable or explicitly approved database target and report the target used.
