"""
Startup tasks:
  1. Create missing MongoDB indexes on the `deployments` collection.
  2. Seed the `field_config` collection if empty.
"""

from pymongo import ASCENDING, DESCENDING

from database import get_deployments_collection, get_field_config_collection

# ---------------------------------------------------------------------------
# System field paths in canonical display order
# ---------------------------------------------------------------------------

SYSTEM_FIELD_PATHS = [
    "deployment_id",
    "version",
    "status",
    "type",
    "environment",
    "created_by",
    "created_at",
    "attributes.name",
    "attributes.description",
    "attributes.team",
    "attributes.region",
]


def derive_label(path: str) -> str:
    """
    Derive a human-readable label from a dot-notation field path.

    Rules:
    - Take the last segment after the last "."
    - Replace underscores with spaces
    - Title-case each word

    Examples:
      "deployment_id"        -> "Deployment Id"
      "attributes.name"      -> "Name"
      "attributes.team"      -> "Team"
      "created_by"           -> "Created By"
    """
    last_segment = path.rsplit(".", 1)[-1]
    return " ".join(word.capitalize() for word in last_segment.split("_"))


def create_indexes() -> None:
    """Create indexes that are not created by the seed script."""
    collection = get_deployments_collection()
    existing = {idx["name"] for idx in collection.list_indexes()}

    def _ensure(keys: list[tuple], **kwargs):
        # Build a name to check existence
        name = "_".join(f"{k}_{v}" for k, v in keys)
        if name not in existing:
            collection.create_index(keys, **kwargs)

    _ensure([("deleted_at", ASCENDING), ("created_at", DESCENDING)])
    _ensure([("type", ASCENDING)])
    _ensure([("environment", ASCENDING)])
    _ensure([("attributes.name", ASCENDING)])
    _ensure([("attributes.description", ASCENDING)])


def seed_field_config() -> None:
    """Seed field_config collection if empty."""
    fc = get_field_config_collection()
    if fc.count_documents({}) > 0:
        return

    # Insert system fields in order
    system_docs = [
        {
            "path": path,
            "label": derive_label(path),
            "type": "system",
            "order": idx,
        }
        for idx, path in enumerate(SYSTEM_FIELD_PATHS)
    ]
    fc.insert_many(system_docs)

    # Discover custom attribute keys from the deployments collection
    deployments = get_deployments_collection()
    system_attr_keys = {
        p.split(".", 1)[1]
        for p in SYSTEM_FIELD_PATHS
        if p.startswith("attributes.")
    }

    custom_keys: set[str] = set()
    for doc in deployments.find({}, {"attributes": 1, "_id": 0}):
        for key in doc.get("attributes", {}).keys():
            if key not in system_attr_keys:
                custom_keys.add(key)

    if custom_keys:
        custom_docs = [
            {
                "path": f"attributes.{key}",
                "label": derive_label(f"attributes.{key}"),
                "type": "custom",
            }
            for key in sorted(custom_keys)
        ]
        fc.insert_many(custom_docs)


def run_startup() -> None:
    create_indexes()
    seed_field_config()
