import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import app  # noqa: E402


def test_healthz_does_not_require_db():
    # Liveness must succeed even with garbage DB config - see the comment
    # in app.py about why liveness and readiness ask different questions.
    client = app.test_client()
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_readyz_reports_db_state():
    client = app.test_client()
    resp = client.get("/readyz")
    # Passes whether or not a real DB is configured for this test run;
    # asserts the status code matches the reported status either way.
    body = resp.get_json()
    if body["status"] == "ready":
        assert resp.status_code == 200
    else:
        assert resp.status_code == 503


def test_create_and_list_item_requires_db():
    # Full integration test - only meaningful with a real Postgres behind
    # it (DB_HOST etc. pointing at one). Skips itself cleanly otherwise.
    client = app.test_client()
    ready = client.get("/readyz").get_json()
    if ready["status"] != "ready":
        import pytest
        pytest.skip("no database available in this environment")

    create_resp = client.post("/api/items", json={"name": "test-item"})
    assert create_resp.status_code == 201
    created = create_resp.get_json()
    assert created["name"] == "test-item"

    list_resp = client.get("/api/items")
    assert list_resp.status_code == 200
    names = [item["name"] for item in list_resp.get_json()]
    assert "test-item" in names
