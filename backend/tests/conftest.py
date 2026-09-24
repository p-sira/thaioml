import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def client():
    """Returns a TestClient instance for the FastAPI app."""
    return TestClient(app)
