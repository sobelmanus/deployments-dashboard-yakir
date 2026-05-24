from fastapi import APIRouter

from database import get_field_config_collection
from models import FieldConfigItem, FieldConfigOut

router = APIRouter(prefix="/field-config", tags=["field-config"])


@router.get("", response_model=FieldConfigOut)
def get_field_config() -> FieldConfigOut:
    collection = get_field_config_collection()

    system_docs = list(
        collection.find({"type": "system"}, {"_id": 0, "path": 1, "label": 1, "order": 1})
        .sort("order", 1)
    )
    custom_docs = list(
        collection.find({"type": "custom"}, {"_id": 0, "path": 1, "label": 1})
        .sort("label", 1)
    )

    return FieldConfigOut(
        system=[FieldConfigItem(path=d["path"], label=d["label"]) for d in system_docs],
        custom=[FieldConfigItem(path=d["path"], label=d["label"]) for d in custom_docs],
    )
