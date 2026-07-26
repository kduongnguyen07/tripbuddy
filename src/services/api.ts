import {
  GeneratePlanRequest,
  RecommendDestinationsRequest,
  SwapOptionsRequest,
  ApplySwapRequest,
  MaterializedPlan,
  DestinationRecommendation,
  SwapOptionsResponse,
  Destination,
  DestinationId,
  PlanServiceItem,
} from '../types';
import destinationsData from '../data/destinationsData.json';
import fullDataset from '../../backend/tripbudget_full_dataset_500.json';
import { API_BASE_URL } from '../config/apiConfig';

const DEST_CODE_MAP: Record<string, string[]> = {
  'ha-noi': ['HAN'],
  hue: ['HUE'],
  'da-nang': ['DAD'],
  'da-lat': ['DLD', 'DLT'],
  'phu-quoc': ['PQC'],
  HAN: ['HAN'],
  HUE: ['HUE'],
  DAD: ['DAD'],
  DLD: ['DLD', 'DLT'],
  DLT: ['DLD', 'DLT'],
  PQC: ['PQC'],
};

function formatDatasetService(item: any, people: number, nights: number): PlanServiceItem {
  const isStay = item.category === 'accommodation' || item.category === 'stay';
  const priceVnd = Math.round(Number(item.price || 0) / 1000) * 1000;
  const totalCost = isStay ? priceVnd * Math.max(1, nights) : priceVnd * people;

  return {
    id: item.id,
    destination_id: item.destination_id,
    category: isStay ? 'stay' : item.category === 'food' ? 'food' : 'activity',
    subtype: item.sub_category || 'standard',
    name: item.name,
    price_vnd: priceVnd,
    price_unit: isStay ? 'per_room' : 'per_person',
    capacity: isStay ? 2 : 1,
    duration_hours: roundDuration(item.duration_mins || 60),
    time_window: isStay ? 'overnight' : 'anytime',
    rating: Number(item.rating || 4.5),
    tags: Array.isArray(item.tags) ? item.tags : [],
    image_url: item.image_url || '',
    affiliate_url: item.booking_url || '',
    total_cost_vnd: totalCost,
    day: 1,
    slot: 'morning',
  };
}

function roundDuration(mins: number): number {
  return Math.round((mins / 60) * 10) / 10;
}

