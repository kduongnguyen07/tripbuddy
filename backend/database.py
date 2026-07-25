"""Database configuration and session management for TripBudget.

Supports online PostgreSQL (Neon, Supabase, Railway, Render, ElephantSQL)
with automatic fallback to SQLite when DATABASE_URL is not set.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Automatically load .env file from project root if present
root_dir = Path(__file__).resolve().parent.parent
env_file = root_dir / ".env"
if env_file.exists():
    try:
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'").strip('"')
                if key not in os.environ:
                    os.environ[key] = val
    except Exception as e:
        print(f"Warning loading .env file: {e}")

# Get DATABASE_URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    os.getenv(
        "POSTGRES_URL",
        "sqlite:///./tripbudget.db"
    )
)

# Fix postgres:// prefix if provided by Heroku/Render/Vercel to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Clean unsupported channel_binding parameter for psycopg2 / Neon compatibility
if "channel_binding=" in DATABASE_URL:
    DATABASE_URL = (
        DATABASE_URL.replace("&channel_binding=require", "")
        .replace("?channel_binding=require&", "?")
        .replace("?channel_binding=require", "")
    )

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
