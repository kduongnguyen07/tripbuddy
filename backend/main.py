from __future__ import annotations

import os
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
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
