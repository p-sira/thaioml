import csv
import sys
from pathlib import Path

# Increase CSV field size limit to handle very large text fields (e.g. SNOMED descriptions)
csv.field_size_limit(sys.maxsize)

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from tqdm import tqdm

from backend.core.db import Base, engine
from backend.models.snomed import SnomedConcept, SnomedDescription


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
        for row in tqdm(reader, desc="Concepts"):
            if row["active"] != "1":
                continue
            concepts.append(
                {"concept_id": int(row["id"]), "active": row["active"] == "1"}
            )
            if len(concepts) >= 10000:
                with engine.begin() as conn:
                    conn.execute(
                        pg_insert(SnomedConcept).on_conflict_do_nothing(), concepts
                    )
                concepts = []
        if concepts:
            with engine.begin() as conn:
                conn.execute(
                    pg_insert(SnomedConcept).on_conflict_do_nothing(), concepts
                )
    print("Concept ingestion complete.")


def ingest_descriptions(file_path: Path):
    if not file_path.exists():
        print(f"Description file not found: {file_path}")
        return

    print(f"Ingesting descriptions from {file_path}...")
    descriptions = []
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in tqdm(reader, desc="Descriptions"):
            if row["active"] != "1":
                continue
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
                    conn.execute(
                        pg_insert(SnomedDescription).on_conflict_do_nothing(),
                        descriptions,
                    )
                descriptions = []
        if descriptions:
            with engine.begin() as conn:
                conn.execute(
                    pg_insert(SnomedDescription).on_conflict_do_nothing(), descriptions
                )
    print("Description ingestion complete.")


def main():
    data_dir = Path(__file__).resolve().parent.parent.parent.parent / "data"
    concept_file = data_dir / "sct2_Concept_Snapshot_INT_20260901.txt"
    desc_file = data_dir / "sct2_Description_Snapshot-en_INT_20260901.txt"

    create_tables()

    ingest_concepts(concept_file)
    ingest_descriptions(desc_file)


if __name__ == "__main__":
    main()
