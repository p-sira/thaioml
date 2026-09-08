---
name: medical-article-workflow
description: >-
  Standard operating procedure for creating, editing, and reviewing medical articles in ThaiOML. 
  Use this when asked to draft new content, update frontmatter, or simulate the editorial workflow.
---

# Medical Article Workflow

When working with medical articles in the `docs/docs/articles/` directory, adhere strictly to these guidelines:

## 1. Content and Formatting
- **High-Yield Format:** All articles MUST adopt a strictly bulleted and high-yield writing style:
  - **Bulleted Hierarchy:** Use concise, hierarchical bullet points. Do NOT write long paragraphs.
  - **Standardized Sections:** Disease articles must strictly use these section headers: Introduction, Pathophysiology, Presentation, Evaluation, Treatment, Complications.
  - **High-Yield First:** Prioritize testable, high-yield facts, specifically including callouts for the Thai National Licensing Exam (NL).
  - **Emphasis:** Heavily bold key terms, pathognomonic findings, and crucial concepts in every sentence to allow rapid skimming. Do not bold generic category labels (e.g., Mechanism, Causes, Symptoms).
  - **Integrated Visuals:** Integrate clinical images and `mermaid` flowcharts directly within the bullet hierarchy where relevant, instead of placing them in separate figure sections.
- **Language:** Main content must be in English. Mnemonics are allowed to be solely in Thai. Contributors are invited to translate pages to Thai later.
- **Priority:** Thai medical knowledge and guidelines MUST be prioritized over US or other data.

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

## 4. SNOMED Lookup Architecture
When agents or frontend widgets interact with the SNOMED lookup system (e.g., via the backend `/snomed-suggest` endpoint), the following hybrid pipeline is used to prevent hallucination while retaining semantic translation capabilities (like Thai to English):
1. **Semantic Translation:** An LLM predicts the canonical *English SNOMED CT term name* from the user's potentially non-standard or Thai query.
2. **Verification (FHIR API):** The backend queries an official terminology server (e.g., CSIRO Ontoserver `tx.ontoserver.csiro.au`) via FHIR (`$expand`) using the predicted term to fetch the actual concept.
3. **Validation:** The system extracts the first active concept, guaranteeing 100% ID accuracy before returning it to the user.

## 5. Editorial CMS Workflow
The GitHub repository acts as the backend for Decap CMS. For the exact editorial workflow (Contributor -> Reviewer -> Editor) and proxy approval rules, you MUST read the canonical guidelines at `docs/docs/guidelines/author-guideline.md`, `docs/docs/guidelines/reviewer-guideline.md`, and `docs/docs/guidelines/editor-guideline.md` using the `view_file` tool before taking action.
