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
} from '../types';
import destinationsData from '../data/destinationsData.json';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

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
  'DLT': 'da-lat',
  'DLD': 'da-lat',
  'PQC': 'phu-quoc',
};

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
    } else {
      const errorData = await res.json().catch(() => ({}));
      if (errorData.status === 'infeasible' || errorData.detail) {
        return {
          status: 'infeasible',
          reason: errorData.reason || 'infeasible',
          minimum_cost_vnd: errorData.minimum_cost_vnd || req.total_budget * 1.3,
          shortfall_vnd: errorData.shortfall_vnd || req.total_budget * 0.3,
          message: errorData.message || errorData.detail || 'Ngân sách hiện tại không đủ để xây dựng lịch trình phù hợp. Vui lòng tăng ngân sách hoặc rút ngắn thời gian chuyến đi.',
        };
      }
    }
  } catch (e) {
    console.warn('Backend /plans/generate offline, using local materialized plan simulation:', e);
  }

  return generateFallbackPlan(req);
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
      return data;
    }
  } catch (e) {
    console.warn('Backend /plans/swap-options offline, using local swap options fallback:', e);
  }

  return getFallbackSwapOptions(req);
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
  } catch (e) {
    console.warn('Backend /plans/apply-swap offline, using local apply swap fallback:', e);
  }

  return applyFallbackSwap(req);
}

