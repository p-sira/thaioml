---
title: LLM Access and Billing Architecture
description: Canonical governance for LiteLLM access, Stripe subscriptions, usage accounting, and retention.
---

# LLM Access and Billing Architecture

This guideline is the canonical source for paid AI access and billing behavior.
Static medical publishing must remain available independently of LiteLLM, model
providers, Stripe, or the billing ledger.

## Service and data ownership

- **Clerk** owns identity and roles. Use only the immutable user ID from a verified
  token; never trust a customer or user ID from the browser.
- **Stripe** owns Products, Prices, subscriptions, invoices, and payments. Existing
  Lite and Pro Price IDs are allowlisted server-side.
- **FastAPI** projects Stripe state into entitlements, reserves usage atomically,
  invokes LiteLLM, and finalizes the application usage ledger.
- **Supabase** stores ThaiOML application data, SNOMED CT, RAG vectors,
  entitlements, subscription projections, and the application usage ledger.
- **LiteLLM Proxy** owns provider routing, model mappings, virtual keys, defensive
  budgets, and normalized provider spend. Only backend services may call it.
- **Neon** is dedicated to LiteLLM operational persistence. LiteLLM migrations must
  never target Supabase; ThaiOML Alembic migrations must never target Neon.

All provider, LiteLLM, database, and Stripe secrets belong in the cloud secret
store. They must not reach browsers, Clerk metadata, source control, telemetry, or
billing metadata.

## Plans, models, and allowances

- Stripe bills the existing **Lite** and **Pro** subscriptions monthly.
- Each plan has a versioned weekly allowance; Pro has the larger limit.
- Allowances are determined empirically so monthly revenue is at least twice the
  worst-case total cost at maximum use: a 100% markup or 50% gross margin.
- Lite-to-Pro upgrades apply the Pro limit immediately without double-granting
  credits used that week. Pro-to-Lite downgrades apply next monthly period.
- Exhaustion is a hard stop; no silent overage is permitted.
- **Fast** maps to `fast` and costs one credit. **Think** maps to `think` and costs
  five credits. The weight is versioned and changes only prospectively.
- SNOMED authoring is organization-funded and never deducts personal allowances.

Application code must use only `fast` or `think`. Provider models and fallbacks
belong in reviewed LiteLLM configuration.

## Request accounting and Stripe

FastAPI verifies Clerk identity and atomically reserves credits before invoking
LiteLLM. Calls carry an internal request ID and non-sensitive attribution. Success
finalizes actual usage; idempotency prevents retries from charging twice. LiteLLM
budgets are defense in depth, not a replacement for application entitlements.

Checkout and Customer Portal sessions are authenticated server operations. Stripe
webhooks are verified from their raw body and processed idempotently despite
duplicates or reordering. Redirects never grant access by themselves.

ThaiOML currently operates as a Thai sole proprietorship below THB 1.8 million in
annual revenue and is not VAT-registered. Use Stripe native receipts without
charging VAT, and never label those receipts as Thai tax invoices. Monitor revenue
and alert before the threshold. Localized Thai e-Tax Invoice/e-Receipt integration
through verified Stripe webhooks is deferred until the business approaches
mandatory registration and professional Thai tax review approves activation.

## Privacy and retention

Prompts, responses, retrieved medical context, diagnoses, bearer tokens, and secrets
must never be stored in billing records, Stripe metadata, or financial telemetry.

- Detailed usage and full webhook payloads are retained for 120 days.
- Reconciliation evidence and financial records are retained for 10 years, subject
  to any longer mandatory period identified by Thai legal/accounting review.
- At day 120, an idempotent job replaces direct user/customer identifiers with a
  keyed HMAC pseudonym and removes IP addresses, user agents, request metadata,
  provider payload fragments, free text, and full webhook payloads.
- The HMAC key is versioned in the cloud secret store and inaccessible to analytics.
  Scrubbing logs only counts and outcomes, never deleted values.
- Retained data is limited to pseudonymous and internal IDs, plan/model versions,
  billing windows, token/credit totals, monetary aggregates, minimally precise
  timestamps, variances, resolutions, and reconciliation state.
- Backup lifecycle and restoration controls must prevent expired unsanitized data
  from returning to general use.

## Reliability

LiteLLM targets 99.5% monthly uptime. Neon free-tier use requires a measured
capacity envelope and paid-tier trigger. LiteLLM or Neon failure must return a
controlled retryable AI error without affecting Supabase or static articles.
