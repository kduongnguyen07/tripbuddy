from __future__ import annotations

import os
from datetime import datetime
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.catalog import CatalogRepository
from backend.planner import PlanInfeasible, apply_swap, generate_plan, get_similar_destinations, recommend_destinations, swap_options
from backend.schemas import (
    ApplySwapRequest,
    GeneratePlanRequest,
    RecommendDestinationsRequest,
    SwapOptionsRequest,
)


@lru_cache
def get_catalog() -> CatalogRepository:
    return CatalogRepository()


def _allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


app = FastAPI(
    title="TripBudget Planning API",
    description="Mock-data itinerary planning API for Vietnam travel.",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    catalog = get_catalog()
    return {"app": "TripBudget Planning API", "status": "online", "docs": "/docs", "data_version": catalog.version}


@app.get("/api/v1/destinations")
def get_destinations():
    catalog = get_catalog()
    destinations = []
    for destination in catalog.destinations():
        # A 2-day, one-person estimate keeps this endpoint independent of a trip form.
        stay = min(service.cost_for_group(1, 1) for service in catalog.services_for(destination["id"], "stay"))
        meals = sum(
            min(service.cost_for_group(1) for service in catalog.services_for(destination["id"], "food") if service.time_window == slot)
            for slot in ("breakfast", "lunch", "dinner")
        )
        destinations.append({**destination, "minimum_two_day_cost_vnd": stay + meals * 2})
    return {
        "status": "success",
        "count": len(destinations),
        "destinations": destinations,
        "data_version": catalog.version,
        "data_source": catalog.metadata["source"],
        "data_updated_at": catalog.metadata["updated_at"],
    }


@app.post("/api/v1/destinations/recommend")
def recommend(request: RecommendDestinationsRequest):
    return recommend_destinations(request, get_catalog())


@app.post("/api/v1/plans/generate")
def generate(request: GeneratePlanRequest):
    catalog = get_catalog()
    try:
        return generate_plan(request, catalog)
    except PlanInfeasible as error:
        return error.response(catalog)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.post("/api/v1/plans/swap-options")
def get_swap_options(request: SwapOptionsRequest):
    try:
        return swap_options(request, get_catalog())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/api/v1/plans/apply-swap")
def apply_plan_swap(request: ApplySwapRequest):
    try:
        return apply_swap(request, get_catalog())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/v1/destinations/{destination_id}/similar")
def get_similar(destination_id: str, limit: int = 3):
    try:
        return get_similar_destinations(destination_id, get_catalog(), limit)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


# --- ONLINE POSTGRESQL / DATABASE API ENDPOINTS ---
from typing import Any
from fastapi import Depends
from sqlalchemy.orm import Session
from backend.database import get_db, engine, Base
from backend.models import DestinationModel, ServiceModel, SavedPlanModel
from backend.seed_db import seed_database

# Create DB tables automatically on server start
Base.metadata.create_all(bind=engine)


@app.get("/api/v1/db/services")
def get_db_services(destination_id: str | None = None, category: str | None = None, db: Session = Depends(get_db)):
    query = db.query(ServiceModel)
    if destination_id and destination_id != "ALL":
        query = query.filter(ServiceModel.destination_id == destination_id)
    if category and category != "ALL":
        query = query.filter(ServiceModel.category == category)
    services = query.all()
    return {"status": "success", "count": len(services), "services": [s.as_dict() for s in services]}


@app.post("/api/v1/db/services")
def create_or_update_db_service(service_data: dict[str, Any], db: Session = Depends(get_db)):
    dest_id = service_data.get("destination_id", "HAN")
    target_dest = db.query(DestinationModel).filter(
        (DestinationModel.id == dest_id) | (DestinationModel.code == dest_id.upper())
    ).first()
    if not target_dest:
        raise HTTPException(
            status_code=400,
            detail=f"Destination '{dest_id}' does not exist. Please specify a valid destination."
        )

    srv_id = service_data.get("id") or f"SRV_{target_dest.code}_{int(datetime.now().timestamp())}"
    db_srv = ServiceModel(
        id=srv_id,
        destination_id=target_dest.id,
        category=service_data.get("category", "activity"),
        sub_category=service_data.get("sub_category", "standard"),
        name=service_data.get("name", "Dịch vụ mới"),
        price=float(service_data.get("price", 0.0)),
        rating=float(service_data.get("rating", 4.5)),
        duration_mins=int(service_data.get("duration_mins", 60)),
        tags=service_data.get("tags", []),
        image_url=service_data.get("image_url", ""),
        booking_url=service_data.get("booking_url", ""),
    )
    db.merge(db_srv)
    db.commit()
    return {"status": "success", "service": db_srv.as_dict()}


@app.delete("/api/v1/db/services/{service_id}")
def delete_db_service(service_id: str, db: Session = Depends(get_db)):
    srv = db.query(ServiceModel).filter(ServiceModel.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(srv)
    db.commit()
    return {"status": "success", "message": f"Deleted service {service_id}"}


@app.post("/api/v1/db/seed")
def reseed_db():
    seed_database()
    return {"status": "success", "message": "Database reseeded successfully"}


@app.get("/api/v1/db/destinations")
def get_db_destinations(db: Session = Depends(get_db)):
    dests = db.query(DestinationModel).all()
    return {"status": "success", "count": len(dests), "destinations": [d.as_dict() for d in dests]}


@app.post("/api/v1/db/destinations")
def create_or_update_db_destination(dest_data: dict[str, Any], db: Session = Depends(get_db)):
    dest_id = dest_data.get("id") or f"dest_{int(datetime.now().timestamp())}"
    db_dest = DestinationModel(
        id=dest_id,
        code=dest_data.get("code", dest_id.upper()),
        name=dest_data.get("name", "Điểm đến mới"),
        region=dest_data.get("region", "Miền Bắc"),
        category_type=dest_data.get("category_type", "city"),
        tags=dest_data.get("tags", []),
        coordinates=dest_data.get("coordinates", [105.85, 21.02]),
        hero_image=dest_data.get("hero_image", ""),
        description=dest_data.get("description", ""),
    )
    db.merge(db_dest)
    db.commit()
    return {"status": "success", "destination": db_dest.as_dict()}


@app.delete("/api/v1/db/destinations/{dest_id}")
def delete_db_destination(dest_id: str, db: Session = Depends(get_db)):
    dests = db.query(DestinationModel).filter(
        (DestinationModel.id == dest_id) | (DestinationModel.id == dest_id.lower()) | (DestinationModel.code == dest_id.upper())
    ).all()
    for dest in dests:
        db.delete(dest)
        db.query(ServiceModel).filter(ServiceModel.destination_id == dest.id).delete()
    db.commit()
    return {"status": "success", "message": f"Deleted destination {dest_id}"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
