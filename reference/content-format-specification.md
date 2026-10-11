# Content Format Specification

Canonical contract for ThaiOML article storage and rendering. Keep this document and the [example article](examples/diabetes-mellitus.md) synchronized in the same change whenever metadata, serialization, citation rules or rendering support changes. Check the implementation and [author guideline](../webapp/content/docs/guidelines/author-guideline.md) before changing this contract.

## Storage and workflow

Articles use Markdown with YAML frontmatter; Git is the source of truth. Public Fumadocs rendering is independent of FastAPI and PostgreSQL.

| Content | Path | Branch |
| --- | --- | --- |
| Editorial drafts | `webapp/content/docs/editorial/{slug}.md` | `editorial` |
| Approved articles | `webapp/content/docs/articles/{slug}.md` | `main`, through a publication PR |
| Public policies | `webapp/content/docs/guidelines/{slug}.md` | `main` |
| Developer specification and examples | `reference/` | `main`, through a development PR |

Workflow: `pitch → accepted → drafting → in_review → approved → published`. Clinical approval remains a human decision. Studio locks the body and reference controls during `pitch`; reviewers annotate through comments. Saving a `published` editorial file writes its article counterpart on `publish/{slug}`, removes the editorial copy, and creates a PR targeting `main`. It does not merge the PR automatically.

## Frontmatter

| Fields | Shape and purpose |
| --- | --- |
| `title`, `review_status` | Required strings: title and workflow state. Preserve legacy statuses when editing older articles. |
| `snomed_id`, legacy `id` | Verified concept ID stored as a string. New Studio drafts use `snomed_id`; do not normalize unrelated legacy files. |
| `snomed_fsn`, `type` | Optional strings: SNOMED fully specified name and category (`disorder`, `drug`, `substance`, `procedure`, `anatomy`). |
| `parents`, `synonyms`, `specialty`, `tags` | Optional string arrays. Terminology IDs remain strings. |
| `abstract` | String: concise pitch or summary. |
| `active_author`, `assigned_editor`, `assigned_reviewers` | Usernames; reviewers are a string array. Clerk controls actual identity and permissions. |
| `last_medical_review` | Optional ISO date of an actual medical review; never invent a review date. |
| `snomed_links` | Phrase-to-string map, e.g. `Metformin: "372567009 | Metformin"`. |
| `references` | Optional array of `{ id, text, url? }`; see citations below. |
| `comments` | Optional array of [CommentThread](../webapp/src/types/editorial.ts) records; see comment anchors below. |

Unknown frontmatter is preserved by Studio saves. The Fumadocs schema explicitly retains `references` and `snomed_links` for build plugins; other custom fields are not automatically exposed by the public content loader. Implementation: [source configuration](../webapp/source.config.ts).

## Body and inline formatting

Use nested bullets, **bold** key findings and thresholds, and the disease sections `Introduction`, `Pathophysiology`, `Presentation`, `Evaluation`, `Treatment`, `Complications`. Keep core clinical text in English; Thai supports mnemonics and localized terms. Place visuals and exam alerts within the relevant bullet hierarchy.

| Feature | Stored syntax |
| --- | --- |
| Highlight | `<mark data-highlight="emerald">text</mark>` |
| Text color | `<span data-text-color="red">text</span>` |
| Open comment | `<mark data-comment-id="comment_example">text</mark>` |
| Resolved comment | `<mark data-comment-id="comment_example" data-resolved="true">text</mark>` |
| Manual terminology link | `[Diabetes mellitus](snomed:73211009)` |
| Ordinary link | `[Guideline](https://example.org/guideline)` |
| Image | `![Descriptive alt text](./diagram.svg)` |
| Flowchart | A fenced `mermaid` block inside a bullet. |
| Exam alert | A nested blockquote starting with `[!IMPORTANT]`, followed by `**High-Yield (NL):**`. |

Highlight colors: `amber`, `emerald`, `sky`, `purple`, `rose`, `accent`. Text colors: `default`, `muted`, `accent`, `blue`, `green`, `amber`, `red`, `purple`; `default` removes the color mark. Studio serializes corresponding theme classes as well as the data attributes. Escape comparison signs in inline HTML (`&lt;`, `&gt;`).

Comment anchor IDs must match frontmatter threads. A thread has `id`, `createdAt`, `author`, `content`, `status` (`open` or `resolved`) and `replies`; optional fields include `highlightedText`, `resolvedBy`, `resolvedAt`, `updatedAt`. Authors contain `id`, `name`, `username` and optional `avatar`, `role`. Replies contain `id`, `createdAt`, `author`, `content` and optional `updatedAt`. See the type definition for the exact interface; resolved anchors and thread status must agree.

### Terminology behavior

Studio's `/term` command and link dialog insert `snomed:` links and support link previews. Build-time `snomed_links` matching creates relative article links for indexed legacy `id` values, or `/stub/{id}` when no target exists. Matching excludes existing links, headings, code, and generated citations/references. The Auto Link action replaces body Markdown returned by FastAPI; it does not populate the `snomed_links` map automatically.

### Current rendering boundaries

Stored syntax does not guarantee identical Studio and public presentation. The current public page supplies no custom Mermaid, GitHub-alert or SNOMED-protocol component: Mermaid remains code, exam alerts remain blockquotes, and public navigation should use generated or ordinary relative links. Studio's configured extensions do not provide dedicated image, table or Mermaid editing. Check round-trip preservation before editing such blocks in Studio. The current `.md` compiler removes raw HTML tags, so highlight/color/comment wrappers retain their text but lose their markup publicly; Studio retains the wrappers and theme classes. These limitations must be updated when support changes.

## References and citations

```yaml
references:
  - id: guideline
    text: "Complete author-entered Vancouver reference."
    url: https://example.org/guideline
```

- IDs are unique and case-sensitive, matching `[A-Za-z0-9][A-Za-z0-9_-]*`. Keep them stable. `text` is nonempty plain text; Markdown/HTML inside it is displayed literally. Optional `url` must be absolute HTTP(S); DOI links use `https://doi.org/{doi}`. Metadata lookup and automatic Vancouver formatting are not provided.
- Cite one source with `[@guideline]` or several with `[@first; @second]`. Duplicate keys within a group are removed, preserving order. Numbers follow first citation; repeats reuse their number. Uncited sources follow in frontmatter order, and all references are published.
- Public rendering adds superscript links, a `References` ordered list, source links and occurrence backlinks. Do not maintain a second bibliography in the body.
- Escaped syntax (`\[@literal]`), code, existing Markdown links/destinations, image alt text and HTML attributes are excluded from citation recognition.
- Studio's **References** tab adds/edits sources and inserts selected sources at the saved editor selection. Click or keyboard-activate a citation to edit its group. Remove all uses before deleting a source.
- Invalid records, duplicate IDs, unsafe URLs and unresolved citation keys block Studio saves, GitHub writes and static compilation. Invalid data remains available for correction. Implementation: [shared citation rules](../webapp/src/lib/citations.ts).

## Example and maintenance checks

[Diabetes mellitus](examples/diabetes-mellitus.md) demonstrates metadata, all six clinical sections, highlights, text colors, open/resolved comments with a reply, manual/generated/internal/external links, an original image, Mermaid, an NL alert, single/grouped/repeated citations and an uncited source. Editorial identities are fictional and the status remains `drafting`; this internal example is excluded from public article indexing. Its SVG is original and follows the repository's public-content license.

When changing the format, update this specification and the example together; validate YAML, reference IDs and comment anchors, then check Studio serialization and public compilation separately. Content-loader changes also require a production build. Preserve unsupported blocks and report rendering limitations instead of claiming full support.
