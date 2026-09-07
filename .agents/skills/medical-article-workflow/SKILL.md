---
name: medical-article-workflow
description: >-
  Standard operating procedure for creating, editing, and reviewing medical articles in ThaiOML. 
  Use this when asked to draft new content, update frontmatter, or simulate the editorial workflow.
---

# Medical Article Workflow

When working with medical articles in the `docs/docs/articles/` directory, adhere strictly to these guidelines:

## 1. Content and Formatting
- **Language:** Main content must be in English. Mnemonics are allowed to be solely in Thai. Contributors are invited to translate pages to Thai later.
- **Priority:** Thai medical knowledge and guidelines MUST be prioritized over US or other data.
- **Figures:** Flowcharts should be built using Mermaid (`mermaid` codeblocks). Image figures (png/jpg) are allowed but should ideally be accompanied by mermaid diagrams to help AI systems parse them.

## 2. YAML Frontmatter Schema
Every article MUST contain this exact metadata structure at the top of the file:

```yaml
---
id: [kebab-case-identifier, e.g., neuro-multiple-sclerosis]
title: [Human Readable Title, e.g., Multiple Sclerosis]
type: [One of: disease, drug, procedure, anatomy, physiology, symptom, laboratory-test, guideline, abbreviation, differential-diagnosis]
specialty:
  - [e.g., neurology]
abbreviations:
  - [e.g., MS]
tags:
  - [e.g., autoimmune]
review_status: [draft, pending, or reviewed]
last_medical_review: [YYYY-MM-DD, optional]
---
```

## 3. Editorial CMS Workflow
The GitHub repository acts as the backend for Decap CMS. For the exact editorial workflow (Contributor -> Reviewer -> Editor) and proxy approval rules, you MUST read the canonical guidelines at `docs/docs/guidelines/editorial-process.md` using the `view_file` tool before taking action.
