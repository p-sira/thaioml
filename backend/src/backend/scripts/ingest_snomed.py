"""Validate and atomically replace the active International RF2 snapshot."""

import argparse
import csv
import re
import sqlite3
import sys
from collections.abc import Iterator
from contextlib import closing, contextmanager
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory

from sqlalchemy import Connection, Engine
from tqdm import tqdm

from backend.core.db import engine

csv.field_size_limit(sys.maxsize)
MAX_DATABASE_BYTES = 460_000_000
CONCEPT_HEADER = ("id", "effectiveTime", "active", "moduleId", "definitionStatusId")
DESCRIPTION_HEADER = (
    "id",
    "effectiveTime",
    "active",
    "moduleId",
    "conceptId",
    "languageCode",
    "typeId",
    "term",
    "caseSignificanceId",
)


def snapshot_files(data_dir: Path) -> tuple[Path, Path, str]:
    files = list(data_dir.glob("sct2_Concept_Snapshot_INT_*.txt"))
    if len(files) != 1:
        raise ValueError(
            f"Expected exactly one International concept snapshot in {data_dir}"
        )
    match = re.fullmatch(r"sct2_Concept_Snapshot_INT_(\d{8})\.txt", files[0].name)
    if not match:
        raise ValueError(
            "Concept snapshot filename must contain an eight-digit release date"
        )
    release = match[1]
    date.fromisoformat(release)
    descriptions = data_dir / f"sct2_Description_Snapshot-en_INT_{release}.txt"
    if not descriptions.is_file():
        raise FileNotFoundError(
            f"Matching English description snapshot is missing: {descriptions}"
        )
    return files[0], descriptions, release


def identifier(value: str) -> int:
    if not value.isascii() or not value.isdecimal() or not 0 < int(value) <= 2**63 - 1:
        raise ValueError(f"Invalid positive bigint identifier: {value!r}")
    return int(value)


def rf2_rows(
    path: Path, header: tuple[str, ...], release: str
) -> Iterator[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source, delimiter="\t", quoting=csv.QUOTE_NONE)
        if tuple(reader.fieldnames or ()) != header:
            raise ValueError(f"Invalid RF2 header in {path.name}")
        for row in tqdm(reader, desc=path.name):
            try:
                if None in row or any(value is None for value in row.values()):
                    raise ValueError("Wrong number of columns")
                if row["active"] not in ("0", "1"):
                    raise ValueError("active must be 0 or 1")
                effective = row["effectiveTime"]
                if not re.fullmatch(r"\d{8}", effective):
                    raise ValueError("effectiveTime must be a published date")
                date.fromisoformat(effective)
                if effective > release:
                    raise ValueError("effectiveTime is newer than the release")
                for key in header:
                    if key == "id" or key.endswith("Id"):
                        identifier(row[key])
                if "term" in row and (
                    row["languageCode"] != "en"
                    or not row["term"].strip()
                    or "\0" in row["term"]
                ):
                    raise ValueError(
                        "Expected a non-empty English term without NUL characters"
                    )
            except ValueError as error:
                raise ValueError(f"{path.name}:{reader.line_num}: {error}") from error
            yield row


@contextmanager
def stage_snapshot(data_dir: Path) -> Iterator[sqlite3.Connection]:
    """Validate every row locally, including inactive records, before any remote write."""
    concepts, descriptions, release = snapshot_files(data_dir)
    with (
        TemporaryDirectory(prefix="thaioml-snomed-") as directory,
        closing(sqlite3.connect(Path(directory) / "snapshot.sqlite")) as stage,
    ):
        stage.executescript(
            "CREATE TABLE concepts (id INTEGER PRIMARY KEY, active INTEGER NOT NULL);"
            "CREATE TABLE descriptions (id INTEGER PRIMARY KEY, concept_id INTEGER NOT NULL, "
            "term TEXT NOT NULL, type_id INTEGER NOT NULL, active INTEGER NOT NULL);"
        )
        try:
            stage.executemany(
                "INSERT INTO concepts VALUES (?, ?)",
                (
                    (int(row["id"]), int(row["active"]))
                    for row in rf2_rows(concepts, CONCEPT_HEADER, release)
                ),
            )
            stage.executemany(
                "INSERT INTO descriptions VALUES (?, ?, ?, ?, ?)",
                (
                    (
                        int(row["id"]),
                        int(row["conceptId"]),
                        row["term"],
                        int(row["typeId"]),
                        int(row["active"]),
                    )
                    for row in rf2_rows(descriptions, DESCRIPTION_HEADER, release)
                ),
            )
        except sqlite3.IntegrityError as error:
            raise ValueError("Duplicate identifiers in RF2 snapshot") from error
        orphan = stage.execute(
            "SELECT d.id FROM descriptions d LEFT JOIN concepts c ON c.id=d.concept_id "
            "WHERE c.id IS NULL LIMIT 1"
        ).fetchone()
        if orphan:
            raise ValueError(
                f"Description {orphan[0]} references a concept absent from the snapshot"
            )
        counts = snapshot_counts(stage)
        if not all(counts):
            raise ValueError("Snapshot must contain active concepts and descriptions")
        stage.commit()
        print(
            f"Validated release {release}: {counts[0]:,} active concepts, {counts[1]:,} active descriptions"
        )
        yield stage


