---
title: Frontend Architecture
description: Standard principles for building frontend components in ThaiOML.
---

# Frontend Architecture

This document describes the architectural principles for handling shared frontend state across the diverse ThaiOML ecosystem, which includes a statically-generated MkDocs site and a Next.js web application.

## 1. The Standard Resolution Flow for Theme Preferences

ThaiOML unifies the appearance of the static library site and the web application through a shared Theme Resolution Flow. This standardizes how theme logic (dark/light/sepia) is applied across all repositories, maintaining a "Single Source of Truth" for settings while eliminating Flash of Unstyled Content (FOUC) and ensuring cross-device synchronization.

### Architectural Layers

1. **Local Cookies (The Performance Layer)**
   - **Implementation:** Cookies bound to the base `.thaioml.org` domain (e.g., `thaioml-theme`).
   - **Why it's used:** Speed. Reading from local cookies allows both the static site and the webapp to apply the theme synchronously during the initial HTML parse (or React hydration). This prevents the "flash of inaccurate theme"—like a blinding white screen for a dark-mode user—while the app waits for an API response.
   - **Scope:** All users, including anonymous visitors. The use of base domain cookies allows cross-subdomain sharing (e.g., between `www.thaioml.org` and `app.thaioml.org`).

2. **User Profile Database (The Sync Layer)**
   - **Implementation:** Clerk `publicMetadata` attached to the user session.
   - **Why it's used:** Cross-device consistency. If a user explicitly sets dark mode on their laptop, they expect the web app to respect that choice when they log in on their phone.
   - **Scope:** Authenticated users only.

3. **The OS Default (The Baseline)**
   - **Implementation:** CSS media queries like `@media (prefers-color-scheme: dark)`.
   - **Why it's used:** To provide a smart default before the user ever touches a toggle button.

### Standard Resolution Process

When a user visits any production ThaiOML application, the frontend must resolve the theme in this precise order:

1. **Check Local Preference (Synchronous):** The app checks for the domain cookies. If a value exists, it applies the CSS variables immediately to the DOM.
2. **Check System Preference (Synchronous):** If cookies are empty, it falls back to `prefers-color-scheme`.
3. **Fetch Profile Preference (Asynchronous):** If the user is logged in to the Next.js webapp, the application fetches their user profile from Clerk.
4. **Reconcile:** If the database preference differs from the current active cookie (e.g. they changed it on another device), the application overwrites the cookie to match the database truth and updates the live UI.

*Note on Static Sites:* The MkDocs static site does not execute the async fetch layer. It exclusively reads the shared `.thaioml.org` cookie for extreme performance. If an authenticated user changes their settings in the webapp, the updated cookie immediately propagates the new theme to the static site.

## 2. Design Aesthetics & Styling

ThaiOML strictly adheres to a **minimalistic and clean style**. This aesthetic prioritizes content readability and performance over complex visual effects.

- **Authorized Themes:** Development must exclusively utilize the established theme palette (Leuko, Darkroom, Progressnote).
- **Prohibited Patterns:** Do **not** use glassmorphism (e.g., heavily blurred backgrounds, translucent overlay panels). Stick to flat, solid backgrounds and subtle borders or shadows (as defined by the active theme).

## 3. Application Routing Architecture & UX

The ThaiOML ecosystem is divided structurally between the Next.js Webapp and the MkDocs static site, but presents a **unified user experience** under a single domain (`www.thaioml.org`).

