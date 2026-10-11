# System Architecture and Infrastructure

ThaiOML uses a decoupled three-tier architecture. Git remains the source of truth for published content.

## Frontend and editorial studio

- `webapp/` uses Next.js 16, React 19, Fumadocs, and Tailwind CSS v4.
- Cloudflare Workers hosts the application through OpenNext with Node.js compatibility.
- Fumadocs compiles Markdown and MDX from `webapp/content/docs/`; documentation pages do not query PostgreSQL at runtime.
- ThaiOML Studio manages editorial files through GitHub-backed server actions.
- Relevant deployment configuration lives in `webapp/wrangler.jsonc` and `webapp/open-next.config.ts`.

## AI, search, and terminology backend

- `backend/` uses FastAPI on Python 3.13 and is managed with `uv`.
- Google Cloud Run hosts the containerized service and may scale it to zero.
- The backend provides RAG retrieval, LLM synthesis, SNOMED CT lookup, and automatic terminology linking.
- Protected routes verify Clerk JWTs before applying role dependencies.
- The public content build and publishing workflow must remain functional when this service is unavailable.

## Data tier

- Supabase PostgreSQL stores terminology and vector data.
- `pgvector` supports embedding search; `pg_trgm` supports fuzzy terminology lookup.
- The backend connects through SQLAlchemy and psycopg using `DATABASE_URL`.
- Production connections use the configured Supabase pooler and TLS. Do not encode a region, hostname, credential, or local fallback in application code.
- SNOMED tables are accessed through FastAPI and trusted database ingestion connections. Keep RLS enabled, revoke table privileges from `PUBLIC`, `anon`, and `authenticated`, and retain restrictive deny policies for the two API roles. Clerk authorization remains in FastAPI; browser clients do not query these tables directly.
- Primary keys supply the SNOMED ID indexes. Do not add duplicate indexes on `snomed_concepts.concept_id` or `snomed_descriptions.id`.
- SNOMED ingestion validates a complete International RF2 Snapshot locally, then atomically replaces active terminology with COPY into the existing tables. Release refreshes preserve RLS and indexes, remove retired records, and reject a replacement whose projected total database size reaches 460,000,000 bytes. The upload requires a maintenance window and temporary disk headroom for rollback.

## Supporting services

- Clerk is the authority for identities, sessions, and roles.
- PostHog provides client and server telemetry.
- GitHub stores canonical articles, editorial drafts, and governance content.
- OpenRouter and Hugging Face provide model and embedding services where configured.

## Configuration contract

Keep environment-specific values in environment variables or deployment secrets. Common variables include:

| Variable | Consumer | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Webapp | Public Clerk configuration |
| `CLERK_SECRET_KEY` | Webapp server | Clerk server operations |
| `THAIOML_BOT_GITHUB_TOKEN` | Webapp server | Editorial GitHub operations |
| `NEXT_PUBLIC_API_URL` | Webapp | Browser-visible backend URL |
| `BACKEND_URL` | Webapp server | Server-side backend URL |
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `OPENROUTER_API_KEY_RAG` | Backend | RAG generation provider |
| `HUGGINGFACE_API_KEY_EMBEDDING` | Backend | Embedding provider |
| `CLERK_JWKS_URL` | Backend | JWT verification endpoint |

Before adding a variable, check existing settings and deployment configuration. Publicly prefixed values must never contain secrets.
