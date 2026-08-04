from __future__ import annotations

from typing import Any, Iterable


import pulp

from backend.catalog import CatalogRepository, Service
from backend.distance import (
    annotate_event_distances,
    coordinates,
    estimated_distance_km,
    haversine_distance_km,
)
from backend.schemas import (
    ApplySwapRequest,
    GeneratePlanRequest,
    PlanSelection,
    PlanState,
    Preferences,
    Priorities,
    RecommendDestinationsRequest,
    SwapOptionsRequest,
    TripCriteria,
)


PRIORITY_WEIGHTS = {"none": 0.5, "normal": 1.0, "important": 1.5, "very_important": 2.0}
MEAL_SLOTS = ("breakfast", "lunch", "dinner")
ACTIVITY_SLOTS = ("morning", "afternoon", "evening")
SLOT_TIMES = {
    "overnight": ("14:00", "08:00"),
    "breakfast": ("08:00", "09:00"),
    "morning": ("09:30", "12:00"),
    "lunch": ("12:00", "13:00"),
    "afternoon": ("14:00", "17:00"),
    "dinner": ("19:00", "20:30"),
    "evening": ("20:30", "22:30"),
}
SLOT_DURATIONS_HOURS = {
    "breakfast": 1.0,
    "morning": 2.5,
    "lunch": 1.0,
    "afternoon": 3.0,
    "dinner": 1.5,
    "evening": 2.0,
}


class PlanInfeasible(Exception):
    def __init__(self, minimum_cost: int, total_budget: int, reason: str = "minimum_cost"):
        self.minimum_cost = minimum_cost
        self.total_budget = total_budget
        self.reason = reason

    def response(self, catalog: CatalogRepository) -> dict[str, Any]:
        messages = {
            "minimum_cost": "Ngân sách hiện tại không đủ để xây dựng lịch trình phù hợp. Vui lòng tăng ngân sách hoặc rút ngắn thời gian chuyến đi.",
            "no_matching_accommodation": "Không có nơi ở phù hợp với sở thích đã chọn cho chuyến đi này.",
            "no_matching_meals": "Không đủ lựa chọn bữa sáng, trưa hoặc tối phù hợp với sở thích đã chọn.",
            "no_matching_activities": "Không đủ hoạt động phù hợp, không lặp lại để xếp cho toàn bộ số ngày đã chọn.",
            "no_feasible_schedule": "Không thể xếp lịch thỏa đồng thời ngân sách, các bữa ăn và hoạt động không trùng khung giờ.",
        }
        return {
            "status": "infeasible",
            "reason": self.reason,
            "minimum_cost_vnd": self.minimum_cost,
            "shortfall_vnd": max(0, self.minimum_cost - self.total_budget),
            **catalog_metadata(catalog),
            "message": messages.get(self.reason, "Không thể xây dựng lịch trình với các điều kiện đã chọn."),
        }


def catalog_metadata(catalog: CatalogRepository) -> dict[str, str]:
    return {
        "data_version": catalog.version,
        "data_source": catalog.metadata["source"],
        "data_updated_at": catalog.metadata["updated_at"],
    }


def _tags_for(category: str, preferences: Preferences) -> set[str]:
    values = {
        "stay": preferences.lodging_styles,
        "food": preferences.food_styles,
        "activity": preferences.activity_styles,
    }[category]
    return {value.casefold() for value in values}


def _filter_services(services: Iterable[Service], category: str, preferences: Preferences) -> list[Service]:
    requested_tags = _tags_for(category, preferences)
    values = list(services)
    if not requested_tags:
        return values
    matched = [service for service in values if requested_tags.intersection(tag.casefold() for tag in service.tags)]
    # Older catalog rows use translated/category-specific tags (for example
    # ``luxury`` instead of ``hotel``). Keep planning usable when a requested
    # label has no exact representation in the current catalog.
    return matched or values


def _service_fits_slot(service: Service, slot: str) -> bool:
    """A service must belong to its assigned fixed slot and fit inside it."""
    if service.time_window != slot:
        return False
    maximum_duration = SLOT_DURATIONS_HOURS.get(slot)
    return maximum_duration is None or service.duration_hours <= maximum_duration


def _eligible_services(
    catalog: CatalogRepository, destination_id: str, category: str, preferences: Preferences,
) -> list[Service]:
    return [
        service
        for service in _filter_services(catalog.services_for(destination_id, category), category, preferences)
        if service.category == "stay" or _service_fits_slot(service, service.time_window)
    ]


