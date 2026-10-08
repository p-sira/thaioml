# ThaiOML Agent Guidelines

## 1. Core Principles
* Single Source of Truth: Git is the sole source of truth. Public governance lives in [webapp/content/docs/guidelines], while internal developer documentation lives in the project-root [reference] directory. Always read the relevant canonical source before modifying domain logic.
* Content Format: All content uses Markdown with YAML frontmatter. The public documentation site is statically generated via Next.js and Fumadocs; frontend pages never run runtime database queries.
* Decoupled Tiers: The static frontend ([webapp]) and AI/RAG backend ([backend]) are decoupled. Content publishing must never depend on backend availability.
  * Frontend: Next.js 16, React 19, Fumadocs, Tailwind CSS v4 on Cloudflare Workers via OpenNext.
  * Backend: FastAPI (Python 3.13) on Google Cloud Run.
  * Database: Supabase PostgreSQL with `pgvector` and `pg_trgm`.

## 2. Governance Context
* ThaiOML is an independent organization.
* Editorial Roles: Contributors draft, expert reviewers approve in ThaiOML Studio, and student editors merge changes.
* Review Metadata Always keep article YAML frontmatter `review_status` synchronized with this workflow.

## 3. Engineering Constraints
* Python Tooling: Use uv exclusively for Python dependency management, never pip.
* Auth & Roles: Clerk is the sole authority for identity and user roles. Next.js proxies forward Clerk JWTs to FastAPI role dependencies.
* Environment Configuration: Never hardcode environment-specific URLs (e.g., `localhost`). Use environment variables (such as `NEXT_PUBLIC_API_URL` and backend settings) across local, staging, and production.

## 4. Canonical Guideline Index
Inspect these canonical sources before executing domain tasks:
* [reference/architecture-stack.md]: Multi-tier infrastructure and deployment contracts.
* [reference/auth-architecture.md]: Clerk tokens, JWT templates, and role enforcement.
* [reference/frontend-architecture.md]: Fumadocs components, shared state, and theme setup.
* [reference/telemetry-architecture.md]: Analytics event schemas and client/server tracking.
* [webapp/content/docs/guidelines/author-guideline.md], [webapp/content/docs/guidelines/reviewer-guideline.md], [webapp/content/docs/guidelines/editor-guideline.md]: Content creation, peer review, and editorial approval.
