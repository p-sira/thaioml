---
name: abbreviation-system
description: Handle medical abbreviations in ThaiOML articles, including ambiguous abbreviations and collisions between meanings.
---

# Abbreviation System

Treat an abbreviation as terminology that needs clinical context rather than a globally unique alias.

## Workflow

1. Search article frontmatter and content for the abbreviation and each proposed expansion before editing.
2. For an unambiguous abbreviation, add it to the canonical concept's `synonyms` and define it on first use in prose.
3. For an abbreviation with multiple meanings, keep each expansion attached to its canonical concept and make the wording explicit enough to disambiguate it.
4. Reuse the article's existing identifier and linking conventions. Do not invent an abbreviation registry, identifier prefix, or generated disambiguation page unless the repository implements that system.
5. Verify that search and linking resolve the intended concept and that no duplicate concept article was introduced.

When the work also changes article content or metadata, apply `medical-article-workflow`.
