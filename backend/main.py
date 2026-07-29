from __future__ import annotations

import os
import uuid
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.catalog import CatalogRepository
from backend.database import get_db, engine, Base
from backend.models import DestinationModel, ServiceModel

from backend.planner import PlanInfeasible, apply_swap, generate_plan, get_similar_destinations, recommend_destinations, swap_options
from backend.schemas import (
    ApplySwapRequest,
    GeneratePlanRequest,
    RecommendDestinationsRequest,
    SwapOptionsRequest,
)
from backend.seed_db import seed_database

# Create DB tables automatically on server start
Base.metadata.create_all(bind=engine)


def get_catalog(db: Session = Depends(get_db)) -> CatalogRepository:
    return CatalogRepository(db=db)


def _allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


app = FastAPI(
    title="TripBudget Planning API",
    description="Planning API backed by PostgreSQL (Neon) Database.",
    version="3.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root(catalog: CatalogRepository = Depends(get_catalog)):
    return {"app": "TripBudget Planning API", "status": "online", "docs": "/docs", "data_version": catalog.version}


@app.get("/api/v1/destinations")
def get_destinations(catalog: CatalogRepository = Depends(get_catalog)):
    destinations = []
    for destination in catalog.destinations():
        stays = catalog.services_for(destination["id"], "stay")
        stay_cost = min((service.cost_for_group(1, 1) for service in stays), default=500000)
        
        foods = catalog.services_for(destination["id"], "food")
        b_meals = [s for s in foods if s.time_window == "breakfast"] or foods
        l_meals = [s for s in foods if s.time_window == "lunch"] or foods
        d_meals = [s for s in foods if s.time_window == "dinner"] or foods

        meals_cost = (
            min((s.cost_for_group(1) for s in b_meals), default=50000) +
            min((s.cost_for_group(1) for s in l_meals), default=80000) +
            min((s.cost_for_group(1) for s in d_meals), default=120000)
        )
        destinations.append({**destination, "minimum_two_day_cost_vnd": stay_cost + meals_cost * 2})
    return {
        "status": "success",
        "count": len(destinations),
        "destinations": destinations,
        "data_version": catalog.version,
        "data_source": catalog.metadata["source"],
        "data_updated_at": catalog.metadata["updated_at"],
    }


@app.post("/api/v1/destinations/recommend")
def recommend(request: RecommendDestinationsRequest, catalog: CatalogRepository = Depends(get_catalog)):
    return recommend_destinations(request, catalog)


@app.post("/api/v1/plans/generate")
def generate(request: GeneratePlanRequest, catalog: CatalogRepository = Depends(get_catalog)):
    try:
        return generate_plan(request, catalog)
    except PlanInfeasible as error:
        return error.response(catalog)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.post("/api/v1/plans/swap-options")
def get_swap_options(request: SwapOptionsRequest, catalog: CatalogRepository = Depends(get_catalog)):
    try:
        return swap_options(request, catalog)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/api/v1/plans/apply-swap")
def apply_plan_swap(request: ApplySwapRequest, catalog: CatalogRepository = Depends(get_catalog)):
    try:
        return apply_swap(request, catalog)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/api/v1/destinations/{destination_id}/similar")
def get_similar(destination_id: str, limit: int = 3, catalog: CatalogRepository = Depends(get_catalog)):
    try:
        return get_similar_destinations(destination_id, catalog, limit)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


# --- ONLINE POSTGRESQL / DATABASE API ENDPOINTS ---


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

    srv_id = service_data.get("id") or f"SRV_{target_dest.code}_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:6]}"
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
    dest_id = dest_data.get("id") or f"dest_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:6]}"
    db_dest = DestinationModel(
        id=dest_id,
        code=dest_data.get("code", dest_id.upper()),
        name=dest_data.get("name", "Điểm đến mới"),
        region=dest_data.get("region", "Miền Bắc"),
        category_type=dest_data.get("category_type", "city"),
        tags=dest_data.get("tags", []),
        coordinates=dest_data.get("coordinates", [105.85, 21.02]),
        hero_image=dest_data.get("hero_image", ""),
        gallery_images=dest_data.get("gallery_images", []),
        satisfaction_scores=dest_data.get("satisfaction_scores", {"stay": 9.0, "food": 9.0, "transport": 9.0, "activities": 9.0}),
        activities=dest_data.get("activities", []),
        description=dest_data.get("description", ""),
        minimum_two_day_cost_vnd=int(dest_data.get("minimum_two_day_cost_vnd", 1500000)),
    )
    db.merge(db_dest)
    db.commit()
    # ---- Persist to JSON dataset ----
    try:
        json_path = Path(__file__).parent / "tripbudget_full_dataset_500.json"
        if json_path.exists():
            with open(json_path, "r", encoding="utf-8") as f:
                dataset = json.load(f)
        else:
            dataset = []
        # Replace or append the destination entry
        existing_idx = next((i for i, d in enumerate(dataset) if d.get("id") == dest_id), None)
        dest_dict = {
            "id": dest_id,
            "code": db_dest.code,
            "name": db_dest.name,
            "region": db_dest.region,
            "category_type": db_dest.category_type,
            "tags": db_dest.tags,
            "coordinates": db_dest.coordinates,
            "hero_image": db_dest.hero_image,
            "gallery_images": db_dest.gallery_images,
            "satisfaction_scores": db_dest.satisfaction_scores,
            "activities": db_dest.activities,
            "description": db_dest.description,
            "minimum_two_day_cost_vnd": db_dest.minimum_two_day_cost_vnd,
        }
        if existing_idx is not None:
            dataset[existing_idx] = dest_dict
        else:
            dataset.append(dest_dict)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(dataset, f, ensure_ascii=False, indent=2)
    except Exception as e:
        # Log but do not fail the request
        print(f"[WARN] Failed to sync JSON dataset: {e}")
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
