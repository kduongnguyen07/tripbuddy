"""Normalize the generated TripBuddy fixture into the catalog contract.

The generated fixture intentionally has a compact authoring schema. This module
is the only translation boundary; a later data provider can emit the canonical
schema directly and bypass it.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def load_destinations_json() -> dict[str, dict[str, Any]]:
    json_path = Path(__file__).with_name("destinations.json")
    if not json_path.exists():
        return {
            "HAN": {"id": "ha-noi", "name": "Hà Nội", "region": "Miền Bắc", "category_type": "city", "tags": ["city", "thanh_pho", "culture", "van_hoa", "history", "lich_su", "food"], "coordinates": [105.8542, 21.0285], "hero_image": "https://images.unsplash.com/photo-1509030450996-93f2e3d84074?auto=format&fit=crop&w=1200&q=80"},
            "HUE": {"id": "hue", "name": "Huế", "region": "Miền Trung", "category_type": "heritage", "tags": ["heritage", "di_san", "history", "lich_su", "culture", "van_hoa"], "coordinates": [107.5847, 16.4637], "hero_image": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80"},
            "DAD": {"id": "da-nang", "name": "Đà Nẵng", "region": "Miền Trung", "category_type": "beach", "tags": ["beach", "bien", "city", "thanh_pho", "resort", "nghi_duong"], "coordinates": [108.2022, 16.0544], "hero_image": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80"},
            "DLD": {"id": "da-lat", "name": "Đà Lạt", "region": "Tây Nguyên", "category_type": "mountain", "tags": ["mountain", "nui_doi", "nature", "thien_nhien", "khi_hau_mat_moe"], "coordinates": [108.4419, 11.9404], "hero_image": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80"},
            "PQC": {"id": "phu-quoc", "name": "Phú Quốc", "region": "Miền Nam", "category_type": "island", "tags": ["island", "dao", "beach", "bien", "luxury", "nghi_duong"], "coordinates": [103.963, 10.2899], "hero_image": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80"},
        }
    items = json.loads(json_path.read_text(encoding="utf-8"))
    return {item.get("code", item["id"].upper()): item for item in items}


DESTINATIONS: dict[str, dict[str, Any]] = load_destinations_json()

CATEGORY_MAP = {"accommodation": "stay", "food": "food", "activity": "activity"}
MEAL_SLOTS = ("breakfast", "lunch", "dinner")
ACTIVITY_SLOTS = ("morning", "afternoon", "evening")


def _capacity_for(subtype: str) -> int:
    if subtype == "villa":
        return 4
    if subtype == "hostel":
        return 1
    return 2


def normalize_generated_records(records: list[dict[str, Any]], source_path: Path) -> dict[str, Any]:
    """Convert `tripbuddy_full_dataset_500.json` records to canonical services."""
    if not records:
        raise ValueError("Generated dataset is empty")

    dest_map = load_destinations_json()
    unknown_destination_ids = {record.get("destination_id") for record in records} - set(dest_map)
    if unknown_destination_ids:
        raise ValueError(f"Unknown destination ids in generated dataset: {sorted(unknown_destination_ids)}")

    updated_at = datetime.fromtimestamp(source_path.stat().st_mtime, tz=timezone.utc).date().isoformat()
    destination_ids = {record["destination_id"] for record in records}
    food_indexes: dict[str, int] = {destination_id: 0 for destination_id in destination_ids}
    activity_indexes: dict[str, int] = {destination_id: 0 for destination_id in destination_ids}
    services: list[dict[str, Any]] = []

    for record in records:
        raw_category = record.get("category")
        if raw_category not in CATEGORY_MAP:
            raise ValueError(f"Unsupported generated category: {raw_category}")
        raw_destination_id = record["destination_id"]
        category = CATEGORY_MAP[raw_category]
        subtype = record.get("sub_category")
        if not subtype:
            raise ValueError(f"Service {record.get('id')} has no sub_category")

        if category == "stay":
            price_unit, capacity, duration_hours, time_window = "per_room", _capacity_for(subtype), 12.0, "overnight"
        elif category == "food":
            position = food_indexes[raw_destination_id]
            food_indexes[raw_destination_id] += 1
            price_unit, capacity, duration_hours, time_window = "per_person", 1, max(0.5, float(record.get("duration_mins", 45)) / 60), MEAL_SLOTS[position % len(MEAL_SLOTS)]
        else:
            position = activity_indexes[raw_destination_id]
            activity_indexes[raw_destination_id] += 1
            price_unit, capacity, duration_hours, time_window = "per_person", 1, max(0.5, float(record.get("duration_mins", 60)) / 60), ACTIVITY_SLOTS[position % len(ACTIVITY_SLOTS)]

        raw_tags = set(record.get("tags", []))
        if subtype:
            raw_tags.add(subtype)
            if subtype == "hotel":
                raw_tags.update(["khach_san", "hotel", "casual"])
            elif subtype == "resort":
                raw_tags.update(["resort", "luxury", "nghi_duong"])
            elif subtype == "homestay":
                raw_tags.update(["homestay", "check_in"])
            elif subtype == "villa":
                raw_tags.update(["villa", "scenic_view", "sang_trong"])
            elif subtype == "hostel":
                raw_tags.update(["hostel", "budget", "giare"])

        # Unsplash fallback photos by category
        img = record.get("image_url") or ""
        if not img or "tripbuddy.vn" in img:
            if category == "stay":
                img = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"
            elif category == "food":
                img = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"
            else:
                img = "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80"

        services.append({
            "id": record["id"],
            "destination_id": dest_map[raw_destination_id]["id"],
            "category": category,
            "subtype": subtype,
            "name": record["name"],
            "price_vnd": int(round(float(record["price"]) / 1000) * 1000),
            "price_unit": price_unit,
            "capacity": capacity,
            "duration_hours": duration_hours,
            "time_window": time_window,
            "rating": float(record["rating"]),
            "tags": sorted(list(raw_tags)),
            "image_url": img,
            "affiliate_url": record.get("booking_url") or None,
            "source": "mock-generated",
            "updated_at": updated_at,
        })

    return {
        "metadata": {"version": "mock-generated-v1", "source": "mock-generated", "updated_at": updated_at},
        "destinations": [details for raw_id, details in dest_map.items() if raw_id in destination_ids],
        "services": services,
    }
