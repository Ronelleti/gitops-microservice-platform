import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import app  # noqa: E402


def test_index():
    client = app.test_client()
    resp = client.get("/")
    assert resp.status_code == 200
    assert "version" in resp.get_json()


def test_healthz():
    client = app.test_client()
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_readyz():
    client = app.test_client()
    resp = client.get("/readyz")
    assert resp.status_code == 200
