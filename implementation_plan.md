# LiteLLM and Stripe Integration Plan

## Status and approval gate

**Status:** Implementation started (Phase 1); product direction confirms Supabase remains the ThaiOML
application database (including SNOMED), Neon is dedicated to the new LiteLLM
Proxy, and the product uses Lite/Pro plans with Fast/Think model abstractions. No
production integration should begin until the remaining open decisions below are
approved.

This document is the implementation plan required before ThaiOML adopts a new
architecture or workflow. After approval, the durable architecture and operating
rules will be added to
`webapp/content/docs/guidelines/llm-access-and-billing-architecture.md`, and the
existing architecture document will link to that canonical guideline. Agent skills
must point to the canonical guideline rather than duplicate its rules.

## Objective

Introduce a self-hosted LiteLLM Proxy between ThaiOML's FastAPI services and model
providers so that ThaiOML can:

- centralize model routing, provider credentials, retries, fallbacks, and pricing;
- attribute model usage and cost to an immutable Clerk user and a Stripe customer;
- enforce prepaid or subscription allowances before expensive model calls;
- reconcile usage with Stripe without trusting browser-supplied identity or price
  data; and
- retain the current static-first publishing model and keep article publication
  independent of AI and billing availability.

The integration is for paid AI access, not for charging authors to publish or
placing canonical medical content behind a dynamic database dependency.

## Current-state findings

- The browser calls the Next.js `/api/chat` route, which obtains the
  `jwt-ask-library` Clerk token and proxies the request to FastAPI.
- FastAPI validates Clerk JWTs and currently authorizes chat by role.
- RAG and SNOMED enrichment instantiate `ChatOpenAI` directly against OpenRouter.
- Provider model names and API keys are application configuration, while usage,
  customer entitlements, and billing ledgers do not yet exist.
- The current production platform is Cloudflare Workers (web), Google Cloud Run
  (FastAPI), and Supabase Postgres. Supabase continues to host ThaiOML application
  data, vector storage, and SNOMED CT. The new LiteLLM Proxy uses a separate Neon
  Postgres database without moving those existing workloads.

## Recommended target architecture

```text
Browser
  -> Cloudflare Worker /api/chat (Clerk session and JWT)
  -> FastAPI AI API (authorization, entitlement reservation, RAG orchestration)
  -> LiteLLM Proxy (virtual key, model alias, budget/rate guard, cost record)
  -> OpenRouter initially; additional providers later

Stripe Checkout / Customer Portal
  -> Stripe-signed webhook
  -> billing service in FastAPI
  -> Supabase billing and entitlement tables

LiteLLM spend records
  -> idempotent reconciliation worker/job
  -> Supabase application usage ledger
  -> Stripe meter events only when metered overage is enabled

LiteLLM Proxy
  -> Neon LiteLLM-owned operational database
```

### Service boundaries

1. **Clerk owns identity and application roles.** Its immutable `user_id` is the
   principal attached to every AI request.
2. **Stripe owns commercial objects.** Stripe Products and Prices define what is
   sold; Subscriptions, Invoices, and Customer Portal define the payment lifecycle.
   The frontend never submits an authoritative price, allowance, or payment state.
3. **Supabase owns ThaiOML application data, SNOMED/vector storage, the entitlement
   projection, and the auditable application ledger.**
   Stripe webhook events are projected into local subscription status and plan
   entitlements. This projection is the low-latency authorization source for
   FastAPI, while Stripe remains authoritative for billing.
4. **LiteLLM owns model access policy and normalized provider cost accounting.** It
   receives only server-issued credentials. It does not replace Clerk, Stripe, or
   ThaiOML's financial ledger.
5. **FastAPI owns orchestration.** It maps an authenticated Clerk principal to the
   current entitlement, selects a stable LiteLLM model alias, reserves quota,
   invokes LiteLLM, and finalizes actual usage.
