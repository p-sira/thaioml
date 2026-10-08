---
name: telemetry-architecture-workflow
description: Add, modify, or debug ThaiOML analytics, consent handling, identity association, or telemetry events across the webapp and FastAPI backend.
---

# Telemetry Architecture Workflow

Read [reference/telemetry-architecture.md](../../../reference/telemetry-architecture.md) before changing telemetry. Inspect the affected client or server implementation as well, because consent storage and integration paths must match deployed code.

Preserve these invariants:

- Client capture remains opt-in and follows the shared consent state.
- Authenticated events use the Clerk subject identifier.
- Existing event names and property meanings remain stable across producers.
- Secrets stay server-side, and public telemetry configuration uses environment variables.
- Events exclude sensitive medical content, credentials, tokens, and identifiable patient data.

Before adding an event, search for an existing equivalent. Test accepted, declined, and revoked consent paths for client changes; test success and failure paths for server events. Keep telemetry failures from breaking the primary user workflow.
