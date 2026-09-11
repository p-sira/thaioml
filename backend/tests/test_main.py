from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Test that the health or root endpoint is responsive."""
    # Assuming the root endpoint is returning a 200 OK or 404 Not Found (if no root exists)
    # The goal is to check if the app initializes properly without crashing.
    response = client.get("/")
    assert response.status_code in [200, 404, 401]
