---
name: update-design-principles
description: Record a user-approved ThaiOML architecture principle or recurring workflow so future implementation follows it. Use when the user asks to adopt, document, or remember the principle.
---

# Update Design Principles

Store each rule in its canonical, reviewable location without duplicating it across instruction layers.

## Workflow

1. Identify the affected domain and read its canonical public guideline or internal developer reference.
2. Confirm the request represents a durable principle or recurring workflow rather than a one-off implementation choice.
3. Store internal developer architecture and workflow documents in the project-root `reference/` directory. Keep public governance and editorial policy in `webapp/content/docs/guidelines/`.
4. Update or create a focused skill only when agents need reusable execution guidance beyond the canonical document. Link to the project reference instead of copying it into the skill.
5. Change `AGENTS.md` only when the user explicitly requests it and the rule truly applies repository-wide.
6. Check references, remove superseded guidance, and verify that the new rule agrees with the implementation or update the implementation when that is part of the request.

Do not create an approval document or pause for a separate approval cycle unless the user asks for a plan. Keep concise routing in `SKILL.md` and substantial developer documentation in the project-root `reference/` directory.

## Skill installation

Use the repository's npm-based skill tooling for future skill installation and updates. Do not use APM. Preserve locally maintained skills when updating third-party packages.