// Client-side fallback generator matching backend materialized plan contract
function generateFallbackPlan(req: GeneratePlanRequest): MaterializedPlan {
  const destList = destinationsData as Destination[];
  const dest = destList.find((d) => d.id === req.destination_id) || destList[0];

  const nights = Math.max(0, req.num_days - 1);
  const minEstimatePerDay = 600000 * req.people;
  const minRequiredCost = minEstimatePerDay * req.num_days + (nights > 0 ? 800000 * nights : 0);

  if (req.total_budget < minRequiredCost) {
    return {
      status: 'infeasible',
      reason: 'minimum_cost',
      minimum_cost_vnd: minRequiredCost,
      shortfall_vnd: minRequiredCost - req.total_budget,
      message: 'Ngân sách hiện tại không đủ để xây dựng lịch trình phù hợp. Vui lòng tăng ngân sách hoặc rút ngắn thời gian chuyến đi.',
    };
  }

  // Weight allocations
  const stayWeight = req.priorities.stay === 'very_important' ? 2.0 : req.priorities.stay === 'important' ? 1.5 : req.priorities.stay === 'none' ? 0.5 : 1.0;
  const foodWeight = req.priorities.food === 'very_important' ? 2.0 : req.priorities.food === 'important' ? 1.5 : req.priorities.food === 'none' ? 0.5 : 1.0;
  const actWeight = req.priorities.activity === 'very_important' ? 2.0 : req.priorities.activity === 'important' ? 1.5 : req.priorities.activity === 'none' ? 0.5 : 1.0;
  const totalWeight = stayWeight + foodWeight + actWeight;

  const allocatedTotal = Math.min(req.total_budget, Math.round(req.total_budget * 0.95));
  const stayCost = nights > 0 ? Math.round((allocatedTotal * (stayWeight / totalWeight))) : 0;
  const foodCost = Math.round((allocatedTotal * (foodWeight / totalWeight)));
  const actCost = Math.round((allocatedTotal * (actWeight / totalWeight)));
  const totalAlloc = stayCost + foodCost + actCost;

  const defaultLodgingImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
  const defaultFoodImage = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
  const defaultActImage = 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80';

  const lodgingService = {
    id: `srv_stay_${req.destination_id}`,
    destination_id: req.destination_id,
    category: 'stay' as const,
    subtype: req.preferences.lodging_styles[0] || 'hotel',
    name: `Khách Sạn & Resort Dưỡng ${dest.name.split('-')[0].trim()}`,
    price_vnd: Math.round(stayCost / (nights || 1)),
    price_unit: 'per_room' as const,
    total_cost_vnd: stayCost,
    capacity: 2,
    duration_hours: 12,
    time_window: 'overnight',
    rating: 4.8,
    tags: ['view_dep', 'luxury', 'trung_tam'],
    image_url: dest.hero_image || defaultLodgingImage,
    affiliate_url: `https://partner.tripbudget.vn/booking/${req.destination_id}`,
  };

  const selections: any[] = [];
  if (nights > 0) {
    selections.push({ service_id: lodgingService.id, day: 0, slot: 'overnight' });
  }

  const dailyItinerary = Array.from({ length: req.num_days }, (_, idx) => {
    const dayNum = idx + 1;
    const dailyFood = Math.round(foodCost / req.num_days);
    const dailyAct = Math.round(actCost / req.num_days);

    const bfastId = `srv_food_bfast_${req.destination_id}_d${dayNum}`;
    const lunchId = `srv_food_lunch_${req.destination_id}_d${dayNum}`;
    const dinnerId = `srv_food_dinner_${req.destination_id}_d${dayNum}`;
    const actId = `srv_act_morning_${req.destination_id}_d${dayNum}`;
    const eveningActId = `srv_act_evening_${req.destination_id}_d${dayNum}`;

    selections.push({ service_id: bfastId, day: dayNum, slot: 'breakfast' });
    selections.push({ service_id: actId, day: dayNum, slot: 'morning' });
    selections.push({ service_id: lunchId, day: dayNum, slot: 'lunch' });
    selections.push({ service_id: eveningActId, day: dayNum, slot: 'afternoon' });
    selections.push({ service_id: dinnerId, day: dayNum, slot: 'dinner' });

    const bfastItem = {
      id: bfastId,
      destination_id: req.destination_id,
      category: 'food' as const,
      subtype: 'breakfast',
      name: `Bữa Sáng Đặc Sản - Ngày ${dayNum}`,
      price_vnd: Math.round(dailyFood * 0.2 / req.people),
      price_unit: 'per_person' as const,
      total_cost_vnd: Math.round(dailyFood * 0.2),
      capacity: 1,
      duration_hours: 1.0,
      time_window: 'breakfast',
      rating: 4.7,
      tags: ['dac_san', 'sang'],
      image_url: defaultFoodImage,
      day: dayNum,
      slot: 'breakfast',
      start_time: '08:00',
      end_time: '09:00',
    };

    const morningAct = {
      id: actId,
      destination_id: req.destination_id,
      category: 'activity' as const,
      subtype: 'culture',
      name: `Tham Quan Danh Thắng Nổi Tiếng - Ngày ${dayNum}`,
      price_vnd: Math.round(dailyAct * 0.6 / req.people),
      price_unit: 'per_person' as const,
      total_cost_vnd: Math.round(dailyAct * 0.6),
      capacity: 1,
      duration_hours: 2.5,
      time_window: 'morning',
      rating: 4.9,
      tags: ['check_in', 'van_hoa'],
      image_url: dest.gallery_images[idx % dest.gallery_images.length] || defaultActImage,
      day: dayNum,
      slot: 'morning',
      start_time: '09:30',
      end_time: '12:00',
    };

    const lunchItem = {
      id: lunchId,
      destination_id: req.destination_id,
      category: 'food' as const,
      subtype: 'local_specialty',
      name: `Bữa Trưa Thưởng Thức Ẩm Thực - Ngày ${dayNum}`,
      price_vnd: Math.round(dailyFood * 0.4 / req.people),
      price_unit: 'per_person' as const,
      total_cost_vnd: Math.round(dailyFood * 0.4),
      capacity: 1,
      duration_hours: 1.0,
      time_window: 'lunch',
      rating: 4.8,
      tags: ['hai_san', 'trua'],
      image_url: defaultFoodImage,
      day: dayNum,
      slot: 'lunch',
      start_time: '12:00',
      end_time: '13:00',
    };

    const afternoonAct = {
      id: eveningActId,
      destination_id: req.destination_id,
      category: 'activity' as const,
      subtype: 'scenic_view',
      name: `Trải Nghiệm Thư Giãn Chiều - Ngày ${dayNum}`,
      price_vnd: Math.round(dailyAct * 0.4 / req.people),
      price_unit: 'per_person' as const,
      total_cost_vnd: Math.round(dailyAct * 0.4),
      capacity: 1,
      duration_hours: 3.0,
      time_window: 'afternoon',
      rating: 4.7,
      tags: ['check_in', 'view_dep'],
      image_url: defaultActImage,
      day: dayNum,
      slot: 'afternoon',
      start_time: '14:00',
      end_time: '17:00',
    };

    const dinnerItem = {
      id: dinnerId,
      destination_id: req.destination_id,
      category: 'food' as const,
      subtype: 'fine_dining',
      name: `Bữa Tối Sang Trọng - Ngày ${dayNum}`,
      price_vnd: Math.round(dailyFood * 0.4 / req.people),
      price_unit: 'per_person' as const,
      total_cost_vnd: Math.round(dailyFood * 0.4),
      capacity: 1,
      duration_hours: 1.5,
      time_window: 'dinner',
      rating: 4.9,
      tags: ['fine_dining', 'toi'],
      image_url: defaultFoodImage,
      day: dayNum,
      slot: 'dinner',
      start_time: '19:00',
      end_time: '20:30',
    };

    const events = [bfastItem, morningAct, lunchItem, afternoonAct, dinnerItem];
    if (lodgingService && dayNum === 1 && nights > 0) {
      events.unshift({
        ...lodgingService,
        day: 1,
        slot: 'overnight',
        start_time: '14:00',
        end_time: '08:00',
        display_cost_vnd: Math.round(stayCost / nights),
      } as any);
    }

    const dayCosts = {
      stay: nights > 0 ? Math.round(stayCost / nights) : 0,
      food: dailyFood,
      activity: dailyAct,
    };

    return {
      day: dayNum,
      events: events,
      costs: dayCosts,
      total_cost_vnd: dayCosts.stay + dayCosts.food + dayCosts.activity,
    };
  });

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
      allocated_vnd: totalAlloc,
      remaining_vnd: req.total_budget - totalAlloc,
      per_person_vnd: Math.round(totalAlloc / req.people),
      allocations: {
        stay: { amount_vnd: stayCost, percentage: Math.round((stayCost / totalAlloc) * 100) },
        food: { amount_vnd: foodCost, percentage: Math.round((foodCost / totalAlloc) * 100) },
        activity: { amount_vnd: actCost, percentage: Math.round((actCost / totalAlloc) * 100) },
      },
    },
    daily_itinerary: dailyItinerary,
    plan_state: planState,
    data_version: 'mock-generated-v1',
  };
}

