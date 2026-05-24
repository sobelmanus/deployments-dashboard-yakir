import pytest
from pydantic import ValidationError

from models import DeploymentPatch, DeploymentPut


class TestDeploymentPatch:
    def test_valid_attributes_name(self):
        patch = DeploymentPatch(**{"attributes.name": "new-name"})
        assert patch.model_dump(exclude_unset=True) == {"attributes.name": "new-name"}

    def test_valid_attributes_description(self):
        patch = DeploymentPatch(**{"attributes.description": "A new description"})
        assert patch.model_dump(exclude_unset=True) == {
            "attributes.description": "A new description"
        }

    def test_valid_both_allowed_paths(self):
        patch = DeploymentPatch(
            **{"attributes.name": "new-name", "attributes.description": "desc"}
        )
        data = patch.model_dump(exclude_unset=True)
        assert data["attributes.name"] == "new-name"
        assert data["attributes.description"] == "desc"

    def test_invalid_path_raises(self):
        with pytest.raises(ValidationError) as exc_info:
            DeploymentPatch(**{"status": "active"})
        assert "invalid paths" in str(exc_info.value).lower() or "only" in str(exc_info.value).lower()

    def test_invalid_top_level_field_raises(self):
        with pytest.raises(ValidationError):
            DeploymentPatch(**{"version": "2.0.0"})

    def test_invalid_nested_attr_path_raises(self):
        with pytest.raises(ValidationError):
            DeploymentPatch(**{"attributes.team": "platform"})

    def test_empty_body_raises(self):
        with pytest.raises(ValidationError) as exc_info:
            DeploymentPatch()
        assert "empty" in str(exc_info.value).lower()

    def test_empty_dict_raises(self):
        with pytest.raises(ValidationError):
            DeploymentPatch(**{})


class TestDeploymentPut:
    def test_normal_attributes_accepted(self):
        put = DeploymentPut(attributes={"name": "app", "team": "platform"})
        assert put.attributes == {"name": "app", "team": "platform"}

    def test_empty_attributes_accepted(self):
        # Empty dict is valid for PUT (removes all custom attributes)
        put = DeploymentPut(attributes={})
        assert put.attributes == {}

    def test_blank_key_raises(self):
        with pytest.raises(ValidationError) as exc_info:
            DeploymentPut(attributes={"": "value"})
        assert "blank" in str(exc_info.value).lower() or "whitespace" in str(exc_info.value).lower()

    def test_whitespace_key_raises(self):
        with pytest.raises(ValidationError) as exc_info:
            DeploymentPut(attributes={" ": "value"})
        assert "blank" in str(exc_info.value).lower() or "whitespace" in str(exc_info.value).lower()

    def test_whitespace_only_key_raises(self):
        with pytest.raises(ValidationError):
            DeploymentPut(attributes={"   ": "val"})

    def test_mixed_valid_and_blank_key_raises(self):
        with pytest.raises(ValidationError):
            DeploymentPut(attributes={"name": "app", "": "oops"})

    def test_single_space_key_raises(self):
        with pytest.raises(ValidationError):
            DeploymentPut(attributes={" ": "val"})

    def test_valid_single_attribute(self):
        put = DeploymentPut(attributes={"name": "only-one"})
        assert put.attributes["name"] == "only-one"
