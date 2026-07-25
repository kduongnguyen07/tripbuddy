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

// Mapping destination_id slug to destination details
const DEST_ID_MAP: Record<string, DestinationId> = {
  'ha-noi': 'ha-noi',
  'hue': 'hue',
  'da-nang': 'da-nang',
  'da-lat': 'da-lat',
  'phu-quoc': 'phu-quoc',
  'HAN': 'ha-noi',
  'HUE': 'hue',
  'DAD': 'da-nang',
  'DLD': 'da-lat',
  'DLT': 'da-lat',
  'PQC': 'phu-quoc',
};

const DEST_CODE_MAP: Record<string, string[]> = {
  'ha-noi': ['HAN'],
  'hue': ['HUE'],
  'da-nang': ['DAD'],
  'da-lat': ['DLD', 'DLT'],
  'phu-quoc': ['PQC'],
  'HAN': ['HAN'],
  'HUE': ['HUE'],
  'DAD': ['DAD'],
  'DLD': ['DLD', 'DLT'],
  'DLT': ['DLD', 'DLT'],
  'PQC': ['PQC'],
};

function formatDatasetService(item: any, people: number, nights: number): PlanServiceItem {
  const isStay = item.category === 'accommodation';
  const isFood = item.category === 'food';
  const priceVnd = Math.round(Number(item.price) / 1000) * 1000;
  const totalCost = isStay ? priceVnd * Math.max(1, nights) : priceVnd * people;

  const tags = new Set<string>(item.tags || []);
  if (item.sub_category) {
    tags.add(item.sub_category);
    if (item.sub_category === 'hotel') {
      tags.add('khach_san');
      tags.add('hotel');
    } else if (item.sub_category === 'resort') {
      tags.add('resort');
      tags.add('nghi_duong');
    } else if (item.sub_category === 'homestay') {
      tags.add('homestay');
      tags.add('check_in');
    } else if (item.sub_category === 'villa') {
      tags.add('villa');
      tags.add('scenic_view');
    }
  }

  let img = item.image_url || '';
  if (!img || img.includes('tripbudget.vn')) {
    if (isStay) {
      img = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
    } else if (isFood) {
      img = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
    } else {
      img = 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80';
    }
  }

  return {
    id: item.id,
    destination_id: item.destination_id,
    category: isStay ? ('stay' as const) : isFood ? ('food' as const) : ('activity' as const),
    subtype: item.sub_category || 'standard',
    name: item.name,
    price_vnd: priceVnd,
    price_unit: isStay ? ('per_room' as const) : ('per_person' as const),
    total_cost_vnd: totalCost,
    capacity: isStay ? 2 : 1,
    duration_hours: item.duration_mins ? Math.max(0.5, item.duration_mins / 60) : 1.5,
    time_window: isStay ? 'overnight' : 'day',
    rating: Number(item.rating) || 4.5,
    tags: Array.from(tags),
    image_url: img,
    affiliate_url: item.booking_url || undefined,
  };
}

