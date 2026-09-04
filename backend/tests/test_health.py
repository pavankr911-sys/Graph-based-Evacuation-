from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test root endpoint returns 200 and system metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert data["status"] == "online"


def test_top_level_health_endpoint(client: TestClient):
    """Test top-level /health endpoint returns 200 and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "service" in data


def test_api_v1_health_endpoint(client: TestClient):
    """Test /api/v1/health endpoint returns 200, healthy status, and database connectivity."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"
    assert data["environment"] == "development"
    assert "database" in data
    assert data["database"]["connected"] is True
    assert data["database"]["dialect"] == "sqlite"
