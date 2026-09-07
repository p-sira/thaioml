---
title: Editorial Guidelines
---

# ThaiOML Editorial Guidelines

Welcome to the ThaiOML contribution guide. This document serves as the unified source of truth for Authors, Reviewers, and Editors. Since this document is part of the repository, it will be automatically ingested into the RAG vector database, allowing contributors to query it via the AI Search!

## 1. Author Guidelines

Authors (Contributors) are the primary creators of content on ThaiOML.

* **Content Focus:** Articles must cater to medical students. 
* **Language:** Write the core content in English. Thai is permitted specifically for mnemonics.
* **Formatting:** All content is written in Markdown. Use `mermaid` codeblocks for flowcharts.
* **Metadata:** Ensure you fill out the required YAML frontmatter fields (like `type`, `specialty`, and `tags`) via the Decap CMS form.
* **Status:** When creating a new article or making an edit, set the `review_status` to `draft` or `pending`.

## 2. Reviewer Guidelines

Reviewers are staff members or medical experts tasked with ensuring the medical accuracy of the content.

* **Priority:** Thai medical knowledge and national clinical guidelines must take precedence over US/international data.
* **Approval:** Reviewers evaluate pending articles for clinical correctness. You may log into the CMS to approve articles directly.

## 3. Editor Guidelines

Editors (often medical students) manage the operational flow and act as the final gatekeepers before content is published to the public site.

* **Merging:** Editors are responsible for merging approved content into the `main` branch.
* **Proxy Approvals:** We recognize that some staff reviewers may not be comfortable navigating the CMS or GitHub. **Student editors are authorized to approve and merge content on behalf of staff reviewers** once they have received verbal or written confirmation of clinical accuracy outside the platform.
* **Final Check:** Before merging, the Editor must ensure the `review_status` is updated to `reviewed` and the `last_medical_review` date is set accurately.
