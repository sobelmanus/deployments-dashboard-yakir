from datetime import datetime, timezone

from serialization import serialize_deployment


class TestSerializeDeployment:
    def _make_doc(self, **overrides):
        doc = {
            "_id": "some-mongo-id",
            "deployment_id": "dep-001",
            "version": "1.0.0",
            "status": "active",
            "type": "web_service",
            "environment": "production",
            "attributes": {"name": "test"},
            "created_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
            "created_by": "alice",
            "updated_at": datetime(2024, 1, 2, tzinfo=timezone.utc),
            "deleted_at": None,
        }
        doc.update(overrides)
        return doc

    def test_returns_deployment_out_model(self):
        from models import DeploymentOut
        doc = self._make_doc()
        result = serialize_deployment(doc)
        assert isinstance(result, DeploymentOut)

    def test_strips_id_field(self):
        doc = self._make_doc()
        result = serialize_deployment(doc)
        # DeploymentOut pydantic model should not have _id
        assert not hasattr(result, "_id")

    def test_deployment_id_preserved(self):
        doc = self._make_doc()
        result = serialize_deployment(doc)
        assert result.deployment_id == "dep-001"

    def test_version_preserved(self):
        doc = self._make_doc()
        result = serialize_deployment(doc)
        assert result.version == "1.0.0"

    def test_status_preserved(self):
        doc = self._make_doc()
        result = serialize_deployment(doc)
        assert result.status == "active"

    def test_attributes_preserved(self):
        doc = self._make_doc(attributes={"name": "my-app", "team": "platform"})
        result = serialize_deployment(doc)
        assert result.attributes == {"name": "my-app", "team": "platform"}

    def test_created_at_preserved_as_datetime(self):
        dt = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        doc = self._make_doc(created_at=dt)
        result = serialize_deployment(doc)
        assert result.created_at == dt

    def test_updated_at_preserved_as_datetime(self):
        dt = datetime(2024, 2, 15, 8, 30, 0, tzinfo=timezone.utc)
        doc = self._make_doc(updated_at=dt)
        result = serialize_deployment(doc)
        assert result.updated_at == dt

    def test_deleted_at_none_stays_none(self):
        doc = self._make_doc(deleted_at=None)
        result = serialize_deployment(doc)
        assert result.deleted_at is None

    def test_deleted_at_preserved_when_set(self):
        dt = datetime(2024, 5, 1, 0, 0, 0, tzinfo=timezone.utc)
        doc = self._make_doc(deleted_at=dt)
        result = serialize_deployment(doc)
        assert result.deleted_at == dt

    def test_created_by_preserved(self):
        doc = self._make_doc(created_by="bob")
        result = serialize_deployment(doc)
        assert result.created_by == "bob"

    def test_environment_preserved(self):
        doc = self._make_doc(environment="staging")
        result = serialize_deployment(doc)
        assert result.environment == "staging"

    def test_type_preserved(self):
        doc = self._make_doc(type="worker")
        result = serialize_deployment(doc)
        assert result.type == "worker"

    def test_no_id_in_input_does_not_crash(self):
        """Document without _id should still work."""
        doc = {
            "deployment_id": "dep-002",
            "version": "2.0.0",
            "status": "failed",
            "type": "cron_job",
            "environment": "development",
            "attributes": {},
            "created_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
            "created_by": "bob",
            "updated_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
            "deleted_at": None,
        }
        result = serialize_deployment(doc)
        assert result.deployment_id == "dep-002"