- **Unified Domain via HTML Fetching (Catch-All):** The Next.js application acts as the single entry point and layout shell. If a request does not match an explicit Next.js route (like `/chat` or `/sign-in`), a Next.js Catch-All route (`app/[[...slug]]`) fetches the raw HTML from the hidden static MkDocs deployment. Next.js extracts the core markdown content and MkDocs scripts, and injects them seamlessly into the Next.js `RootLayout`. This allows MkDocs to use the exact same React Header and Footer (including Clerk Authentication avatars) without maintaining duplicated vanilla JS templates, while preserving perfect SEO and extreme speed via Next.js ISR (Incremental Static Regeneration).
- **Static Asset Proxy:** MkDocs static assets (CSS, JS, search workers, and images) are proxied directly via `next.config.ts` rewrites to ensure the MkDocs client-side scripts function perfectly.
- **Relative Linking:** Because of the unified domain architecture, hardcoding absolute URLs or environment-specific hostnames (like `NEXT_PUBLIC_SITE_URL` or `http://localhost:3000`) is strictly prohibited. All cross-linking between the webapp and the static site MUST use pure relative paths (e.g. `/`, `/about/`, `/articles/...`).
- **Local Development Mappings:** During local development, the Next.js proxy runs on port `3000`, while the MkDocs server runs on port `8000` in the background. To ensure cross-links work correctly, developers MUST access the site through the Next.js proxy at `http://localhost:3000`. Accessing MkDocs directly at `http://localhost:8000` will break relative links that point back to the webapp.
- **Webapp as the Main Focus:** The Next.js application serves as the primary entry point, index/landing page, and interactive search interface for ThaiOML. 
- **Search-Centric Discovery:** The traditional left-hand directory navigation in MkDocs is intentionally removed. Users are encouraged to browse the content library via global search, intelligent search suggestions, and inline hyperlinks within the medical articles.
- **MkDocs as the Content Library:** The static MkDocs site strictly serves the rendered markdown medical articles, guidelines, and static pages (like Contribution and About).
- **Settings vs Public Profiles:** The application maintains a strict separation between public portfolios and private configurations. Public profiles are served dynamically at `/user/[username_or_id]`, while private account configurations (including Clerk's native profile management and custom display settings) are unified under the `/settings` route.

## 4. Common Architecture Pitfalls

Throughout development, we have encountered several edge cases related to this unified architecture. Keep these in mind to avoid regressions:

- **Next.js Route Shadowing (The Search Bug):** If Next.js has a defined page (e.g., `/` via `page.tsx`), the `rewrites()` fallback will NOT proxy that path to MkDocs. This means if you submit a form to `/?q=query`, the MkDocs search modal will never trigger because Next.js handles the `/` route first. **Solution:** We explicitly map cross-app searches to a dedicated proxy endpoint like `/search/` (backed by a blank `search.md` in MkDocs) so Next.js seamlessly hands off the request.
- **Strict Validation of MkDocs `repo_url`:** The built-in MkDocs `repo_url` configuration strictly enforces absolute URLs (with `http://` or `https://` schemes). It cannot accept relative paths (e.g. `/`). Do not try to hack `repo_url` into a relative internal link; use the custom `header.html` template for internal app navigation instead.
- **`NEXT_PUBLIC_` Environment Variable Leaks:** Baking absolute URLs (like `NEXT_PUBLIC_SITE_URL`) into the client build breaks cross-environment compatibility if the same build artifact is promoted from staging to production. Relying exclusively on unified relative paths with `rewrites()` eliminates this entire class of bugs.
- **Node.js `getaddrinfo ENOTFOUND` in Local Proxy:** When configuring the `DOCS_UPSTREAM_URL` for local development, be careful not to accidentally set the proxy destination to the live production URL (e.g., `https://www.thaioml.org`) while testing locally. This will cause Node.js fetch errors or infinite proxy loops. The local upstream should always confidently point to `http://localhost:8000`.

## 5. CSS Isolation & Framework Conflicts

Because Next.js (Tailwind) and MkDocs (Material) are stitched together in the DOM via the catch-all proxy, their CSS engines can aggressively collide. Follow these rules to ensure perfect CSS encapsulation:

- **HTML Font-Size Geometry Conflict:** MkDocs Material requires `html { font-size: 125%; }` (20px), while Tailwind relies on a 16px root. If left unchecked, Tailwind's `rem`-based classes (like padding, margins, and text sizes) will artificially inflate by 25% on proxy pages! 
  **Solution:** We force `html { font-size: 100% !important; }` in `globals.css` to protect Tailwind's geometry, and apply `zoom: 1.25` to the `.mkdocs-wrapper` so MkDocs scales itself perfectly back to its intended design size.
- **Element Tag Overrides:** MkDocs CSS aggressively styles raw HTML tags (`nav`, `footer`, `a`). 
  **Solution:** Next.js layout components must use generic `div` wrappers with ARIA roles (e.g., `<div role="navigation">` instead of `<nav>`) to cleanly evade MkDocs's global element selectors.
- **Tailwind Opacity Modifiers (Invalid CSS Generation):** In Tailwind v4, opacity modifiers like `text-foreground/70` generate `color-mix()` CSS functions. Because we map `--color-foreground` directly to MkDocs's internal `var(--md-default-fg-color)` (which evaluates to a complex `hsla(...)` string), the resulting CSS is invalid and silently dropped by the browser. 
  **Solution:** Never use opacity modifiers with arbitrary external CSS variables. Instead, decouple them using standard CSS properties (e.g., `text-foreground opacity-70`).
- **Typography Unification & Anti-aliasing:** MkDocs has its own internal font variables. If not unified, you will experience sudden font changes or weight mismatches (where `font-medium` suddenly looks bold) due to browser anti-aliasing edge cases on different fonts.
- **Tailwind v4 CSS Cascade Layers (!important):** Tailwind v4 wraps all its styles in native CSS `@layer` blocks (e.g., `@layer utilities`). According to CSS specifications, **unlayered CSS always beats layered CSS**, regardless of specificity. Because MkDocs imports raw, unlayered CSS files, a simple MkDocs tag selector (like `a { text-decoration: none }`) will completely override a Tailwind utility class (like `.underline`).
  **Solution:** When a Tailwind utility class mysteriously fails to apply on a static proxy page, you must forcefully elevate its specificity by prepending an exclamation mark (e.g., `!underline`) to compile it with `!important`.
