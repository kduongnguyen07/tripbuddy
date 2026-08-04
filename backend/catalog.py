from __future__ import annotations

import json
from dataclasses import dataclass
from math import ceil
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import DestinationModel, ServiceModel


@dataclass(frozen=True)
class Service:
    id: str
    destination_id: str
    category: str
    subtype: str
    name: str
    price_vnd: int
    price_unit: str
    capacity: int
    duration_hours: float
    time_window: str
    rating: float
    tags: tuple[str, ...]
    image_url: str
    affiliate_url: str | None
    source: str
    updated_at: str
    coordinates: tuple[float, float] | None = None
    geocoding_status: str = "pending"
    geocoding_confidence: float | None = None
    meal_slots: tuple[str, ...] = ()

    def cost_for_group(self, people: int, nights: int = 1) -> int:
        return self.price_vnd * (ceil(people / self.capacity) * nights if self.price_unit == "per_room" else people)

    def as_dict(self, people: int, nights: int = 1) -> dict[str, Any]:
        return {
            "id": self.id, "destination_id": self.destination_id, "category": self.category,
            "subtype": self.subtype, "name": self.name, "price_vnd": self.price_vnd,
            "price_unit": self.price_unit, "total_cost_vnd": self.cost_for_group(people, nights),
            "capacity": self.capacity, "duration_hours": self.duration_hours, "time_window": self.time_window,
            "rating": self.rating, "tags": list(self.tags), "image_url": self.image_url,
            "affiliate_url": self.affiliate_url, "source": self.source, "updated_at": self.updated_at,
            "coordinates": list(self.coordinates) if self.coordinates else None,
            "geocoding_status": self.geocoding_status,
            "geocoding_confidence": self.geocoding_confidence,
        }


def _srv_model_to_service(s: ServiceModel) -> Service:
    cat = "stay" if s.category in ("stay", "accommodation") else s.category
    price_unit = "per_room" if cat == "stay" else "per_person"
    capacity = 2 if cat == "stay" else 1

    tags_list = s.tags if isinstance(s.tags, list) else json.loads(s.tags or "[]")
    sub_cat = (s.sub_category or "").lower()
    tags_lower = [t.lower() for t in tags_list]
    time_window = "anytime"

    meal_slots: tuple[str, ...] = ()
    if cat == "stay":
        time_window = "overnight"
    elif cat == "food":
        meal_slots = tuple(
            slot
            for slot in ("breakfast", "lunch", "dinner")
            if slot in {value.strip().lower() for value in (s.meal_type or "").split(",")}
        )
        if meal_slots:
            # Keep a stable default for legacy consumers. The planner uses
            # ``meal_slots`` so a venue can be scheduled at every meal it serves.
            time_window = meal_slots[0]
        elif any(t in tags_lower for t in ("breakfast", "sang", "sang_sang")):
            time_window = "breakfast"
        elif any(t in tags_lower for t in ("lunch", "trua", "an_trua")):
            time_window = "lunch"
        elif any(t in tags_lower for t in ("dinner", "toi", "an_toi", "night")):
            time_window = "dinner"
        else:
            # Distribute anytime foods across meal slots based on ID hash
            hash_idx = sum(ord(c) for c in s.id) % 3
            time_window = ("breakfast", "lunch", "dinner")[hash_idx]
    elif cat == "activity":
        if any(t in tags_lower for t in ("morning", "sang")):
            time_window = "morning"
        elif any(t in tags_lower for t in ("afternoon", "chieu")):
            time_window = "afternoon"
        elif any(t in tags_lower for t in ("evening", "night", "toi")):
            time_window = "evening"
        else:
            # Distribute anytime activities across activity slots based on ID hash
            hash_idx = sum(ord(c) for c in s.id) % 3
            time_window = ("morning", "afternoon", "evening")[hash_idx]

    raw_coordinates = s.coordinates
    if isinstance(raw_coordinates, str):
        try:
            raw_coordinates = json.loads(raw_coordinates)
        except Exception:
            raw_coordinates = None
    coordinates = None
    if isinstance(raw_coordinates, (list, tuple)) and len(raw_coordinates) == 2:
        try:
            coordinates = (float(raw_coordinates[0]), float(raw_coordinates[1]))
        except (TypeError, ValueError):
            coordinates = None

    return Service(
        id=s.id,
        destination_id=s.destination_id,
        category=cat,
        subtype=s.sub_category or "standard",
        name=s.name,
        price_vnd=int(s.price),
        price_unit=price_unit,
        capacity=capacity,
        duration_hours=round(s.duration_mins / 60.0, 1),
        time_window=time_window,
        rating=float(s.rating or 4.5),
        tags=tuple(tags_list),
        image_url=s.image_url or "",
        affiliate_url=s.booking_url,
        source="neon_postgres",
        updated_at="2026-07-26",
        coordinates=coordinates,
        geocoding_status=s.geocoding_status or "pending",
        geocoding_confidence=float(s.geocoding_confidence) if s.geocoding_confidence is not None else None,
        meal_slots=meal_slots,
    )


class CatalogRepository:
    """Catalog repository backed strictly by PostgreSQL Database."""

    def __init__(self, db: Session | None = None, path: Path | None = None):
        self._db = db
        self._owns_session = False
        if self._db is None:
            try:
                self._db = SessionLocal()
                self._owns_session = True
            except Exception as e:
                print("Warning opening SessionLocal in CatalogRepository:", e)
                self._db = None

    def __del__(self):
        if getattr(self, "_owns_session", False) and getattr(self, "_db", None) is not None:
            try:
                self._db.close()
            except Exception:
                pass

    @property
    def metadata(self) -> dict[str, Any]:
        return {
            "version": "3.0.0-postgres",
            "source": "Neon PostgreSQL Database",
            "updated_at": "2026-07-26T06:23:02Z",
        }

    @property
    def version(self) -> str:
        return self.metadata["version"]

    def destinations(self) -> list[dict[str, Any]]:
        if not self._db:
            return []
        dests = self._db.query(DestinationModel).all()
        return [d.as_dict() for d in dests]

    def destination(self, destination_id: str) -> dict[str, Any] | None:
        if not self._db:
            return None
        dest_obj = self._db.query(DestinationModel).filter(
            (DestinationModel.id == destination_id)
            | (DestinationModel.id == destination_id.lower())
            | (DestinationModel.code == destination_id.upper())
        ).first()
        return dest_obj.as_dict() if dest_obj else None

    def services_for(self, destination_id: str, category: str | None = None) -> list[Service]:
        if not self._db:
            return []
        dest_obj = self.destination(destination_id)
        valid_dest_ids = {destination_id}
        if dest_obj:
            valid_dest_ids.add(dest_obj["id"])
            if dest_obj.get("code"):
                valid_dest_ids.add(dest_obj["code"])

        query = self._db.query(ServiceModel).filter(ServiceModel.destination_id.in_(list(valid_dest_ids)))
        if category:
            if category == "stay":
                query = query.filter(ServiceModel.category.in_(["stay", "accommodation"]))
            else:
                query = query.filter(ServiceModel.category == category)

        records = query.all()
        return [_srv_model_to_service(s) for s in records]

    def service(self, service_id: str) -> Service | None:
        if not self._db:
            return None
        srv = self._db.query(ServiceModel).filter(ServiceModel.id == service_id).first()
        return _srv_model_to_service(srv) if srv else None
