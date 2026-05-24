from datetime import datetime, timezone

import mongomock
import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def mock_db():
    return mongomock.MongoClient()["test_db"]


@pytest.fixture()
def deps_col(mock_db):
    return mock_db["deployments"]


@pytest.fixture()
def fc_col(mock_db):
    return mock_db["field_config"]


@pytest.fixture(autouse=True)
def _patch_db(monkeypatch, deps_col, fc_col):
    monkeypatch.setattr("routers.deployments.get_deployments_collection", lambda: deps_col)
    monkeypatch.setattr("routers.deployments.get_field_config_collection", lambda: fc_col)
    monkeypatch.setattr("routers.field_config.get_field_config_collection", lambda: fc_col)
    monkeypatch.setattr("startup.get_deployments_collection", lambda: deps_col)
    monkeypatch.setattr("startup.get_field_config_collection", lambda: fc_col)


@pytest.fixture()
def client(deps_col, fc_col):
    from main import app
    with TestClient(app) as c:
        yield c


def make_dep(overrides=None):
    """Build a test deployment document."""
    doc = {
        "deployment_id": "dep-001",
        "version": "1.0.0",
        "status": "active",
        "type": "web_service",
        "environment": "production",
        "attributes": {"name": "my-app", "description": "A test app"},
        "created_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
        "created_by": "alice",
        "updated_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
        "deleted_at": None,
    }
    if overrides:
        doc.update(overrides)
    return doc
