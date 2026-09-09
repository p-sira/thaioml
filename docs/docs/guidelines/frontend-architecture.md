---
title: Frontend Architecture
description: Standard principles for building frontend components in ThaiOML.
---

# Frontend Architecture

This document describes the architectural principles for handling shared frontend state across the diverse ThaiOML ecosystem, which includes a statically-generated MkDocs site and a Next.js web application.

## 1. The Standard Resolution Flow for Theme Preferences

ThaiOML unifies the appearance of the static library site and the web application through a shared Theme Resolution Flow. This standardizes how theme logic (dark/light/sepia) and accent colors are applied across all repositories, maintaining a "Single Source of Truth" for settings while eliminating Flash of Unstyled Content (FOUC) and ensuring cross-device synchronization.

### Architectural Layers

1. **Local Cookies (The Performance Layer)**
   - **Implementation:** Cookies bound to the base `.thaioml.org` domain (e.g., `thaioml-theme`, `thaioml-accent-color`).
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
