"""RF2 validation and atomic refresh tests against a disposable database."""

import csv
import os

import pytest
from psycopg.errors import CheckViolation
from sqlalchemy import create_engine

from backend.models.snomed import SnomedConcept, SnomedDescription
from backend.scripts.ingest_snomed import (
    CONCEPT_HEADER,
    DESCRIPTION_HEADER,
    database_bytes,
    refresh_snapshot,
    snapshot_counts,
    stage_snapshot,
)


@pytest.fixture
def snapshot(tmp_path):
    concepts = [
        (100, "20261001", 1, 1, 1),
        (200, "20261001", 0, 1, 1),
        (300, "20261001", 1, 1, 1),
    ]
    descriptions = [
        (1000, "20261001", 1, 1, 100, "en", 1, "Changed term (disorder)", 1),
        (2000, "20261001", 1, 1, 200, "en", 1, "Inactive concept", 1),
        (3000, "20261001", 0, 1, 100, "en", 1, "Retired description", 1),
        (4000, "20261001", 1, 1, 300, "en", 1, 'New "quoted" term \\ value', 1),
    ]
    for filename, header, rows in (
        ("sct2_Concept_Snapshot_INT_20261001.txt", CONCEPT_HEADER, concepts),
        (
            "sct2_Description_Snapshot-en_INT_20261001.txt",
            DESCRIPTION_HEADER,
            descriptions,
        ),
    ):
        with (tmp_path / filename).open("w", newline="") as stream:
            writer = csv.writer(
                stream,
                delimiter="\t",
                quoting=csv.QUOTE_NONE,
                escapechar="~",
                quotechar=None,
            )
            writer.writerow(header)
            writer.writerows(rows)
    return tmp_path


def test_snapshot_filters_retired_rows_and_preserves_terms(snapshot):
    with stage_snapshot(snapshot) as stage:
        assert snapshot_counts(stage) == (2, 2)
        assert (
            stage.execute("SELECT term FROM descriptions WHERE id=4000").fetchone()[0]
            == 'New "quoted" term \\ value'
        )


@pytest.mark.parametrize(
    ("old", "new", "error"),
    [
        ("1000\t", "invalid\t", "identifier"),
        ("\t20261001\t", "\t20261002\t", "newer"),
        ("\t20261001\t", "\t20260230\t", "day"),
        ("\t1\t1\t100\t", "\t2\t1\t100\t", "active"),
        ("\t100\ten\t", "\t999\ten\t", "absent"),
        ("\ten\t", "\tth\t", "English"),
        ("Changed term (disorder)", "", "English"),
        ("1000\t", "4000\t", "Duplicate"),
        ("caseSignificanceId", "unexpected", "header"),
    ],
)
def test_invalid_snapshot_is_rejected(snapshot, old, new, error):
    path = snapshot / "sct2_Description_Snapshot-en_INT_20261001.txt"
    path.write_text(path.read_text().replace(old, new, 1))
    with pytest.raises(ValueError, match=error), stage_snapshot(snapshot):
        pytest.fail("Invalid data was accepted")


def test_missing_description_file_is_rejected(snapshot):
    (snapshot / "sct2_Description_Snapshot-en_INT_20261001.txt").unlink()
    with pytest.raises(FileNotFoundError), stage_snapshot(snapshot):
        pytest.fail("Missing file was accepted")


@pytest.fixture
def disposable_database():
    url = os.environ.get("SNOMED_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set SNOMED_TEST_DATABASE_URL to a disposable Postgres database")
    database = create_engine(url)
    if database.url.database != "snomed_ingestion_test":
        pytest.fail("Integration tests require a database named snomed_ingestion_test")
    tables = (SnomedDescription.__table__, SnomedConcept.__table__)
    with database.begin() as connection:
        connection.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        for table in tables:
            table.drop(connection, checkfirst=True)
        for table in reversed(tables):
            table.create(connection)
        for table in tables:
            connection.exec_driver_sql(
                f"ALTER TABLE {table.name} ENABLE ROW LEVEL SECURITY"
            )
            connection.exec_driver_sql(
                f"CREATE POLICY deny_direct_api_access ON {table.name} AS RESTRICTIVE "
                "FOR ALL TO PUBLIC USING (false) WITH CHECK (false)"
            )
        connection.exec_driver_sql(
            "INSERT INTO snomed_concepts VALUES (100,true),(200,true),(999,true)"
        )
        connection.exec_driver_sql(
            "INSERT INTO snomed_descriptions VALUES "
            "(1000,100,'Old term',1,true),(2000,200,'Retiring concept',1,true),"
            "(3000,100,'Retiring description',1,true),(9990,999,'Absent from release',1,true)"
        )
    try:
        yield database
    finally:
        with database.begin() as connection:
            for table in tables:
                table.drop(connection)
        database.dispose()


