"""Seed database script to import destinations and 500 services into PostgreSQL / SQLite."""

from __future__ import annotations

import json
from pathlib import Path
from backend.database import SessionLocal, Base, engine
from backend.models import DestinationModel, ServiceModel, SlideModel, SiteConfigModel


def seed_database():
    """Create missing tables and populate initial dataset from JSON files safely without dropping existing tables."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[WARNING] Table creation check: {e}")

    db = SessionLocal()

    try:


        # 1. Seed Destinations
        dest_path = Path(__file__).with_name("destinations.json")
        if not dest_path.exists():
            dest_path = Path(__file__).parent.parent / "src" / "data" / "destinationsData.json"

        if dest_path.exists():
            dest_data = json.loads(dest_path.read_text(encoding="utf-8"))
            existing = {d.id: d for d in db.query(DestinationModel).all()}

            new_dests = []
            for d in dest_data:
                dest_id = d["id"]
                if dest_id not in existing:
                    new_dests.append(
                        DestinationModel(
                            id=dest_id,
                            code=d.get("code", dest_id),
                            name=d["name"],
                            region=d["region"],
                            category_type=d.get("category_type", "city"),
                            tags=d.get("tags", []),
                            coordinates=d.get("coordinates", [105.8542, 21.0285]),
                            hero_image=d.get("hero_image"),
                            gallery_images=d.get("gallery_images", []),
                            satisfaction_scores=d.get("satisfaction_scores", {}),
                            activities=d.get("activities", []),
                            travel_tips=d.get("travel_tips", []),
                            description=d.get("description", ""),
                            minimum_two_day_cost_vnd=d.get("minimum_two_day_cost_vnd", 1500000),
                        )
                    )
            if new_dests:
                db.add_all(new_dests)
                db.commit()
                print(f"[SUCCESS] {len(new_dests)} destinations seeded into Neon PostgreSQL database!")
            else:
                print(f"[INFO] Destinations in sync with Database ({len(existing)} items).")

        # 2. Seed 500 Services
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
                print(f"[SUCCESS] {len(new_services)} services seeded into Neon PostgreSQL database!")
            else:
                print(f"[INFO] Services already exist in Database ({len(existing_srv_ids)} items).")

        # 3. Seed Journey Slides
        slides_path = Path(__file__).parent.parent / "src" / "data" / "slidesData.json"
        if slides_path.exists():
            existing_slides = set(r[0] for r in db.query(SlideModel.id).all())
            slides_data = json.loads(slides_path.read_text(encoding="utf-8"))
            new_slides = []
            for sl in slides_data:
                if sl["id"] not in existing_slides:
                    new_slides.append(
                        SlideModel(
                            id=sl["id"],
                            category=sl.get("category", ""),
                            title=sl.get("title", ""),
                            titleHighlight=sl.get("titleHighlight", ""),
                            description=sl.get("description", ""),
                            image=sl.get("image", ""),
                            imageCaptionTitle=sl.get("imageCaptionTitle", ""),
                            imageCaptionSub=sl.get("imageCaptionSub", ""),
                            features=sl.get("features", []),
                        )
                    )
            if new_slides:
                db.add_all(new_slides)
                db.commit()
                print(f"[SUCCESS] {len(new_slides)} journey slides seeded into Neon PostgreSQL database!")
            else:
                print(f"[INFO] Slides already exist in Database ({len(existing_slides)} items).")

        # 4. Seed Hero Banner Site Config
        existing_hero = db.query(SiteConfigModel).filter_by(key="hero").first()
        if not existing_hero:
            hero_default = {
                "badge": "VIỆT NAM VÀ NHỮNG CHUYẾN ĐI",
                "titleLine1": "Khám Phá Việt Nam",
                "titleLine2": "Theo Cách",
                "titleHighlight": "Của Bạn",
                "backgroundImage": "https://images.pexels.com/photos/28706873/pexels-photo-28706873.jpeg",
                "ctaButtonText": "Khám Phá Ngay"
            }
            db.add(SiteConfigModel(key="hero", value=hero_default))
            db.commit()
            print("[SUCCESS] Default Hero banner config seeded into Neon PostgreSQL database!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()