6. **Neon owns only LiteLLM's operational persistence.** LiteLLM migrations, virtual
   keys, budgets, and spend records use Neon. Neon is not the source of truth for
   SNOMED, RAG vectors, Stripe subscription state, or customer entitlements.

### Deployment recommendation

Deploy LiteLLM Proxy as a separate private Cloud Run service with a dedicated
service identity, health checks, minimum production availability appropriate to
the paid SLA, and autoscaling limits. Only the FastAPI service may invoke it. Keep
the LiteLLM master key and upstream provider keys in the cloud secret store; never
send a LiteLLM key to a browser or persist it in Clerk metadata.

Give LiteLLM a dedicated Neon project/database and least-privilege role. ThaiOML
Alembic migrations must continue to target Supabase and must never modify
LiteLLM-owned Neon tables. Conversely, LiteLLM migrations must never target
Supabase. Back up, restore, migrate, and rotate credentials for the two providers
independently.

Configure a pooled, TLS-required Neon connection for the serverless LiteLLM
workload, with a direct connection used only if LiteLLM's documented migration path
requires it. Validate connection, storage, compute, branch, backup/restore, and
egress limits against measured production demand; the free tier is a launch-cost
optimization, not an availability or capacity guarantee. Supabase connection and
extension requirements for SNOMED, `pg_trgm`, RAG vectors, and `pgvector` remain
unchanged.

## Commercial model

### Recommended launch model

Launch the two Stripe-defined subscription plans—**Lite** and **Pro**—with hard,
versioned weekly usage allowances, not immediate usage-based invoicing. Stripe
billing remains monthly, while each plan's usage balance resets weekly on a clearly
defined UTC boundary. Pro has a larger allowance than Lite; both allowance values
will be set empirically against measured worst-case usage. This gives users a
predictable bill while LiteLLM provides internal cost visibility. Reject requests
when no active entitlement or remaining allowance exists; do not silently incur
unbilled overages.

An upgrade from Lite to Pro applies the Pro usage limit immediately and must not
double-grant usage already consumed in the active weekly window. A scheduled
downgrade retains Pro access and limits through the end of the current monthly
Stripe subscription period; Lite begins at the next monthly period boundary. The
weekly usage window continues independently across that scheduled transition.

Add metered overage only after one complete shadow-accounting and reconciliation
cycle demonstrates that ThaiOML, LiteLLM, provider, and Stripe totals agree within
an approved tolerance. If overage is enabled, aggregate immutable ledger entries
into billable units and send idempotent Stripe meter events from a server-side job.

### Pricing method

For each model alias and plan, calculate:

```text
expected variable cost
  = input tokens * input provider rate
  + output tokens * output provider rate
  + provider-specific request/tool charges

minimum unit price
  = (expected variable cost + allocated platform cost)
    / (1 - payment fee rate - target contribution margin)
```

The stated target of “100% profit” is treated in this plan as a **100% markup on
worst-case total cost**: monthly plan revenue must be at least twice the modeled
provider, LiteLLM/Neon, payment, and allocated platform cost when the subscriber
uses every weekly allowance. This equals a 50% gross margin; if “100% profit” is
intended to mean a different accounting measure, finance must correct this
definition before allowances are published. Recalculate the safe Lite and Pro
allowances whenever cost inputs or model mappings materially change, but apply
changes through a new plan version rather than repricing historical usage.

Do not expose raw provider model identifiers as paid products. Expose exactly two
stable capabilities: **Fast** (internal alias `fast`) and **Think** (internal alias
`think`). Route those aliases to approved provider models in LiteLLM so underlying
models can change without changing the customer contract. Store every price and
usage-weight schedule with currency, effective timestamps, and a source/version so
historical usage is never repriced when a provider changes its rates.

The existing Stripe Price IDs for Lite and Pro must be configured server-side and
mapped to immutable, versioned internal plan records. Product metadata may carry a
non-authoritative internal plan code, but the webhook handler must recognize only
allowlisted Price IDs. Do not create replacement Stripe Products or Prices during
implementation unless product owners explicitly request a new price version.

