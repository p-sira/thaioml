import csv
from pathlib import Path

from backend.core.db import Base, engine
from backend.models.snomed import SnomedConcept, SnomedDescription
from sqlalchemy import insert, text


def create_tables():
    print("Creating extensions and tables...")
    # Create extension first
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
        conn.commit()

    Base.metadata.create_all(engine)
    print("Tables created successfully.")


def ingest_concepts(file_path: Path):
    if not file_path.exists():
        print(f"Concept file not found: {file_path}")
        return

    print(f"Ingesting concepts from {file_path}...")
    concepts = []
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            concepts.append(
                {"concept_id": int(row["id"]), "active": row["active"] == "1"}
            )
            if len(concepts) >= 10000:
                with engine.begin() as conn:
                    conn.execute(insert(SnomedConcept), concepts)
                concepts = []
        if concepts:
            with engine.begin() as conn:
                conn.execute(insert(SnomedConcept), concepts)
    print("Concept ingestion complete.")


def ingest_descriptions(file_path: Path):
    if not file_path.exists():
        print(f"Description file not found: {file_path}")
        return

    print(f"Ingesting descriptions from {file_path}...")
    descriptions = []
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            descriptions.append(
                {
                    "id": int(row["id"]),
                    "concept_id": int(row["conceptId"]),
                    "term": row["term"],
                    "type_id": int(row["typeId"]),
                    "active": row["active"] == "1",
                }
            )
            if len(descriptions) >= 10000:
                with engine.begin() as conn:
                    conn.execute(insert(SnomedDescription), descriptions)
                descriptions = []
        if descriptions:
            with engine.begin() as conn:
                conn.execute(insert(SnomedDescription), descriptions)
    print("Description ingestion complete.")


def main():
    data_dir = Path(__file__).resolve().parent.parent.parent.parent / "data"
    concept_file = (
        data_dir / "sct2_Concept_Snapshot_INT_20230731.txt"
    )  # Adjust filename as needed
    desc_file = (
        data_dir / "sct2_Description_Snapshot-en_INT_20230731.txt"
    )  # Adjust filename as needed

    create_tables()

    # Uncomment when actual files are present
    # ingest_concepts(concept_file)
    # ingest_descriptions(desc_file)

    print(
        "Note: Update the filenames in ingest_snomed.py to match your actual RF2 files."
    )


if __name__ == "__main__":
    main()
