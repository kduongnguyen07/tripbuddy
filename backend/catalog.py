from __future__ import annotations

import json
from dataclasses import dataclass
from math import ceil
from pathlib import Path
from typing import Any

from backend.normalizer import normalize_generated_records


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
        }


class CatalogRepository:
    """Catalog boundary. Use a database/API adapter later without changing the planner."""

    REQUIRED_SERVICE_FIELDS = {
        "id", "destination_id", "category", "subtype", "name", "price_vnd", "price_unit",
        "capacity", "duration_hours", "time_window", "rating", "tags", "image_url",
        "affiliate_url", "source", "updated_at",
    }

    def __init__(self, path: Path | None = None):
        generated_path = Path(__file__).with_name("tripbudget_full_dataset_500.json")
        self.path = path or (generated_path if generated_path.exists() else Path(__file__).with_name("dataset.json"))
        raw_payload = json.loads(self.path.read_text(encoding="utf-8"))
        self._payload = self._to_canonical_payload(raw_payload)
        self._validate_catalog()
        self._services = self._load_services()

    @property
    def metadata(self) -> dict[str, Any]:
        return self._payload["metadata"]

    @property
    def version(self) -> str:
        return self.metadata["version"]

    def _to_canonical_payload(self, raw_payload: Any) -> dict[str, Any]:
        if isinstance(raw_payload, list):
            return normalize_generated_records(raw_payload, self.path)
        if isinstance(raw_payload, dict) and "services" in raw_payload:
            return raw_payload
        if isinstance(raw_payload, dict) and "service_templates" in raw_payload:
            return self._legacy_templates_to_canonical(raw_payload)
        raise ValueError("Unsupported catalog payload; expected generated records or canonical services")

    def _legacy_templates_to_canonical(self, payload: dict[str, Any]) -> dict[str, Any]:
        metadata = payload["metadata"]
        services = []
        for destination in payload["destinations"]:
            multiplier = float(destination["cost_multiplier"])
            for template in payload["service_templates"]:
                services.append({
                    "id": f"{destination['id']}:{template['id']}", "destination_id": destination["id"],
                    "category": template["category"], "subtype": template["subtype"],
                    "name": template["name"].format(destination=destination["name"]),
                    "price_vnd": round(template["price_vnd"] * multiplier / 1000) * 1000,
                    "price_unit": template["price_unit"], "capacity": template["capacity"],
                    "duration_hours": template["duration_hours"], "time_window": template["time_window"],
                    "rating": template["rating"], "tags": template["tags"], "image_url": template["image_url"],
                    "affiliate_url": template["affiliate_url"], "source": metadata["source"], "updated_at": metadata["updated_at"],
                })
        return {"metadata": metadata, "destinations": payload["destinations"], "services": services}

    def _validate_catalog(self) -> None:
        metadata = self._payload.get("metadata", {})
        if not {"version", "source", "updated_at"}.issubset(metadata):
            raise ValueError("Catalog metadata is incomplete")
        destinations = self._payload.get("destinations", [])
        services = self._payload.get("services", [])
        if not destinations or not services:
            raise ValueError("Catalog must contain destinations and services")
        destination_ids = {destination["id"] for destination in destinations}
        if len(destination_ids) != len(destinations):
            raise ValueError("Destination ids must be unique")
        for service in services:
            if not self.REQUIRED_SERVICE_FIELDS.issubset(service):
                raise ValueError(f"Invalid service: {service.get('id')}")
            if service["destination_id"] not in destination_ids:
                raise ValueError(f"Service has unknown destination: {service['id']}")
            if service["category"] not in {"stay", "food", "activity"}:
                raise ValueError(f"Unsupported service category: {service['id']}")
            if service["price_unit"] not in {"per_person", "per_room"}:
                raise ValueError(f"Invalid price unit: {service['id']}")

    def _load_services(self) -> dict[str, Service]:
        return {
            item["id"]: Service(
                id=item["id"], destination_id=item["destination_id"], category=item["category"],
                subtype=item["subtype"], name=item["name"], price_vnd=int(item["price_vnd"]),
                price_unit=item["price_unit"], capacity=int(item["capacity"]),
                duration_hours=float(item["duration_hours"]), time_window=item["time_window"],
                rating=float(item["rating"]), tags=tuple(item["tags"]), image_url=item["image_url"],
                affiliate_url=item["affiliate_url"], source=item["source"], updated_at=item["updated_at"],
            )
            for item in self._payload["services"]
        }

    def destinations(self) -> list[dict[str, Any]]:
        return list(self._payload["destinations"])

    def destination(self, destination_id: str) -> dict[str, Any] | None:
        return next((item for item in self._payload["destinations"] if item["id"] == destination_id), None)

    def services_for(self, destination_id: str, category: str | None = None) -> list[Service]:
        values = [service for service in self._services.values() if service.destination_id == destination_id]
        return [service for service in values if service.category == category] if category else values

    def service(self, service_id: str) -> Service | None:
        return self._services.get(service_id)
