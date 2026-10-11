# ThaiOML Backend

This is the FastAPI backend for ThaiOML. It handles RAG (Retrieval-Augmented Generation) and SNOMED CT terminology lookups.

---

## 1. Local Development Setup

1. **Install dependencies via `uv`:**
   ```bash
   uv sync
   ```

2. **Configure Database (Local or Supabase):**
   Ensure PostgreSQL has the `vector` and `pg_trgm` extensions enabled.
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```
   Set `DATABASE_URL` in your `.env`:
   ```bash
   # Supabase Session Pooler format (IPv4 compatible):
   DATABASE_URL=postgresql+psycopg://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
   ```

3. **SNOMED CT Lookup Feature (Optional):**
   - Use the complete International RF2 **Snapshot** release, not Full or Delta files. Place exactly one `sct2_Concept_Snapshot_INT_<YYYYMMDD>.txt` and the matching `sct2_Description_Snapshot-en_INT_<YYYYMMDD>.txt` directly in `backend/data/`. Move the previous release files elsewhere.
   - The Supabase schema must already be initialized and migrated. The importer preserves the existing tables, indexes, grants, and RLS policies; it does not create a schema. `DATABASE_URL` must identify the intended database and a trusted role with permission to read, truncate, and load both SNOMED tables. A direct connection or session pooler is suitable.
   - From `backend/`, optionally validate without connecting to the database: `uv run ingest --validate-only`.
   - Run `uv run ingest`. It validates both files into a temporary local SQLite database, then replaces both tables in one PostgreSQL transaction using COPY. Updated terms and new IDs replace the previous release; inactive or absent records are removed. Active descriptions belonging to inactive concepts are excluded. There is no separate Supabase upload step.
   - Imports block SNOMED table access while uploading. Schedule a maintenance window and allow temporary server disk headroom for the old and replacement data plus WAL; the old files remain until commit to support rollback. Local staging also needs disk space for both parsed snapshots.
   - The importer verifies row counts and checks the projected total size of all PostgreSQL databases against **460,000,000 bytes** before committing. Failed validation, loading, or the size check leaves the previous release intact. It reports the measured total after commit; unrelated concurrent database growth can still exceed the limit. A larger release that cannot fit is rejected rather than partially imported.

   To use another directory: `uv run ingest --data-dir /path/to/snapshot-files`.

   Ingestion tests run with `uv run pytest -q tests/test_ingest_snomed.py`. Set `SNOMED_TEST_DATABASE_URL` to a disposable PostgreSQL database named `snomed_ingestion_test` to include database integration tests; those tests replace its SNOMED tables. They never use `DATABASE_URL`.

4. **Start the server:**
   ```bash
   uv run backend
   # or
   uv run uvicorn backend.main:app --reload --port 8080
   ```

---

## 2. Production Deployment (Google Cloud Run)

The backend is containerized via a multi-stage Dockerfile utilizing Astral's official `uv` image.

### Build and Test Container Locally
```bash
docker build -t thaioml-backend .
docker run -p 8080:8080 --env-file ../.env thaioml-backend
```

### Deploy to Google Cloud Run
Deploy directly from source with the Google Cloud CLI:
```bash
gcloud run deploy thaioml-backend \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json" \
  --set-secrets "DATABASE_URL=THAI_DB_URL:latest,OPENROUTER_API_KEY_RAG=OPENROUTER_API_KEY:latest,HUGGINGFACE_API_KEY_EMBEDDING=HF_API_KEY:latest"
```

Once deployed, copy the Cloud Run service URL (e.g. `https://thaioml-backend-xxx-as.a.run.app`) into `NEXT_PUBLIC_API_URL` and `BACKEND_URL` in `webapp/wrangler.jsonc`.
