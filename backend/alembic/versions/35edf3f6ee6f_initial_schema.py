"""initial_schema

Revision ID: 35edf3f6ee6f
Revises: 
Create Date: 2026-09-17 07:11:37.176902

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '35edf3f6ee6f'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Ensure pg_trgm extension exists for the GIN index
    op.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm;')
    
    op.create_table(
        'snomed_concepts',
        sa.Column('concept_id', sa.BigInteger(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, default=True),
        sa.PrimaryKeyConstraint('concept_id')
    )
    op.create_index(op.f('ix_snomed_concepts_concept_id'), 'snomed_concepts', ['concept_id'], unique=False)
    
    op.create_table(
        'snomed_descriptions',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('concept_id', sa.BigInteger(), nullable=False),
        sa.Column('term', sa.String(length=512), nullable=False),
        sa.Column('type_id', sa.BigInteger(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, default=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_snomed_descriptions_concept_id'), 'snomed_descriptions', ['concept_id'], unique=False)
    op.create_index(op.f('ix_snomed_descriptions_id'), 'snomed_descriptions', ['id'], unique=False)
    
    # GIN trgm index
    op.execute("CREATE INDEX IF NOT EXISTS trgm_idx_snomed_term ON snomed_descriptions USING gin (term gin_trgm_ops);")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('trgm_idx_snomed_term', table_name='snomed_descriptions')
    op.drop_index(op.f('ix_snomed_descriptions_id'), table_name='snomed_descriptions')
    op.drop_index(op.f('ix_snomed_descriptions_concept_id'), table_name='snomed_descriptions')
    op.drop_table('snomed_descriptions')
    
    op.drop_index(op.f('ix_snomed_concepts_concept_id'), table_name='snomed_concepts')
    op.drop_table('snomed_concepts')
