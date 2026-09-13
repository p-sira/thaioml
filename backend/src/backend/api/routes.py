import os
from typing import Annotated

from backend.core.auth import require_role
from backend.core.db import get_db
from backend.services.rag import rag_service
from backend.services.snomed import auto_link_terms, suggest_snomed_term
from fastapi import APIRouter, Depends, HTTPException
from posthog import Posthog
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter()
posthog = Posthog(
    project_api_key=os.environ.get("POSTHOG_API_KEY", "disabled"),
    host=os.environ.get("POSTHOG_HOST", "https://app.posthog.com"),
    disabled=not os.environ.get("POSTHOG_API_KEY"),
)


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    answer: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    session_id: str | None = None


@router.get("/")
def read_root():
    return {"message": "Welcome to ThaiOML RAG API"}


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.post("/query", response_model=QueryResponse)
def query_system(
    request: QueryRequest,
    user_data: Annotated[
        dict,
        Depends(
            require_role(
                [
                    "org:researcher",
                    "org:author",
                    "org:admin",
                    "researcher",
                    "author",
                    "admin",
                ]
            )
        ),
    ],
):
    try:
        answer = rag_service.query(request.query)
        posthog.capture(
            distinct_id=user_data.get("sub", "anonymous"),
            event="ask_library_query_submitted",
            properties={"query": request.query},
        )
        return QueryResponse(answer=answer)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=QueryResponse)
def chat_system(
    request: ChatRequest,
    user_data: Annotated[
        dict,
        Depends(
            require_role(
                [
                    "org:researcher",
                    "org:author",
                    "org:admin",
                    "researcher",
                    "author",
                    "admin",
                ]
            )
        ),
    ],
):
    try:
        messages_dict = [
            {"role": msg.role, "content": msg.content} for msg in request.messages
        ]
        answer = rag_service.chat(messages_dict)
        posthog.capture(
            distinct_id=user_data.get("sub", "anonymous"),
            event="ask_library_chat_submitted",
            properties={"num_messages": len(messages_dict)},
        )
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
    db: Annotated[Session, Depends(get_db)],
    user_data: Annotated[
        dict, Depends(require_role(["org:author", "org:admin", "author", "admin"]))
    ],
):
    try:
        concept_id, display_term = suggest_snomed_term(request.query, db)
        posthog.capture(
            distinct_id=user_data.get("sub", "anonymous"),
            event="title_check_performed",
            properties={"query": request.query, "found_concept_id": concept_id},
        )
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
    body: str


@router.post("/auto-link", response_model=AutoLinkResponse)
def auto_link(
    request: AutoLinkRequest,
    db: Annotated[Session, Depends(get_db)],
    user_data: Annotated[
        dict, Depends(require_role(["org:author", "org:admin", "author", "admin"]))
    ],
):
    try:
        modified_body, links = auto_link_terms(request.body, db)
        posthog.capture(
            distinct_id=user_data.get("sub", "anonymous"),
            event="auto_link_used",
            properties={"num_links_found": len(links)},
        )
        return AutoLinkResponse(links=links, body=modified_body)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))
