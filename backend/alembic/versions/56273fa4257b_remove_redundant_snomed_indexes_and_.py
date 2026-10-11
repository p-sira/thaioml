"""remove redundant SNOMED indexes and restrict direct API access

Revision ID: 56273fa4257b
Revises: 35edf3f6ee6f
Create Date: 2026-10-12 00:24:13.148936

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "56273fa4257b"
down_revision: str | Sequence[str] | None = "35edf3f6ee6f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Primary keys already provide equivalent B-tree indexes.
    op.execute("DROP INDEX IF EXISTS public.ix_snomed_concepts_concept_id")
    op.execute("DROP INDEX IF EXISTS public.ix_snomed_descriptions_id")

    for table in ("snomed_concepts", "snomed_descriptions"):
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
        # RLS does not protect TRUNCATE; remove all direct API privileges.
        op.execute(
            f"REVOKE ALL PRIVILEGES ON TABLE public.{table} "
            "FROM PUBLIC, anon, authenticated"
        )
        op.execute(
            f"CREATE POLICY deny_direct_api_access ON public.{table} "
            "AS RESTRICTIVE FOR ALL TO anon, authenticated "
            "USING (false) WITH CHECK (false)"
        )


def downgrade() -> None:
    for table in ("snomed_concepts", "snomed_descriptions"):
        op.execute(f"DROP POLICY deny_direct_api_access ON public.{table}")
        op.execute(
            f"GRANT ALL PRIVILEGES ON TABLE public.{table} TO anon, authenticated"
        )
        # Keep RLS enabled so restoring legacy grants cannot expose rows.

    op.create_index(
        "ix_snomed_descriptions_id", "snomed_descriptions", ["id"], schema="public"
    )
    op.create_index(
        "ix_snomed_concepts_concept_id",
        "snomed_concepts",
        ["concept_id"],
        schema="public",
    )
