---
title: Authentication & Authorization Architecture
description: Standard principles for Clerk authentication and JWT authorization in ThaiOML.
---

# Authentication & Authorization Architecture

This document describes the architectural principles for handling authentication and role-based authorization across the ThaiOML ecosystem, specifically between the Next.js web application and the Python FastAPI backend.

## 1. The Single Source of Truth

ThaiOML relies on **Clerk** as the single source of truth for identity and roles. 
- **Identity** is handled by the standard Clerk session.
- **Roles** are assigned in the Clerk dashboard and attached to the user's `public_metadata` object.

## 2. JWT Templates & Role Propagation

By default, Clerk's session tokens do not include the `public_metadata` object in the payload. To securely pass the user's roles from the frontend to the backend without requiring an extra database lookup on every request, we utilize **Custom JWT Templates**.

### The `jwt-ask-library` Template

ThaiOML maintains a custom JWT template named `jwt-ask-library` in the Clerk dashboard. This template injects the `public_metadata` and `org_role` into the JWT payload:

```json
{
  "public_metadata": "{{user.public_metadata}}",
  "org_role": "{{org_membership.role}}"
}
```

## 3. Implementation Guidelines

### Frontend (Next.js)

When the Next.js API layer acts as a proxy to the Python backend, it **MUST** explicitly request the custom JWT template to ensure the token contains the necessary metadata.

```typescript
// Correct: Requesting the specific template containing roles
const token = await auth().getToken({ template: 'jwt-ask-library' });

// Incorrect: This returns the default token missing the public_metadata
const token = await auth().getToken();
```

> [!WARNING]
> In Next.js 15+ (App Router), `auth()` is asynchronous and **must** be `await`ed before calling `getToken`.

### Backend (FastAPI)

The Python backend uses `PyJWKClient` to verify the JWT against the Clerk JWKS endpoint (`CLERK_JWKS_URL`). 

The `require_role` dependency in `backend/core/auth.py` handles the authorization logic:
1. It reads the verified JWT payload.
2. It looks for roles in `org_role` and `public_metadata.roles` (handling both snake_case and camelCase variations).
3. If the user does not possess the required role, it raises a `403 Forbidden` exception, which includes a debug payload for troubleshooting.

```python
# Example Usage in FastAPI Routes
@router.post("/chat")
def chat_system(
    request: ChatRequest,
    user_data: dict = Depends(require_role(["org:researcher", "author", "admin"])),
): ...
```
