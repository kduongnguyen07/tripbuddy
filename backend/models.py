"""SQLAlchemy Models for PostgreSQL / Database storage."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from sqlalchemy import Column, Float, Integer, String, Text, DateTime, JSON
from backend.database import Base


class DestinationModel(Base):
    __tablename__ = "destinations"

    id = Column(String(50), primary_key=True, index=True) # e.g. 'ha-noi'
    code = Column(String(20), index=True) # e.g. 'HAN'
    name = Column(String(100), nullable=False) # e.g. 'Hà Nội'
    region = Column(String(50), nullable=False) # e.g. 'Miền Bắc'
    category_type = Column(String(50), default="city") # e.g. 'city', 'beach'
    tags = Column(JSON, default=list) # e.g. ["city", "culture"]
    coordinates = Column(JSON, default=list) # e.g. [105.8542, 21.0285]
    hero_image = Column(Text, nullable=True)
    gallery_images = Column(JSON, default=list)
    satisfaction_scores = Column(JSON, default=dict)
    activities = Column(JSON, default=list)
    travel_tips = Column(JSON, default=list)
    description = Column(Text, nullable=True)
    minimum_two_day_cost_vnd = Column(Integer, default=1500000)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def as_dict(self):
        scores = self.satisfaction_scores
        if isinstance(scores, str):
            try:
                scores = json.loads(scores)
            except Exception:
                scores = {}
        if not scores or not isinstance(scores, dict):
            scores = {"stay": 9.0, "food": 9.2, "transport": 8.8, "activities": 9.5}

        gallery = self.gallery_images
        if isinstance(gallery, str):
            try:
                gallery = json.loads(gallery)
            except Exception:
                gallery = []
        if not gallery or not isinstance(gallery, list):
            gallery = [self.hero_image] if self.hero_image else []

        acts = self.activities
        if isinstance(acts, str):
            try:
                acts = json.loads(acts)
            except Exception:
                acts = []
        if not isinstance(acts, list):
            acts = []

        tips = self.travel_tips
        if isinstance(tips, str):
            try:
                tips = json.loads(tips)
            except Exception:
                tips = []
        if not isinstance(tips, list):
            tips = []

        return {
            "id": self.id,
            "code": self.code or self.id.upper(),
            "name": self.name,
            "region": self.region,
            "category_type": self.category_type,
            "tags": self.tags if isinstance(self.tags, list) else json.loads(self.tags or "[]"),
            "coordinates": self.coordinates if isinstance(self.coordinates, list) else json.loads(self.coordinates or "[105.8542, 21.0285]"),
            "hero_image": self.hero_image or "",
            "gallery_images": gallery,
            "satisfaction_scores": scores,
            "activities": acts,
            "travel_tips": tips,
            "description": self.description or "",
            "minimum_two_day_cost_vnd": self.minimum_two_day_cost_vnd or 1500000,
        }



class ServiceModel(Base):
    __tablename__ = "services"

    id = Column(String(100), primary_key=True, index=True) # e.g. 'SRV_HAN_005'
    destination_id = Column(String(50), index=True, nullable=False) # e.g. 'HAN' or 'ha-noi'
    category = Column(String(50), index=True, nullable=False) # accommodation, food, activity
    sub_category = Column(String(50), index=True, nullable=False) # hotel, resort, restaurant...
    name = Column(String(255), nullable=False)
    price = Column(Float, nullable=False, default=0.0) # Price in VND
    rating = Column(Float, default=4.5)
    duration_mins = Column(Integer, default=60)
    tags = Column(JSON, default=list)
    image_url = Column(Text, nullable=True)
    booking_url = Column(Text, nullable=True)
    meal_type = Column(String(100), default="breakfast,lunch,dinner")
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def as_dict(self):
        return {
            "id": self.id,
            "destination_id": self.destination_id,
            "category": self.category,
            "sub_category": self.sub_category,
            "name": self.name,
            "price": self.price,
            "rating": self.rating,
            "duration_mins": self.duration_mins,
            "tags": self.tags if isinstance(self.tags, list) else json.loads(self.tags or "[]"),
            "image_url": self.image_url or "",
            "booking_url": self.booking_url or "",
            "meal_type": self.meal_type or "breakfast,lunch,dinner",
        }



class SavedPlanModel(Base):
    __tablename__ = "saved_plans"

    id = Column(String(100), primary_key=True, index=True)
    destination_id = Column(String(50), index=True)
    total_budget = Column(Float, nullable=False)
    people = Column(Integer, default=2)
    num_days = Column(Integer, default=3)
    plan_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def as_dict(self):
        return {
            "id": self.id,
            "destination_id": self.destination_id,
            "total_budget": self.total_budget,
            "people": self.people,
            "num_days": self.num_days,
            "plan_data": self.plan_data if isinstance(self.plan_data, dict) else json.loads(self.plan_data or "{}"),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SlideModel(Base):
    __tablename__ = "slides"

    id = Column(String(100), primary_key=True, index=True)
    category = Column(String(200), nullable=False)
    title = Column(String(200), nullable=False)
    titleHighlight = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    image = Column(Text, nullable=False)
    imageCaptionTitle = Column(String(200), nullable=True)
    imageCaptionSub = Column(String(200), nullable=True)
    features = Column(JSON, default=list)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def as_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "title": self.title,
            "titleHighlight": self.titleHighlight,
            "description": self.description,
            "image": self.image,
            "imageCaptionTitle": self.imageCaptionTitle or "",
            "imageCaptionSub": self.imageCaptionSub or "",
            "features": self.features if isinstance(self.features, list) else json.loads(self.features or "[]"),
        }


class SiteConfigModel(Base):
    __tablename__ = "site_config"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def as_dict(self):
        return {
            "key": self.key,
            "value": self.value if isinstance(self.value, (dict, list)) else json.loads(self.value or "{}"),
        }


