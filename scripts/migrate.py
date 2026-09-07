import os
import yaml
from pathlib import Path

# Mapping of current filenames (without .md) to new SNOMED CT frontmatter data
mappings = {
    "diabetes-mellitus": {
        "id": "73211009",
        "title": "Diabetes mellitus",
        "snomed_fsn": "Diabetes mellitus (disorder)",
        "type": "disorder",
        "synonyms": ["DM", "โรคเบาหวาน"],
        "parents": ["73211009"] # Assuming root for now, or endocrine disorder 62459000
    },
    "diabetic-ketoacidosis": {
        "id": "420422005",
        "title": "Diabetic ketoacidosis",
        "snomed_fsn": "Diabetic ketoacidosis (disorder)",
        "type": "disorder",
        "synonyms": ["DKA", "ภาวะเลือดเป็นกรดจากคีโตนจากเบาหวาน"],
        "parents": ["73211009"]
    },
    "headache": {
        "id": "25064002",
        "title": "Headache",
        "snomed_fsn": "Headache (finding)",
        "type": "finding",
        "synonyms": ["อาการปวดศีรษะ"],
        "parents": []
    },
    "heart-murmur": {
        "id": "88610006",
        "title": "Heart murmur",
        "snomed_fsn": "Heart murmur (finding)",
        "type": "finding",
        "synonyms": ["เสียงฟู่ของหัวใจ"],
        "parents": []
    },
    "hyperglycemic-hyperosmotic-syndrome": {
        "id": "190446001",
        "title": "Hyperosmolar hyperglycemic state",
        "snomed_fsn": "Hyperosmolar hyperglycemic state (disorder)",
        "type": "disorder",
        "synonyms": ["HHS", "HONK"],
        "parents": ["73211009"]
    },
    "hypoglycemic-agents": {
        "id": "372793006",
        "title": "Hypoglycemic agent",
        "snomed_fsn": "Hypoglycemic agent (substance)",
        "type": "substance",
        "synonyms": ["Anti-diabetic drugs", "ยาลดน้ำตาลในเลือด"],
        "parents": []
    },
    "insulin-therapy": {
        "id": "226065005",
        "title": "Insulin therapy",
        "snomed_fsn": "Insulin therapy (procedure)",
        "type": "procedure",
        "synonyms": ["การรักษาด้วยอินซูลิน"],
        "parents": []
    },
    "ischemic-stroke": {
        "id": "422504002",
        "title": "Ischemic stroke",
        "snomed_fsn": "Ischemic stroke (disorder)",
        "type": "disorder",
        "synonyms": ["Cerebral infarction", "โรคหลอดเลือดสมองตีบหรืออุดตัน"],
        "parents": []
    },
    "lacunar-stroke": {
        "id": "15301000",
        "title": "Lacunar infarction",
        "snomed_fsn": "Lacunar infarction (disorder)",
        "type": "disorder",
        "synonyms": ["Lacunar stroke"],
        "parents": ["422504002"]
    },
    "language-disorder": {
        "id": "62415009",
        "title": "Language disorder",
        "snomed_fsn": "Language disorder (disorder)",
        "type": "disorder",
        "synonyms": ["ความผิดปกติทางภาษา"],
        "parents": []
    },
    "st-elevated-myocardial-infarction": {
        "id": "401303003",
        "title": "Acute ST segment elevation myocardial infarction",
        "snomed_fsn": "Acute ST segment elevation myocardial infarction (disorder)",
        "type": "disorder",
        "synonyms": ["STEMI", "กล้ามเนื้อหัวใจตายเฉียบพลันชนิด ST ยก"],
        "parents": []
    },
    "valvular-heart-disease": {
        "id": "368009",
        "title": "Heart valve disorder",
        "snomed_fsn": "Heart valve disorder (disorder)",
        "type": "disorder",
        "synonyms": ["VHD", "โรคลิ้นหัวใจ"],
        "parents": []
    }
}

class NoAliasDumper(yaml.SafeDumper):
    def ignore_aliases(self, data):
        return True

def migrate_article(file_path):
    filename = Path(file_path).stem
    if filename not in mappings:
        print(f"Skipping {filename} - no mapping found.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if not content.startswith('---'):
        return

    parts = content.split('---', 2)
    if len(parts) < 3:
        return

    try:
        frontmatter = yaml.safe_load(parts[1])
    except Exception as e:
        print(f"Error parsing {filename}: {e}")
        return

    body = parts[2]
    mapping = mappings[filename]

    # Build new frontmatter, retaining some old fields if appropriate
    new_fm = {
        "id": mapping["id"],
        "title": mapping["title"],
        "snomed_fsn": mapping["snomed_fsn"],
        "type": mapping["type"],
        "parents": mapping["parents"],
        "synonyms": mapping["synonyms"],
    }
    
    # Retain specialty, tags, review_status, last_medical_review
    if "specialty" in frontmatter:
        new_fm["specialty"] = frontmatter["specialty"]
    if "tags" in frontmatter:
        new_fm["tags"] = frontmatter["tags"]
    if "review_status" in frontmatter:
        new_fm["review_status"] = frontmatter["review_status"]
    if "last_medical_review" in frontmatter:
        new_fm["last_medical_review"] = frontmatter["last_medical_review"]

    # Incorporate old abbreviations into synonyms
    old_abbrs = frontmatter.get("abbreviations", [])
    if old_abbrs and isinstance(old_abbrs, list):
        for abbr in old_abbrs:
            if abbr not in new_fm["synonyms"]:
                new_fm["synonyms"].append(abbr)

    # Convert back to yaml
    yaml_str = yaml.dump(new_fm, allow_unicode=True, Dumper=NoAliasDumper, default_flow_style=False, sort_keys=False)
    
    new_content = f"---\n{yaml_str}---\n{body.lstrip()}"

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Migrated {filename}")

if __name__ == "__main__":
    articles_dir = "docs/docs/articles"
    for p in Path(articles_dir).rglob("*.md"):
        migrate_article(p)
