from backend.distance import (
    annotate_event_distances,
    estimated_distance_km,
    haversine_distance_km,
)


def _event(service_id, slot, start_time, coordinate_marker=...):
    event = {"id": service_id, "slot": slot, "start_time": start_time}
    if coordinate_marker is not ...:
        event["coordinates"] = coordinate_marker
    return event


def test_haversine_is_zero_for_the_same_coordinate():
    assert haversine_distance_km((105.8, 21.0), (105.8, 21.0)) == 0


def test_estimated_distance_normalizes_json_coordinates_and_missing_values():
    assert estimated_distance_km([105.8, 21.0], [105.81, 21.0]) == 1.0
    assert estimated_distance_km(None, [105.81, 21.0]) is None
    assert estimated_distance_km([float("nan"), 21.0], [105.81, 21.0]) is None


def test_daily_annotations_follow_visible_order_and_skip_the_first_card():
    events = [
        _event("breakfast", "breakfast", "08:00", [105.81, 21.0]),
        _event("hotel", "overnight", "14:00", [105.8, 21.0]),
        _event("morning", "morning", "09:30", [105.82, 21.0]),
    ]

    ordered = annotate_event_distances(events)

    assert [event["id"] for event in ordered] == ["hotel", "breakfast", "morning"]
    assert "distance_from_previous_km" not in ordered[0]
    assert ordered[1]["distance_from_previous_km"] == 1.0
    assert ordered[2]["distance_from_previous_km"] == 1.0


def test_missing_coordinate_marks_this_leg_and_the_following_leg_unknown():
    events = [
        _event("first", "breakfast", "08:00", [105.8, 21.0]),
        _event("missing", "morning", "09:30", None),
        _event("third", "lunch", "12:00", [105.82, 21.0]),
    ]

    ordered = annotate_event_distances(events)

    assert ordered[1]["distance_from_previous_km"] is None
    assert ordered[2]["distance_from_previous_km"] is None


def test_each_day_starts_a_new_distance_chain():
    first_day = annotate_event_distances([
        _event("day-1", "breakfast", "08:00", [105.8, 21.0]),
    ])
    second_day = annotate_event_distances([
        _event("day-2", "breakfast", "08:00", [105.9, 21.0]),
    ])

    assert "distance_from_previous_km" not in first_day[0]
    assert "distance_from_previous_km" not in second_day[0]