export async function fetchDestinationsApi(): Promise<Destination[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/destinations`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.destinations)) {
        return data.destinations.map((d: any) => ({
          id: d.id,
          name: d.name,
          region: d.region,
          coordinates: d.coordinates || [105.8542, 21.0285],
          hero_image: d.hero_image,
          gallery_images: [d.hero_image],
          satisfaction_scores: { stay: 9.0, food: 9.2, transport: 8.8, activities: 9.5 },
          activities: [],
          minimum_two_day_cost_vnd: d.minimum_two_day_cost_vnd || 1200000,
        }));
      }
    }
  } catch (e) {
    console.warn('Backend /destinations offline, using static destinations list:', e);
  }
  return destinationsData as Destination[];
}

export async function recommendDestinationsApi(
  req: RecommendDestinationsRequest
): Promise<DestinationRecommendation[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/destinations/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.recommendations)) {
        return data.recommendations;
      }
    }
  } catch (e) {
    console.warn('Backend /destinations/recommend offline, using local recommendation fallback:', e);
  }

  // Client-side fallback for destination recommendation
  const all = (destinationsData as Destination[]).slice(0, req.limit || 5);
  return all.map((d, index) => {
    const estMin = Math.round((d.minimum_two_day_cost_vnd || 1500000) * (req.num_days / 2) * req.people);
    const fitScore = Math.max(70, 98 - index * 6);
    return {
      destination: {
        id: d.id,
        name: d.name,
        region: d.region,
        coordinates: d.coordinates,
        hero_image: d.hero_image,
      },
      estimated_minimum_cost_vnd: estMin,
      remaining_vnd: Math.max(0, req.total_budget - estMin),
      fit_score: fitScore,
    };
  });
}

export async function getSimilarDestinationsApi(
  destinationId: string,
  limit: number = 3
): Promise<import('../types').SimilarDestinationResult[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/destinations/${destinationId}/similar?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.similar_destinations)) {
        return data.similar_destinations.map((item: any) => ({
          destination: {
            id: item.destination.id,
            name: item.destination.name,
            region: item.destination.region,
            coordinates: item.destination.coordinates || [105.8, 21.0],
            hero_image: item.destination.hero_image,
            gallery_images: [item.destination.hero_image],
            satisfaction_scores: { stay: 9.0, food: 9.0, transport: 9.0, activities: 9.0 },
            activities: [],
          },
          similarity_score: item.similarity_score,
          matching_tags: item.matching_tags || [],
          reason: item.reason || 'Gợi ý tương tự theo đặc trưng',
        }));
      }
    }
  } catch (e) {
    console.warn('Backend /destinations/{id}/similar offline, using client-side tag similarity fallback:', e);
  }

  const tagMap: Record<string, string[]> = {
    'ha-noi': ['city', 'thanh_pho', 'culture', 'van_hoa', 'history', 'lich_su', 'food'],
    'hue': ['heritage', 'di_san', 'history', 'lich_su', 'culture', 'van_hoa', 'river'],
    'da-nang': ['beach', 'bien', 'city', 'thanh_pho', 'modern', 'resort'],
    'da-lat': ['mountain', 'nui_doi', 'nature', 'thien_nhien', 'cool_climate'],
    'phu-quoc': ['island', 'dao', 'beach', 'bien', 'luxury', 'resort'],
  };

  const destList = destinationsData as Destination[];
  const targetTags = new Set(tagMap[destinationId] || ['city', 'culture']);

  const results = destList
    .filter((d) => d.id !== destinationId)
    .map((d) => {
      const dTags = new Set(tagMap[d.id] || ['city']);
      const intersection = [...targetTags].filter((x) => dTags.has(x));
      const union = new Set([...targetTags, ...dTags]);
      const jaccard = union.size > 0 ? intersection.length / union.size : 0;
      const score = Math.min(99, Math.round(jaccard * 100 + (intersection.length > 0 ? 20 : 5)));

      return {
        destination: d,
        similarity_score: score,
        matching_tags: intersection,
        reason: `Chung ${intersection.length} đặc trưng (${intersection.join(', ')})`,
      };
    })
    .sort((a, b) => b.similarity_score - a.similarity_score);

  return results.slice(0, limit);
}

export async function generatePlanApi(req: GeneratePlanRequest): Promise<MaterializedPlan> {
  try {
    const res = await fetch(`${API_BASE_URL}/plans/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
    const errText = await res.text();
    throw new Error(`Backend API error (${res.status}): ${errText}`);
  } catch (e: any) {
    console.error('Backend /plans/generate offline or error:', e);
    throw new Error('Không thể kết nối đến Backend Planning API. Vui lòng đảm bảo server backend đang chạy trên http://127.0.0.1:8000.');
  }
}

export async function getSwapOptionsApi(req: SwapOptionsRequest): Promise<SwapOptionsResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/plans/swap-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        return data;
      }
    }
    throw new Error('Backend returns error status');
  } catch (e: any) {
    console.error('Backend /plans/swap-options error:', e);
    throw new Error('Không thể lấy danh sách thay thế dịch vụ từ Backend API.');
  }
}

