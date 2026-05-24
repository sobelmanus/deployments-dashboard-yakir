"""Helpers to convert raw MongoDB documents to JSON-serializable dicts."""

from datetime import datetime, timezone


def _fmt_dt(dt: datetime | None) -> str | None:
    """Return ISO 8601 string with Z suffix, or None."""
    if dt is None:
        return None
    # Ensure UTC-aware
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"


def serialize_deployment(doc: dict) -> dict:
    """Return a deployment doc ready for the API response (no _id, datetimes as ISO strings)."""
    out = {k: v for k, v in doc.items() if k != "_id"}
    for field in ("created_at", "updated_at", "deleted_at"):
        out[field] = _fmt_dt(out.get(field))
    return out