### Plan and model contract

| Customer-facing plan | Internal plan code | Allowance | Models |
| --- | --- | --- | --- |
| Lite | `lite` | Lower weekly limit, set empirically for the pricing target | Fast and Think |
| Pro | `pro` | Higher weekly limit, set empirically for the pricing target | Fast and Think |

Fast and Think consume the plan's common weekly usage balance. One successful Fast
unit costs one usage credit and one successful Think unit costs five usage credits.
The 5× factor is versioned configuration, not a hardcoded permanent product rule,
so a future factor applies prospectively and never changes historical ledger rows.
The UI and API must show the units a request consumed, the applicable factor, and
the remaining common balance without exposing the provider model selected behind
either alias.

## Data model

Add application-owned tables through Alembic migrations:

- `billing_customers`: unique `clerk_user_id`, unique `stripe_customer_id`, status,
  and timestamps;
- `billing_subscriptions`: Stripe subscription/item/price IDs, internal plan code,
  status, billing-period boundaries, cancellation state, and last event time;
- `plan_versions`: immutable weekly allowance, Fast/Think weight schedule, enabled
  model aliases, rate limits, currency, effective interval, and pricing-source
  version;
- `entitlements`: user, plan version, weekly window boundaries, granted units,
  consumed units, reserved units, and state;
- `llm_usage_ledger`: internal request ID, LiteLLM call/request ID, Clerk user ID,
  plan version, model alias and resolved model, token counts, normalized cost,
  billable units, status, and timestamps;
- `stripe_webhook_events`: unique Stripe event ID, event type, received/processed
  timestamps, processing result, and retry diagnostics; and
- `billing_adjustments`: immutable credits/debits with reason and actor, rather than
  destructive edits to usage rows.

Use integer minor currency units and integer usage units. Store decimal provider
costs at sufficient precision for reconciliation. Never use binary floating point
for money. Avoid storing prompts or model responses in billing tables.

## Request and billing lifecycle

1. The Next.js proxy obtains the Clerk JWT and sends it to FastAPI as it does now.
2. FastAPI validates the token and derives the immutable Clerk user ID exclusively
   from verified claims.
3. FastAPI loads the active local entitlement and atomically reserves a bounded
   quantity for the request. Concurrent requests must not overspend one allowance.
4. FastAPI calls a stable LiteLLM model alias using a server-side virtual key and
   passes non-sensitive tags: internal request ID, hashed/pseudonymous principal,
   plan version, feature, and environment.
5. LiteLLM routes to an approved provider and returns normalized usage/cost data.
6. FastAPI commits an idempotent usage-ledger entry and converts the reservation to
   actual usage. On a failed call, it releases the reservation according to a
   documented retry/failure policy.
7. A reconciliation job compares application ledger totals with LiteLLM and the
   upstream provider. It alerts on missing, duplicate, stale, or materially
   divergent records.
8. If metered overage is later approved, a separate job emits Stripe meter events
   using deterministic idempotency identifiers; webhook-derived invoice state is
   then projected back into the local subscription record.

The request path must fail closed for paid access when entitlement cannot be
verified. A LiteLLM or provider outage must return a retryable service error and
must not consume a successful-use allowance.

SNOMED authoring assistance is organization-funded. Those calls still flow through
LiteLLM for routing, cost attribution, and organization budget enforcement, but
they never reserve or deduct credits from an individual Lite or Pro allowance.

## Stripe lifecycle and security

- Create Checkout Sessions and Customer Portal Sessions only on authenticated
  server routes. Reuse the `billing_customers` mapping rather than trusting a
  customer ID supplied by the client.
- Verify webhook signatures against the raw request body and the environment's
  endpoint secret before parsing or mutating data.
- Accept duplicate and out-of-order events. Record the Stripe event ID, make each
  handler idempotent, and retrieve the current Stripe object when event ordering
  could change the outcome.
