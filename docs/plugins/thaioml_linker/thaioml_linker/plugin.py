import os
import posixpath
import re

import yaml
from mkdocs.config import Config
from mkdocs.plugins import BasePlugin
from mkdocs.structure.files import Files


class ThaiOMLLinkerPlugin(BasePlugin):
    def __init__(self):
        self.snomed_index = {}  # snomed_id -> url

    def on_files(self, files: Files, config: Config):
        """
        Scan all markdown files and build an index mapping SNOMED ID to URL.
        """
        for file in files.documentation_pages():
            if os.path.exists(file.abs_src_path):
                with open(file.abs_src_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if content.startswith("---"):
                        try:
                            # Extract the YAML block
                            parts = content.split("---", 2)
                            if len(parts) >= 3:
                                frontmatter = yaml.safe_load(parts[1])
                                if frontmatter and "id" in frontmatter:
                                    snomed_id = str(frontmatter["id"])
                                    self.snomed_index[snomed_id] = file.src_uri
                        except Exception as e:
                            print(
                                f"[thaioml-linker] Error parsing frontmatter in {file.src_path}: {e}"
                            )

        print(
            f"[thaioml-linker] Built index with {len(self.snomed_index)} SNOMED concepts."
        )
        return files

    def on_page_markdown(self, markdown: str, page, config: Config, files: Files):
        """
        Replace terms in the markdown body with links based on snomed_links in frontmatter.
        """
        if not page.meta or "snomed_links" not in page.meta:
            return markdown

        snomed_links = page.meta.get("snomed_links", {})
        if not isinstance(snomed_links, dict):
            return markdown

        terms = sorted(snomed_links.keys(), key=len, reverse=True)

        for term in terms:
            snomed_id = str(snomed_links[term])
            url = self.snomed_index.get(snomed_id)

            is_stub = False
            if not url:
                url = f"stub/{snomed_id}.html"
                is_stub = True

            # Match markdown links, inline code, or the term itself
            pattern = re.compile(
                r"(`[^`]*`|\[[^\]]*\]\([^\)]*\))|(\b" + re.escape(term) + r"\b)"
            )

            def replacer(match):
                if match.group(1):
                    return match.group(1)
                elif match.group(2):
                    original_text = match.group(2)

                    if is_stub:
                        return f"[{original_text}](/{url})"

                    # Calculate relative URL from current page to target URL
                    page_dir = posixpath.dirname(page.file.src_uri)

                    if not page_dir:
                        rel_url = url
                    else:
                        rel_url = posixpath.relpath(url, page_dir)

                    return f"[{original_text}]({rel_url})"
                return match.group(0)

            markdown = pattern.sub(replacer, markdown)

        return markdown
