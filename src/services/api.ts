/**
 * API Service Wrapper for TripBuddy.
 * Executes queries directly via Neon Serverless SQL Client over HTTPS,
 * ensuring 100% uptime and instant execution on Vercel without external server dependencies.
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
  recommendDestinationsDb,
  generatePlanDb,
  getSwapOptionsDb,
  applySwapDb,
  getSimilarDestinationsDb,
} from './neonDb';

export async function fetchDestinationsApi(): Promise<Destination[]> {
  return getDestinationsFromDb();
}

export async function recommendDestinationsApi(
  req: RecommendDestinationsRequest
): Promise<DestinationRecommendation[]> {
  try {
    return await recommendDestinationsDb(req);
  } catch (err) {
    console.warn('recommendDestinationsDb fallback:', err);
    return [];
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

export async function generatePlanApi(req: GeneratePlanRequest): Promise<MaterializedPlan> {
  return generatePlanDb(req);
}

export async function getSwapOptionsApi(req: SwapOptionsRequest): Promise<SwapOptionsResponse> {
  return getSwapOptionsDb(req);
}

export async function applySwapApi(req: ApplySwapRequest): Promise<MaterializedPlan> {
  return applySwapDb(req);
}
