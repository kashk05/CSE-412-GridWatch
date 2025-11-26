# backend/db/session.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.config import settings


engine = create_engine(
    settings.database_url,
    echo=False,
    future=True
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False
)