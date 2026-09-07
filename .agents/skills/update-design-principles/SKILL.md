---
name: update-design-principles
description: >-
  Use this skill when the user mentions a new architectural design, a new coding principle, or a new workflow pattern that needs to be remembered.
---

# Updating Design Principles and Workflows

ThaiOML relies on the AI customization system (`AGENTS.md` and `.agents/skills/`) to maintain consistency. When the user proposes a new principle, design, or workflow, you must capture it so future agents remember it.

## Procedure for Updating Principles

1. **Analyze the Request:** Determine if the new principle is a fundamental, global rule (belongs in `AGENTS.md`) or a specific procedure/runbook (belongs in a specific skill inside `.agents/skills/`).
2. **Draft a Plan:** DO NOT modify the rules immediately. Draft an implementation plan (`implementation_plan.md`) describing exactly what file you intend to modify and what the new rule will say.
3. **Request Approval:** Request the user's feedback on the plan.
4. **Execute:** Once the user approves, update the appropriate `AGENTS.md` or `SKILL.md` file.

*Remember: Always maintain "progressive disclosure". Keep `AGENTS.md` extremely lean and point to specific skills for detailed instructions.*