- Initially handle the events needed for checkout completion, subscription
  creation/update/deletion, invoice payment success/failure, and entitlement
  revocation. Record unknown events without granting access.
- Do not grant paid access solely from the Checkout redirect. Access begins only
  after a verified webhook establishes an allowed subscription/payment state.
- Separate test and live Stripe keys, Price IDs, webhook secrets, LiteLLM databases,
  and provider budgets. Include environment in all reconciliation dimensions.
- Retain only billing identifiers and minimum audit metadata. Never attach medical
  questions, retrieved context, diagnoses, or model responses to Stripe objects.
- While ThaiOML operates as a Thai sole proprietorship below THB 1.8 million in
  annual revenue and is not VAT-registered, use Stripe's native receipts and do not
  calculate or charge VAT. Revenue monitoring must alert well before the threshold;
  crossing or approaching it triggers professional tax review and a launch gate for
  localized Thai e-Tax Invoice/e-Receipt integration driven by verified Stripe
  webhooks. Do not represent Stripe's native receipt as a Thai tax invoice. Keep the
  localized integration disabled until registration and tax configuration are
  approved, and never infer VAT status from client input.

## LiteLLM policy and configuration

- Use only the `fast` and `think` aliases in application code and maintain their
  provider-model mappings in reviewed LiteLLM configuration.
- Start with OpenRouter behind LiteLLM to minimize migration risk, then validate a
  second provider and controlled fallback in staging.
- Set global, environment, and key/team budgets as defense in depth. Application
  entitlements remain authoritative because LiteLLM budgets alone do not represent
  Stripe subscription state.
- Apply per-user and per-plan request/token limits before provider invocation.
- Pin LiteLLM and database migration versions; promote configuration through code
  review rather than editing production-only state.
- Disable prompt/response logging by default. Redact authorization headers and
  secrets from logs. If request tracing is required, use IDs and aggregate token/
  cost fields only.
- Document whether cached responses are free, discounted, or allowance-consuming,
  and ensure the same rule is used in customer display, the ledger, and invoicing.
- Configure availability and alerting around a **99.5% monthly LiteLLM service
  uptime target**, excluding only explicitly documented maintenance or upstream
  exclusions approved for the customer-facing service definition.

## Delivery phases

The first Phase 1 increment centralizes OpenAI-compatible client construction on
the private LiteLLM endpoint, switches RAG and organization-funded SNOMED calls to
the `fast` alias, adds deployment configuration, and adds unit coverage for Fast and
Think alias selection. Provisioning the LiteLLM Cloud Run service and Neon database
remains an infrastructure follow-up before production traffic is enabled.

### Phase 0 — approve architecture and product rules

- Approve this plan and resolve the product decisions listed below.
- Create the canonical guideline and update
  `webapp/content/docs/guidelines/architecture-stack.md` to show LiteLLM and Stripe.
- Plan the new LiteLLM Neon database, including roles, connection consumers,
  backup/restore requirements, failure isolation from Supabase, and a tested
  rollback/rebuild procedure. Do not migrate SNOMED or RAG data from Supabase.
- Capture a threat model, data-retention schedule, and incident owners.
- Record current provider prices as a dated baseline; finance/product approves the
  tier margin and allowance assumptions.

**Exit:** architecture, privacy, pricing, refund, and customer-support owners sign
off; no unresolved decision can alter the ledger's unit semantics.

### Phase 1 — LiteLLM gateway in shadow accounting

- Add a pinned LiteLLM Proxy deployment and its isolated data store.
- Define the `fast` and `think` aliases, upstream OpenRouter routing, timeouts,
  retries, circuit breakers, spend limits, and health/readiness behavior.
- Replace direct OpenRouter base URLs in RAG and SNOMED services with a configurable
  LiteLLM endpoint and server credential while preserving LangChain compatibility.