export async function applySwapApi(req: ApplySwapRequest): Promise<MaterializedPlan> {
  try {
    const res = await fetch(`${API_BASE_URL}/plans/apply-swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
    throw new Error('Backend returns error status');
  } catch (e: any) {
    console.error('Backend /plans/apply-swap error:', e);
    throw new Error('Không thể áp dụng thay đổi dịch vụ từ Backend API.');
  }
}

export function getActiveDataset(): any[] {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_tripbudget_dataset_500');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
  }
  return fullDataset;
}

function getFallbackPlan(req: GeneratePlanRequest): MaterializedPlan {
  const destList = destinationsData as Destination[];
  const dest = destList.find((d) => d.id === req.destination_id) || destList[0];
  const destCodes = DEST_CODE_MAP[req.destination_id] || ['HAN'];

  // Query active dataset items for this destination
  const activeData = getActiveDataset();
  const destItems = activeData.filter((item) => destCodes.includes(item.destination_id));

  const stays = destItems.filter((i) => i.category === 'accommodation');
  const foods = destItems.filter((i) => i.category === 'food');
  const acts = destItems.filter((i) => i.category === 'activity');

  const nights = Math.max(0, req.num_days - 1);

  // Pick top lodging
  const rawStay = stays.sort((a, b) => Number(b.rating) - Number(a.rating))[0] || {
    id: `SRV_${destCodes[0]}_001`,
    destination_id: destCodes[0],
    category: 'accommodation',
    sub_category: 'hotel',
    name: `Khách sạn ${dest.name.split('-')[0].trim()}`,
    price: 1200000,
    rating: 4.8,
    tags: ['hotel', 'luxury'],
  };

  const lodgingService = formatDatasetService(rawStay, req.people, nights);
  lodgingService.time_window = 'overnight';

  const stayCost = lodgingService.total_cost_vnd;

  const foodItemsFormatted = foods.map((f) => formatDatasetService(f, req.people, nights));
  const actItemsFormatted = acts.map((a) => formatDatasetService(a, req.people, nights));

  const selections: any[] = [];
  if (nights > 0) {
    selections.push({ service_id: lodgingService.id, day: 0, slot: 'overnight' });
  }

  let totalAllocated = stayCost;
  let foodAllocated = 0;
  let actAllocated = 0;

  const dailyItinerary = Array.from({ length: req.num_days }, (_, idx) => {
    const dayNum = idx + 1;

    const bfast = foodItemsFormatted[idx % foodItemsFormatted.length] || foodItemsFormatted[0];
    const lunch = foodItemsFormatted[(idx + 1) % foodItemsFormatted.length] || foodItemsFormatted[0];
    const dinner = foodItemsFormatted[(idx + 2) % foodItemsFormatted.length] || foodItemsFormatted[0];

    const morningAct = actItemsFormatted[idx % actItemsFormatted.length] || actItemsFormatted[0];
    const afternoonAct = actItemsFormatted[(idx + 1) % actItemsFormatted.length] || actItemsFormatted[0];

    const dayStay = lodgingService;
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

  totalAllocated += foodAllocated + actAllocated;

  const planState = {
    destination_id: req.destination_id,
    total_budget: req.total_budget,
    people: req.people,
    num_days: req.num_days,
    priorities: req.priorities,
    preferences: req.preferences,
    selections: selections,
    catalog_version: 'mock-generated-v1',
  };

  return {
    status: 'success',
    destination: {
      id: dest.id,
      name: dest.name,
      region: dest.region,
      coordinates: dest.coordinates,
      hero_image: dest.hero_image,
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
    plan_state: planState,
    data_version: 'mock-generated-v1',
  };
}

function getFallbackPlanFromState(state: any): MaterializedPlan {
  return getFallbackPlan({
    destination_id: state.destination_id,
    total_budget: state.total_budget,
    people: state.people,
    num_days: state.num_days,
    priorities: state.priorities || { stay: 'normal', food: 'important', activity: 'normal' },
    preferences: state.preferences || { lodging_styles: [], food_styles: [], activity_styles: [] },
  });
}

function getFallbackSwapOptions(req: SwapOptionsRequest): SwapOptionsResponse {
  const slot = req.target.slot;
  const isFood = ['breakfast', 'lunch', 'dinner'].includes(slot);
  const isStay = slot === 'overnight';
  const rawCat = isStay ? 'accommodation' : isFood ? 'food' : 'activity';

  const destCodes = DEST_CODE_MAP[req.plan_state.destination_id] || ['HAN'];

  const people = req.plan_state.people;
  const nights = Math.max(1, req.plan_state.num_days - 1);

  // Filter candidates matching destination and category from active dataset
  const activeData = getActiveDataset();
  const candidatesRaw = activeData.filter(
    (item) => destCodes.includes(item.destination_id) && item.category === rawCat && item.id !== req.target.service_id
  );

  const formatted = candidatesRaw.map((item) => formatDatasetService(item, people, nights));

  // Sort by rating descending and total cost ascending
  formatted.sort((a, b) => b.rating - a.rating || a.total_cost_vnd - b.total_cost_vnd);

  return {
    status: 'success',
    target: req.target,
    alternatives: formatted.slice(0, 5),
  };
}