function getFallbackPlan(req: GeneratePlanRequest): MaterializedPlan {
  const destList = destinationsData as unknown as Destination[];
  const dest = destList.find((d) => d.id === req.destination_id) || destList[0];
  const destCodes = DEST_CODE_MAP[req.destination_id] || ['HAN'];

  const destItems = (fullDataset as any[]).filter((item) => destCodes.includes(item.destination_id));

  const stays = destItems.filter((i) => i.category === 'accommodation' || i.category === 'stay');
  const foods = destItems.filter((i) => i.category === 'food');
  const acts = destItems.filter((i) => i.category === 'activity');

  const nights = Math.max(0, req.num_days - 1);

  const rawStay = stays.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0] || {
    id: `SRV_${destCodes[0]}_001`,
    destination_id: destCodes[0],
    category: 'accommodation',
    sub_category: 'hotel',
    name: `Khách sạn tại ${dest.name}`,
    price: 1200000,
    rating: 4.8,
    tags: ['hotel', 'luxury'],
  };

  const lodgingService = formatDatasetService(rawStay, req.people, nights);
  lodgingService.time_window = 'overnight';
  const stayCost = lodgingService.total_cost_vnd;

  const foodItemsFormatted = (foods.length > 0 ? foods : destItems).map((f) => formatDatasetService(f, req.people, nights));
  const actItemsFormatted = (acts.length > 0 ? acts : destItems).map((a) => formatDatasetService(a, req.people, nights));

  const selections: any[] = [];
  if (nights > 0) {
    selections.push({ service_id: lodgingService.id, day: 0, slot: 'overnight' });
  }

  let foodAllocated = 0;
  let actAllocated = 0;

  const dailyItinerary = Array.from({ length: req.num_days }, (_, idx) => {
    const dayNum = idx + 1;

    const bfast = foodItemsFormatted[idx % foodItemsFormatted.length] || foodItemsFormatted[0];
    const lunch = foodItemsFormatted[(idx + 1) % foodItemsFormatted.length] || foodItemsFormatted[0];
    const dinner = foodItemsFormatted[(idx + 2) % foodItemsFormatted.length] || foodItemsFormatted[0];

    const morningAct = actItemsFormatted[idx % actItemsFormatted.length] || actItemsFormatted[0];
    const afternoonAct = actItemsFormatted[(idx + 1) % actItemsFormatted.length] || actItemsFormatted[0];

    const dayStay = { ...lodgingService, day: dayNum, slot: 'overnight' };
    const bfastEv = { ...bfast, day: dayNum, slot: 'breakfast', start_time: '08:00', end_time: '09:00' };
    const morningEv = { ...morningAct, day: dayNum, slot: 'morning', start_time: '09:30', end_time: '12:00' };
    const lunchEv = { ...lunch, day: dayNum, slot: 'lunch', start_time: '12:00', end_time: '13:30' };
    const afternoonEv = { ...afternoonAct, day: dayNum, slot: 'afternoon', start_time: '14:00', end_time: '17:00' };
    const dinnerEv = { ...dinner, day: dayNum, slot: 'dinner', start_time: '19:00', end_time: '20:30' };

    selections.push({ service_id: bfastEv.id, day: dayNum, slot: 'breakfast' });
    selections.push({ service_id: morningEv.id, day: dayNum, slot: 'morning' });
    selections.push({ service_id: lunchEv.id, day: dayNum, slot: 'lunch' });
    selections.push({ service_id: afternoonEv.id, day: dayNum, slot: 'afternoon' });
    selections.push({ service_id: dinnerEv.id, day: dayNum, slot: 'dinner' });

    const dayFoodTotal = bfastEv.total_cost_vnd + lunchEv.total_cost_vnd + dinnerEv.total_cost_vnd;
    const dayActTotal = morningEv.total_cost_vnd + afternoonEv.total_cost_vnd;

    foodAllocated += dayFoodTotal;
    actAllocated += dayActTotal;

    return {
      day: dayNum,
      events: [dayStay, bfastEv, morningEv, lunchEv, afternoonEv, dinnerEv],
      costs: {
        stay: Math.round(stayCost / req.num_days),
        food: dayFoodTotal,
        activity: dayActTotal,
      },
      total_cost_vnd: Math.round(stayCost / req.num_days) + dayFoodTotal + dayActTotal,
    };
  });

  const totalAllocated = stayCost + foodAllocated + actAllocated;

  return {
    status: 'success',
    destination: {
      id: dest.id,
      name: dest.name,
      region: dest.region,
      coordinates: dest.coordinates || [105.85, 21.02],
      hero_image: dest.hero_image || '',
    },
    trip: { people: req.people, num_days: req.num_days, nights: nights },
    budget: {
      total_vnd: req.total_budget,
      allocated_vnd: totalAllocated,
      remaining_vnd: Math.max(0, req.total_budget - totalAllocated),
      per_person_vnd: Math.round(totalAllocated / req.people),
      allocations: {
        stay: { amount_vnd: stayCost, percentage: Math.round((stayCost / totalAllocated) * 100) },
        food: { amount_vnd: foodAllocated, percentage: Math.round((foodAllocated / totalAllocated) * 100) },
        activity: { amount_vnd: actAllocated, percentage: Math.round((actAllocated / totalAllocated) * 100) },
      },
    },
    daily_itinerary: dailyItinerary,
    plan_state: {
      destination_id: req.destination_id,
      total_budget: req.total_budget,
      people: req.people,
      num_days: req.num_days,
      priorities: req.priorities,
      preferences: req.preferences,
      selections: selections,
      catalog_version: 'v3.0_canonical_db',
    },
    data_version: 'v3.0_canonical_db',
  };
}

