/**
 * Server API client for catalogue and CMS data.
 *
 * This module deliberately contains no database URL or SQL client. The browser
 * talks only to the FastAPI/Vercel application, which owns the Neon connection.
 */

import {
  Destination,
  HeroConfig,
  JourneySlide,
  SimilarDestinationResult,
} from '../types';
import { API_BASE_URL } from '../config/apiConfig';

type ApiEnvelope = Record<string, any>;

async function apiRequest<T extends ApiEnvelope>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
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
    const detail = payload?.detail || payload?.message || `Yêu cầu API thất bại (${response.status})`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return payload as T;
}

export async function createAdminSession(secret: string): Promise<void> {
  await apiRequest('/admin/session', {
    method: 'POST',
    headers: { 'X-Admin-Secret': secret },
  });
}

export async function deleteAdminSession(): Promise<void> {
  await apiRequest('/admin/session', { method: 'DELETE' });
}

export async function getDestinationsFromDb(): Promise<Destination[]> {
  const payload = await apiRequest<{ destinations: Destination[] }>('/db/destinations');
  return payload.destinations || [];
}

export async function addDestinationDb(
  destination: Partial<Destination> & { id: string; name: string; region: string },
): Promise<Destination> {
  const payload = await apiRequest<{ destination: Destination }>('/db/destinations', {
    method: 'POST',
    body: JSON.stringify(destination),
  });
  return payload.destination;
}

export async function updateDestinationDb(destination: Destination): Promise<Destination> {
  return addDestinationDb(destination);
}

export async function deleteDestinationDb(id: string): Promise<boolean> {
  await apiRequest(`/db/destinations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return true;
}

export async function getServicesFromDb(destinationId?: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (destinationId) params.set('destination_id', destinationId);
  const suffix = params.size ? `?${params.toString()}` : '';
  const payload = await apiRequest<{ services: any[] }>(`/db/services${suffix}`);
  return payload.services || [];
}

export async function addServiceDb(service: any): Promise<any> {
  const payload = await apiRequest<{ service: any }>('/db/services', {
    method: 'POST',
    body: JSON.stringify(service),
  });
  return payload.service;
}

export async function updateServiceDb(service: any): Promise<any> {
  return addServiceDb(service);
}

export async function deleteServiceDb(id: string): Promise<boolean> {
  await apiRequest(`/db/services/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return true;
}

export async function getHeroConfigFromDb(): Promise<HeroConfig | null> {
  const payload = await apiRequest<{ hero: HeroConfig | null }>('/db/hero');
  return payload.hero || null;
}

export async function updateHeroConfigDb(config: HeroConfig): Promise<HeroConfig> {
  const payload = await apiRequest<{ hero: HeroConfig }>('/db/hero', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
  return payload.hero;
}

export async function getSlidesFromDb(): Promise<JourneySlide[]> {
  const payload = await apiRequest<{ slides: JourneySlide[] }>('/db/slides');
  return payload.slides || [];
}

export async function addSlideDb(slide: JourneySlide): Promise<JourneySlide> {
  const payload = await apiRequest<{ slide: JourneySlide }>('/db/slides', {
    method: 'POST',
    body: JSON.stringify(slide),
  });
  return payload.slide;
}

export async function updateSlideDb(slide: JourneySlide): Promise<JourneySlide> {
  return addSlideDb(slide);
}

export async function deleteSlideDb(id: string): Promise<boolean> {
  await apiRequest(`/db/slides/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return true;
}

export async function getSimilarDestinationsDb(
  destinationId: string,
  limit = 3,
): Promise<SimilarDestinationResult[]> {
  const payload = await apiRequest<{ similar_destinations?: SimilarDestinationResult[]; destinations?: SimilarDestinationResult[] }>(
    `/destinations/${encodeURIComponent(destinationId)}/similar?limit=${limit}`,
  );
  return payload.similar_destinations || payload.destinations || [];
}

export function getServiceIllustrationImage(item: any): string {
  if (item.image_url && typeof item.image_url === 'string' && item.image_url.trim().length > 10) {
    return item.image_url;
  }
  const category = (item.category || '').toLowerCase();
  const destination = (item.destination_id || '').toLowerCase();
  if (category === 'stay' || category === 'accommodation') {
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85';
  }
  if (category === 'food' || category === 'dining') {
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85';
  }
  if (destination.includes('pqc') || destination.includes('phu-quoc')) {
    return 'https://images.unsplash.com/photo-1730714103959-5d5a30acf547?auto=format&fit=crop&w=1200&q=85';
  }
  if (destination.includes('dld') || destination.includes('da-lat') || destination.includes('dad') || destination.includes('da-nang')) {
    return 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=85';
  }
  if (destination.includes('hue')) {
    return 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=85';
  }
  return 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=85';
}
