# backend/core/config.py
import os
from functools import lru_cache
from pydantic import BaseModel


class Settings(BaseModel):
    database_url: str


@lru_cache()
def get_settings() -> Settings:
    # Use your actual local creds: user 'kash', db 'gridwatch'
    # No password here -> psycopg2 will use .pgpass just like DataGrip
    default_url = "postgresql+psycopg2://kash@localhost:5432/gridwatch"

    return Settings(
        database_url=os.getenv("DATABASE_URL", default_url)
    )


settings = get_settings()