def _priority(category: str, priorities: Priorities) -> float:
    return PRIORITY_WEIGHTS[getattr(priorities, category).value]


def _minimum_cost(criteria: TripCriteria, catalog: CatalogRepository, destination_id: str) -> int:
    nights = max(0, criteria.num_days - 1)
    stay = _eligible_services(catalog, destination_id, "stay", criteria.preferences)
    food = _eligible_services(catalog, destination_id, "food", criteria.preferences)
    activities = _eligible_services(catalog, destination_id, "activity", criteria.preferences)
    food_by_slot = {slot: [item for item in food if item.time_window == slot] for slot in MEAL_SLOTS}
    if nights and not stay:
        raise PlanInfeasible(criteria.total_budget, criteria.total_budget, "no_matching_accommodation")
    if any(not options for options in food_by_slot.values()):
        raise PlanInfeasible(criteria.total_budget, criteria.total_budget, "no_matching_meals")
    lodging_cost = min(item.cost_for_group(criteria.people, nights) for item in stay) if nights else 0
    meals_cost = criteria.num_days * sum(
        min(item.cost_for_group(criteria.people) for item in food_by_slot[slot])
        for slot in MEAL_SLOTS
    )
    activity_cost = (
        sum(sorted(service.cost_for_group(criteria.people) for service in activities)[:criteria.num_days])
        if len(activities) >= criteria.num_days
        else criteria.num_days * min((item.cost_for_group(criteria.people) for item in activities), default=0)
    )
    return lodging_cost + meals_cost + activity_cost


def _validate_destination(catalog: CatalogRepository, destination_id: str) -> dict[str, Any]:
    destination = catalog.destination(destination_id)
    if not destination:
        raise ValueError("Unknown destination_id")
    return destination


def _make_state(request: GeneratePlanRequest, selections: list[PlanSelection], catalog: CatalogRepository) -> PlanState:
    return PlanState(
        destination_id=request.destination_id,
        total_budget=request.total_budget,
        people=request.people,
        num_days=request.num_days,
        priorities=request.priorities,
        preferences=request.preferences,
        selections=selections,
        catalog_version=catalog.version,
    )


def _distance_aware_improve(
    selections: list[PlanSelection],
    request: GeneratePlanRequest,
    catalog: CatalogRepository,
) -> list[PlanSelection]:
    """Apply a small deterministic local search after the LP solution.

    The LP remains responsible for hard budget/time constraints. For each
    selected meal/activity we compare eligible alternatives using a 70/30
    suitability-versus-distance score. This keeps the candidate space bounded
    while allowing the optimizer to choose a nearer service when quality is
    comparable. Straight-line distances are used consistently for proximity.
    """
    ordered_slots = {slot: index for index, slot in enumerate(MEAL_SLOTS + ACTIVITY_SLOTS)}
    updated = list(selections)
    nights = max(0, request.num_days - 1)
    current_total = sum(
        catalog.service(item.service_id).cost_for_group(request.people, nights if catalog.service(item.service_id).category == "stay" else 1)
        for item in updated
        if catalog.service(item.service_id)
    )

    def coordinates_for(selection: PlanSelection) -> tuple[float, float] | None:
        service = catalog.service(selection.service_id)
        return service.coordinates if service else None

    def travel_distance(first: tuple[float, float], second: tuple[float, float]) -> float:
        return haversine_distance_km(first, second)

    for index, selection in enumerate(list(updated)):
        current = catalog.service(selection.service_id)
        if not current or current.category == "stay" or not current.coordinates:
            continue
        if current.category == "activity" and len(_eligible_services(
            catalog, request.destination_id, "activity", request.preferences,
        )) < request.num_days:
            # The solver has already distributed repeated activities across
            # days. Do not undo that spacing during local distance tuning.
            continue
        candidates = [
            service for service in _eligible_services(catalog, request.destination_id, current.category, request.preferences)
            if service.id != current.id
            and service.time_window == selection.slot
            and service.coordinates
            and (current.category == "food" or service.id not in {item.service_id for item in updated if item != selection})
        ]
        if not candidates:
            continue

        same_day = sorted(
            [item for item in updated if item.day == selection.day and item.slot in ordered_slots],
            key=lambda item: ordered_slots.get(item.slot, 99),
        )
        position = next((pos for pos, item in enumerate(same_day) if item == selection), -1)
        previous_coords = coordinates_for(same_day[position - 1]) if position > 0 else None
        next_coords = coordinates_for(same_day[position + 1]) if position + 1 < len(same_day) else None

        def score(service: Service) -> float:
            quality = max(0.0, min(1.0, service.rating / 5.0))
            legs = []
            if previous_coords:
                legs.append(travel_distance(previous_coords, service.coordinates))
            if next_coords:
                legs.append(travel_distance(service.coordinates, next_coords))
            distance_km = sum(legs) if legs else 0
            proximity = 1.0 / (1.0 + distance_km / 5.0)
            return 0.7 * quality + 0.3 * proximity

        best = max(candidates, key=score)
        if score(best) <= score(current) + 0.015:
            continue
        old_cost = current.cost_for_group(request.people, nights if current.category == "stay" else 1)
        new_cost = best.cost_for_group(request.people, nights if best.category == "stay" else 1)
        if current_total - old_cost + new_cost > request.total_budget:
            continue
        updated[index] = PlanSelection(service_id=best.id, day=selection.day, slot=selection.slot)
        current_total = current_total - old_cost + new_cost
    return updated


