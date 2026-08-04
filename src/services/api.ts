/**
 * API Service Wrapper
 * Uses Neon for catalogue reads and the FastAPI planning endpoints for
 * recommendations and itinerary operations.
 * Includes a robust fallback mechanism if backend server is unreachable.
 */

import {
  GeneratePlanRequest,
  RecommendDestinationsRequest,
  SwapOptionsRequest,
  ApplySwapRequest,
  MaterializedPlan,
  DestinationRecommendation,
  SwapOptionsResponse,
  Destination,
  SimilarDestinationResult,
  PlanServiceItem,
  PlanSelection,
  DailyItineraryDayPlan,
  DailyItineraryDayCosts,
} from '../types';

import {
  getDestinationsFromDb,
  getSimilarDestinationsDb,
  getServiceIllustrationImage,
} from './neonDb';
import { API_BASE_URL } from '../config/apiConfig';
import destinationsData from '../data/destinationsData.json';

async function planningRequest<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail || payload?.message || `Planning API failed (${response.status})`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return normalizePlanningImages(payload) as T;
}

function normalizePlanningImages(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const value = payload as Record<string, any>;
  const addFallback = (item: any) => ({
    ...item,
    image_url: item?.image_url || getServiceIllustrationImage(item || {}),
  });

  if (Array.isArray(value.daily_itinerary)) {
    value.daily_itinerary = value.daily_itinerary.map((day: any) => ({
      ...day,
      events: Array.isArray(day?.events) ? day.events.map(addFallback) : day?.events,
    }));
  }
  if (Array.isArray(value.alternatives)) {
    value.alternatives = value.alternatives.map(addFallback);
  }
  return value;
}

export async function fetchDestinationsApi(): Promise<Destination[]> {
  return getDestinationsFromDb();
}

export async function recommendDestinationsApi(
  req: RecommendDestinationsRequest
): Promise<DestinationRecommendation[]> {
  try {
    const response = await planningRequest<{ recommendations: DestinationRecommendation[] }>(
      '/destinations/recommend',
      req
    );
    return response.recommendations;
  } catch (err) {
    console.warn('Backend /destinations/recommend failed, using catalogue recommendations:', err);
    const dests = await getDestinationsFromDb();
    return dests.slice(0, 3).map((d) => ({
      destination: {
        id: d.id,
        name: d.name,
        region: d.region,
        coordinates: d.coordinates as [number, number],
        hero_image: d.hero_image,
      },
      estimated_minimum_cost_vnd: (d.minimum_two_day_cost_vnd || 1500000) * req.people,
      remaining_vnd: Math.max(0, req.total_budget - (d.minimum_two_day_cost_vnd || 1500000) * req.people),
      fit_score: 95,
    }));
  }
}

export async function getSimilarDestinationsApi(
  destinationId: string,
  limit: number = 3
): Promise<SimilarDestinationResult[]> {
  try {
    return await getSimilarDestinationsDb(destinationId, limit);
  } catch (err) {
    console.warn('getSimilarDestinationsDb fallback:', err);
    return [];
  }
}

