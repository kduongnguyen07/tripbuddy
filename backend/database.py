"""Database configuration and session management for TripBudget.

Supports online PostgreSQL (Neon, Supabase, Railway, Render, ElephantSQL)
with automatic fallback to SQLite when DATABASE_URL is not set.
"""

from __future__ import annotations

import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Get DATABASE_URL from environment (e.g., postgresql://user:pass@ep-xyz.neon.tech/tripbudget?sslmode=require)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv(
        "POSTGRES_URL",
        "sqlite:///./tripbudget.db"
    )
)

# Fix postgres:// prefix if provided by Heroku/Render to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator:
    """FastAPI Dependency for DB Sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