def generate_plan(request: GeneratePlanRequest, catalog: CatalogRepository) -> dict[str, Any]:
    _validate_destination(catalog, request.destination_id)
    minimum_cost = _minimum_cost(request, catalog, request.destination_id)
    if minimum_cost > request.total_budget:
        raise PlanInfeasible(minimum_cost, request.total_budget)

    nights = max(0, request.num_days - 1)
    stay = _eligible_services(catalog, request.destination_id, "stay", request.preferences)
    food = _eligible_services(catalog, request.destination_id, "food", request.preferences)
    activities = _eligible_services(catalog, request.destination_id, "activity", request.preferences)
    problem = pulp.LpProblem("tripbuddy_plan", pulp.LpMaximize)
    variables: dict[tuple[str, int, str], pulp.LpVariable] = {}

    if nights:
        for index, service in enumerate(stay):
            variables[(service.id, 0, "overnight")] = pulp.LpVariable(f"stay_{index}", cat="Binary")
        problem += pulp.lpSum(variables[(service.id, 0, "overnight")] for service in stay) == 1

    for day in range(1, request.num_days + 1):
        for slot in MEAL_SLOTS:
            candidates = [service for service in food if service.time_window == slot]
            for index, service in enumerate(candidates):
                variables[(service.id, day, slot)] = pulp.LpVariable(f"food_{day}_{slot}_{index}", cat="Binary")
            problem += pulp.lpSum(variables[(service.id, day, slot)] for service in candidates) == 1
        for slot in ACTIVITY_SLOTS:
            candidates = [service for service in activities if service.time_window == slot]
            for index, service in enumerate(candidates):
                variables[(service.id, day, slot)] = pulp.LpVariable(f"activity_{day}_{slot}_{index}", cat="Binary")
            if candidates:
                problem += pulp.lpSum(variables[(service.id, day, slot)] for service in candidates) <= 1
        day_activity_variables = [
            variables[(service.id, day, slot)]
            for slot in ACTIVITY_SLOTS
            for service in activities
            if service.time_window == slot
        ]
        if day_activity_variables:
            problem += pulp.lpSum(day_activity_variables) >= 1

    if len(activities) >= request.num_days:
        # Keep activities unique whenever the catalogue has enough choices.
        for service in activities:
            service_vars = [variable for key, variable in variables.items() if key[0] == service.id]
            if service_vars:
                problem += pulp.lpSum(service_vars) <= 1
    elif len(activities) > 1:
        # With too few activities, reuse them in a round-robin-like cadence:
        # the same place cannot recur within the number of available choices.
        # This gives the largest possible minimum gap between repetitions.
        repeat_gap = len(activities)
        for service in activities:
            for earlier_day in range(1, request.num_days + 1):
                earlier_vars = [
                    variable
                    for key, variable in variables.items()
                    if key[0] == service.id and key[1] == earlier_day
                ]
                for later_day in range(earlier_day + 1, min(request.num_days + 1, earlier_day + repeat_gap)):
                    later_vars = [
                        variable
                        for key, variable in variables.items()
                        if key[0] == service.id and key[1] == later_day
                    ]
                    problem += pulp.lpSum(earlier_vars + later_vars) <= 1

    def variable_cost(key: tuple[str, int, str]) -> int:
        service = catalog.service(key[0])
        assert service
        return service.cost_for_group(request.people, nights if service.category == "stay" else 1)

    problem += pulp.lpSum(variable_cost(key) * variable for key, variable in variables.items()) <= request.total_budget

    def utility(key: tuple[str, int, str]) -> float:
        service = catalog.service(key[0])
        assert service
        return _priority(service.category, request.priorities) * service.rating

    problem += pulp.lpSum(utility(key) * variable for key, variable in variables.items())
    status = problem.solve(pulp.PULP_CBC_CMD(msg=False))
    if pulp.LpStatus[status] != "Optimal":
        raise PlanInfeasible(minimum_cost, request.total_budget, "no_feasible_schedule")

    selections = [
        PlanSelection(service_id=service_id, day=day, slot=slot)
        for (service_id, day, slot), variable in variables.items()
        if float(variable.value() or 0) > 0.5
    ]
    selections = _distance_aware_improve(selections, request, catalog)
    return materialize_plan(_make_state(request, selections, catalog), catalog)


