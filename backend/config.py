import json
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "deployments"
    cors_origins: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> list[str]:
        try:
            result = json.loads(self.cors_origins)
            return result if isinstance(result, list) else [self.cors_origins]
        except json.JSONDecodeError:
            return [self.cors_origins]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
