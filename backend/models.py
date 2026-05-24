from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator, model_validator


# ---------------------------------------------------------------------------
# Deployment response
# ---------------------------------------------------------------------------

class DeploymentOut(BaseModel):
    deployment_id: str
    version: str
    status: str
    type: str
    environment: str
    attributes: dict[str, Any]
    created_at: datetime
    created_by: str
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = {"populate_by_name": True}


class DeploymentListOut(BaseModel):
    items: list[DeploymentOut]
    total: int
    page: int
    pages: int


# ---------------------------------------------------------------------------
# PATCH  /deployments/{id}  — granular dot-notation update
# ---------------------------------------------------------------------------

ALLOWED_PATCH_PATHS = {"attributes.name", "attributes.description"}


class DeploymentPatch(BaseModel):
    # Arbitrary keys; validated below.
    model_config = {"extra": "allow"}

    @model_validator(mode="before")
    @classmethod
    def check_paths(cls, values: dict) -> dict:
        invalid = set(values.keys()) - ALLOWED_PATCH_PATHS
        if invalid:
            raise ValueError(
                f"Only {sorted(ALLOWED_PATCH_PATHS)} may be patched; "
                f"invalid paths: {sorted(invalid)}"
            )
        return values


# ---------------------------------------------------------------------------
# PUT  /deployments/{id}  — full attributes replacement
# ---------------------------------------------------------------------------

class DeploymentPut(BaseModel):
    attributes: dict[str, Any]

    @field_validator("attributes")
    @classmethod
    def no_blank_keys(cls, v: dict) -> dict:
        if any(k == "" for k in v):
            raise ValueError("Attribute keys must not be blank")
        return v


# ---------------------------------------------------------------------------
# Field-config response
# ---------------------------------------------------------------------------

class FieldConfigItem(BaseModel):
    path: str
    label: str


class FieldConfigOut(BaseModel):
    system: list[FieldConfigItem]
    custom: list[FieldConfigItem]
