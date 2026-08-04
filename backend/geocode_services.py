"""One-time, cached service geocoder.

Usage:
  GEOCODER_BASE_URL=https://us1.locationiq.com/v1/search \
    GEOCODER_API_KEY=your_locationiq_key \
    .venv/Scripts/python backend/geocode_services.py --apply

Without ``--apply`` the command is a dry run.  The public Nominatim endpoint
is intentionally not the default; production deployments should use a
provider with an agreed SLA or a self-hosted instance.
"""

from __future__ import annotations

import argparse
import math
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from backend.database import SessionLocal
from backend.models import DestinationModel, ServiceModel
from sqlalchemy import or_


DEFAULT_ALLOWED_DESTINATIONS = frozenset({"HAN", "HUE", "DAD", "DLD", "PQC"})


def _coordinates(value: Any) -> tuple[float, float] | None:
    if isinstance(value, (list, tuple)) and len(value) == 2:
        try:
            return float(value[0]), float(value[1])
        except (TypeError, ValueError):
            return None
    return None


def _distance_km(first: tuple[float, float], second: tuple[float, float]) -> float:
    from backend.distance import haversine_distance_km

    return haversine_distance_km(first, second)


def _destination_code(destination: DestinationModel) -> str:
    return str(getattr(destination, "code", None) or getattr(destination, "id", "")).strip().upper()


def _allowed_destinations() -> frozenset[str]:
    configured = os.getenv("GEOCODER_ALLOWED_DESTINATIONS", "")
    if configured.strip():
        return frozenset(item.strip().upper() for item in configured.split(",") if item.strip())
    return DEFAULT_ALLOWED_DESTINATIONS


def _is_allowed_destination(destination: DestinationModel) -> bool:
    return _destination_code(destination) in _allowed_destinations()


def _destination_label(destination: DestinationModel) -> str:
    name = str(getattr(destination, "name", "")).strip()
    return name.split(" - ", 1)[0].strip() or name


def _viewbox(destination_coords: tuple[float, float], radius_km: float) -> str:
    """Return a LocationIQ/Nominatim viewbox around [longitude, latitude]."""
    longitude, latitude = destination_coords
    latitude_delta = radius_km / 111.32
    longitude_delta = radius_km / max(111.32 * abs(math.cos(math.radians(latitude))), 1.0)
    west = max(-180.0, longitude - longitude_delta)
    east = min(180.0, longitude + longitude_delta)
    south = max(-90.0, latitude - latitude_delta)
    north = min(90.0, latitude + latitude_delta)
    # Nominatim-compatible order: left, top, right, bottom.
    return f"{west:.6f},{north:.6f},{east:.6f},{south:.6f}"


def _request_params(service: ServiceModel, destination: DestinationModel, endpoint: str) -> dict[str, Any]:
    radius_km = float(os.getenv("GEOCODER_MAX_DISTANCE_KM", "90"))
    destination_coords = _coordinates(destination.coordinates)
    params: dict[str, Any] = {
        "q": f"{service.name}, {_destination_label(destination)}, Việt Nam",
        "format": os.getenv(
            "GEOCODER_FORMAT",
            "json" if "locationiq.com" in endpoint.lower() else "jsonv2",
        ),
        "limit": 3,
        "countrycodes": os.getenv("GEOCODER_COUNTRY_CODES", "vn"),
        "accept-language": "vi,en",
    }
    api_key = os.getenv("GEOCODER_API_KEY", "").strip()
    if api_key:
        params["key"] = api_key
    if destination_coords:
        params["viewbox"] = _viewbox(destination_coords, radius_km)
        params["bounded"] = 1
    return params


