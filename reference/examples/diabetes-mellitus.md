---
title: Diabetes mellitus — content-format example
snomed_id: "73211009"
snomed_fsn: Diabetes mellitus (disorder)
type: disorder
parents: []
synonyms: [DM, โรคเบาหวาน]
specialty: [Endocrinology]
tags: [example, diagnosis, glycemic-control]
review_status: drafting
abstract: "Internal format example: diagnosis, insulin physiology and complication prevention. Editorial identities are fictional; clinical review is pending."
active_author: example-author
assigned_editor: example-editor
assigned_reviewers: [example-reviewer]
snomed_links:
  Diabetes mellitus: "73211009 | Diabetes mellitus"
  Metformin: "372567009 | Metformin"
references:
  - id: thai-cpg-2023
    text: "Diabetes Association of Thailand. Clinical practice guideline for diabetes 2023, updated February 2024 [Internet]. [cited 2026 Oct 11]."
    url: https://dmthai.org/new/index.php/activities-and-news/news-pr/naewthang-wech-ptibati-sahrab-rokh-bea-hwan-2566-chbab-prabprung-kph-67
  - id: niddk-overview
    text: "National Institute of Diabetes and Digestive and Kidney Diseases. What is diabetes? [Internet]. [cited 2026 Oct 11]."
    url: https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes
  - id: niddk-diagnosis
    text: "National Institute of Diabetes and Digestive and Kidney Diseases. Diabetes tests & diagnosis [Internet]. [cited 2026 Oct 11]."
    url: https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis
  - id: niddk-management
    text: "National Institute of Diabetes and Digestive and Kidney Diseases. Managing diabetes [Internet]. [cited 2026 Oct 11]."
    url: https://www.niddk.nih.gov/health-information/diabetes/overview/managing-diabetes
comments:
  - id: comment_example_open
    createdAt: "2026-10-11T12:00:00Z"
    author: {id: example-reviewer, name: Example Reviewer, username: example-reviewer, role: reviewer}
    content: "Example review thread: check HbA1c limitations against the cited source before clinical approval."
    highlightedText: "HbA1c may be unreliable"
    status: open
    resolvedBy: null
    resolvedAt: null
    replies:
      - id: reply_example
        createdAt: "2026-10-11T12:05:00Z"
        author: {id: example-author, name: Example Author, username: example-author, role: author}
        content: "Example reply: the plasma-glucose alternative is included below."
  - id: comment_example_resolved
    createdAt: "2026-10-11T12:00:00Z"
    author: {id: example-editor, name: Example Editor, username: example-editor, role: editor}
    content: "Example formatting thread: retain the Thai mnemonic inside the relevant bullet."
    highlightedText: "ตา–ไต–ประสาท"
    status: resolved
    resolvedBy: {id: example-author, name: Example Author, username: example-author, role: author}
    resolvedAt: "2026-10-11T12:10:00Z"
    replies: []
---

# Diabetes Mellitus

## Introduction

- Diabetes mellitus (**DM**) causes **persistent hyperglycemia** through inadequate insulin secretion, impaired insulin action, or both. [@niddk-overview]
  - Review the existing [library article](/articles/diabetes-mellitus) alongside this draft example.

## Pathophysiology

- **Type 1:** Immune-mediated β-cell destruction causes severe insulin deficiency; **insulin replacement is essential**. [@niddk-overview]
- **Type 2:** **Insulin resistance** and insufficient compensatory secretion raise plasma glucose. [@niddk-overview]
  - ![Simplified pathway from pancreatic insulin secretion to cellular glucose uptake](./insulin-action.svg)
  - *Original schematic; receptor signaling and tissue-specific effects are omitted.*

## Presentation

- Hyperglycemia may be **symptomatic or detected on testing**; clinical presentation alone does not establish the diagnosis. [@niddk-diagnosis]
  - Consider the differential and confirm using **laboratory testing**, rather than a home glucose meter. [@niddk-diagnosis]

## Evaluation

- Diagnostic thresholds for **nonpregnant adults**: [@niddk-diagnosis]
  - **Fasting plasma glucose ≥ 126 mg/dL**, after at least **8 hours** fasting.
  - **2-hour oral glucose tolerance test ≥ 200 mg/dL**.
  - **HbA1c ≥ 6.5%**.
  - **Random plasma glucose ≥ 200 mg/dL** when diabetes symptoms are present.
  - Without unequivocal symptomatic hyperglycemia, obtain <mark data-highlight="emerald" class="theme-highlight theme-highlight-emerald">confirmatory testing</mark>.
  - > [!IMPORTANT]
    > **High-Yield (NL):** Pair a diagnostic glucose result with its clinical context; **symptomatic random glucose ≥ 200 mg/dL** is the key immediate-diagnosis pattern. [@niddk-diagnosis]
- <mark data-comment-id="comment_example_open" class="comment-highlight">HbA1c may be unreliable</mark> with some hemoglobin variants or altered red-cell conditions; consider **plasma glucose testing** when results disagree. [@niddk-diagnosis]
- Diagnostic reasoning:
  ```mermaid
  flowchart TD
    A[Laboratory glucose assessment] --> B{Classic symptoms and random glucose >= 200 mg/dL?}
    B -->|Yes| C[Diagnose diabetes and assess severity]
    B -->|No| D[Assess fasting glucose, HbA1c or OGTT]
    D --> E{Diagnostic threshold reached?}
    E -->|Yes| F[Confirm with repeat or second abnormal test]
    E -->|No| G[Assess risk and arrange appropriate follow-up]
  ```

## Treatment

- Establish an **individualized care plan**: nutrition, physical activity, prescribed medicines and glucose monitoring. [@niddk-management]
  - **Type 1 requires insulin**; type 2 therapy depends on the patient's needs. [@niddk-overview; @niddk-management]
  - Consult the [Thai national diabetes guideline](https://dmthai.org/new/index.php/activities-and-news/news-pr/naewthang-wech-ptibati-sahrab-rokh-bea-hwan-2566-chbab-prabprung-kph-67) for local treatment pathways.
  - Review **Metformin** eligibility and alternatives using that guideline; a terminology link is not a prescribing recommendation.
- Follow the **ABCs**: <span data-text-color="accent" class="theme-text theme-text-accent">A1c, blood pressure and cholesterol</span>, plus smoking cessation. [@niddk-management]
  - **HbA1c &lt; 7%** is a common goal; <span data-text-color="red" class="theme-text theme-text-red">individualize the target</span> according to patient circumstances. [@niddk-management]

## Complications

- Chronic hyperglycemia increases risk of **eye, kidney, nerve and cardiovascular disease**. [@niddk-overview; @niddk-management]
  - Thai mnemonic: <mark data-comment-id="comment_example_resolved" data-resolved="true" class="comment-highlight comment-highlight-resolved">ตา–ไต–ประสาท</mark> recalls the major microvascular targets.
  - Coordinate **glucose management, blood-pressure control, lipid management and complication surveillance**. [@niddk-management]
- Terminology review: [Diabetes mellitus](snomed:73211009) opens a concept preview in Studio and resolves to the library article at build time. Referenced concepts without articles, such as [Metformin](snomed:372567009), receive an article-pending stub without another AI pass.
