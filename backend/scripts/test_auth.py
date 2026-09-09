import os
import sys

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../src"))

from backend.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_unauthorized_access():
    print("Testing unauthorized access to /query...")
    response = client.post("/query", json={"query": "test"})
    assert response.status_code in [401, 403], (
        f"Expected 401 or 403, got {response.status_code}"
    )
    print("✅ Passed: Blocked unauthorized request.")

    # Wait, FastAPI HTTPBearer returns 403 when not authenticated if auto_error=True
    # Actually, HTTPBearer raises 403 when credentials are not provided.

    print("Testing invalid token access to /auto-link...")
    response = client.post(
        "/auto-link",
        json={"body": "test"},
        headers={"Authorization": "Bearer invalid_token"},
    )
    # PyJWT should fail to decode
    assert response.status_code == 401, (
        f"Expected 401, got {response.status_code}: {response.text}"
    )
    print("✅ Passed: Blocked invalid token (401 Unauthorized).")


if __name__ == "__main__":
    try:
        test_unauthorized_access()
        print("All tests passed successfully!")
    except AssertionError as e:
        print(f"❌ Test Failed: {e}")
        sys.exit(1)
