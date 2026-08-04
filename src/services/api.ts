/**
 * API Service Wrapper.
 *
 * The browser calls only the FastAPI application. Database credentials remain
 * on the server, while this module preserves image fallbacks for planning UI.
 */

import {
  ApplySwapRequest,
  Destination,
  DestinationRecommendation,
  GeneratePlanRequest,
  MaterializedPlan,
  RecommendDestinationsRequest,
  SimilarDestinationResult,
  SwapOptionsRequest,
  SwapOptionsResponse,
} from '../types';
import { API_BASE_URL } from '../config/apiConfig';
import { getServiceIllustrationImage } from './neonDb';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail || payload?.message || `API request failed (${response.status})`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return payload as T;
}

function normalizePlanningImages<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;
  const value = payload as Record<string, any>;
  const withFallbackImage = (item: any) => ({
    ...item,
    image_url: item?.image_url || getServiceIllustrationImage(item || {}),
  });

  if (Array.isArray(value.daily_itinerary)) {
    value.daily_itinerary = value.daily_itinerary.map((day: any) => ({
      ...day,
      events: Array.isArray(day?.events) ? day.events.map(withFallbackImage) : day?.events,
    }));
  }
  if (Array.isArray(value.alternatives)) {
    value.alternatives = value.alternatives.map(withFallbackImage);
  }
  return payload;
}

async function planningRequest<T>(path: string, request: unknown): Promise<T> {
  const payload = await apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return normalizePlanningImages(payload);
}

export async function fetchDestinationsApi(): Promise<Destination[]> {
  const payload = await apiRequest<{ destinations: Destination[] }>('/destinations');
  return payload.destinations || [];
}

export async function recommendDestinationsApi(
  req: RecommendDestinationsRequest,
): Promise<DestinationRecommendation[]> {
  const response = await planningRequest<{ recommendations: DestinationRecommendation[] }>(
    '/destinations/recommend',
    req,
  );
  return response.recommendations || [];
}

export async function getSimilarDestinationsApi(
  destinationId: string,
  limit = 3,
): Promise<SimilarDestinationResult[]> {
  const payload = await apiRequest<{ similar_destinations: SimilarDestinationResult[] }>(
    `/destinations/${encodeURIComponent(destinationId)}/similar?limit=${limit}`,
  );
  return payload.similar_destinations || [];
}

export async function generatePlanApi(req: GeneratePlanRequest): Promise<MaterializedPlan> {
  return planningRequest<MaterializedPlan>('/plans/generate', req);
}

export async function getSwapOptionsApi(req: SwapOptionsRequest): Promise<SwapOptionsResponse> {
  return planningRequest<SwapOptionsResponse>('/plans/swap-options', req);
}

export async function applySwapApi(req: ApplySwapRequest): Promise<MaterializedPlan> {
  return planningRequest<MaterializedPlan>('/plans/apply-swap', req);
}