async function generatePlanFallback(req: GeneratePlanRequest): Promise<MaterializedPlan> {
  let destinations: Destination[];
  try {
    destinations = await getDestinationsFromDb();
  } catch (err) {
    console.warn('Fallback plan is using bundled destination data:', err);
    destinations = destinationsData as unknown as Destination[];
  }
  const dest = destinations.find(
    (d) => d.id === req.destination_id || d.code === req.destination_id
  ) || destinations[0] || {
    id: req.destination_id || 'HAN',
    name: 'Hà Nội',
    region: 'Miền Bắc',
    coordinates: [105.8542, 21.0285] as [number, number],
    hero_image: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=1200&auto=format&fit=crop',
  };

  const nights = Math.max(0, req.num_days - 1);
  const stayShare = nights > 0 ? 0.35 : 0;
  const maxStayBudget = req.total_budget * stayShare;

  const lodgingPrice = Math.max(300000, Math.round((maxStayBudget / Math.max(1, nights * req.people)) / 10000) * 10000);
  const lodgingTotal = lodgingPrice * nights * req.people;

  const sampleLodgingItem: PlanServiceItem = {
    id: `SRV_${dest.id}_LODG_01`,
    destination_id: dest.id,
    category: 'stay',
    subtype: 'hotel',
    name: `Khách sạn cao cấp tại ${dest.name}`,
    price_vnd: lodgingPrice,
    price_unit: 'per_room',
    total_cost_vnd: lodgingTotal,
    capacity: 2,
    duration_hours: 24,
    time_window: 'overnight',
    rating: 4.8,
    tags: ['hotel', 'luxury'],
    image_url: dest.hero_image,
  };

  const dailyItinerary: DailyItineraryDayPlan[] = [];
  let foodTotal = 0;
  let actTotal = 0;
  const selections: PlanSelection[] = [];

  if (nights > 0) {
    selections.push({
      service_id: sampleLodgingItem.id,
      day: 0,
      slot: 'overnight',
    });
  }

  for (let day = 1; day <= req.num_days; day++) {
    const events: PlanServiceItem[] = [];
    
    // Breakfast
    const bCost = 60000 * req.people;
    foodTotal += bCost;
    const bItem: PlanServiceItem = {
      id: `SRV_${dest.id}_FOOD_B_${day}`,
      destination_id: dest.id,
      category: 'food',
      subtype: 'breakfast',
      name: `Thưởng thức ẩm thực sáng tại ${dest.name}`,
      price_vnd: 60000,
      price_unit: 'per_person',
      total_cost_vnd: bCost,
      capacity: 1,
      duration_hours: 1,
      time_window: 'breakfast',
      rating: 4.7,
      tags: ['food', 'breakfast'],
      image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
    };
    events.push(bItem);
    selections.push({ service_id: bItem.id, day, slot: 'breakfast' });

    // Morning Activity
    const mCost = 120000 * req.people;
    actTotal += mCost;
    const mItem: PlanServiceItem = {
      id: `SRV_${dest.id}_ACT_M_${day}`,
      destination_id: dest.id,
      category: 'activity',
      subtype: 'sightseeing',
      name: `Khám phá di sản & điểm đến nổi tiếng (Ngày ${day})`,
      price_vnd: 120000,
      price_unit: 'per_person',
      total_cost_vnd: mCost,
      capacity: 1,
      duration_hours: 2.5,
      time_window: 'morning',
      rating: 4.9,
      tags: ['activity', 'morning'],
      image_url: dest.hero_image,
    };
    events.push(mItem);
    selections.push({ service_id: mItem.id, day, slot: 'morning' });

    // Lunch
    const lCost = 150000 * req.people;
    foodTotal += lCost;
    const lItem: PlanServiceItem = {
      id: `SRV_${dest.id}_FOOD_L_${day}`,
      destination_id: dest.id,
      category: 'food',
      subtype: 'lunch',
      name: `Bữa trưa đặc sản địa phương (Ngày ${day})`,
      price_vnd: 150000,
      price_unit: 'per_person',
      total_cost_vnd: lCost,
      capacity: 1,
      duration_hours: 1.5,
      time_window: 'lunch',
      rating: 4.8,
      tags: ['food', 'lunch'],
      image_url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600',
    };
    events.push(lItem);
    selections.push({ service_id: lItem.id, day, slot: 'lunch' });

    // Afternoon Activity
    const aCost = 100000 * req.people;
    actTotal += aCost;
    const aItem: PlanServiceItem = {
      id: `SRV_${dest.id}_ACT_A_${day}`,
      destination_id: dest.id,
      category: 'activity',
      subtype: 'culture',
      name: `Trải nghiệm văn hóa & check-in chiều (Ngày ${day})`,
      price_vnd: 100000,
      price_unit: 'per_person',
      total_cost_vnd: aCost,
      capacity: 1,
      duration_hours: 2.5,
      time_window: 'afternoon',
      rating: 4.8,
      tags: ['activity', 'afternoon'],
      image_url: dest.hero_image,
    };
    events.push(aItem);
    selections.push({ service_id: aItem.id, day, slot: 'afternoon' });

    // Dinner
    const dCost = 200000 * req.people;
    foodTotal += dCost;
    const dItem: PlanServiceItem = {
      id: `SRV_${dest.id}_FOOD_D_${day}`,
      destination_id: dest.id,
      category: 'food',
      subtype: 'dinner',
      name: `Bữa tối ấm cúng & thưởng thức phong vị (Ngày ${day})`,
      price_vnd: 200000,
      price_unit: 'per_person',
      total_cost_vnd: dCost,
      capacity: 1,
      duration_hours: 1.5,
      time_window: 'dinner',
      rating: 4.9,
      tags: ['food', 'dinner'],
      image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
    };
    events.push(dItem);
    selections.push({ service_id: dItem.id, day, slot: 'dinner' });

    const dayCosts: DailyItineraryDayCosts = {
      stay: nights > 0 ? sampleLodgingItem.price_vnd * req.people : 0,
      food: bCost + lCost + dCost,
      activity: mCost + aCost,
    };

    dailyItinerary.push({
      day,
      events,
      costs: dayCosts,
      total_cost_vnd: dayCosts.stay + dayCosts.food + dayCosts.activity,
    });
  }

  const totalSpent = lodgingTotal + foodTotal + actTotal;
  const remaining = Math.max(0, req.total_budget - totalSpent);

  return {
    status: 'success',
    destination: {
      id: dest.id,
      name: dest.name,
      region: dest.region,
      coordinates: dest.coordinates as [number, number],
      hero_image: dest.hero_image,
    },
    trip: {
      people: req.people,
      num_days: req.num_days,
      nights,
    },
    budget: {
      total_vnd: req.total_budget,
      allocated_vnd: totalSpent,
      remaining_vnd: remaining,
      per_person_vnd: Math.round(totalSpent / req.people),
      allocations: {
        stay: { amount_vnd: lodgingTotal, percentage: Math.round((lodgingTotal / totalSpent) * 100) || 0 },
        food: { amount_vnd: foodTotal, percentage: Math.round((foodTotal / totalSpent) * 100) || 0 },
        activity: { amount_vnd: actTotal, percentage: Math.round((actTotal / totalSpent) * 100) || 0 },
      },
    },
    daily_itinerary: dailyItinerary,
    plan_state: {
      destination_id: dest.id,
      total_budget: req.total_budget,
      people: req.people,
      num_days: req.num_days,
      priorities: req.priorities || { pace: 'balanced', comfort: 'medium' },
      preferences: req.preferences || { stay_styles: [], food_styles: [], activity_styles: [] },
      selections,
      catalog_version: '1.0',
    },
    data_source: 'tripbuddy-fallback',
  };
}

