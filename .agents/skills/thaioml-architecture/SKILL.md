---
name: thaioml-architecture
description: Modify ThaiOML's cross-tier architecture, deployment boundaries, service responsibilities, or environment contracts.
---

# ThaiOML Architecture

Read [reference/architecture-stack.md](../../../reference/architecture-stack.md) before changing responsibilities or communication between the webapp, FastAPI backend, GitHub content store, and Supabase PostgreSQL.

Preserve the static publishing boundary, Clerk's authority over identity and roles, and environment-based service configuration. Inspect the current implementation before relying on a path, version, or deployment detail from the reference.

When a change is local to a specialist domain, also apply its focused skill, such as `frontend-architecture-workflow`, `rag-pipeline-runbook`, `auth-architecture-workflow`, or `telemetry-architecture-workflow`.