- Add internal request IDs and pseudonymous cost-attribution tags.
- Compare LiteLLM costs with upstream provider records; billing remains disabled.

**Exit:** no browser-visible key, fallback behavior is tested, and sampled token and
cost totals reconcile within the approved tolerance.

### Phase 2 — provision Neon for LiteLLM

- Provision isolated Neon environments and a least-privilege LiteLLM role; store
  credentials in the cloud secret store.
- Let the pinned LiteLLM release create and migrate only its Neon-owned schema.
- Update environment configuration and deployment jobs without hardcoded URLs or
  changes to the Supabase URLs used by SNOMED and RAG.
- Test pooled runtime connections, any direct migration connection, suspend/resume
  behavior, connection exhaustion, backup/restore, observability, and rebuild.
- Prove that Neon failure cannot corrupt Supabase or prevent static article access;
  LiteLLM-dependent features must fail with a controlled service error.

**Exit:** LiteLLM passes against Neon, Supabase-backed SNOMED and RAG regression
tests remain green, restore/rebuild is rehearsed, the 99.5% target is supportable,
and measured Neon limits support the launch cohort.

### Phase 3 — ledger and entitlement enforcement

- Add Alembic migrations and repository/service layers for the proposed tables.
- Implement transactional quota reservation/finalization and idempotent request
  handling.
- Add authenticated usage/balance endpoints with no cross-user data exposure.
- Enforce personal entitlements before billable RAG calls and the separate
  organization budget before SNOMED authoring calls.
- Add structured metrics for allowed, denied, failed, reserved, and reconciled use.

**Exit:** concurrency tests cannot exceed an allowance, retries do not double count,
and failure paths release or finalize reservations correctly.

### Phase 4 — Stripe subscriptions

- Register the existing Lite and Pro Stripe Price IDs in environment-specific,
  server-side configuration and map them to versioned internal plans.
- Add authenticated Checkout and Customer Portal session endpoints.
- Add the signature-verified, idempotent webhook endpoint and subscription
  projection.
- Add a billing page showing subscription state, period allowance/usage, renewal,
  weekly reset, scheduled plan transition, and portal link. Do not expose provider
  cost as a customer charge.
- Exercise Stripe test clocks/test mode for renewals, cancellation, payment failure,
  delayed webhooks, refunds, and plan changes.

**Exit:** access changes only from verified server state, all lifecycle scenarios are
covered by automated tests, and finance can reconcile a test period end to end.

### Phase 5 — controlled launch

- Backfill billing-customer mappings only for consenting launch users.
- Run an internal cohort, then a capped beta with provider and platform spend alerts.
- Publish customer-facing pricing, quota semantics, privacy disclosures, refund
  rules, and support escalation procedures before collecting payment.
- Maintain kill switches for new checkout, billable model access, fallback models,
  and overage emission independently.

**Exit:** support and incident runbooks have been exercised, alerts have owners, and
actual unit economics remain within the approved threshold.

### Phase 6 — optional metered overage

- Require a separate approval based on at least one full billing cycle of evidence.
- Freeze the billable-unit definition and rounding policy per plan version.
- Emit aggregated, idempotent Stripe meter events from finalized ledger rows.
- Reconcile application, LiteLLM, provider, Stripe meter, and invoice totals before
  automatically charging overage at scale.

**Exit:** finance signs off on invoice accuracy and replay/recovery tests.

## Testing and acceptance matrix

