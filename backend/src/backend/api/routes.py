from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.core.db import get_db

from backend.services.rag import rag_service
from backend.services.snomed import auto_link_terms, suggest_snomed_term
from backend.core.auth import require_role

router = APIRouter()


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    answer: str


@router.get("/")
def read_root():
    return {"message": "Welcome to ThaiOML RAG API"}


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.post("/query", response_model=QueryResponse)
def query_system(
    request: QueryRequest,
    user_data: dict = Depends(require_role(["org:researcher", "org:author", "org:admin", "researcher", "author", "admin"]))
):
    try:
        answer = rag_service.query(request.query)
        return QueryResponse(answer=answer)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))


class SnomedSuggestRequest(BaseModel):
    query: str


class SnomedSuggestResponse(BaseModel):
    id: str
    term: str


@router.post("/snomed-suggest", response_model=SnomedSuggestResponse)
def snomed_suggest(
    request: SnomedSuggestRequest,
    db: Session = Depends(get_db),
    user_data: dict = Depends(require_role(["org:author", "org:admin", "author", "admin"]))
):
    try:
        concept_id, display_term = suggest_snomed_term(request.query, db)
        return SnomedSuggestResponse(id=concept_id, term=display_term)
    except ValueError as e:
        if "missing" in str(e).lower():
            raise HTTPException(status_code=500, detail=str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))


class AutoLinkRequest(BaseModel):
    body: str


class AutoLinkResponse(BaseModel):
    links: dict[str, str]


@router.post("/auto-link", response_model=AutoLinkResponse)
def auto_link(
    request: AutoLinkRequest,
    db: Session = Depends(get_db),
    user_data: dict = Depends(require_role(["org:author", "org:admin", "author", "admin"]))
):
    try:
        links = auto_link_terms(request.body, db)
        return AutoLinkResponse(links=links)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))
