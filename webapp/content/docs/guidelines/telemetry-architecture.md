---
title: Telemetry Architecture
description: Guidelines and architectural overview for telemetry and analytics tracking in ThaiOML.
---

# Telemetry Architecture

ThaiOML utilizes PostHog to track telemetry, usage analytics, and feature engagement across all system components. Analytics integration follows a **Privacy First** approach.

## 1. Core Principles

- **Privacy First (Opt-in Tracking):** Client-side tracking is strictly opt-in. PostHog SDKs are initialized with `opt_out_capturing_by_default: true`. Tracking is only enabled once the user explicitly accepts cookies via the consent banner.
- **Unified Event Taxonomy:** Maintain consistent event names (e.g., `ask_library_query_submitted`, `title_check_performed`, `auto_link_used`) across all platforms.
- **Identity Resolution:** For authenticated workflows (e.g., in the Next.js webapp or FastAPI backend), tie events to the user's Clerk `sub` (Subject ID) instead of arbitrary anonymous IDs. This prevents double-counting and ensures cross-device tracking.

## 2. Platform Integrations

### Next.js Webapp
- **Integration:** Handled by `posthog-js` on the client.
- **Initialization:** Managed by the `PostHogProvider` wrapped in `layout.tsx`.
- **Consent:** Governed by the `CookieBanner` component, saving consent state in `localStorage('cookie_consent')`.

### MkDocs Frontend
- **Integration:** Implemented via vanilla JavaScript in `docs/docs/javascripts/analytics.js`.
- **Consent:** Incorporates a native DOM cookie consent banner. 
- **Configuration:** The `POSTHOG_API_KEY` is injected into the build via `mkdocs.yml` environment variables.

### FastAPI Backend
- **Integration:** Utilizes the `posthog` Python SDK.
- **Usage:** Server-side events are triggered for API-driven features to ensure accuracy regardless of client-side ad blockers. Key events tracked:
  - `/query` & `/chat`: `ask_library_query_submitted` and `ask_library_chat_submitted`.
  - `/snomed-suggest`: `title_check_performed`.
  - `/auto-link`: `auto_link_used`.