export async function generatePlanApi(req: GeneratePlanRequest): Promise<MaterializedPlan> {
  try {
    return await planningRequest<MaterializedPlan>('/plans/generate', req);
  } catch (err) {
    console.warn('Backend planning API unreachable, using robust client plan generator:', err);
    return generatePlanFallback(req);
  }
}

export async function getSwapOptionsApi(req: SwapOptionsRequest): Promise<SwapOptionsResponse> {
  try {
    return await planningRequest<SwapOptionsResponse>('/plans/swap-options', req);
  } catch (err) {
    console.warn('getSwapOptionsApi fallback:', err);
    return { status: 'success', target: req.target, alternatives: [] };
  }
}

export async function applySwapApi(req: ApplySwapRequest): Promise<MaterializedPlan> {
  try {
    return await planningRequest<MaterializedPlan>('/plans/apply-swap', req);
  } catch (err) {
    console.warn('applySwapApi fallback:', err);
    return generatePlanFallback({
      destination_id: req.plan_state.destination_id || 'HAN',
      num_days: req.plan_state.num_days || 3,
      people: req.plan_state.people || 2,
      total_budget: req.plan_state.total_budget || 10000000,
      priorities: req.plan_state.priorities,
      preferences: req.plan_state.preferences,
    });
  }
}
