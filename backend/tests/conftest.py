import pytest
from backend.main import app
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Returns a TestClient instance for the FastAPI app."""
    return TestClient(app)
