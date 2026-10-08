---
name: auth-architecture-workflow
description: Modify ThaiOML authentication, Clerk sessions or roles, JWT forwarding, protected routes, or profile identity behavior.
---

# Authentication Architecture Workflow

Read [reference/auth-architecture.md](../../../reference/auth-architecture.md) before changing authentication or authorization across the webapp and backend.

Keep authorization decisions on trusted server boundaries, preserve Clerk as the identity and role authority, and verify the current JWT and metadata shapes in code. Test unauthenticated, unauthorized, and authorized paths for every changed boundary.
