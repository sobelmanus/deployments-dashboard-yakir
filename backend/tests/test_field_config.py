from startup import SYSTEM_FIELD_PATHS


class TestGetFieldConfig:
    def test_returns_system_and_custom_keys(self, client):
        response = client.get("/field-config")
        assert response.status_code == 200
        data = response.json()
        assert "system" in data
        assert "custom" in data

    def test_system_fields_seeded_at_startup(self, client):
        response = client.get("/field-config")
        data = response.json()
        system_paths = [f["path"] for f in data["system"]]
        assert len(system_paths) == len(SYSTEM_FIELD_PATHS)
        for path in SYSTEM_FIELD_PATHS:
            assert path in system_paths

    def test_custom_list_empty_when_no_custom_fields(self, client):
        response = client.get("/field-config")
        data = response.json()
        assert data["custom"] == []

    def test_custom_field_returned_after_insert(self, client, fc_col):
        fc_col.insert_one(
            {"path": "attributes.custom_field", "label": "Custom Field", "type": "custom"}
        )
        response = client.get("/field-config")
        data = response.json()
        custom_paths = [f["path"] for f in data["custom"]]
        assert "attributes.custom_field" in custom_paths

    def test_custom_field_has_correct_label(self, client, fc_col):
        fc_col.insert_one(
            {"path": "attributes.my_key", "label": "My Key", "type": "custom"}
        )
        response = client.get("/field-config")
        data = response.json()
        custom = {f["path"]: f["label"] for f in data["custom"]}
        assert custom["attributes.my_key"] == "My Key"

    def test_system_fields_ordered_by_order_field(self, client):
        response = client.get("/field-config")
        data = response.json()
        # The seeded system fields have an order field; deployment_id should come first
        system = data["system"]
        assert system[0]["path"] == "deployment_id"

    def test_multiple_custom_fields_sorted_by_label(self, client, fc_col):
        fc_col.insert_many([
            {"path": "attributes.zzz", "label": "Zzz", "type": "custom"},
            {"path": "attributes.aaa", "label": "Aaa", "type": "custom"},
        ])
        response = client.get("/field-config")
        data = response.json()
        custom_labels = [f["label"] for f in data["custom"]]
        assert custom_labels == sorted(custom_labels)

    def test_system_fields_have_path_and_label(self, client):
        response = client.get("/field-config")
        data = response.json()
        for field in data["system"]:
            assert "path" in field
            assert "label" in field
