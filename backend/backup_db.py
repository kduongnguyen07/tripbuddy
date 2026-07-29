"""Script to dump and export entire database tables to JSON backups."""

import os
import json
from datetime import datetime
from pathlib import Path
from backend.database import SessionLocal
from backend.models import DestinationModel, ServiceModel, SlideModel, SiteConfigModel, SavedPlanModel

def export_database_json(output_dir: str | None = None) -> dict:
    """Export all database tables into a consolidated JSON backup."""
    db = SessionLocal()
    try:
        destinations = [d.as_dict() for d in db.query(DestinationModel).all()]
        services = [s.as_dict() for s in db.query(ServiceModel).all()]
        slides = [sl.as_dict() for sl in db.query(SlideModel).all()]
        site_configs = [c.as_dict() for c in db.query(SiteConfigModel).all()]
        saved_plans = [p.as_dict() for p in db.query(SavedPlanModel).all()]

        backup_payload = {
            "exported_at": datetime.now().isoformat(),
            "counts": {
                "destinations": len(destinations),
                "services": len(services),
                "slides": len(slides),
                "site_configs": len(site_configs),
                "saved_plans": len(saved_plans),
            },
            "destinations": destinations,
            "services": services,
            "slides": slides,
            "site_configs": site_configs,
            "saved_plans": saved_plans,
        }

        # Determine output directory
        if not output_dir:
            base_dir = Path(__file__).parent / "backups"
        else:
            base_dir = Path(output_dir)

        base_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = base_dir / f"backup_tripbudget_{timestamp}.json"

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(backup_payload, f, ensure_ascii=False, indent=2)

        print(f"[SUCCESS] Database backup saved to: {file_path}")
        return {
            "status": "success",
            "file_path": str(file_path),
            "counts": backup_payload["counts"],
        }
    except Exception as e:
        print(f"[ERROR] Database backup failed: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()

if __name__ == "__main__":
    export_database_json()
