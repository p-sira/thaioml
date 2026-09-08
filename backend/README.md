# ThaiOML Backend

This is the FastAPI backend for ThaiOML. It handles RAG (Retrieval-Augmented Generation) and SNOMED CT terminology lookups.

## Setup

1. Install dependencies via `uv`:
   ```bash
   uv sync
   ```

2. **SNOMED CT Lookup Feature**: 
   - Ensure the Postgres database has the `pg_trgm` extension installed to enable fuzzy searching on SNOMED terms. The ingestion script will attempt to create it automatically: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
   - Place the SNOMED RF2 release files in the `backend/data/` directory.
   - Run the ingestion script: `uv run ingest` (or `python src/backend/scripts/ingest_snomed.py`)

3. Start the server:
   ```bash
   uv run backend
   ```
