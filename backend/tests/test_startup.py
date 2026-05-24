import pytest

from startup import SYSTEM_FIELD_PATHS, create_indexes, derive_label, seed_field_config


class TestDeriveLabel:
    def test_simple_path(self):
        assert derive_label("deployment_id") == "Deployment Id"

    def test_nested_path_uses_last_segment(self):
        assert derive_label("attributes.name") == "Name"

    def test_two_word_field(self):
        assert derive_label("created_by") == "Created By"

    def test_single_word_field(self):
        assert derive_label("version") == "Version"

    def test_nested_multi_word(self):
        assert derive_label("attributes.team") == "Team"

    def test_nested_region(self):
        assert derive_label("attributes.region") == "Region"

    def test_nested_description(self):
        assert derive_label("attributes.description") == "Description"

    def test_status(self):
        assert derive_label("status") == "Status"

    def test_environment(self):
        assert derive_label("environment") == "Environment"

    def test_created_at(self):
        assert derive_label("created_at") == "Created At"

    def test_updated_at(self):
        assert derive_label("updated_at") == "Updated At"


class TestSeedFieldConfig:
    def test_empty_collection_seeds_11_system_fields(self, fc_col, deps_col):
        seed_field_config()
        system_docs = list(fc_col.find({"type": "system"}))
        assert len(system_docs) == 11

    def test_seeded_docs_have_correct_paths(self, fc_col, deps_col):
        seed_field_config()
        paths = {doc["path"] for doc in fc_col.find({"type": "system"})}
        assert paths == set(SYSTEM_FIELD_PATHS)

    def test_seeded_docs_have_correct_labels(self, fc_col, deps_col):
        seed_field_config()
        for doc in fc_col.find({"type": "system"}):
            expected_label = derive_label(doc["path"])
            assert doc["label"] == expected_label, (
                f"Expected label '{expected_label}' for path '{doc['path']}', "
                f"got '{doc['label']}'"
            )

    def test_seeded_docs_have_order_field(self, fc_col, deps_col):
        seed_field_config()
        for doc in fc_col.find({"type": "system"}):
            assert "order" in doc

    def test_deployment_id_has_order_0(self, fc_col, deps_col):
        seed_field_config()
        doc = fc_col.find_one({"path": "deployment_id"})
        assert doc["order"] == 0

    def test_version_has_order_1(self, fc_col, deps_col):
        seed_field_config()
        doc = fc_col.find_one({"path": "version"})
        assert doc["order"] == 1

    def test_non_empty_collection_skips_seeding(self, fc_col, deps_col):
        # Pre-insert a doc so collection is not empty
        fc_col.insert_one({"path": "existing", "label": "Existing", "type": "system", "order": 0})
        seed_field_config()
        # Only the pre-existing doc should be there
        assert fc_col.count_documents({}) == 1

    def test_deployments_with_custom_attributes_seeds_custom_fields(self, fc_col, deps_col):
        deps_col.insert_one(
            {
                "deployment_id": "dep-001",
                "attributes": {"name": "app", "description": "desc", "custom_key": "val"},
            }
        )
        seed_field_config()
        custom_docs = list(fc_col.find({"type": "custom"}))
        custom_paths = {doc["path"] for doc in custom_docs}
        assert "attributes.custom_key" in custom_paths

    def test_system_attribute_keys_not_duplicated_as_custom(self, fc_col, deps_col):
        # name, description, team, region are system attribute keys
        deps_col.insert_one(
            {
                "deployment_id": "dep-001",
                "attributes": {"name": "app", "description": "desc", "team": "platform"},
            }
        )
        seed_field_config()
        custom_docs = list(fc_col.find({"type": "custom"}))
        custom_paths = {doc["path"] for doc in custom_docs}
        # These are system attribute keys so should NOT appear as custom
        assert "attributes.name" not in custom_paths
        assert "attributes.description" not in custom_paths
        assert "attributes.team" not in custom_paths

    def test_multiple_deployments_custom_keys_all_seeded(self, fc_col, deps_col):
        deps_col.insert_many([
            {"deployment_id": "dep-001", "attributes": {"name": "a", "foo": "1"}},
            {"deployment_id": "dep-002", "attributes": {"name": "b", "bar": "2"}},
        ])
        seed_field_config()
        custom_paths = {doc["path"] for doc in fc_col.find({"type": "custom"})}
        assert "attributes.foo" in custom_paths
        assert "attributes.bar" in custom_paths

    def test_no_custom_attrs_no_custom_docs(self, fc_col, deps_col):
        deps_col.insert_one(
            {
                "deployment_id": "dep-001",
                "attributes": {"name": "app", "description": "desc"},
            }
        )
        seed_field_config()
        assert fc_col.count_documents({"type": "custom"}) == 0


class TestCreateIndexes:
    def test_create_indexes_completes_without_error(self, deps_col):
        # Should not raise
        create_indexes()

    def test_create_indexes_idempotent(self, deps_col):
        # Running twice should not raise
        create_indexes()
        create_indexes()

    def test_expected_indexes_created(self, deps_col):
        create_indexes()
        index_names = {idx["name"] for idx in deps_col.list_indexes()}
        assert "deleted_at_1_created_at_-1" in index_names
        assert "type_1" in index_names
        assert "environment_1" in index_names