def _selection_cost(selection: PlanSelection, state: PlanState, catalog: CatalogRepository) -> int:
    service = catalog.service(selection.service_id)
    if not service:
        raise ValueError("Unknown service in plan_state")
    if service.destination_id != state.destination_id:
        raise ValueError("Service belongs to a different destination")
    nights = max(0, state.num_days - 1)
    return service.cost_for_group(state.people, nights if service.category == "stay" else 1)


def _validate_state(state: PlanState, catalog: CatalogRepository) -> None:
    _validate_destination(catalog, state.destination_id)
    if state.catalog_version != catalog.version:
        raise ValueError("Catalog version has changed; generate the plan again")
    seen_slots: set[tuple[int, str]] = set()
    intervals_by_day: dict[int, list[tuple[float, float]]] = {}
    accommodation_selections: list[PlanSelection] = []
    for selection in state.selections:
        service = catalog.service(selection.service_id)
        if not service or service.destination_id != state.destination_id:
            raise ValueError("Invalid plan_state selection")

        if service.category == "stay":
            if selection.slot != "overnight" or selection.day != 0:
                raise ValueError("Accommodation must use the overnight slot with day 0")
            if service.time_window != selection.slot:
                raise ValueError("Invalid accommodation selection")
            accommodation_selections.append(selection)
            continue

        if not 1 <= selection.day <= state.num_days:
            raise ValueError("Invalid plan_state day")
        if service.category == "food":
            if selection.slot not in MEAL_SLOTS:
                raise ValueError("Food must use a meal slot")
        elif service.category == "activity":
            if selection.slot not in ACTIVITY_SLOTS:
                raise ValueError("Activities must use an activity slot")
        else:
            raise ValueError("Unsupported service category")

        if service.time_window != selection.slot:
            raise ValueError("Invalid plan_state selection")
        if selection.slot in MEAL_SLOTS + ACTIVITY_SLOTS:
            if not _service_fits_slot(service, selection.slot):
                raise ValueError("Service duration does not fit its scheduled slot")
            marker = (selection.day, selection.slot)
            if marker in seen_slots:
                raise ValueError("Overlapping selections are not allowed")
            seen_slots.add(marker)
            start_time, _ = SLOT_TIMES[selection.slot]
            start_hour, start_minute = (int(part) for part in start_time.split(":"))
            interval_start = start_hour + start_minute / 60
            interval_end = interval_start + service.duration_hours
            for existing_start, existing_end in intervals_by_day.setdefault(selection.day, []):
                if interval_start < existing_end and existing_start < interval_end:
                    raise ValueError("Overlapping selections are not allowed")
            intervals_by_day[selection.day].append((interval_start, interval_end))
    if len(accommodation_selections) != (1 if state.num_days > 1 else 0):
        raise ValueError("Invalid accommodation selection")
    for day in range(1, state.num_days + 1):
        if {item.slot for item in state.selections if item.day == day}.issuperset(MEAL_SLOTS) is False:
            raise ValueError("Every day must contain three meals")
        if not any(item.day == day and item.slot in ACTIVITY_SLOTS for item in state.selections):
            raise ValueError("Every day must contain an activity")
    if sum(_selection_cost(item, state, catalog) for item in state.selections) > state.total_budget:
        raise ValueError("Plan exceeds total budget")


