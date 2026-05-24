from functools import lru_cache

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from config import get_settings


@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    settings = get_settings()
    return MongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=3000,
    )


def get_db() -> Database:
    settings = get_settings()
    return get_client()[settings.db_name]


def get_deployments_collection() -> Collection:
    return get_db()["deployments"]


def get_field_config_collection() -> Collection:
    return get_db()["field_config"]
