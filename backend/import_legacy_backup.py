"""Restore the historical TripBuddy catalog backup into the configured database.

The backup was committed before the original Neon project became unavailable.
This tool deliberately only upserts records: it never clears a target database.

Usage:
    python -m backend.import_legacy_backup --dry-run
    python -m backend.import_legacy_backup
    python -m backend.import_legacy_backup --backup-file path\\to\\backup.json
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any, Type

from sqlalchemy.orm import Session

from backend.database import Base, SessionLocal, engine, ensure_service_coordinates_schema
from backend.models import DestinationModel, ServiceModel, SiteConfigModel, SlideModel


LEGACY_COMMIT = "9a2011662f8cfe138cf001195438b4e9129b277f"
LEGACY_BACKUP_PATH = "backend/backups/backup_tripbudget_20260729_152628.json"
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def load_backup(backup_file: Path | None = None) -> dict[str, Any]:
    """Load a supplied backup or the known snapshot from Git history."""
    if backup_file:
        content = backup_file.read_text(encoding="utf-8")
    else:
        result = subprocess.run(
            ["git", "show", f"{LEGACY_COMMIT}:{LEGACY_BACKUP_PATH}"],
            cwd=PROJECT_ROOT,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        content = result.stdout

    backup = json.loads(content)
    if not isinstance(backup, dict):
        raise ValueError("Backup must be a JSON object")
    return backup


def _upsert_records(db: Session, model: Type[Any], records: list[dict[str, Any]]) -> int:
    for record in records:
        if not isinstance(record, dict):
            raise ValueError(f"Invalid {model.__tablename__} record in backup")
        db.merge(model(**record))
    return len(records)


def restore_backup(backup: dict[str, Any], dry_run: bool = False) -> dict[str, int]:
    """Upsert catalog content, keeping any unrelated target records intact."""
    groups: list[tuple[str, Type[Any]]] = [
        ("destinations", DestinationModel),
        ("services", ServiceModel),
        ("slides", SlideModel),
        ("site_configs", SiteConfigModel),
    ]
    counts = {name: len(backup.get(name, [])) for name, _ in groups}

    if dry_run:
        return counts

    Base.metadata.create_all(bind=engine)
    ensure_service_coordinates_schema()
    db = SessionLocal()
    try:
        for name, model in groups:
            records = backup.get(name, [])
            if not isinstance(records, list):
                raise ValueError(f"Backup field '{name}' must be an array")
            _upsert_records(db, model, records)
        db.commit()
        return counts
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Restore the historical TripBuddy catalog backup")
    parser.add_argument("--backup-file", type=Path, help="Use a JSON backup file instead of the Git snapshot")
    parser.add_argument("--dry-run", action="store_true", help="Validate and show record counts without writing")
    args = parser.parse_args()

    backup = load_backup(args.backup_file)
    counts = restore_backup(backup, dry_run=args.dry_run)
    mode = "Validated" if args.dry_run else "Imported"
    print(f"{mode} legacy backup: " + ", ".join(f"{name}={count}" for name, count in counts.items()))


if __name__ == "__main__":
    main()
