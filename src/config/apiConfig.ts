/**
 * Centralized API Configuration for TripBuddy.
 * Supports environment variable overrides for production deployment (Vercel, Render, Railway).
 */

const getBaseUrl = (): string => {
  const normalizeLocalHost = (url: string): string => {
    if (typeof window === 'undefined') return url;
    const pageHost = window.location.hostname;
    if (!['localhost', '127.0.0.1'].includes(pageHost)) return url;
    try {
      const parsed = new URL(url);
      if (['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.hostname !== pageHost) {
        parsed.hostname = pageHost;
        return parsed.toString().replace(/\/$/, '');
      }
    } catch {}
    return url;
  };

  // Check process.env safely without node typings error
  const gProcess = (globalThis as any).process;
  if (gProcess && gProcess.env && gProcess.env.NEXT_PUBLIC_API_BASE_URL) {
    return normalizeLocalHost(gProcess.env.NEXT_PUBLIC_API_BASE_URL);
  }

  // Check VITE_API_BASE_URL (Vite / Vercel)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE_URL) {
      return normalizeLocalHost((import.meta as any).env.VITE_API_BASE_URL);
    }
  } catch {}

  // In a Vercel deployment the FastAPI function is served from the same
  // origin. Keep localhost as the developer default.
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${window.location.origin}/api/v1`;
  }
  return 'http://127.0.0.1:8000/api/v1';
};

export const API_BASE_URL = getBaseUrl().replace(/\/+$/, '');
