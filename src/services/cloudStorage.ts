import { Destination, JourneySlide, HeroConfig } from '../types';

export const DEFAULT_CLOUD_API_URL = '';

export interface CloudPayload {
  destinations: Destination[];
  slides: JourneySlide[];
  heroConfig: HeroConfig;
  updatedAt?: string;
}

/**
 * Cloud DB sync disabled to prevent last-write-wins overwrites during multi-user demos.
 * Local browser state & local database are used as single source of truth.
 */
export async function fetchCloudData(_apiUrl?: string): Promise<CloudPayload | null> {
  // Cloud sync disabled: returns null to rely strictly on local state & database
  return null;
}

/**
 * Cloud DB sync disabled to prevent last-write-wins overwrites during multi-user demos.
 */
export async function saveCloudData(
  _payload: CloudPayload,
  _apiUrl?: string
): Promise<boolean> {
  // Cloud sync disabled: returns true cleanly without external HTTP calls
  return true;
}
