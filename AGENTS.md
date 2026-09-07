# ThaiOML: Agent Guidelines

Welcome to the Open Medical Library of Thailand (ThaiOML) workspace. As an AI pair programmer, you MUST adhere to these fundamental architectural and governance rules at all times.

## 1. Core Principles
* **Single Source of Truth:** The Git repository is the absolute source of truth. NO content exists exclusively inside a CMS database. Furthermore, to avoid drift between human instructions and agent behavior, all detailed operational workflows and governance rules must be documented in the public `docs/docs/guidelines/` directory. Agent skills should NOT hardcode these workflows; instead, they must instruct agents to read those canonical Markdown files (using tools like `view_file`) before taking action.
* **Markdown First:** All canonical content is stored as `Markdown + YAML Frontmatter`. It must be portable, version-controlled, and AI-friendly.
* **Static First:** The public website is statically generated (via MkDocs). There are NO dynamic database queries happening at runtime for the frontend. 
* **Separation of Concerns:** The static frontend (`docs/`) and the AI search/RAG backend (`backend/`) are decoupled. Publishing must NEVER depend on the AI systems.
* **Python Tooling:** You MUST strictly use `uv` for all Python dependency management and environments across the repository (both frontend docs and backend). The use of standard `pip` is banned.

## 2. Agent Skills
To save your context window, detailed procedures have been extracted into Skills. If you need to perform any of the following tasks, you MUST load the respective skill before modifying files:

* **Creating or Editing Medical Articles:** Use the `medical-article-workflow` skill. It contains rules on YAML schema, CMS editorial processes, and language guidelines.
* **Handling Abbreviations:** Use the `abbreviation-system` skill. It explains how to treat abbreviations as entities and resolve disambiguations.
* **Testing the RAG Pipeline:** Use the `rag-pipeline-runbook` skill for instructions on running the local FastAPI server and `pgvector` container.
* **Updating Principles & Designs:** If the user mentions a new design, principle, or workflow, you MUST use the `update-design-principles` skill to properly document it in the system.

## 3. Governance Context
* ThaiOML is an independent organization. Branches (like specific medical schools) operate under this unified structure.
* Reviewers (staff/experts) approve content via the Decap CMS, and the responsible editors (medical students) merge on that basis. Always ensure `review_status` metadata accurately reflects this pipeline.
