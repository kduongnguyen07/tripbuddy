/**
 * API Service Wrapper
 * Uses Neon for catalogue reads and the FastAPI planning endpoints for
 * recommendations and itinerary operations.
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
} from '../types';

import {
  getDestinationsFromDb,
  getSimilarDestinationsDb,
  getServiceIllustrationImage,
} from './neonDb';
import { API_BASE_URL } from '../config/apiConfig';

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
  const response = await planningRequest<{ recommendations: DestinationRecommendation[] }>(
    '/destinations/recommend',
    req
  );
  return response.recommendations;
}

export async function getSimilarDestinationsApi(
  destinationId: string,
  limit: number = 3
): Promise<SimilarDestinationResult[]> {
  return getSimilarDestinationsDb(destinationId, limit);
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
