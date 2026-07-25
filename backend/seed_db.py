"""Seed database script to import destinations and 500 services into PostgreSQL / SQLite."""

from __future__ import annotations

import json
from pathlib import Path
from backend.database import SessionLocal, Base, engine
from backend.models import DestinationModel, ServiceModel


def seed_database():
    """Create tables and populate initial dataset from JSON files."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Destinations if empty
        dest_path = Path(__file__).with_name("destinations.json")
        if dest_path.exists():
            dest_data = json.loads(dest_path.read_text(encoding="utf-8"))
            for d in dest_data:
                dest_id = d["id"]
                existing = db.query(DestinationModel).filter(DestinationModel.id == dest_id).first()
                if not existing:
                    db_dest = DestinationModel(
                        id=dest_id,
                        code=d.get("code", dest_id.upper()),
                        name=d["name"],
                        region=d["region"],
                        category_type=d.get("category_type", "city"),
                        tags=d.get("tags", []),
                        coordinates=d.get("coordinates", [105.85, 21.02]),
                        hero_image=d.get("hero_image"),
                        description=d.get("description"),
                    )
                    db.add(db_dest)
            db.commit()
            print("[SUCCESS] Destinations seeded cleanly.")

        # 2. Seed Services if empty
        services_path = Path(__file__).with_name("tripbudget_full_dataset_500.json")
        if services_path.exists():
            services_data = json.loads(services_path.read_text(encoding="utf-8"))
            count = 0
            for s in services_data:
                srv_id = s["id"]
                existing = db.query(ServiceModel).filter(ServiceModel.id == srv_id).first()
                if not existing:
                    db_srv = ServiceModel(
                        id=srv_id,
                        destination_id=s.get("destination_id", "HAN"),
                        category=s.get("category", "activity"),
                        sub_category=s.get("sub_category", "standard"),
                        name=s.get("name", "Dich vu du lich"),
                        price=float(s.get("price", 0.0)),
                        rating=float(s.get("rating", 4.5)),
                        duration_mins=int(s.get("duration_mins", 60)),
                        tags=s.get("tags", []),
                        image_url=s.get("image_url", ""),
                        booking_url=s.get("booking_url", ""),
                    )
                    db.add(db_srv)
                    count += 1
            db.commit()
            print(f"[SUCCESS] {count} services seeded into database.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