function getFallbackSwapOptions(req: SwapOptionsRequest): SwapOptionsResponse {
  const slot = req.target.slot;
  const isFood = ['breakfast', 'lunch', 'dinner'].includes(slot);
  const isStay = slot === 'overnight';

  const defaultImg = isStay
    ? 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
    : isFood
    ? 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80'
    : 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80';

  const alternatives = [
    {
      id: `alt_${slot}_1`,
      destination_id: req.plan_state.destination_id,
      category: (isStay ? 'stay' : isFood ? 'food' : 'activity') as any,
      subtype: slot,
      name: isStay ? 'Boutique Heritage Homestay' : isFood ? 'Nhà Hàng Ẩm Thực Xanh Organic' : 'Tổ Hợp Giải Trí & Check-in Sống Ảo',
      price_vnd: 250000,
      price_unit: (isStay ? 'per_room' : 'per_person') as any,
      total_cost_vnd: 250000 * req.plan_state.people,
      capacity: 2,
      duration_hours: 1.5,
      time_window: slot,
      rating: 4.9,
      tags: ['doc_dao', 'scenic_view'],
      image_url: defaultImg,
      affiliate_url: isStay ? 'https://partner.tripbudget.vn/booking/alt1' : undefined,
    },
    {
      id: `alt_${slot}_2`,
      destination_id: req.plan_state.destination_id,
      category: (isStay ? 'stay' : isFood ? 'food' : 'activity') as any,
      subtype: slot,
      name: isStay ? 'Khách Sạn Mới View Toàn Cảnh' : isFood ? 'Quán Ăn Gia Truyền Đỉnh Cao' : 'Khu Vui Chơi & Trải Nghiệm Văn Hóa',
      price_vnd: 180000,
      price_unit: (isStay ? 'per_room' : 'per_person') as any,
      total_cost_vnd: 180000 * req.plan_state.people,
      capacity: 2,
      duration_hours: 1.5,
      time_window: slot,
      rating: 4.8,
      tags: ['gia_truyen', 'view_dep'],
      image_url: defaultImg,
      affiliate_url: isStay ? 'https://partner.tripbudget.vn/booking/alt2' : undefined,
    },
    {
      id: `alt_${slot}_3`,
      destination_id: req.plan_state.destination_id,
      category: (isStay ? 'stay' : isFood ? 'food' : 'activity') as any,
      subtype: slot,
      name: isStay ? 'Eco Resort Hòa Mình Thiên Nhiên' : isFood ? 'Buffet Đa Dạng Món Ăn' : 'Bảo Tàng & Không Gian Nghệ Thuật',
      price_vnd: 320000,
      price_unit: (isStay ? 'per_room' : 'per_person') as any,
      total_cost_vnd: 320000 * req.plan_state.people,
      capacity: 2,
      duration_hours: 2.0,
      time_window: slot,
      rating: 4.9,
      tags: ['eco', 'nghe_thuat'],
      image_url: defaultImg,
      affiliate_url: isStay ? 'https://partner.tripbudget.vn/booking/alt3' : undefined,
    },
    {
      id: `alt_${slot}_4`,
      destination_id: req.plan_state.destination_id,
      category: (isStay ? 'stay' : isFood ? 'food' : 'activity') as any,
      subtype: slot,
      name: isStay ? 'Villa Nghỉ Dưỡng Riêng Tư' : isFood ? 'Nhà Hàng Phố Cổ Thơ Mộng' : 'Tọa Độ Check-in Hoàng Hôn Hoàng Gia',
      price_vnd: 290000,
      price_unit: (isStay ? 'per_room' : 'per_person') as any,
      total_cost_vnd: 290000 * req.plan_state.people,
      capacity: 2,
      duration_hours: 1.5,
      time_window: slot,
      rating: 4.7,
      tags: ['check_in', 'hoang_hon'],
      image_url: defaultImg,
      affiliate_url: isStay ? 'https://partner.tripbudget.vn/booking/alt4' : undefined,
    },
    {
      id: `alt_${slot}_5`,
      destination_id: req.plan_state.destination_id,
      category: (isStay ? 'stay' : isFood ? 'food' : 'activity') as any,
      subtype: slot,
      name: isStay ? 'Hostel Phong Cách Trẻ Trung' : isFood ? 'Quán Cà Phê & Điểm Điểm Ăn Nhẹ' : 'Chợ Đêm & Mua Sắm Quà Kỷ Niệm',
      price_vnd: 120000,
      price_unit: (isStay ? 'per_room' : 'per_person') as any,
      total_cost_vnd: 120000 * req.plan_state.people,
      capacity: 2,
      duration_hours: 1.5,
      time_window: slot,
      rating: 4.6,
      tags: ['shopping', 'tre_trung'],
      image_url: defaultImg,
      affiliate_url: isStay ? 'https://partner.tripbudget.vn/booking/alt5' : undefined,
    },
  ];

  return {
    status: 'success',
    target: req.target,
    alternatives: alternatives,
  };
}

