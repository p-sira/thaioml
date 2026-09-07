---
name: abbreviation-system
description: >-
  Explains the core principles of how abbreviations are treated in ThaiOML.
  Use this when parsing abbreviations or when resolving an abbreviation collision.
---

# Abbreviation System

In ThaiOML, abbreviations are treated as first-class entities, not plain text. This is critical for the RAG system to accurately disambiguate medical jargon.

## 1. The Disambiguation Principle
An abbreviation like "MS" can mean *Multiple Sclerosis*, *Mitral Stenosis*, or *Morphine Sulfate*.
Because of this, abbreviations must be explicitly registered and linked.

## 2. Creating an Abbreviation Entity
When a new abbreviation collision is found, or when defining a major abbreviation, create a dedicated file:
`docs/docs/articles/abbreviations/[ABBREVIATION].md` (or in the root articles folder if `type` handles it).

**Example Format:**
```yaml
---
id: abbr-ms
title: MS
type: abbreviation
meanings:
  - neuro-multiple-sclerosis
  - cardio-mitral-stenosis
  - pharm-morphine-sulfate
---

# MS

This abbreviation can refer to:
* [Multiple Sclerosis](neuro-multiple-sclerosis.md)
* [Mitral Stenosis](cardio-mitral-stenosis.md)
* [Morphine Sulfate](pharm-morphine-sulfate.md)
```

## 3. Build Rules
The static site build process (or a CI script) will eventually be responsible for:
1. Validating the abbreviation registry.
2. Detecting collisions.
3. Generating these disambiguation pages automatically if missing.
4. Generating a global abbreviation index.