def _end_time(start_time: str, duration_hours: float) -> str:
    start_hour, start_minute = (int(part) for part in start_time.split(":"))
    end_minutes = round((start_hour * 60 + start_minute) + duration_hours * 60)
    return f"{(end_minutes // 60) % 24:02d}:{end_minutes % 60:02d}"


def materialize_plan(state: PlanState, catalog: CatalogRepository) -> dict[str, Any]:
    _validate_state(state, catalog)
    destination = _validate_destination(catalog, state.destination_id)
    nights = max(0, state.num_days - 1)
    totals = {"stay": 0, "food": 0, "activity": 0}
    daily_events: dict[int, list[dict[str, Any]]] = {day: [] for day in range(1, state.num_days + 1)}
    lodging: Service | None = None

    for selection in state.selections:
        service = catalog.service(selection.service_id)
        assert service
        cost = _selection_cost(selection, state, catalog)
        totals[service.category] += cost
        if service.category == "stay":
            lodging = service
            continue
        start_time, _ = SLOT_TIMES[selection.slot]
        end_time = _end_time(start_time, service.duration_hours)
        daily_events[selection.day].append({
            **service.as_dict(state.people),
            "day": selection.day,
            "slot": selection.slot,
            "start_time": start_time,
            "end_time": end_time,
            "total_cost_vnd": cost,
        })

    timeline = []
    stay_per_night, stay_remainder = divmod(totals["stay"], nights) if nights else (0, 0)
    for day in range(1, state.num_days + 1):
        stay_cost_for_day = stay_per_night + (1 if day <= stay_remainder else 0) if day <= nights else 0
        if lodging and day <= nights:
            start_time, end_time = SLOT_TIMES["overnight"]
            daily_events[day].append({
                **lodging.as_dict(state.people),
                "day": day,
                "slot": "overnight",
                "start_time": start_time,
                "end_time": end_time,
                "total_cost_vnd": stay_cost_for_day,
                "display_cost_vnd": stay_cost_for_day,
            })
        events = annotate_event_distances(daily_events[day])
        daily_costs = {
            "stay": stay_cost_for_day,
            "food": sum(event["total_cost_vnd"] for event in events if event["category"] == "food"),
            "activity": sum(event["total_cost_vnd"] for event in events if event["category"] == "activity"),
        }
        timeline.append({"day": day, "events": events, "costs": daily_costs, "total_cost_vnd": sum(daily_costs.values())})

    allocated = sum(totals.values())
    return {
        "status": "success",
        "destination": destination,
        "trip": {"people": state.people, "num_days": state.num_days, "nights": nights},
        "budget": {
            "total_vnd": state.total_budget,
            "allocated_vnd": allocated,
            "remaining_vnd": state.total_budget - allocated,
            "per_person_vnd": round(allocated / state.people),
            "allocations": {key: {"amount_vnd": value, "percentage": round(value / allocated * 100, 1) if allocated else 0} for key, value in totals.items()},
        },
        "daily_itinerary": timeline,
        "plan_state": state.model_dump(mode="json"),
        **catalog_metadata(catalog),
    }


def recommend_destinations(request: RecommendDestinationsRequest, catalog: CatalogRepository) -> dict[str, Any]:
    recommendations = []
    for destination in catalog.destinations():
        try:
            minimum = _minimum_cost(request, catalog, destination["id"])
        except PlanInfeasible:
            continue
        if minimum <= request.total_budget:
            recommendations.append({
                "destination": destination,
                "estimated_minimum_cost_vnd": minimum,
                "remaining_vnd": request.total_budget - minimum,
                "fit_score": round(min(100, 100 * (request.total_budget - minimum) / request.total_budget + 40), 1),
            })
    recommendations.sort(key=lambda item: (-item["fit_score"], item["estimated_minimum_cost_vnd"]))
    return {"status": "success", "recommendations": recommendations[:request.limit], **catalog_metadata(catalog)}


def _find_target(state: PlanState, target: PlanSelection) -> PlanSelection:
    match = next((selection for selection in state.selections if selection == target), None)
    if not match:
        raise ValueError("Target is not part of plan_state")
    return match