def geocode_service(client: httpx.Client, service: ServiceModel, destination: DestinationModel) -> dict[str, Any] | None:
    endpoint = os.getenv("GEOCODER_BASE_URL", "").rstrip("/")
    if not endpoint:
        raise RuntimeError("GEOCODER_BASE_URL must point to a Nominatim-compatible /search endpoint")
    if not _is_allowed_destination(destination):
        return None
    if "locationiq.com" in endpoint.lower() and not os.getenv("GEOCODER_API_KEY", "").strip():
        raise RuntimeError("GEOCODER_API_KEY is required when using LocationIQ")
    destination_coords = _coordinates(destination.coordinates)
    response = client.get(endpoint, params=_request_params(service, destination, endpoint))
    response.raise_for_status()
    results = response.json()
    if not isinstance(results, list) or not results:
        return None
    candidates = []
    for result in results:
        try:
            coords = (float(result["lon"]), float(result["lat"]))
        except (KeyError, TypeError, ValueError):
            continue
        distance = _distance_km(destination_coords, coords) if destination_coords else 0
        if distance <= float(os.getenv("GEOCODER_MAX_DISTANCE_KM", "90")):
            importance = float(result.get("importance") or 0)
            candidates.append((importance, -distance, result, coords))
    if not candidates:
        return None
    _, _, result, coords = max(candidates, key=lambda item: (item[0], item[1]))
    confidence = max(0.0, min(1.0, float(result.get("importance") or 0)))
    return {
        "coordinates": list(coords),
        "confidence": confidence,
        "address": result.get("display_name", ""),
        "status": "auto_verified" if confidence >= 0.55 else "review_required",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="write accepted results to the database")
    parser.add_argument("--limit", type=int, default=0, help="process at most N services")
    parser.add_argument(
        "--force",
        action="store_true",
        help="re-geocode existing non-verified coordinates (admin verified rows are preserved)",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        query = db.query(ServiceModel, DestinationModel).join(
            DestinationModel,
            or_(ServiceModel.destination_id == DestinationModel.id, ServiceModel.destination_id == DestinationModel.code),
        )
        if not args.force:
            # SQLite stores SQLAlchemy JSON ``None`` as the JSON text ``null``.
            # Pending/failed status therefore acts as the portable missing-
            # coordinate predicate while the explicit NULL check covers
            # PostgreSQL and older schemas.
            query = query.filter(
                or_(
                    ServiceModel.coordinates.is_(None),
                    ServiceModel.geocoding_status.is_(None),
                    ServiceModel.geocoding_status.in_(("pending", "failed")),
                )
            )
        else:
            query = query.filter(
                or_(
                    ServiceModel.geocoding_status.is_(None),
                    ServiceModel.geocoding_status != "verified",
                )
            )
        rows = query.limit(args.limit).all() if args.limit else query.all()
        rows = [(service, destination) for service, destination in rows if _is_allowed_destination(destination)]
        print(f"Geocoding {len(rows)} services in {','.join(sorted(_allowed_destinations()))}")
        user_agent = os.getenv("GEOCODER_USER_AGENT", "TripBuddy/1.0 (contact: admin@example.com)")
        with httpx.Client(timeout=10, headers={"User-Agent": user_agent}) as client:
            for service, destination in rows:
                try:
                    result = geocode_service(client, service, destination)
                    if result:
                        print(f"{service.id}: {result['status']} {result['coordinates']} {result['address']}")
                        if args.apply:
                            service.coordinates = result["coordinates"]
                            service.geocoding_status = result["status"]
                            service.geocoding_confidence = result["confidence"]
                            service.geocoded_address = result["address"]
                            service.geocoded_at = datetime.now(timezone.utc)
                    else:
                        print(f"{service.id}: failed")
                        if args.apply:
                            if args.force:
                                service.coordinates = None
                            service.geocoding_status = "failed"
                except (httpx.HTTPError, RuntimeError, ValueError) as error:
                    print(f"{service.id}: error {error}")
                    if args.apply and args.force:
                        service.coordinates = None
                        service.geocoding_status = "failed"
                # Respect public geocoder limits when a developer explicitly
                # chooses one; production providers may set this to 0.
                time.sleep(float(os.getenv("GEOCODER_DELAY_SECONDS", "1")))
            if args.apply:
                db.commit()
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
