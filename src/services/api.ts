/**
 * API Service Wrapper
 * Uses the legacy browser-side planner for catalogue reads and itinerary
 * operations. This keeps plan generation available when the Vercel Python
 * function is unavailable.
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
  recommendDestinationsDb,
  generatePlanDb,
  getSwapOptionsDb,
  applySwapDb,
} from './neonDb';

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
  return recommendDestinationsDb(req);
}

export async function getSimilarDestinationsApi(
  destinationId: string,
  limit: number = 3
): Promise<SimilarDestinationResult[]> {
  return getSimilarDestinationsDb(destinationId, limit);
}

export async function generatePlanApi(req: GeneratePlanRequest): Promise<MaterializedPlan> {
  return normalizePlanningImages(await generatePlanDb(req)) as MaterializedPlan;
}

export async function getSwapOptionsApi(req: SwapOptionsRequest): Promise<SwapOptionsResponse> {
  return normalizePlanningImages(await getSwapOptionsDb(req)) as SwapOptionsResponse;
}

export async function applySwapApi(req: ApplySwapRequest): Promise<MaterializedPlan> {
  return normalizePlanningImages(await applySwapDb(req)) as MaterializedPlan;
}
