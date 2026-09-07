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
id: [SNOMED CT Concept ID, e.g., 22298006. Custom IDs like thai-guideline-xxx allowed for exceptions]
title: [Preferred Term, e.g., Myocardial infarction]
snomed_fsn: [Fully Specified Name, e.g., Myocardial infarction (disorder)]
type: [One of: disease, drug, procedure, anatomy, physiology, symptom, laboratory-test, guideline, abbreviation, differential-diagnosis]
parents:
  - [SCTID of Parent 1]
synonyms:
  - [e.g., Heart attack]
  - [e.g., ภาวะกล้ามเนื้อหัวใจตายเฉียบพลัน]
specialty:
  - [e.g., neurology]
tags:
  - [e.g., autoimmune]
review_status: [draft, pending, or reviewed]
last_medical_review: [YYYY-MM-DD, optional]
---
```

## 3. Disambiguation and Deduplication
- **Deduplication:** The `id` field (SNOMED Concept ID) acts as the unique identifier. Do not create a new file if a concept with this ID already exists. For Thai-specific local content (e.g., national guidelines) that has no SNOMED equivalent, use a custom ID prefix like `thai-guideline-`.
- **Thai Aliases:** Always map Thai condition names to the official SNOMED CT concept. Include the Thai name in the `synonyms` array to ensure AI search and RAG pipelines can find the English canonical concept via Thai queries.
- **Workflow:** Authors should use the AI semantic lookup in Decap CMS to find the correct `id` and `snomed_fsn` when creating articles. Keep filenames in human-readable kebab-case (e.g., `myocardial-infarction.md`).

## 3. Editorial CMS Workflow
The GitHub repository acts as the backend for Decap CMS. For the exact editorial workflow (Contributor -> Reviewer -> Editor) and proxy approval rules, you MUST read the canonical guidelines at `docs/docs/guidelines/editorial-process.md` using the `view_file` tool before taking action.
