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

## 3. Application Routing Architecture

The ThaiOML ecosystem is divided structurally between the Next.js Webapp and the MkDocs static site:

- **Webapp as the Landing Page:** The Next.js application serves as the primary entry point, index/landing page, and interactive search interface for ThaiOML. It provides dynamic experiences like the "Ask the Library" chat interface and intelligent global search.
- **MkDocs as the Content Library:** The static MkDocs site strictly serves the rendered markdown medical articles, guidelines, and static pages (like Contribution and About). 
- **Integration:** The Next.js webapp intelligently links to the static MkDocs pages. For example, searches on the webapp land users directly into the relevant static `/articles/...` endpoints hosted by MkDocs.
