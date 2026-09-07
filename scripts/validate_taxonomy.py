import os
import sys
from pathlib import Path

import yaml


def extract_frontmatter(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                return yaml.safe_load(parts[1])
            except yaml.YAMLError as e:
                print(f"Error parsing YAML in {file_path}: {e}")
                return None
    return None


def validate_taxonomy(articles_dir):
    seen_ids = {}
    duplicates_found = False

    for path in Path(articles_dir).rglob("*.md"):
        frontmatter = extract_frontmatter(path)
        if frontmatter and "id" in frontmatter:
            concept_id = str(frontmatter["id"]).strip()

            if concept_id in seen_ids:
                print(f"ERROR: Duplicate SNOMED ID / Concept ID '{concept_id}' found.")
                print(f"  - File 1: {seen_ids[concept_id]}")
                print(f"  - File 2: {path}")
                duplicates_found = True
            else:
                seen_ids[concept_id] = path

    if duplicates_found:
        print("\nTaxonomy validation FAILED: Duplicate IDs detected.")
        sys.exit(1)
    else:
        print("\nTaxonomy validation PASSED: No duplicate IDs found.")
        sys.exit(0)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Validate ThaiOML taxonomy for duplicate SNOMED IDs."
    )
    parser.add_argument(
        "--dir",
        type=str,
        default="docs/docs/articles",
        help="Directory containing markdown articles",
    )
    args = parser.parse_args()

    articles_dir = args.dir
    if not os.path.isdir(articles_dir):
        # Allow passing gracefully if directory doesn't exist yet for testing purposes, just warn
        print(f"Warning: Directory '{articles_dir}' not found. Skipping validation.")
        sys.exit(0)

    validate_taxonomy(articles_dir)
