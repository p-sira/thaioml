---
name: frontend-architecture-workflow
description: Modify ThaiOML theme resolution, shared frontend state, proxy integration, or other cross-app frontend architecture.
---

# Frontend Architecture Workflow

Before changing cross-app frontend behavior, read [reference/frontend-architecture.md](../../../reference/frontend-architecture.md) and inspect the current implementation named by the task. Treat the reference as the design contract and the code as the source for current file paths and APIs.

Preserve these invariants:

- Shared preferences resolve synchronously from the established cookie before asynchronous account reconciliation.
- Authenticated preference sync uses Clerk metadata; Clerk remains the identity and role authority.
- Cross-app behavior works through the configured Next.js and static-content integration with relative routing.
- Environment-specific origins come from configuration rather than hardcoded URLs.
- Styling changes respect the documented theme palette and CSS isolation constraints.

Test the smallest affected integration surface. For proxy, theme, or hydration changes, include a production build when practical because development mode does not exercise every boundary.