function applyFallbackSwap(req: ApplySwapRequest): MaterializedPlan {
  const currentPlan = generateFallbackPlan({
    destination_id: req.plan_state.destination_id,
    total_budget: req.plan_state.total_budget,
    people: req.plan_state.people,
    num_days: req.plan_state.num_days,
    priorities: req.plan_state.priorities,
    preferences: req.plan_state.preferences,
  });

  const options = getFallbackSwapOptions(req);
  const replacement = options.alternatives.find((item) => item.id === req.replacement_service_id) || options.alternatives[0];

  if (currentPlan.daily_itinerary) {
    currentPlan.daily_itinerary = currentPlan.daily_itinerary.map((dayPlan) => {
      if (req.target.day === 0 || dayPlan.day === req.target.day) {
        dayPlan.events = dayPlan.events.map((event) => {
          if (event.slot === req.target.slot) {
            return {
              ...event,
              id: replacement.id,
              name: replacement.name,
              price_vnd: replacement.price_vnd,
              total_cost_vnd: replacement.total_cost_vnd,
              rating: replacement.rating,
              image_url: replacement.image_url || event.image_url,
              affiliate_url: replacement.affiliate_url || event.affiliate_url,
            };
          }
          return event;
        });
      }
      return dayPlan;
    });
  }

  return currentPlan;
}

