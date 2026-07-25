from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class PriorityLevel(str, Enum):
    none = "none"
    normal = "normal"
    important = "important"
    very_important = "very_important"


LodgingStyle = Literal["casual", "check_in", "luxury", "nature", "scenic_view", "street_food"]
FoodStyle = Literal[
    "asian_food", "casual", "fast_food", "fine_dining", "healthy",
    "local_specialty", "scenic_view", "seafood", "vegetarian", "western_food",
]
ActivityStyle = Literal[
    "check_in", "culture", "entertainment", "history", "nature",
    "scenic_view", "shopping", "street_food",
]
DestinationId = Literal["ha-noi", "hue", "da-nang", "da-lat", "phu-quoc"]


class Priorities(BaseModel):
    stay: PriorityLevel = PriorityLevel.normal
    food: PriorityLevel = PriorityLevel.normal
    activity: PriorityLevel = PriorityLevel.normal


class Preferences(BaseModel):
    lodging_styles: list[LodgingStyle] = Field(
        default_factory=list,
        max_length=5,
        description="Accepted values: casual, check_in, luxury, nature, scenic_view, street_food.",
    )
    food_styles: list[FoodStyle] = Field(
        default_factory=list,
        max_length=5,
        description="Accepted values: asian_food, casual, fast_food, fine_dining, healthy, local_specialty, scenic_view, seafood, vegetarian, western_food.",
    )
    activity_styles: list[ActivityStyle] = Field(
        default_factory=list,
        max_length=8,
        description="Accepted values: check_in, culture, entertainment, history, nature, scenic_view, shopping, street_food.",
    )


class TripCriteria(BaseModel):
    total_budget: int = Field(gt=0, description="Total group budget in VND")
    people: int = Field(ge=1, le=20)
    num_days: int = Field(ge=1, le=7)
    priorities: Priorities = Field(default_factory=Priorities)
    preferences: Preferences = Field(default_factory=Preferences)


class GeneratePlanRequest(TripCriteria):
    destination_id: DestinationId = Field(
        description="Accepted values: ha-noi, hue, da-nang, da-lat, phu-quoc."
    )


class RecommendDestinationsRequest(TripCriteria):
    limit: int = Field(default=5, ge=3, le=5)


class PlanSelection(BaseModel):
    service_id: str
    day: int = Field(ge=0, le=7)
    slot: str


class PlanState(BaseModel):
    destination_id: DestinationId = Field(
        description="Accepted values: ha-noi, hue, da-nang, da-lat, phu-quoc."
    )
    total_budget: int = Field(gt=0)
    people: int = Field(ge=1, le=20)
    num_days: int = Field(ge=1, le=7)
    priorities: Priorities
    preferences: Preferences
    selections: list[PlanSelection]
    catalog_version: str


class SwapOptionsRequest(BaseModel):
    plan_state: PlanState
    target: PlanSelection


class ApplySwapRequest(SwapOptionsRequest):
    replacement_service_id: str


class LegacyPreferences(BaseModel):
    stay: float = Field(default=1.0, ge=0.1, le=3.0)
    food: float = Field(default=1.0, ge=0.1, le=3.0)
    activities: float = Field(default=1.0, ge=0.1, le=3.0)


class LegacyOptimizeRequest(BaseModel):
    total_budget: int = Field(gt=0)
    num_days: int = Field(ge=1, le=7)
    destination_id: DestinationId = Field(
        description="Accepted values: ha-noi, hue, da-nang, da-lat, phu-quoc."
    )
    preferences: LegacyPreferences = Field(default_factory=LegacyPreferences)