def snapshot_counts(stage: sqlite3.Connection) -> tuple[int, int]:
    return (
        stage.execute("SELECT count(*) FROM concepts WHERE active=1").fetchone()[0],
        stage.execute(
            "SELECT count(*) FROM descriptions d JOIN concepts c ON c.id=d.concept_id "
            "WHERE d.active=1 AND c.active=1"
        ).fetchone()[0],
    )


def database_bytes(connection: Connection) -> int:
    return int(
        connection.exec_driver_sql(
            "SELECT sum(pg_database_size(datname)) FROM pg_database"
        ).scalar_one()
    )


def refresh_snapshot(
    stage: sqlite3.Connection,
    database_engine: Engine = engine,
    max_bytes: int = MAX_DATABASE_BYTES,
) -> int:
    if database_engine.dialect.name != "postgresql":
        raise ValueError("DATABASE_URL must point to the intended PostgreSQL database")
    print(f"Target: {database_engine.url.host}/{database_engine.url.database}")
    with database_engine.begin() as connection:
        connection.exec_driver_sql("SET LOCAL lock_timeout = '5s'")
        connection.exec_driver_sql("SET LOCAL statement_timeout = '30min'")
        if not connection.exec_driver_sql(
            "SELECT pg_try_advisory_xact_lock(hashtext('thaioml.snomed_ingest'))"
        ).scalar_one():
            raise RuntimeError("Another SNOMED import is running")
        # Require the existing, migrated schema; preserve indexes, grants, and policies.
        connection.exec_driver_sql(
            "LOCK TABLE public.snomed_concepts, public.snomed_descriptions IN ACCESS EXCLUSIVE MODE"
        )
        old_bytes = connection.exec_driver_sql(
            "SELECT pg_total_relation_size('public.snomed_concepts') + "
            "pg_total_relation_size('public.snomed_descriptions')"
        ).scalar_one()
        connection.exec_driver_sql(
            "TRUNCATE ONLY public.snomed_concepts, public.snomed_descriptions"
        )
        with connection.connection.driver_connection.cursor() as cursor:
            with cursor.copy(
                "COPY public.snomed_concepts (concept_id, active) FROM STDIN"
            ) as copy:
                for row in stage.execute(
                    "SELECT id, 1 FROM concepts WHERE active=1 ORDER BY id"
                ):
                    copy.write_row((row[0], True))
            with cursor.copy(
                "COPY public.snomed_descriptions (id, concept_id, term, type_id, active) FROM STDIN"
            ) as copy:
                for row in stage.execute(
                    "SELECT d.id, d.concept_id, d.term, d.type_id FROM descriptions d "
                    "JOIN concepts c ON c.id=d.concept_id WHERE d.active=1 AND c.active=1 ORDER BY d.id"
                ):
                    copy.write_row((*row, True))
        counts = connection.exec_driver_sql(
            "SELECT (SELECT count(*) FROM public.snomed_concepts), "
            "(SELECT count(*) FROM public.snomed_descriptions)"
        ).one()
        if tuple(counts) != snapshot_counts(stage):
            raise RuntimeError(
                "Uploaded row counts do not match the validated snapshot"
            )
        connection.exec_driver_sql(
            "SELECT gin_clean_pending_list('public.trgm_idx_snomed_term'::regclass)"
        )
        connection.exec_driver_sql("ANALYZE public.snomed_concepts")
        connection.exec_driver_sql("ANALYZE public.snomed_descriptions")
        # TRUNCATE retains old relation files until commit so rollback can restore them.
        projected_bytes = database_bytes(connection) - old_bytes
        if projected_bytes >= max_bytes:
            raise RuntimeError(
                f"Replacement would use {projected_bytes / 1_000_000:.2f} MB, "
                f"exceeding the {max_bytes / 1_000_000:.2f} MB limit; import rolled back"
            )
    with database_engine.connect() as connection:
        actual_bytes = database_bytes(connection)
    print(f"Release committed. Total database size: {actual_bytes / 1_000_000:.2f} MB")
    if actual_bytes >= max_bytes:
        raise RuntimeError(
            "Release committed, but concurrent database growth exceeded the size limit"
        )
    return actual_bytes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-dir", type=Path, default=Path(__file__).resolve().parents[3] / "data"
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate files locally without connecting to PostgreSQL",
    )
    args = parser.parse_args()
    with stage_snapshot(args.data_dir) as stage:
        if not args.validate_only:
            refresh_snapshot(stage)


if __name__ == "__main__":
    main()
