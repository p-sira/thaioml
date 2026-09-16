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
   - Place the SNOMED RF2 release files in the `backend/data/` directory.
   - Run the ingestion script: `uv run ingest` (or `python src/backend/scripts/ingest_snomed.py`)

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
