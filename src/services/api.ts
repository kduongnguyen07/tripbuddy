import {
  GeneratePlanRequest,
  RecommendDestinationsRequest,
  SwapOptionsRequest,
  ApplySwapRequest,
  MaterializedPlan,
  DestinationRecommendation,
  SwapOptionsResponse,
  Destination,
} from '../types';
import { API_BASE_URL } from '../config/apiConfig';

export async function fetchDestinationsApi(): Promise<Destination[]> {
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
        satisfaction_scores: d.satisfaction_scores || { stay: 9.0, food: 9.2, transport: 8.8, activities: 9.5 },
        activities: d.activities || [],
        minimum_two_day_cost_vnd: d.minimum_two_day_cost_vnd || 1200000,
      }));
    }
  }
  const errText = await res.text().catch(() => '');
  throw new Error(`Không thể lấy danh sách điểm đến từ Backend Postgres API (${res.status}): ${errText}`);
}

export async function recommendDestinationsApi(
  req: RecommendDestinationsRequest
): Promise<DestinationRecommendation[]> {
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
  const errText = await res.text().catch(() => '');
  throw new Error(`Không thể gợi ý điểm đến từ Backend Postgres API (${res.status}): ${errText}`);
}

export async function getSimilarDestinationsApi(
  destinationId: string,
  limit: number = 3
): Promise<import('../types').SimilarDestinationResult[]> {
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
          satisfaction_scores: item.destination.satisfaction_scores || { stay: 9.0, food: 9.0, transport: 9.0, activities: 9.0 },
          activities: item.destination.activities || [],
        },
        similarity_score: item.similarity_score,
        matching_tags: item.matching_tags || [],
        reason: item.reason || 'Gợi ý tương tự theo đặc trưng',
      }));
    }
  }
  const errText = await res.text().catch(() => '');
  throw new Error(`Không thể tìm điểm đến tương tự từ Backend Postgres API (${res.status}): ${errText}`);
}

export async function generatePlanApi(req: GeneratePlanRequest): Promise<MaterializedPlan> {
  const res = await fetch(`${API_BASE_URL}/plans/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (res.ok) {
    const data = await res.json();
    return data;
  }
  const errText = await res.text().catch(() => '');
  throw new Error(`Backend Planning API error (${res.status}): ${errText}`);
}

export async function getSwapOptionsApi(req: SwapOptionsRequest): Promise<SwapOptionsResponse> {
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
  const errText = await res.text().catch(() => '');
  throw new Error(`Backend /plans/swap-options error (${res.status}): ${errText}`);
}

export async function applySwapApi(req: ApplySwapRequest): Promise<MaterializedPlan> {
  const res = await fetch(`${API_BASE_URL}/plans/apply-swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (res.ok) {
    const data = await res.json();
    return data;
  }
  const errText = await res.text().catch(() => '');
  throw new Error(`Backend /plans/apply-swap error (${res.status}): ${errText}`);
}
