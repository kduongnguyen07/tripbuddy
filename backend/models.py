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
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def as_dict(self):
        return {
            "id": self.id,
            "code": self.code or self.id.upper(),
            "name": self.name,
            "region": self.region,
            "category_type": self.category_type,
            "tags": self.tags if isinstance(self.tags, list) else json.loads(self.tags or "[]"),
            "coordinates": self.coordinates if isinstance(self.coordinates, list) else json.loads(self.coordinates or "[105.85, 21.02]"),
            "hero_image": self.hero_image,
            "description": self.description,
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
