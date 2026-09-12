---
name: frontend-architecture-workflow
description: >-
  Use this skill when modifying theme logic, cross-app shared state, or global frontend architecture in ThaiOML.
---

# Frontend Architecture Workflow

When performing any tasks related to the frontend architecture, theme preferences, or cross-application state in ThaiOML (between the Next.js webapp and Fumadocs static site), you **MUST** adhere to the documented design principles.

## 1. Review Canonical Documentation

Before modifying any theme logic, you **MUST** read the canonical documentation to understand the Standard Resolution Flow:

- Call the `view_file` tool on `webapp/content/docs/guidelines/frontend-architecture.md`.

## 2. Key Reminders

- The standard flow involves a synchronous **Performance Layer** (Local Cookies) and an asynchronous **Sync Layer** (Clerk `publicMetadata`).
- ThaiOML relies on `.thaioml.org` domain cookies to share state between the static library and the webapp. 
- Never implement arbitrary `localStorage` solutions for cross-app features without considering domain-bound cookies and this documented architecture.
