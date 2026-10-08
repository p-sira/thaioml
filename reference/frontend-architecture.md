# Frontend Architecture

ThaiOML's public library and interactive application share one Next.js application. Fumadocs compiles the content in `webapp/content/docs/`; there is no separate runtime documentation database or HTML proxy.

## Content routing

- `webapp/source.config.ts` defines the Fumadocs source.
- `webapp/src/lib/source.ts` loads that source at the root URL.
- `webapp/src/app/(docs)/[...slug]/page.tsx` renders content and generates static parameters.
- Explicit application routes such as `/chat`, `/editorial`, `/settings`, and `/user/[username]` coexist with the documentation catch-all.
- Internal links use relative paths so builds work across local, staging, and production hosts.

Publishing content must not require the FastAPI backend or PostgreSQL at request time.

## Theme resolution

The supported themes are `leuko`, `darkroom`, and `progressnote`. Resolve them in this order:

1. Read the `thaioml-theme` cookie during server rendering and before hydration.
2. Use the operating-system color preference when no cookie exists.
3. For an authenticated user, reconcile the cookie with Clerk `publicMetadata.theme`.
4. Persist an explicit setting to both Clerk metadata and the shared production cookie.

Keep the synchronous path available to anonymous users and avoid introducing a client-only flash. Do not create a competing local-storage preference.

## Styling

- Use the established CSS variables and theme palette.
- Prefer flat surfaces, restrained borders, and readable typography; avoid glassmorphism.
- Preserve the 16px root geometry expected by Tailwind.
- Opacity modifiers can produce invalid `color-mix()` output when a Tailwind color aliases a complex external variable. Use a base color plus the `opacity-*` utility when that mapping is involved.
- Use semantic elements unless a demonstrated third-party style collision requires another accessible pattern.

## Verification

For routing or content-loader changes, run the relevant tests and a production webapp build. For theme changes, verify first paint, hydration, anonymous system preference, stored cookie preference, authenticated reconciliation, and a settings update.