| Area | Required evidence |
| --- | --- |
| Identity | A user cannot charge another Clerk/Stripe customer; deleted and signed-out sessions fail closed. |
| Authorization | Only Fast and Think aliases are accepted, their weighted use matches the effective Lite or Pro plan, and roles alone do not grant a paid allowance. |
| Quota | Parallel requests, retries, cancellation, timeouts, and streaming disconnects cannot over-consume or double count. |
| LiteLLM | Routing, fallback, timeout, malformed usage metadata, provider outage, and global budget exhaustion are tested. |
| Stripe | Invalid signatures fail; duplicate/out-of-order webhooks converge; renewals, upgrades, downgrades, cancellation, refunds, and payment failures are covered. |
| Reconciliation | Request-level samples and period aggregates trace from FastAPI through LiteLLM/provider and, when enabled, Stripe. |
| Privacy | No prompt, response, retrieved medical context, bearer token, or secret appears in billing records, Stripe metadata, or logs. |
| Deployment | Neon provisioning and restore/rebuild, Supabase non-regression, test/live isolation, secret rotation, Cloud Run IAM, and kill switches are exercised. |
| Resilience | Static articles remain available when FastAPI, LiteLLM, Stripe, or a provider is unavailable. |
| Availability | Synthetic checks and service-level indicators demonstrate that the LiteLLM service can meet 99.5% monthly uptime. |

## Observability and operations

Create dashboards and alerts for request count, tokens, normalized cost, allowance
denials, reservation age, LiteLLM/provider latency and errors, provider budget
utilization, webhook lag/failures, reconciliation variance, and Stripe payment
failures. Metrics must use pseudonymous/internal IDs and must not contain medical
query text.

Run reconciliation at least daily, at every weekly allowance reset, and at the
monthly billing-period close. Quarantine mismatched records instead of guessing.
Financial adjustments must be append-only and retain the initiating operator/reason.

Retain detailed usage rows and Stripe webhook payloads for **120 days**. Retain
reconciliation evidence and ThaiOML financial records for **10 years**. Automated
deletion must cover primary records, operational copies, and documented backup
expiry according to the applicable retention class. The 10-year reconciliation
record should contain the minimum aggregates, identifiers, variances, resolutions,
and audit trail needed to reproduce the financial result rather than duplicating
expired detailed usage or full webhook payloads.

At the 120-day boundary, a scheduled, idempotent scrubbing job must replace direct
user and customer identifiers in finalized usage rows with a keyed HMAC pseudonym,
remove IP addresses, user agents, request metadata, provider payload fragments, and
any free-text fields, and detach or delete the corresponding full webhook payload.
The HMAC key must be held in the cloud secret store, versioned, and unavailable to
analytics clients. The job retains only the pseudonymous principal, internal request
and ledger IDs, plan/model versions, weekly/billing periods, token and credit totals,
cost/currency aggregates, timestamps rounded to the minimum useful precision, and
reconciliation status needed for the 10-year record. It must emit counts and an
audit result without logging deleted values, retry safely, and have tests proving
that expired PII cannot be recovered from the retained row. Backup copies expire
under their documented lifecycle and must not be restored into general use after
their source data's scrubbing deadline.

These product retention targets are subordinate to any longer period legally
required of a Thailand-based business; obtain Thai accounting, tax,
consumer-protection, and privacy review before deletion or production sales. Store
no medical prompt or response content in any of these records.

## Rollback strategy

- Before payments launch, switch the FastAPI model endpoint back to direct
  OpenRouter only as an explicit emergency configuration; record that calls during
  the bypass lack LiteLLM accounting.
- After payments launch, disable new AI calls or provide a documented free-service
  incident mode rather than route paid traffic around entitlement and ledger checks.
- Disable Checkout independently without canceling existing subscriptions.
- Stop overage export independently while continuing to retain finalized usage for
  later reconciliation.
- Use forward corrections for financial records. Never rewrite invoiced usage.

## Confirmed product decisions

1. Stripe bills the existing Lite and Pro subscriptions monthly; their usage
   allowances reset weekly and are hard limits.
2. Lite-to-Pro upgrades apply the Pro limit immediately. Pro-to-Lite downgrades are
   scheduled for the next monthly subscription boundary.
3. Think consumes five times the credits of Fast. The factor is versioned and may
   change prospectively.
4. SNOMED authoring assistance is organization-funded and does not consume personal
   Lite or Pro allowances.