export async function fetchDestinationsApi(): Promise<Destination[]> {
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE_URL}/destinations`, { signal: controller.signal });
    clearTimeout(tId);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.destinations) && data.destinations.length > 0) {
        return data.destinations.map((d: any) => ({
          id: d.id,
          name: d.name,
          region: d.region,
          coordinates: d.coordinates || [105.8542, 21.0285],
          hero_image: d.hero_image,
          gallery_images: [d.hero_image],
          satisfaction_scores: d.satisfaction_scores || { stay: 9.0, food: 9.2, transport: 8.8, activities: 9.5 },
          activities: d.activities || [],
          minimum_two_day_cost_vnd: d.minimum_two_day_cost_vnd || 1200000,
        }));
      }
    }
  } catch (e) {
    console.warn('Backend /destinations offline, using static destinations:', e);
  }
  return destinationsData as unknown as Destination[];
}

export async function recommendDestinationsApi(
  req: RecommendDestinationsRequest
): Promise<DestinationRecommendation[]> {
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE_URL}/destinations/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    clearTimeout(tId);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        return data.recommendations;
      }
    }
  } catch (e) {
    console.warn('Backend /destinations/recommend offline, using fallback:', e);
  }

  const destList = destinationsData as unknown as Destination[];
  return destList.slice(0, req.limit || 4).map((d) => ({
    destination: {
      id: d.id,
      name: d.name,
      region: d.region,
      coordinates: d.coordinates || [105.85, 21.02],
      hero_image: d.hero_image || '',
    },
    estimated_minimum_cost_vnd: Math.round(req.total_budget * 0.7),
    remaining_vnd: Math.max(0, Math.round(req.total_budget * 0.3)),
    fit_score: 9.5,
  }));
}

export async function getSimilarDestinationsApi(
  destinationId: string,
  limit: number = 3
): Promise<import('../types').SimilarDestinationResult[]> {
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE_URL}/destinations/${destinationId}/similar?limit=${limit}`, { signal: controller.signal });
    clearTimeout(tId);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.similar_destinations) && data.similar_destinations.length > 0) {
        return data.similar_destinations.map((item: any) => ({
          destination: {
            id: item.destination.id,
            name: item.destination.name,
            region: item.destination.region,
            coordinates: item.destination.coordinates || [105.8, 21.0],
            hero_image: item.destination.hero_image,
            gallery_images: [item.destination.hero_image],
            satisfaction_scores: item.destination.satisfaction_scores || { stay: 9.0, food: 9.0, transport: 9.0, activities: 9.0 },
            activities: item.destination.activities || [],
          },
          similarity_score: item.similarity_score,
          matching_tags: item.matching_tags || [],
          reason: item.reason || 'Gợi ý tương tự theo đặc trưng',
        }));
      }
    }
  } catch (e) {
    console.warn('Backend /similar offline, using fallback:', e);
  }

  const destList = destinationsData as unknown as Destination[];
  return destList
    .filter((d) => d.id !== destinationId)
    .slice(0, limit)
    .map((d) => ({
      destination: d,
      similarity_score: 0.92,
      matching_tags: ['Văn Hóa', 'Cảnh Quan'],
      reason: 'Điểm đến tương đồng về phong cách & chi phí.',
    }));
}

export async function generatePlanApi(req: GeneratePlanRequest): Promise<MaterializedPlan> {
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${API_BASE_URL}/plans/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    clearTimeout(tId);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.status === 'success' || data.status === 'infeasible')) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Backend /plans/generate offline/timeout, using fast client planner fallback:', e);
  }
  return getFallbackPlan(req);
}

export async function getSwapOptionsApi(req: SwapOptionsRequest): Promise<SwapOptionsResponse> {
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE_URL}/plans/swap-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    clearTimeout(tId);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        return data;
      }
    }
  } catch (e) {
    console.warn('Backend /plans/swap-options offline:', e);
  }

  const destCodes = DEST_CODE_MAP[req.plan_state.destination_id] || ['HAN'];
  const candidates = (fullDataset as any[]).filter(
    (item) => destCodes.includes(item.destination_id) && item.id !== req.target.service_id
  );
  const formatted = candidates.slice(0, 5).map((c) => formatDatasetService(c, req.plan_state.people, req.plan_state.num_days - 1));

  return {
    status: 'success',
    target: req.target,
    alternatives: formatted,
  };
}

export async function applySwapApi(req: ApplySwapRequest): Promise<MaterializedPlan> {
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE_URL}/plans/apply-swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    clearTimeout(tId);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn('Backend /plans/apply-swap offline:', e);
  }

  return getFallbackPlan({
    destination_id: req.plan_state.destination_id,
    total_budget: req.plan_state.total_budget,
    people: req.plan_state.people,
    num_days: req.plan_state.num_days,
    priorities: req.plan_state.priorities || { stay: 'normal', food: 'important', activity: 'normal' },
    preferences: req.plan_state.preferences || { lodging_styles: [], food_styles: [], activity_styles: [] },
  });
}
