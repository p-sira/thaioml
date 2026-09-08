from sqlalchemy import BigInteger, Boolean, Column, Index, String

from backend.core.db import Base


class SnomedConcept(Base):
    __tablename__ = "snomed_concepts"

    concept_id = Column(BigInteger, primary_key=True, index=True)
    active = Column(Boolean, nullable=False, default=True)


class SnomedDescription(Base):
    __tablename__ = "snomed_descriptions"

    id = Column(BigInteger, primary_key=True, index=True)
    concept_id = Column(BigInteger, nullable=False, index=True)
    term = Column(String(512), nullable=False)
    type_id = Column(BigInteger, nullable=False)
    active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("trgm_idx_snomed_term", "term", postgresql_ops={"term": "gin_trgm_ops"}, postgresql_using="gin"),
    )
