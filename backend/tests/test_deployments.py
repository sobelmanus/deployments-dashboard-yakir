from datetime import datetime, timedelta, timezone

import pytest

from tests.conftest import make_dep


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _insert(deps_col, *overrides_list):
    """Insert one or more deployments; returns the list of docs inserted."""
    docs = [make_dep(ov) for ov in overrides_list]
    deps_col.insert_many(docs)
    return docs


# ---------------------------------------------------------------------------
# GET /deployments
# ---------------------------------------------------------------------------


class TestListDeployments:
    def test_empty_collection_returns_empty(self, client):
        resp = client.get("/deployments")
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_active_deployment_visible_with_default_view(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.get("/deployments")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["deployment_id"] == "dep-001"

    def test_deleted_deployment_not_visible_with_default_view(self, client, deps_col):
        _insert(deps_col, {"deleted_at": datetime.now(timezone.utc)})
        resp = client.get("/deployments")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_deleted_deployment_visible_with_view_deleted(self, client, deps_col):
        _insert(deps_col, {"deleted_at": datetime.now(timezone.utc)})
        resp = client.get("/deployments?view=deleted")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["deployment_id"] == "dep-001"

    def test_view_all_includes_active_and_deleted(self, client, deps_col):
        _insert(
            deps_col,
            {},
            {"deployment_id": "dep-002", "deleted_at": datetime.now(timezone.utc)},
        )
        resp = client.get("/deployments?view=all")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        ids = {item["deployment_id"] for item in data["items"]}
        assert "dep-001" in ids
        assert "dep-002" in ids

    def test_expired_deleted_excluded_from_view_all(self, client, deps_col):
        expired_time = datetime.now(timezone.utc) - timedelta(hours=721)
        _insert(
            deps_col,
            {},
            {"deployment_id": "dep-002", "deleted_at": expired_time},
        )
        resp = client.get("/deployments?view=all")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["deployment_id"] == "dep-001"

    def test_expired_deleted_excluded_from_view_deleted(self, client, deps_col):
        expired_time = datetime.now(timezone.utc) - timedelta(hours=721)
        _insert(deps_col, {"deleted_at": expired_time})
        resp = client.get("/deployments?view=deleted")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0

    def test_status_filter_returns_only_matching(self, client, deps_col):
        _insert(
            deps_col,
            {"status": "active"},
            {"deployment_id": "dep-002", "status": "failed"},
            {"deployment_id": "dep-003", "status": "stopped"},
        )
        resp = client.get("/deployments?status=active")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "active"

    def test_type_filter_returns_only_matching(self, client, deps_col):
        _insert(
            deps_col,
            {"type": "web_service"},
            {"deployment_id": "dep-002", "type": "worker"},
        )
        resp = client.get("/deployments?type=worker")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["deployment_id"] == "dep-002"

    def test_environment_filter_returns_only_matching(self, client, deps_col):
        _insert(
            deps_col,
            {"environment": "production"},
            {"deployment_id": "dep-002", "environment": "staging"},
        )
        resp = client.get("/deployments?environment=staging")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["environment"] == "staging"

    def test_multiple_status_values_returns_both(self, client, deps_col):
        _insert(
            deps_col,
            {"status": "active"},
            {"deployment_id": "dep-002", "status": "failed"},
            {"deployment_id": "dep-003", "status": "stopped"},
        )
        resp = client.get("/deployments?status=active&status=failed")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        statuses = {item["status"] for item in data["items"]}
        assert statuses == {"active", "failed"}

    def test_pagination_total_and_pages(self, client, deps_col):
        _insert(
            deps_col,
            {},
            {"deployment_id": "dep-002"},
            {"deployment_id": "dep-003"},
        )
        resp = client.get("/deployments?limit=2")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert data["pages"] == 2
        assert len(data["items"]) == 2

    def test_pagination_page_2(self, client, deps_col):
        _insert(
            deps_col,
            {},
            {"deployment_id": "dep-002"},
            {"deployment_id": "dep-003"},
        )
        resp = client.get("/deployments?limit=1&page=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["page"] == 2
        assert data["total"] == 3

    def test_sort_by_version_asc(self, client, deps_col):
        _insert(
            deps_col,
            {"version": "2.0.0"},
            {"deployment_id": "dep-002", "version": "1.0.0"},
            {"deployment_id": "dep-003", "version": "3.0.0"},
        )
        resp = client.get("/deployments?sort=version&order=asc")
        assert resp.status_code == 200
        versions = [item["version"] for item in resp.json()["items"]]
        assert versions == sorted(versions)

    def test_sort_by_version_desc(self, client, deps_col):
        _insert(
            deps_col,
            {"version": "2.0.0"},
            {"deployment_id": "dep-002", "version": "1.0.0"},
            {"deployment_id": "dep-003", "version": "3.0.0"},
        )
        resp = client.get("/deployments?sort=version&order=desc")
        assert resp.status_code == 200
        versions = [item["version"] for item in resp.json()["items"]]
        assert versions == sorted(versions, reverse=True)

    def test_updated_since_returns_recent_records(self, client, deps_col):
        old_ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
        new_ts = datetime(2024, 6, 1, tzinfo=timezone.utc)
        since_str = "2024-03-01T00:00:00Z"
        _insert(
            deps_col,
            {"deployment_id": "dep-old", "updated_at": old_ts},
            {"deployment_id": "dep-new", "updated_at": new_ts},
        )
        resp = client.get(f"/deployments?updated_since={since_str}")
        assert resp.status_code == 200
        data = resp.json()
        ids = {item["deployment_id"] for item in data["items"]}
        assert "dep-new" in ids
        assert "dep-old" not in ids

    def test_updated_since_returns_empty_when_no_updates(self, client, deps_col):
        old_ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
        since_str = "2024-06-01T00:00:00Z"
        _insert(deps_col, {"updated_at": old_ts})
        resp = client.get(f"/deployments?updated_since={since_str}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_updated_since_invalid_format_returns_422(self, client, deps_col):
        resp = client.get("/deployments?updated_since=not-a-date")
        assert resp.status_code == 422

    def test_combined_status_and_environment_filter(self, client, deps_col):
        _insert(
            deps_col,
            {"status": "active", "environment": "production"},
            {"deployment_id": "dep-002", "status": "active", "environment": "staging"},
            {"deployment_id": "dep-003", "status": "failed", "environment": "production"},
        )
        resp = client.get("/deployments?status=active&environment=production")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["deployment_id"] == "dep-001"

    def test_default_page_is_1(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.get("/deployments")
        assert resp.status_code == 200
        assert resp.json()["page"] == 1

    def test_limit_is_respected(self, client, deps_col):
        for i in range(5):
            deps_col.insert_one(make_dep({"deployment_id": f"dep-{i:03d}"}))
        resp = client.get("/deployments?limit=3")
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 3

    def test_search_specific_field_matches(self, client, deps_col):
        _insert(deps_col, {}, {"deployment_id": "dep-002", "attributes": {"name": "other-app"}})
        resp = client.get("/deployments?search=attributes.name:my-app")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["deployment_id"] == "dep-001"

    def test_search_specific_field_no_match_returns_empty(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.get("/deployments?search=attributes.name:nonexistent")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_search_specific_field_case_insensitive(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.get("/deployments?search=attributes.name:MY-APP")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_search_all_matches_created_by(self, client, deps_col):
        _insert(deps_col, {}, {"deployment_id": "dep-002", "created_by": "bob"})
        resp = client.get("/deployments?search=all:alice")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["deployment_id"] == "dep-001"

    def test_search_all_matches_attribute_value(self, client, deps_col):
        _insert(deps_col, {}, {"deployment_id": "dep-002", "attributes": {"name": "other"}})
        resp = client.get("/deployments?search=all:my-app")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["deployment_id"] == "dep-001"

    def test_search_all_matches_deployment_id(self, client, deps_col):
        _insert(deps_col, {}, {"deployment_id": "dep-002"})
        resp = client.get("/deployments?search=all:dep-001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["deployment_id"] == "dep-001"

    def test_search_multiple_chips_are_anded(self, client, deps_col):
        _insert(
            deps_col,
            {"created_by": "alice", "attributes": {"name": "my-app"}},
            {"deployment_id": "dep-002", "created_by": "alice", "attributes": {"name": "other"}},
        )
        resp = client.get("/deployments?search=all:alice&search=attributes.name:my-app")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["deployment_id"] == "dep-001"

    def test_search_chip_no_match_in_and_returns_empty(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.get("/deployments?search=all:alice&search=attributes.name:nonexistent")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0


# ---------------------------------------------------------------------------
# GET /deployments/{id}
# ---------------------------------------------------------------------------


class TestGetDeployment:
    def test_found_returns_200(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.get("/deployments/dep-001")
        assert resp.status_code == 200
        assert resp.json()["deployment_id"] == "dep-001"

    def test_not_found_returns_404(self, client):
        resp = client.get("/deployments/nonexistent")
        assert resp.status_code == 404

    def test_soft_deleted_within_expiry_returns_200(self, client, deps_col):
        recent_delete = datetime.now(timezone.utc) - timedelta(hours=100)
        _insert(deps_col, {"deleted_at": recent_delete})
        resp = client.get("/deployments/dep-001")
        assert resp.status_code == 200

    def test_expired_soft_deleted_returns_404(self, client, deps_col):
        expired_delete = datetime.now(timezone.utc) - timedelta(hours=721)
        _insert(deps_col, {"deleted_at": expired_delete})
        resp = client.get("/deployments/dep-001")
        assert resp.status_code == 404

    def test_response_has_correct_fields(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.get("/deployments/dep-001")
        data = resp.json()
        assert data["version"] == "1.0.0"
        assert data["status"] == "active"
        assert data["type"] == "web_service"
        assert data["environment"] == "production"
        assert data["created_by"] == "alice"

    def test_datetime_fields_are_strings(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.get("/deployments/dep-001")
        data = resp.json()
        assert isinstance(data["created_at"], str)
        assert isinstance(data["updated_at"], str)
        # Verify they are parseable ISO strings
        from datetime import datetime
        datetime.fromisoformat(data["created_at"])
        datetime.fromisoformat(data["updated_at"])


# ---------------------------------------------------------------------------
# PATCH /deployments/{id}
# ---------------------------------------------------------------------------


class TestPatchDeployment:
    def test_patch_attributes_name(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.patch(
            "/deployments/dep-001",
            json={"attributes.name": "updated-name"},
        )
        assert resp.status_code == 200
        assert resp.json()["attributes"]["name"] == "updated-name"

    def test_patch_attributes_description(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.patch(
            "/deployments/dep-001",
            json={"attributes.description": "new description"},
        )
        assert resp.status_code == 200
        assert resp.json()["attributes"]["description"] == "new description"

    def test_patch_both_allowed_fields(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.patch(
            "/deployments/dep-001",
            json={"attributes.name": "new-name", "attributes.description": "new-desc"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["attributes"]["name"] == "new-name"
        assert data["attributes"]["description"] == "new-desc"

    def test_patch_not_found_returns_404(self, client):
        resp = client.patch(
            "/deployments/nonexistent",
            json={"attributes.name": "x"},
        )
        assert resp.status_code == 404

    def test_patch_invalid_path_returns_422(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.patch(
            "/deployments/dep-001",
            json={"status": "failed"},
        )
        assert resp.status_code == 422

    def test_patch_empty_body_returns_422(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.patch("/deployments/dep-001", json={})
        assert resp.status_code == 422

    def test_patch_updates_updated_at(self, client, deps_col):
        original_ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
        _insert(deps_col, {"updated_at": original_ts})
        resp = client.patch(
            "/deployments/dep-001",
            json={"attributes.name": "changed"},
        )
        assert resp.status_code == 200
        new_ts = resp.json()["updated_at"]
        assert new_ts != "2024-01-01T00:00:00.000000Z"

    def test_patch_does_not_affect_other_fields(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.patch(
            "/deployments/dep-001",
            json={"attributes.name": "new-name"},
        )
        data = resp.json()
        # version and status should be unchanged
        assert data["version"] == "1.0.0"
        assert data["status"] == "active"

    def test_patch_expired_deleted_returns_404(self, client, deps_col):
        expired = datetime.now(timezone.utc) - timedelta(hours=721)
        _insert(deps_col, {"deleted_at": expired})
        resp = client.patch(
            "/deployments/dep-001",
            json={"attributes.name": "x"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /deployments/{id}
# ---------------------------------------------------------------------------


class TestPutDeployment:
    def test_replace_attributes_returns_200(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.put(
            "/deployments/dep-001",
            json={"attributes": {"name": "new-app", "team": "infra"}},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["attributes"]["name"] == "new-app"
        assert data["attributes"]["team"] == "infra"

    def test_put_replaces_existing_attributes_completely(self, client, deps_col):
        _insert(deps_col, {"attributes": {"name": "old-app", "description": "old desc", "region": "us-east"}})
        resp = client.put(
            "/deployments/dep-001",
            json={"attributes": {"name": "new-app"}},
        )
        assert resp.status_code == 200
        data = resp.json()
        # Only name should remain; description and region should be gone
        assert "description" not in data["attributes"]
        assert "region" not in data["attributes"]
        assert data["attributes"]["name"] == "new-app"

    def test_put_registers_custom_keys_in_fc_col(self, client, deps_col, fc_col):
        _insert(deps_col, {})
        resp = client.put(
            "/deployments/dep-001",
            json={"attributes": {"name": "app", "my_custom_field": "value"}},
        )
        assert resp.status_code == 200
        custom = fc_col.find_one({"path": "attributes.my_custom_field"})
        assert custom is not None
        assert custom["type"] == "custom"

    def test_put_not_found_returns_404(self, client):
        resp = client.put(
            "/deployments/nonexistent",
            json={"attributes": {"name": "x"}},
        )
        assert resp.status_code == 404

    def test_put_blank_key_returns_422(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.put(
            "/deployments/dep-001",
            json={"attributes": {"": "value"}},
        )
        assert resp.status_code == 422

    def test_put_whitespace_key_returns_422(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.put(
            "/deployments/dep-001",
            json={"attributes": {" ": "value"}},
        )
        assert resp.status_code == 422

    def test_put_updates_updated_at(self, client, deps_col):
        original_ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
        _insert(deps_col, {"updated_at": original_ts})
        resp = client.put(
            "/deployments/dep-001",
            json={"attributes": {"name": "new"}},
        )
        assert resp.status_code == 200
        assert resp.json()["updated_at"] != "2024-01-01T00:00:00.000000Z"

    def test_put_empty_attributes_accepted(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.put(
            "/deployments/dep-001",
            json={"attributes": {}},
        )
        assert resp.status_code == 200
        assert resp.json()["attributes"] == {}


# ---------------------------------------------------------------------------
# DELETE /deployments/{id}
# ---------------------------------------------------------------------------


class TestDeleteDeployment:
    def test_soft_delete_sets_deleted_at(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.delete("/deployments/dep-001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["deleted_at"] is not None
        assert isinstance(data["deleted_at"], str)
        # Verify it's a parseable ISO datetime string
        from datetime import datetime
        datetime.fromisoformat(data["deleted_at"])

    def test_already_deleted_returns_409(self, client, deps_col):
        _insert(deps_col, {"deleted_at": datetime.now(timezone.utc)})
        resp = client.delete("/deployments/dep-001")
        assert resp.status_code == 409

    def test_not_found_returns_404(self, client):
        resp = client.delete("/deployments/nonexistent")
        assert resp.status_code == 404

    def test_delete_response_contains_deployment_id(self, client, deps_col):
        _insert(deps_col, {})
        resp = client.delete("/deployments/dep-001")
        assert resp.status_code == 200
        assert resp.json()["deployment_id"] == "dep-001"

    def test_deleted_record_hidden_from_existing_view(self, client, deps_col):
        _insert(deps_col, {})
        client.delete("/deployments/dep-001")
        list_resp = client.get("/deployments")
        assert list_resp.json()["total"] == 0

    def test_expired_deleted_returns_404(self, client, deps_col):
        expired = datetime.now(timezone.utc) - timedelta(hours=721)
        _insert(deps_col, {"deleted_at": expired})
        resp = client.delete("/deployments/dep-001")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /deployments/{id}/restore
# ---------------------------------------------------------------------------


class TestRestoreDeployment:
    def test_restore_clears_deleted_at(self, client, deps_col):
        _insert(deps_col, {"deleted_at": datetime.now(timezone.utc)})
        resp = client.post("/deployments/dep-001/restore")
        assert resp.status_code == 200
        assert resp.json()["deleted_at"] is None

    def test_restore_not_deleted_returns_409(self, client, deps_col):
        _insert(deps_col, {})  # not deleted
        resp = client.post("/deployments/dep-001/restore")
        assert resp.status_code == 409

    def test_restore_not_found_returns_404(self, client):
        resp = client.post("/deployments/nonexistent/restore")
        assert resp.status_code == 404

    def test_restore_response_has_correct_deployment_id(self, client, deps_col):
        _insert(deps_col, {"deleted_at": datetime.now(timezone.utc)})
        resp = client.post("/deployments/dep-001/restore")
        assert resp.status_code == 200
        assert resp.json()["deployment_id"] == "dep-001"

    def test_restored_record_visible_in_existing_view(self, client, deps_col):
        _insert(deps_col, {"deleted_at": datetime.now(timezone.utc)})
        client.post("/deployments/dep-001/restore")
        list_resp = client.get("/deployments")
        assert list_resp.json()["total"] == 1

    def test_restore_expired_deleted_returns_404(self, client, deps_col):
        expired = datetime.now(timezone.utc) - timedelta(hours=721)
        _insert(deps_col, {"deleted_at": expired})
        resp = client.post("/deployments/dep-001/restore")
        assert resp.status_code == 404

    def test_restore_updates_updated_at(self, client, deps_col):
        original_ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
        _insert(deps_col, {"deleted_at": datetime.now(timezone.utc), "updated_at": original_ts})
        resp = client.post("/deployments/dep-001/restore")
        assert resp.status_code == 200
        assert resp.json()["updated_at"] != "2024-01-01T00:00:00.000000Z"
