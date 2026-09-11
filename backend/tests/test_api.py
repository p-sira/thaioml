from unittest.mock import patch

import pytest
from backend.core.auth import get_current_user
from backend.core.db import get_db
from backend.main import app
from fastapi.testclient import TestClient


def override_get_current_user():
    return {"org_role": "org:admin", "sub": "test_user_id"}


def override_get_db():
    yield "mocked_db_session"


@pytest.fixture(autouse=True)
def override_dependencies():
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides = {}


@pytest.fixture
def client():
    return TestClient(app)


@patch("backend.api.routes.rag_service")
def test_query_endpoint(mock_rag_service, client):
    mock_rag_service.query.return_value = "Mocked RAG response"

    response = client.post("/query", json={"query": "What is hypertension?"})

    assert response.status_code == 200
    assert response.json() == {"answer": "Mocked RAG response"}
    mock_rag_service.query.assert_called_once_with("What is hypertension?")


@patch("backend.api.routes.suggest_snomed_term")
def test_snomed_suggest_endpoint(mock_suggest, client):
    mock_suggest.return_value = ("123456", "Hypertension (disorder)")

    response = client.post("/snomed-suggest", json={"query": "hypertension"})

    assert response.status_code == 200
    assert response.json() == {"id": "123456", "term": "Hypertension (disorder)"}
    mock_suggest.assert_called_once_with("hypertension", "mocked_db_session")


@patch("backend.api.routes.auto_link_terms")
def test_auto_link_endpoint(mock_auto_link, client):
    mock_auto_link.return_value = {"Hypertension": "123456"}

    response = client.post("/auto-link", json={"body": "Patient has Hypertension."})

    assert response.status_code == 200
    assert response.json() == {"links": {"Hypertension": "123456"}}
    mock_auto_link.assert_called_once_with(
        "Patient has Hypertension.", "mocked_db_session"
    )
