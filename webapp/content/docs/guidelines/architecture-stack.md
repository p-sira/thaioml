---
title: System Architecture & Infrastructure Stack
description: Canonical production infrastructure and deployment architecture across Cloudflare, Google Cloud Run, and Supabase.
---

# System Architecture & Infrastructure Stack

ThaiOML is built as a decoupled, multi-tier system engineered for static resilience, high availability, edge delivery, and zero-idle hosting costs.

```
┌─────────────────────────────────────────────────────────┐
│                    Public Users / Edge                  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│        Tier 1: Frontend & Editorial Studio (Cloudflare)  │
│  - Next.js 16 + React 19 + Fumadocs                      │
│  - Deployed on Cloudflare Workers via OpenNext          │
│  - Static documentation, MDX pages, and Server Actions  │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
               ▼ (Clerk JWT via /api/chat) │ (Octokit GitHub commits)
┌──────────────────────────────┐           ▼
│  Tier 2: AI & RAG Backend    │   ┌──────────────────────────────┐
│  - FastAPI (Python 3.13)     │   │   GitHub (Source of Truth)   │
│  - Hosted on Google Cloud Run│   │   - Articles & Guidelines    │
│  - Scale-to-zero compute     │   │   - Editorial Pull Requests  │
└──────────────┬───────────────┘   └──────────────────────────────┘
               │
               ▼ (SQLAlchemy + psycopg 3 / Session Pooler)
┌─────────────────────────────────────────────────────────┐
│        Tier 3: Database & Vector Storage (Supabase)     │
│  - Managed PostgreSQL 16                                │
│  - pgvector: Vector embeddings & similarity search      │
│  - pg_trgm: Fuzzy search for SNOMED CT terminology      │
└─────────────────────────────────────────────────────────┘
```

---

## Tier 1: Frontend & CMS (Cloudflare Workers)

* **Framework:** Next.js 16 (App Router), React 19, Fumadocs, Tailwind CSS v4.
* **Hosting Platform:** **Cloudflare Workers** using `@opennextjs/cloudflare`.
* **Runtime:** Node.js compatibility (`compatibility_flags: ["nodejs_compat"]`).
* **Role:**
  * Serves the public medical knowledgebase with statically generated and incremental edge responses.
  * Hosts ThaiOML Studio (`/cms` and `/editorial`), managing medical article editorial lifecycles.
  * Proxies AI chat sessions to Tier 2 via Next.js route handlers (`/api/chat`).
* **Configuration:** [wrangler.jsonc](file:///home/psira/Code/web/thaioml/webapp/wrangler.jsonc) and [open-next.config.ts](file:///home/psira/Code/web/thaioml/webapp/open-next.config.ts).

---

## Tier 2: Search, Terminology & RAG Backend (Google Cloud Run)

* **Framework:** FastAPI, Python 3.13, managed with `uv`.
* **Hosting Platform:** **Google Cloud Run** (`asia-southeast1` / Singapore or Jakarta).
* **Execution Model:** Fully serverless container that scales to zero instances when idle, incurring zero baseline server costs.
* **Role:**
  * **RAG Retrieval:** Vector similarity search using LangChain and Hugging Face embeddings.
* **LLM Synthesis:** Synthesizes responses through a private LiteLLM Proxy using
  the stable Fast and Think model aliases.
  * **Terminology Lookup:** Fuzzy trigram search against SNOMED CT clinical terms.
  * **Authorization:** Validates Clerk JWT tokens against Clerk's JWKS endpoint before executing protected routes.
* **Containerization:** Multi-stage build via [backend/Dockerfile](file:///home/psira/Code/web/thaioml/backend/Dockerfile) with Astral `uv`.

---

## Tier 3: Vector & Terminology Database (Supabase)

* **Platform:** Managed PostgreSQL 16 on **Supabase**.
* **Required Extensions:**
  * `vector` (`pgvector`): Stores document embeddings and vector index.
  * `pg_trgm`: Powers trigram similarity index for SNOMED concept searches.
* **Connection Routing:**
  * Must connect via Supabase's **Session Pooler** (`aws-0-[region].pooler.supabase.com:6543`) with `?sslmode=require` to ensure IPv4 cloud compatibility and persistent pooling.
  * Driver prefix: `postgresql+psycopg://`.

---

## LLM Gateway & Billing Control Plane

FastAPI sends generation requests to a private LiteLLM Proxy on Google Cloud Run
using only the `fast` and `think` aliases. LiteLLM routes requests to OpenRouter (or
approved future providers), applies defensive budgets, and persists its operational
state in a dedicated Neon Postgres database. Supabase continues to hold SNOMED,
vectors, entitlements, and the application usage ledger.

Stripe owns Lite and Pro subscription state. FastAPI verifies Stripe webhooks and
enforces the corresponding weekly allowance. Full governance is defined in
[LLM Access and Billing Architecture](./llm-access-and-billing-architecture.md).

---

## Supporting Services

* **Identity & Authentication:** [Clerk](https://clerk.com) — Single source of truth for user identities, roles, and cryptographic JWT sessions.
* **Analytics & Telemetry:** [PostHog](https://posthog.com) — Privacy-first, server-side and client-side telemetry.
* **LLM / Embedding Providers:** OpenRouter (text generation) and Hugging Face (embeddings).
* **LLM Gateway:** LiteLLM Proxy on Google Cloud Run with dedicated Neon Postgres
  persistence. See [LLM Access and Billing Architecture](./llm-access-and-billing-architecture.md).
* **Billing:** Stripe owns commercial state; FastAPI enforces entitlements and
  reconciles usage in Supabase.

---

## Environment Configuration

| Variable | Location | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Cloudflare Worker / Webapp | Clerk public key for auth UI |
| `CLERK_SECRET_KEY` | Cloudflare Secret (`wrangler secret put`) | Clerk backend verification key |
| `THAIOML_BOT_GITHUB_TOKEN` | Cloudflare Secret (`wrangler secret put`) | GitHub Personal Access Token for CMS commits |
| `NEXT_PUBLIC_API_URL` | Cloudflare Worker (`vars`) | Public URL pointing to Google Cloud Run |
| `BACKEND_URL` | Cloudflare Worker (`vars`) | Internal/Server URL pointing to Google Cloud Run |
| `DATABASE_URL` | Cloud Run Secret | Supabase connection string (`postgresql+psycopg://...`) |
| `LITELLM_API_BASE` | Cloud Run Secret | Private LiteLLM Proxy URL |
| `LITELLM_API_KEY` | Cloud Run Secret | Server-side LiteLLM virtual key |
| `LITELLM_MODEL_FAST` | Cloud Run Environment Variable | Stable Fast alias (default `fast`) |
| `LITELLM_MODEL_THINK` | Cloud Run Environment Variable | Stable Think alias (default `think`) |
| `LITELLM_DATABASE_URL` | LiteLLM Cloud Run Secret | Dedicated Neon connection used only by LiteLLM |
| `HUGGINGFACE_API_KEY_EMBEDDING` | Cloud Run Secret | Hugging Face embedding API key |
| `CLERK_JWKS_URL` | Cloud Run Environment Variable | JWKS endpoint for Clerk JWT verification |
