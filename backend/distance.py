"""Distance helpers for itinerary planning.

Distances are intentionally straight-line estimates.  External map providers
are not involved in either itinerary materialization or proximity optimization.
"""

from __future__ import annotations

import math
from typing import Any


Coordinate = tuple[float, float]


def haversine_distance_km(first: Coordinate, second: Coordinate) -> float:
    """Return the great-circle distance between two ``(longitude, latitude)`` points."""
    lon1, lat1 = first
    lon2, lat2 = second
    radius_km = 6_371.0
    latitude_delta = math.radians(lat2 - lat1)
    longitude_delta = math.radians(lon2 - lon1)
    value = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(longitude_delta / 2) ** 2
    )
    # Clamp against tiny floating-point overshoots at antipodal points.
    return 2 * radius_km * math.asin(math.sqrt(max(0.0, min(1.0, value))))


def coordinates(value: Any) -> Coordinate | None:
    """Normalize a JSON coordinate pair and reject malformed/non-finite values."""
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        return None
    try:
        result = (float(value[0]), float(value[1]))
    except (TypeError, ValueError):
        return None
    return result if all(math.isfinite(item) for item in result) else None


def estimated_distance_km(first: Any, second: Any) -> float | None:
    """Return a one-decimal straight-line estimate for two JSON coordinate pairs."""
    first_coordinates = coordinates(first)
    second_coordinates = coordinates(second)
    if first_coordinates is None or second_coordinates is None:
        return None
    return round(haversine_distance_km(first_coordinates, second_coordinates), 1)


def timeline_sort_value(event: dict[str, Any]) -> int:
    """Match the visible itinerary ordering used by the timeline component."""
    slot = event.get("slot")
    if slot == "overnight":
        return 0
    if slot == "check_out":
        return 1200
    if slot == "check_in":
        return 1400

    start_time = event.get("start_time")
    if isinstance(start_time, str) and ":" in start_time:
        try:
            hour, minute = (int(part) for part in start_time.split(":", 1))
            return hour * 100 + minute
        except ValueError:
            pass

    slot_weights = {
        "breakfast": 800,
        "morning": 930,
        "check_out": 1200,
        "lunch": 1230,
        "check_in": 1400,
        "afternoon": 1430,
        "dinner": 1900,
        "evening": 2030,
    }
    return slot_weights.get(slot, 1000)


def annotate_event_distances(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sort one day's events and add distances from the immediately prior card.

    The first event deliberately has no distance field.  A missing coordinate
    on either side of a later pair is represented by ``None``.
    """
    ordered = sorted(events, key=timeline_sort_value)
    previous: Coordinate | None = None
    for index, event in enumerate(ordered):
        current = coordinates(event.get("coordinates"))
        if index > 0:
            event["distance_from_previous_km"] = estimated_distance_km(previous, current)
        previous = current
    return ordered
