import re
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query, status

from database import get_deployments_collection, get_field_config_collection
from models import DeploymentListOut, DeploymentOut, DeploymentPatch, DeploymentPut
from serialization import serialize_deployment

router = APIRouter(prefix="/deployments", tags=["deployments"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

EXPIRY_HOURS = 720  # 30 days



def _expiry_filter() -> dict:
    """Filter that excludes hard-expired soft-deleted records."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=EXPIRY_HOURS)
    return {
        "$or": [
            {"deleted_at": None},
            {"deleted_at": {"$gte": cutoff}},
        ]
    }


def _get_or_404(deployment_id: str) -> dict:
    """Fetch a deployment by deployment_id, raise 404 if not found or expired."""
    collection = get_deployments_collection()
    doc = collection.find_one(
        {"deployment_id": deployment_id, **_expiry_filter()}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return doc


def _register_custom_fields(attribute_keys: list[str]) -> None:
    """Upsert any unknown attribute keys into field_config as custom fields."""
    from startup import derive_label  # local import to avoid circular

    fc = get_field_config_collection()
    for key in attribute_keys:
        path = f"attributes.{key}"
        fc.update_one(
            {"path": path},
            {"$setOnInsert": {"path": path, "label": derive_label(path), "type": "custom"}},
            upsert=True,
        )


# ---------------------------------------------------------------------------
# GET /deployments
# ---------------------------------------------------------------------------

@router.get("", response_model=DeploymentListOut)
def list_deployments(
    view: Annotated[Literal["existing", "deleted", "all"], Query()] = "existing",
    status: Annotated[list[str], Query()] = [],
    type: Annotated[list[str], Query()] = [],
    environment: Annotated[list[str], Query()] = [],
    search: Annotated[list[str], Query()] = [],
    sort: Annotated[str, Query()] = "created_at",
    order: Annotated[str, Query()] = "desc",
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    updated_since: Annotated[str | None, Query()] = None,
) -> DeploymentListOut:
    collection = get_deployments_collection()

    # ---- updated_since: delta re-fetch ----
    if updated_since is not None:
        try:
            since_dt = datetime.fromisoformat(updated_since.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid updated_since format")

        query: dict = {"updated_at": {"$gt": since_dt}, **_expiry_filter()}
        docs = list(collection.find(query, {"_id": 0}))
        return DeploymentListOut(
            items=[serialize_deployment(d) for d in docs],
            total=len(docs),
            page=1,
            pages=1,
        )

    # ---- normal query ----
    # Each view builds its own deleted_at filter to avoid key collisions with _expiry_filter()'s $or.
    if view == "existing":
        query: dict = {"deleted_at": None}
    elif view == "deleted":
        cutoff = datetime.now(timezone.utc) - timedelta(hours=EXPIRY_HOURS)
        query = {"deleted_at": {"$ne": None, "$gte": cutoff}}
    else:  # "all"
        query = _expiry_filter()

    # enum filters
    if status:
        query["status"] = {"$in": status}
    if type:
        query["type"] = {"$in": type}
    if environment:
        query["environment"] = {"$in": environment}

    # search chips
    if search:
        fc = get_field_config_collection()
        attr_paths = [
            doc["path"]
            for doc in fc.find({"path": {"$regex": r"^attributes\."}}, {"path": 1, "_id": 0})
        ]
        chip_conditions = []
        for raw in search:
            colon_idx = raw.find(":")
            field = raw[:colon_idx] if colon_idx != -1 else "all"
            value = raw[colon_idx + 1:] if colon_idx != -1 else raw
            if not value:
                continue
            pattern = {"$regex": re.escape(value), "$options": "i"}
            if field == "all":
                clauses = [
                    {"deployment_id": pattern},
                    {"created_by": pattern},
                    {"version": pattern},
                    *[{path: pattern} for path in attr_paths],
                ]
                chip_conditions.append({"$or": clauses})
            else:
                chip_conditions.append({field: pattern})
        if chip_conditions:
            query["$and"] = chip_conditions

    # sort
    sort_dir = 1 if order == "asc" else -1

    # total count
    total = collection.count_documents(query)

    # pagination
    skip = (page - 1) * limit
    cursor = (
        collection.find(query, {"_id": 0})
        .sort(sort, sort_dir)
        .skip(skip)
        .limit(limit)
    )

    items = [serialize_deployment(d) for d in cursor]
    pages = max(1, (total + limit - 1) // limit)

    return DeploymentListOut(items=items, total=total, page=page, pages=pages)


# ---------------------------------------------------------------------------
# GET /deployments/{deployment_id}
# ---------------------------------------------------------------------------

@router.get("/{deployment_id}", response_model=DeploymentOut)
def get_deployment(deployment_id: str) -> DeploymentOut:
    doc = _get_or_404(deployment_id)
    return serialize_deployment(doc)


# ---------------------------------------------------------------------------
# PATCH /deployments/{deployment_id}  — granular update
# ---------------------------------------------------------------------------

@router.patch("/{deployment_id}", response_model=DeploymentOut)
def patch_deployment(deployment_id: str, body: DeploymentPatch) -> DeploymentOut:
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="Request body must not be empty")

    now = datetime.now(timezone.utc)
    set_doc = {**updates, "updated_at": now}

    collection = get_deployments_collection()
    updated = collection.find_one_and_update(
        {"deployment_id": deployment_id, **_expiry_filter()},
        {"$set": set_doc},
        return_document=True,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return serialize_deployment(updated)


# ---------------------------------------------------------------------------
# PUT /deployments/{deployment_id}  — full attributes replacement
# ---------------------------------------------------------------------------

@router.put("/{deployment_id}", response_model=DeploymentOut)
def put_deployment(deployment_id: str, body: DeploymentPut) -> DeploymentOut:
    # Register before the write so a crash between them doesn't leave orphaned keys
    _register_custom_fields(list(body.attributes.keys()))

    now = datetime.now(timezone.utc)
    collection = get_deployments_collection()
    updated = collection.find_one_and_update(
        {"deployment_id": deployment_id, **_expiry_filter()},
        {"$set": {"attributes": body.attributes, "updated_at": now}},
        return_document=True,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return serialize_deployment(updated)


# ---------------------------------------------------------------------------
# DELETE /deployments/{deployment_id}  — soft delete
# ---------------------------------------------------------------------------

@router.delete("/{deployment_id}", response_model=DeploymentOut)
def delete_deployment(deployment_id: str) -> DeploymentOut:
    doc = _get_or_404(deployment_id)

    if doc.get("deleted_at") is not None:
        raise HTTPException(status_code=409, detail="Deployment is already deleted")

    now = datetime.now(timezone.utc)
    collection = get_deployments_collection()
    updated = collection.find_one_and_update(
        {"deployment_id": deployment_id},
        {"$set": {"deleted_at": now, "updated_at": now}},
        return_document=True,
    )
    return serialize_deployment(updated)


# ---------------------------------------------------------------------------
# POST /deployments/{deployment_id}/restore
# ---------------------------------------------------------------------------

@router.post("/{deployment_id}/restore", response_model=DeploymentOut)
def restore_deployment(deployment_id: str) -> DeploymentOut:
    doc = _get_or_404(deployment_id)

    if doc.get("deleted_at") is None:
        raise HTTPException(status_code=409, detail="Deployment is not deleted")

    now = datetime.now(timezone.utc)
    collection = get_deployments_collection()
    updated = collection.find_one_and_update(
        {"deployment_id": deployment_id},
        {"$set": {"deleted_at": None, "updated_at": now}},
        return_document=True,
    )
    return serialize_deployment(updated)
