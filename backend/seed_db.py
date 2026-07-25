"""Seed database script to import destinations and 500 services into PostgreSQL / SQLite."""

from __future__ import annotations

import json
from pathlib import Path
from backend.database import SessionLocal, Base, engine
from backend.models import DestinationModel, ServiceModel


def seed_database():
    """Create tables and populate initial dataset from JSON files in ultra-fast bulk operations."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Destinations if empty
        dest_path = Path(__file__).parent.parent / "src" / "data" / "destinationsData.json"
        if not dest_path.exists():
            dest_path = Path(__file__).with_name("destinations.json")

        if dest_path.exists():
            existing_dest_ids = set(r[0] for r in db.query(DestinationModel.id).all())
            dest_data = json.loads(dest_path.read_text(encoding="utf-8"))
            new_dests = []
            for d in dest_data:
                dest_id = d["id"]
                if dest_id not in existing_dest_ids:
                    new_dests.append(
                        DestinationModel(
                            id=dest_id,
                            code=d.get("code", dest_id.upper()),
                            name=d["name"],
                            region=d["region"],
                            category_type=d.get("category_type", "city"),
                            tags=d.get("tags", []),
                            coordinates=d.get("coordinates", [105.8542, 21.0285]),
                            hero_image=d.get("hero_image"),
                            description=d.get("description", ""),
                        )
                    )
            if new_dests:
                db.add_all(new_dests)
                db.commit()
                print(f"[SUCCESS] {len(new_dests)} destinations seeded cleanly into Database.")
            else:
                print("[INFO] Destinations already seeded in Database.")

        # 2. Seed 500 Services in 1 Single Fast Bulk Insert
        services_path = Path(__file__).with_name("tripbudget_full_dataset_500.json")
        if services_path.exists():
            existing_srv_ids = set(r[0] for r in db.query(ServiceModel.id).all())
            services_data = json.loads(services_path.read_text(encoding="utf-8"))
            new_services = []
            for s in services_data:
                srv_id = s["id"]
                if srv_id not in existing_srv_ids:
                    new_services.append(
                        ServiceModel(
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
                    )
            if new_services:
                db.add_all(new_services)
                db.commit()
                print(f"[SUCCESS] {len(new_services)} services seeded into PostgreSQL Database!")
            else:
                print(f"[INFO] Services already exist in Database ({len(existing_srv_ids)} items).")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