def rows(database):
    with database.connect() as connection:
        return (
            connection.exec_driver_sql(
                "SELECT * FROM snomed_concepts ORDER BY concept_id"
            ).all(),
            connection.exec_driver_sql(
                "SELECT * FROM snomed_descriptions ORDER BY id"
            ).all(),
        )


def test_refresh_replaces_release_and_preserves_schema(snapshot, disposable_database):
    with stage_snapshot(snapshot) as stage:
        refresh_snapshot(stage, disposable_database)
        first = rows(disposable_database)
        refresh_snapshot(stage, disposable_database)
        assert rows(disposable_database) == first
    assert [row[0] for row in first[0]] == [100, 300]
    assert [row[0] for row in first[1]] == [1000, 4000]
    assert first[1][0][2] == "Changed term (disorder)"
    with disposable_database.connect() as connection:
        assert (
            connection.exec_driver_sql(
                "SELECT count(*) FROM pg_policies WHERE policyname='deny_direct_api_access'"
            ).scalar_one()
            == 2
        )
        assert connection.exec_driver_sql(
            "SELECT bool_and(relrowsecurity) FROM pg_class WHERE relname IN ('snomed_concepts','snomed_descriptions')"
        ).scalar_one()
        assert connection.exec_driver_sql(
            "SELECT to_regclass('trgm_idx_snomed_term')"
        ).scalar_one()


def test_size_failure_rolls_back_both_tables(snapshot, disposable_database):
    before = rows(disposable_database)
    with disposable_database.connect() as connection:
        size_before = database_bytes(connection)
    with (
        stage_snapshot(snapshot) as stage,
        pytest.raises(RuntimeError, match="rolled back"),
    ):
        refresh_snapshot(stage, disposable_database, max_bytes=1)
    assert rows(disposable_database) == before
    with disposable_database.connect() as connection:
        assert database_bytes(connection) <= size_before + 100_000


def test_copy_failure_rolls_back_truncate(snapshot, disposable_database):
    before = rows(disposable_database)
    with stage_snapshot(snapshot) as stage:
        with disposable_database.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE snomed_descriptions ADD CONSTRAINT reject_new_term CHECK (term <> 'Changed term (disorder)')"
            )
        with pytest.raises(CheckViolation, match="reject_new_term"):
            refresh_snapshot(stage, disposable_database)
    assert rows(disposable_database) == before


def test_concurrent_import_is_rejected(snapshot, disposable_database):
    before = rows(disposable_database)
    with disposable_database.begin() as other, stage_snapshot(snapshot) as stage:
        other.exec_driver_sql(
            "SELECT pg_advisory_xact_lock(hashtext('thaioml.snomed_ingest'))"
        )
        with pytest.raises(RuntimeError, match="Another SNOMED import"):
            refresh_snapshot(stage, disposable_database)
    assert rows(disposable_database) == before


def test_budget_excludes_old_files_retained_for_rollback(snapshot, disposable_database):
    with disposable_database.begin() as connection:
        connection.exec_driver_sql(
            "INSERT INTO snomed_descriptions "
            "SELECT id,100,md5(id::text),1,true FROM generate_series(10000,20000) id"
        )
        old_size = connection.exec_driver_sql(
            "SELECT pg_total_relation_size('snomed_concepts') + "
            "pg_total_relation_size('snomed_descriptions')"
        ).scalar_one()
        limit = database_bytes(connection) - old_size + 300_000
    with stage_snapshot(snapshot) as stage:
        assert refresh_snapshot(stage, disposable_database, max_bytes=limit) < limit