def _previous_event_coordinates(
    state: PlanState,
    target: PlanSelection,
    catalog: CatalogRepository,
) -> tuple[bool, tuple[float, float] | None]:
    """Find the card immediately before a swappable item in its visible day."""
    # Accommodation is rendered as the first card of each applicable day.
    if target.day <= 0 or target.slot == "overnight":
        return False, None

    materialized = materialize_plan(state, catalog)
    day_plan = next(
        (item for item in materialized.get("daily_itinerary", []) if item.get("day") == target.day),
        None,
    )
    if not day_plan:
        return False, None

    events = day_plan.get("events", [])
    target_index = next(
        (
            index
            for index, event in enumerate(events)
            if event.get("id") == target.service_id and event.get("slot") == target.slot
        ),
        -1,
    )
    if target_index <= 0:
        return False, None
    return True, coordinates(events[target_index - 1].get("coordinates"))


def swap_options(request: SwapOptionsRequest, catalog: CatalogRepository) -> dict[str, Any]:
    state = request.plan_state
    _validate_state(state, catalog)
    target = _find_target(state, request.target)
    current = catalog.service(target.service_id)
    assert current
    current_total = sum(_selection_cost(item, state, catalog) for item in state.selections)
    target_cost = _selection_cost(target, state, catalog)
    has_previous_event, previous_coordinates = _previous_event_coordinates(state, target, catalog)
    candidates = []
    for service in _eligible_services(catalog, state.destination_id, current.category, state.preferences):
        if service.id == current.id or service.category != current.category or service.time_window != target.slot:
            continue
        replacement_cost = service.cost_for_group(state.people, max(0, state.num_days - 1) if service.category == "stay" else 1)
        if current_total - target_cost + replacement_cost <= state.total_budget:
            candidate = service.as_dict(state.people, max(0, state.num_days - 1) if service.category == "stay" else 1)
            if has_previous_event:
                candidate["distance_from_previous_km"] = estimated_distance_km(
                    previous_coordinates,
                    service.coordinates,
                )
            candidates.append(candidate)
    candidates.sort(key=lambda item: (-item["rating"], item["total_cost_vnd"]))
    return {"status": "success", "target": target.model_dump(), "alternatives": candidates[:5], **catalog_metadata(catalog)}


def apply_swap(request: ApplySwapRequest, catalog: CatalogRepository) -> dict[str, Any]:
    state = request.plan_state
    options = swap_options(SwapOptionsRequest(plan_state=state, target=request.target), catalog)
    if request.replacement_service_id not in {item["id"] for item in options["alternatives"]}:
        raise ValueError("Replacement is not an eligible alternative")
    selections = [
        PlanSelection(service_id=request.replacement_service_id, day=item.day, slot=item.slot) if item == request.target else item
        for item in state.selections
    ]
    updated = state.model_copy(update={"selections": selections})
    return materialize_plan(updated, catalog)


def get_similar_destinations(destination_id: str, catalog: CatalogRepository, limit: int = 3) -> dict[str, Any]:
    target = catalog.destination(destination_id)
    if not target:
        raise ValueError("Unknown destination_id")

    target_tags = set(tag.casefold() for tag in target.get("tags", []))
    target_type = target.get("category_type", "")
    target_region = target.get("region", "")

    similarities = []
    for dest in catalog.destinations():
        if dest["id"] == destination_id:
            continue
        dest_tags = set(tag.casefold() for tag in dest.get("tags", []))
        intersection = target_tags.intersection(dest_tags)
        union = target_tags.union(dest_tags)

        jaccard = len(intersection) / len(union) if union else 0.0
        bonus = 0.0
        if dest.get("category_type") == target_type and target_type:
            bonus += 0.25
        if dest.get("region") == target_region and target_region:
            bonus += 0.1

        score = min(99.0, round((jaccard + bonus) * 100, 1))
        similarities.append({
            "destination": dest,
            "similarity_score": score,
            "matching_tags": sorted(list(intersection)),
            "reason": f"Chung {len(intersection)} đặc trưng ({', '.join(sorted(list(intersection))[:3])})",
        })

    similarities.sort(key=lambda item: (-item["similarity_score"], item["destination"]["name"]))
    return {
        "status": "success",
        "target_destination": target,
        "similar_destinations": similarities[:limit],
        **catalog_metadata(catalog),
    }

