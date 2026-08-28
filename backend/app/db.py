from __future__ import annotations

import os
from collections.abc import Generator
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


def database_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///./data/phase1.db")


def build_engine(url: str | None = None):
    selected_url = url or database_url()
    connect_args = {"check_same_thread": False} if selected_url.startswith("sqlite") else {}
    return create_engine(selected_url, connect_args=connect_args)


engine = build_engine()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def ensure_schema() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "migrations"))
    config.set_main_option("sqlalchemy.url", database_url())
    if not inspect(engine).has_table("lessons"):
        Base.metadata.create_all(bind=engine)
        command.stamp(config, "head")
    else:
        command.upgrade(config, "head")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