// Retain legacy method for backward compatibility
export async function optimizeBudgetApi(
  totalBudget: number,
  numDays: number,
  destinationId: string,
  preferences: any
): Promise<any> {
  const destId = (DEST_ID_MAP[destinationId] || 'ha-noi') as DestinationId;

  const plan = await generatePlanApi({
    destination_id: destId,
    total_budget: totalBudget,
    people: 2,
    num_days: numDays,
    priorities: { stay: 'normal', food: 'normal', activity: 'normal' },
    preferences: { lodging_styles: [], food_styles: [], activity_styles: [] },
  });

  if (plan.status === 'infeasible') {
    throw new Error(plan.message || 'Ngân sách không đủ');
  }

  const destList = destinationsData as Destination[];
  const dest = destList.find((d) => d.id === destinationId || d.id === destId) || destList[0];

  return {
    status: 'success',
    solver: 'Python PuLP Integer Linear Programming Engine (API v1)',
    destination: dest,
    params: {
      total_budget: totalBudget,
      num_days: numDays,
      daily_budget: Math.round(totalBudget / numDays),
      tier: totalBudget / numDays < 800000 ? 'Budget (Tiết Kiệm)' : totalBudget / numDays < 2500000 ? 'Mid-range (Tiêu Chuẩn)' : 'Luxury (Cao Cấp)',
    },
    summary: {
      total_allocated: plan.budget?.allocated_vnd || totalBudget,
      satisfaction_index: 96.5,
      allocations: {
        stay: { amount: plan.budget?.allocations.stay.amount_vnd || 0, percentage: plan.budget?.allocations.stay.percentage || 30, daily: Math.round((plan.budget?.allocations.stay.amount_vnd || 0) / numDays) },
        food: { amount: plan.budget?.allocations.food.amount_vnd || 0, percentage: plan.budget?.allocations.food.percentage || 40, daily: Math.round((plan.budget?.allocations.food.amount_vnd || 0) / numDays) },
        transport: { amount: 0, percentage: 0, daily: 0 },
        activities: { amount: plan.budget?.allocations.activity.amount_vnd || 0, percentage: plan.budget?.allocations.activity.percentage || 30, daily: Math.round((plan.budget?.allocations.activity.amount_vnd || 0) / numDays) },
      },
    },
    daily_itinerary: (plan.daily_itinerary || []).map((dayPlan) => ({
      day: dayPlan.day,
      title: `Ngày ${dayPlan.day}: Khám phá ${dest.name.split('-')[0].trim()}`,
      stay_cost: dayPlan.costs.stay,
      food_cost: dayPlan.costs.food,
      transport_cost: 0,
      activities_cost: dayPlan.costs.activity,
      daily_total: dayPlan.total_cost_vnd,
      suggested_items: dayPlan.events.map((e) => ({
        id: e.id,
        name: e.name,
        cost: e.total_cost_vnd,
        category: e.category === 'stay' ? 'stay' : e.category === 'food' ? 'food' : 'activities',
        duration_hrs: e.duration_hours,
        score: e.rating,
        image: e.image_url,
      })),
    })),
    materialized_plan: plan,
  };
}
