import os
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
            except yaml.YAMLError:
                return None
    return None


def build_graph(articles_dir):
    nodes = {}

    for path in Path(articles_dir).rglob("*.md"):
        # Keep path relative to docs directory for mkdocs
        try:
            rel_path = str(path.relative_to(Path(articles_dir).parent))
        except ValueError:
            rel_path = str(path)

        frontmatter = extract_frontmatter(path)
        if frontmatter and "id" in frontmatter:
            concept_id = str(frontmatter["id"]).strip()
            title = frontmatter.get("title", concept_id)
            parents = [str(p).strip() for p in frontmatter.get("parents", [])]

            nodes[concept_id] = {
                "id": concept_id,
                "title": title,
                "parents": parents,
                "path": rel_path,
            }

    return nodes


def build_tree(nodes):
    # Find roots (nodes with no parents, or parents that don't exist in our graph)
    roots = []
    children_map = {node_id: [] for node_id in nodes}

    for node_id, data in nodes.items():
        has_valid_parent = False
        for parent_id in data["parents"]:
            if parent_id in nodes:
                children_map[parent_id].append(node_id)
                has_valid_parent = True

        if not has_valid_parent:
            roots.append(node_id)

    # Recursive function to build mkdocs nav structure
    def get_nav_level(node_ids, visited):
        nav = []
        for node_id in sorted(node_ids, key=lambda x: nodes[x]["title"]):
            # Prevent infinite loops in case of cyclic graphs (though SNOMED should be a DAG)
            if node_id in visited:
                continue

            node_data = nodes[node_id]
            child_ids = children_map.get(node_id, [])

            if not child_ids:
                # Leaf node
                nav.append({node_data["title"]: node_data["path"]})
            else:
                # Node with children
                sub_nav = get_nav_level(child_ids, visited | {node_id})
                # Add self as an entry in the category as well
                sub_nav.insert(0, {"Overview": node_data["path"]})
                nav.append({node_data["title"]: sub_nav})

        return nav

    return get_nav_level(roots, set())


def update_mkdocs_nav(mkdocs_file, generated_nav):
    if not os.path.exists(mkdocs_file):
        print(f"Warning: {mkdocs_file} not found. Cannot update nav.")
        return

    with open(mkdocs_file, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f) or {}

    # Find existing nav and append/replace the Articles section
    existing_nav = config.get("nav", [])

    # Simple approach: either append or replace 'Medical Library'
    new_nav = []
    replaced = False
    for item in existing_nav:
        if isinstance(item, dict) and "Medical Library" in item:
            new_nav.append({"Medical Library": generated_nav})
            replaced = True
        else:
            new_nav.append(item)

    if not replaced:
        new_nav.append({"Medical Library": generated_nav})

    config["nav"] = new_nav

    with open(mkdocs_file, "w", encoding="utf-8") as f:
        yaml.dump(
            config, f, allow_unicode=True, default_flow_style=False, sort_keys=False
        )

    print("Successfully updated mkdocs.yml with polyhierarchical navigation.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate MkDocs navigation from polyhierarchical SNOMED links."
    )
    parser.add_argument(
        "--dir",
        type=str,
        default="docs/docs/articles",
        help="Directory containing markdown articles",
    )
    parser.add_argument(
        "--config", type=str, default="docs/mkdocs.yml", help="Path to mkdocs.yml"
    )
    args = parser.parse_args()

    if os.path.isdir(args.dir):
        nodes = build_graph(args.dir)
        nav = build_tree(nodes)

        if nav:
            # For testing, we can also just print the yaml
            print("Generated Navigation Map:")
            print(yaml.dump(nav, allow_unicode=True, default_flow_style=False))
            update_mkdocs_nav(args.config, nav)
        else:
            print("No valid nodes found to build navigation.")
    else:
        print(f"Warning: Directory '{args.dir}' not found. Skipping navigation build.")