5. The LiteLLM service target is 99.5% monthly uptime.
6. Detailed usage and webhook payloads have a 120-day retention target;
   reconciliation evidence and financial records have a 10-year retention target,
   subject to any longer mandatory period identified by Thai legal/accounting
   review.
7. ThaiOML currently operates as a sole proprietorship below the THB 1.8 million
   VAT-registration threshold. It uses Stripe native receipts without charging VAT;
   localized Thai e-Tax Invoice/e-Receipt integration via verified Stripe webhooks
   is deferred until revenue approaches the mandatory registration threshold.

## Remaining decisions requiring approval

1. **Allowance calculation:** collect worst-case Fast/Think cost measurements, set
   the exact Lite and Pro weekly credit values, choose the weekly UTC reset boundary,
   and confirm that “100% profit” means the 100% markup/50% gross-margin definition
   used above.
2. **Upgrade accounting:** when Lite upgrades mid-week, decide whether the user gets
   the full Pro weekly limit less credits already consumed (recommended) or a fresh
   full Pro grant. The plan currently assumes the former to prevent double grants.
3. **Failure semantics:** decide when a reserved credit becomes consumed. In
   particular:
   - Does a partial streamed answer consume the full model weight, a prorated token
     amount, or zero credits?
   - Does an automatic provider retry count once for the user (recommended) while
     ThaiOML absorbs duplicate provider cost, or can it consume additional credits?
   - Are cache hits free, discounted, or charged the normal model weight?
   - Are safety refusals charged only when provider usage is incurred, or always
     returned at no charge to the user?
   - If the user disconnects/cancels after generation starts, is usage charged from
     actual reported tokens or released entirely?
4. **Thailand commerce:** confirm the customer-facing currency (THB recommended),
   the revenue alert buffer below THB 1.8 million, and the owner/timeline for Thai
   VAT registration and localized e-Tax Invoice/e-Receipt implementation. Qualified
   Thai advisors must still approve record retention, receipts, refunds, and
   consumer/privacy disclosures before accepting payment.
5. **Availability measurement:** define the 99.5% service-level indicator, reporting
   window, planned-maintenance treatment, upstream-provider exclusions, minimum
   instances, and cold-start policy.
6. **Neon capacity:** approve the measured free-tier operating envelope and the
   spend threshold or capacity signal that triggers a paid Neon tier.

## Documentation changes after approval

The implementation PR following approval will:

1. add
   `webapp/content/docs/guidelines/llm-access-and-billing-architecture.md` as the
   canonical public operational and architectural guideline;
2. update `webapp/content/docs/guidelines/architecture-stack.md` with the LiteLLM
   gateway, Stripe control plane, Supabase retained for ThaiOML/SNOMED data, Neon
   dedicated to LiteLLM, data ownership, and environment variables;
3. update `AGENTS.md` with only a concise pointer to an agent skill if a recurring
   workflow requires one; and
4. create or revise that skill so it instructs agents to read the canonical
   guideline before changing model access, pricing, entitlements, or billing.

## Reference documentation to validate during implementation

Because external documentation was unavailable from this environment while this
plan was prepared, implementation must revalidate all API names, supported
features, and version-specific behavior against the then-current primary sources:

- LiteLLM Proxy documentation: <https://docs.litellm.ai/docs/simple_proxy>
- LiteLLM virtual keys and budgets: <https://docs.litellm.ai/docs/proxy/virtual_keys>
- LiteLLM spend tracking: <https://docs.litellm.ai/docs/proxy/cost_tracking>
- Neon connection pooling: <https://neon.com/docs/connect/connection-pooling>
- Neon connection guidance: <https://neon.com/docs/connect/connect-from-any-app>
- Stripe usage-based billing: <https://docs.stripe.com/billing/subscriptions/usage-based>
- Stripe webhook signatures and delivery behavior: <https://docs.stripe.com/webhooks>
- Stripe idempotent requests: <https://docs.stripe.com/api/idempotent_requests>
