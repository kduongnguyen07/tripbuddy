/**
 * API Service Wrapper - Database Mode
 * Redirects all API requests directly to Neon PostgreSQL Database (via neonDb.ts)
 * eliminating HTTP backend API servers & fallback mechanisms.
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
  getSimilarDestinationsDb,
  generatePlanDb,
  getSwapOptionsDb,
  applySwapDb,
} from './neonDb';

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
  return generatePlanDb(req);
}

export async function getSwapOptionsApi(req: SwapOptionsRequest): Promise<SwapOptionsResponse> {
  return getSwapOptionsDb(req);
}

export async function applySwapApi(req: ApplySwapRequest): Promise<MaterializedPlan> {
  return applySwapDb(req);
}
