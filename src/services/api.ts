/**
 * API Service Wrapper for TripBuddy.
 * Talks to the FastAPI application, which owns the server-side database
 * connection. This keeps Neon credentials out of the browser bundle.
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

import { API_BASE_URL } from '../config/apiConfig';

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

export async function fetchDestinationsApi(): Promise<Destination[]> {
  const payload = await apiRequest<{ destinations: Destination[] }>('/destinations');
  return payload.destinations || [];
}

export async function recommendDestinationsApi(
  req: RecommendDestinationsRequest
): Promise<DestinationRecommendation[]> {
  try {
    const payload = await apiRequest<{ recommendations: DestinationRecommendation[] }>('/destinations/recommend', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    return payload.recommendations || [];
  } catch (err) {
    console.warn('Destination recommendation request failed:', err);
    return [];
  }
}

export async function getSimilarDestinationsApi(
  destinationId: string,
  limit: number = 3
): Promise<SimilarDestinationResult[]> {
  try {
    const payload = await apiRequest<{ similar_destinations: SimilarDestinationResult[] }>(
      `/destinations/${encodeURIComponent(destinationId)}/similar?limit=${limit}`,
    );
    return payload.similar_destinations || [];
  } catch (err) {
    console.warn('Similar destination request failed:', err);
    return [];
  }
}

export async function generatePlanApi(req: GeneratePlanRequest): Promise<MaterializedPlan> {
  return apiRequest<MaterializedPlan>('/plans/generate', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function getSwapOptionsApi(req: SwapOptionsRequest): Promise<SwapOptionsResponse> {
  return apiRequest<SwapOptionsResponse>('/plans/swap-options', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function applySwapApi(req: ApplySwapRequest): Promise<MaterializedPlan> {
  return apiRequest<MaterializedPlan>('/plans/apply-swap', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}
