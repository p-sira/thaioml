# Authentication and Authorization Architecture

Clerk is ThaiOML's authority for identity, sessions, and roles. The Next.js application handles browser sessions, while FastAPI verifies forwarded Clerk JWTs independently.

## Webapp authorization

- Server components, route handlers, and server actions use the asynchronous Clerk server APIs.
- Page-level role checks read `user.publicMetadata.roles` on the server.
- Client-provided role or identity values are display or input data and cannot authorize an operation.
- Secrets and Clerk server clients remain outside client components.

## JWT forwarding

Calls from the webapp to protected FastAPI routes request the Clerk JWT template named `jwt-ask-library`:

```ts
const authState = await auth();
const token = await authState.getToken({ template: 'jwt-ask-library' });
```

The template supplies the role claims consumed by the backend, including `org_role` and `public_metadata.roles`. If the template or claim shape changes, update the frontend caller, backend verifier, Clerk configuration, and tests together.

## Backend verification and roles

`backend/src/backend/core/auth.py`:

1. Reads the bearer token.
2. Resolves its signing key through `CLERK_JWKS_URL`.
3. Verifies the RS256 signature and expiration.
4. Collects roles from `org_role`, `public_metadata.roles`, or the supported compatibility claims.
5. Returns `401` for authentication failures and `403` when no allowed role matches.

Use `require_role(...)` on protected routes. Do not decode tokens without signature verification, trust user-editable request data for roles, expose tokens in logs, or add a second identity authority.

## User references

- Clerk user IDs are stable; usernames can change.
- Public profile routing accepts a username and currently supports Clerk IDs beginning with `user_`.
- Existing editorial assignment fields primarily store usernames. Preserve that representation during focused changes.
- A migration to stable structured user references must update Studio editing, article frontmatter, profile lookup, rendering, and existing content together.

## Verification

Exercise missing, expired, malformed, insufficient-role, and permitted-role tokens. Confirm frontend redirects and API status codes without logging bearer tokens or complete JWT payloads.
