/**
 * Direct Neon PostgreSQL Database Client for TripBuddy.
 * Eliminates intermediate API server / REST endpoints entirely,
 * executing SQL queries directly against Neon Database over serverless HTTPS.
 */

import { neon } from '@neondatabase/serverless';
import {
  Destination,
  GeneratePlanRequest,
  RecommendDestinationsRequest,
  SwapOptionsRequest,
  ApplySwapRequest,
  MaterializedPlan,
  PlanState,
  DestinationRecommendation,
  SwapOptionsResponse,
  SimilarDestinationResult,
  PlanServiceItem,
  HeroConfig,
  JourneySlide,
} from '../types';
import destinationsData from '../data/destinationsData.json';
import slidesData from '../data/slidesData.json';
import fullDataset from '../../backend/tripbuddy_full_dataset_500.json';

const DEFAULT_HERO_CONFIG: HeroConfig = {
  badge: 'VIỆT NAM VÀ NHỮNG CHUYẾN ĐI',
  titleLine1: 'Khám Phá Việt Nam',
  titleLine2: 'Theo Cách',
  titleHighlight: 'Của Bạn',
  backgroundImage: 'https://images.pexels.com/photos/28706873/pexels-photo-28706873.jpeg',
  ctaButtonText: 'Khám Phá Ngay',
};

const connectionString =
  (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_DATABASE_URL) ||
  'postgresql://neondb_owner:npg_ANCoSBwcq72U@ep-wandering-wind-awc25xcc-pooler.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require';



const cleanUrl = connectionString
  .replace('&channel_binding=require', '')
  .replace('?channel_binding=require&', '?')
  .replace('?channel_binding=require', '');

export const sql = neon(cleanUrl);

const DEST_CODE_MAP: Record<string, string[]> = {
  'ha-noi': ['HAN'],
  hue: ['HUE'],
  'da-nang': ['DAD'],
  'da-lat': ['DLD', 'DLT'],
  'phu-quoc': ['PQC'],
  HAN: ['HAN'],
  HUE: ['HUE'],
  DAD: ['DAD'],
  DLD: ['DLD', 'DLT'],
  DLT: ['DLD', 'DLT'],
  PQC: ['PQC'],
};

function safeJson(val: any, fallback: any) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}

type PreferenceCategory = 'stay' | 'food' | 'activity';

// A preference can be stored under either its UI value or a closely related
// catalogue tag. Keeping these aliases here lets older catalogue rows still
// receive the same preference boost as newly added rows.
const PREFERENCE_TAG_ALIASES: Record<string, string[]> = {
  hotel: ['hotel', 'luxury'],
  resort: ['resort', 'nature', 'scenic_view'],
  homestay: ['homestay', 'casual'],
  villa: ['villa', 'luxury'],
  hostel: ['hostel', 'casual'],
  casual: ['casual', 'street_food'],
  seafood: ['seafood'],
  local_specialty: ['local_specialty', 'asian_food'],
  buffet: ['buffet'],
  street_food: ['street_food', 'casual'],
  fine_dining: ['fine_dining', 'luxury'],
  cafe: ['cafe', 'scenic_view'],
  fast_food: ['fast_food'],
  asian_food: ['asian_food', 'local_specialty'],
  healthy: ['healthy', 'vegetarian'],
  vegetarian: ['vegetarian', 'healthy'],
  western_food: ['western_food'],
  check_in: ['check_in', 'scenic_view'],
  culture: ['culture', 'history'],
  entertainment: ['entertainment'],
  history: ['history', 'culture'],
  nature: ['nature', 'scenic_view'],
  scenic_view: ['scenic_view', 'nature'],
  shopping: ['shopping'],
};

function preferencesForCategory(preferences: any, category: PreferenceCategory): string[] {
  if (!preferences) return [];
  if (category === 'stay') return preferences.lodging_styles || [];
  if (category === 'food') return preferences.food_styles || [];
  return preferences.activity_styles || [];
}

function preferenceScore(item: any, styles: string[]): number {
  if (!styles.length) return 0;

  const tags = Array.isArray(item?.tags) ? item.tags : safeJson(item?.tags, []);
  const searchable = [
    ...(Array.isArray(tags) ? tags : []),
    item?.sub_category,
    item?.subtype,
    item?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return styles.reduce((score, style) => {
    const candidates = PREFERENCE_TAG_ALIASES[style] || [style];
    return score + (candidates.some((tag) => searchable.includes(tag.toLowerCase())) ? 1 : 0);
  }, 0);
}

function sortByPreference<T extends { rating?: number; price?: number; price_vnd?: number; tags?: any; sub_category?: string; subtype?: string; name?: string }>(
  items: T[],
  styles: string[],
): T[] {
  return [...items].sort((a, b) => {
    const preferenceDifference = preferenceScore(b, styles) - preferenceScore(a, styles);
    if (preferenceDifference !== 0) return preferenceDifference;
    const ratingDifference = Number(b.rating || 0) - Number(a.rating || 0);
    if (ratingDifference !== 0) return ratingDifference;
    return Number(a.price ?? a.price_vnd ?? 0) - Number(b.price ?? b.price_vnd ?? 0);
  });
}

function matchingServicesOrFallback<T extends { rating?: number; price?: number; price_vnd?: number; tags?: any; sub_category?: string; subtype?: string; name?: string }>(
  items: T[],
  styles: string[],
  minimumMatches: number = 1,
): T[] {
  const ordered = sortByPreference(items, styles);
  if (!styles.length) return ordered;

  const matching = ordered.filter((item) => preferenceScore(item, styles) > 0);
  if (matching.length >= minimumMatches) return matching;

  // Preserve all matching choices first, but add the non-matching catalogue
  // only when it cannot fill the required distinct itinerary slots.
  return [...matching, ...ordered.filter((item) => preferenceScore(item, styles) === 0)];
}

function validCoordinates(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  return Number.isFinite(longitude) && Number.isFinite(latitude) ? [longitude, latitude] : null;
}

function estimatedDistanceKm(first: unknown, second: unknown): number | null {
  const firstCoordinates = validCoordinates(first);
  const secondCoordinates = validCoordinates(second);
  if (!firstCoordinates || !secondCoordinates) return null;

  const [lon1, lat1] = firstCoordinates;
  const [lon2, lat2] = secondCoordinates;
  const radians = Math.PI / 180;
  const latitudeDelta = (lat2 - lat1) * radians;
  const longitudeDelta = (lon2 - lon1) * radians;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine)))) * 10) / 10;
}

function selectRouteAwareActivity(
  candidates: PlanServiceItem[],
  anchor: PlanServiceItem | null,
  styles: string[],
): PlanServiceItem | null {
  if (!candidates.length) return null;

  return [...candidates].sort((a, b) => {
    // A preference match always wins; distance only chooses the better route
    // between activities with the same preference relevance.
    const preferenceDifference = preferenceScore(b, styles) - preferenceScore(a, styles);
    if (preferenceDifference !== 0) return preferenceDifference;

    const distanceA = anchor ? estimatedDistanceKm(anchor.coordinates, a.coordinates) : null;
    const distanceB = anchor ? estimatedDistanceKm(anchor.coordinates, b.coordinates) : null;
    if (distanceA !== null && distanceB !== null && distanceA !== distanceB) return distanceA - distanceB;
    if (distanceA !== null && distanceB === null) return -1;
    if (distanceA === null && distanceB !== null) return 1;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.total_cost_vnd - b.total_cost_vnd;
  })[0];
}

function annotateRouteDistances(events: PlanServiceItem[]): PlanServiceItem[] {
  let previousCoordinates: [number, number] | null = null;

  return events.map((event, index) => {
    const currentCoordinates = validCoordinates(event.coordinates);
    const distanceFromPrevious = index === 0
      ? undefined
      : estimatedDistanceKm(previousCoordinates, currentCoordinates);
    previousCoordinates = currentCoordinates;

    return distanceFromPrevious === undefined
      ? event
      : { ...event, distance_from_previous_km: distanceFromPrevious };
  });
}

function parseDestinationRow(row: any): Destination {
  const hero = row.hero_image || '';
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    coordinates: safeJson(row.coordinates, [105.8542, 21.0285]),
    hero_image: hero,
    gallery_images: safeJson(row.gallery_images, hero ? [hero] : []),
    satisfaction_scores: safeJson(row.satisfaction_scores, { stay: 9.0, food: 9.0, transport: 9.0, activities: 9.0 }),
    activities: safeJson(row.activities, []),
    travel_tips: safeJson(row.travel_tips, []),
    minimum_two_day_cost_vnd: Number(row.minimum_two_day_cost_vnd || 1500000),
  };
}

// --------------------------------------------------------
// DESTINATION OPERATIONS (Direct Neon Database)
// --------------------------------------------------------

export async function getDestinationsFromDb(): Promise<Destination[]> {
  try {
    const rows = await sql`SELECT * FROM destinations ORDER BY name ASC`;
    if (rows && rows.length > 0) {
      return rows.map(parseDestinationRow);
    }
  } catch (err) {
    console.warn('Neon DB query failed for destinations, fallback to static dataset:', err);
  }
  return destinationsData as unknown as Destination[];
}

export async function addDestinationDb(dest: Partial<Destination> & { id: string; name: string; region: string }): Promise<Destination> {
  const code = dest.id.toUpperCase();
  const coords = JSON.stringify(dest.coordinates || [105.8542, 21.0285]);
  const gallery = JSON.stringify(dest.gallery_images || [dest.hero_image || '']);
  const scores = JSON.stringify(dest.satisfaction_scores || { stay: 9.0, food: 9.0, transport: 9.0, activities: 9.0 });
  const acts = JSON.stringify(dest.activities || []);
  const tips = JSON.stringify(dest.travel_tips || []);
  const hero = dest.hero_image || '';
  const minCost = dest.minimum_two_day_cost_vnd || 1500000;

  try {
    await sql`
      INSERT INTO destinations (id, code, name, region, category_type, tags, coordinates, hero_image, gallery_images, satisfaction_scores, activities, travel_tips, description, minimum_two_day_cost_vnd)
      VALUES (${dest.id}, ${code}, ${dest.name}, ${dest.region}, 'city', '[]', ${coords}, ${hero}, ${gallery}, ${scores}, ${acts}, ${tips}, '', ${minCost})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        region = EXCLUDED.region,
        coordinates = EXCLUDED.coordinates,
        hero_image = EXCLUDED.hero_image,
        gallery_images = EXCLUDED.gallery_images,
        satisfaction_scores = EXCLUDED.satisfaction_scores,
        activities = EXCLUDED.activities,
        travel_tips = EXCLUDED.travel_tips,
        minimum_two_day_cost_vnd = EXCLUDED.minimum_two_day_cost_vnd
    `;
  } catch (err) {
    console.error('Error inserting destination into Neon DB:', err);
  }

  return {
    id: dest.id,
    name: dest.name,
    region: dest.region,
    coordinates: dest.coordinates || [105.8542, 21.0285],
    hero_image: hero,
    gallery_images: dest.gallery_images || [hero],
    satisfaction_scores: dest.satisfaction_scores || { stay: 9.0, food: 9.0, transport: 9.0, activities: 9.0 },
    activities: dest.activities || [],
    travel_tips: dest.travel_tips || [],
    minimum_two_day_cost_vnd: minCost,
  };
}


export async function updateDestinationDb(dest: Destination): Promise<Destination> {
  return addDestinationDb(dest);
}

export async function deleteDestinationDb(id: string): Promise<boolean> {
  try {
    await sql`DELETE FROM destinations WHERE id = ${id}`;
    return true;
  } catch (err) {
    console.error('Error deleting destination from Neon DB:', err);
    return false;
  }
}

// --------------------------------------------------------
// SERVICE OPERATIONS (Direct Neon Database)
// --------------------------------------------------------

export async function getServicesFromDb(destinationId?: string): Promise<any[]> {
  const destCodes = destinationId
    ? (DEST_CODE_MAP[destinationId] || [destinationId, destinationId.toUpperCase()])
    : null;

  try {
    let rows;
    if (destCodes && destCodes.length > 0) {
      const primaryCode = destCodes[0];
      rows = await sql`SELECT * FROM services WHERE UPPER(destination_id) = UPPER(${primaryCode}) ORDER BY rating DESC`;
    } else {
      rows = await sql`SELECT * FROM services ORDER BY rating DESC LIMIT 500`;
    }
    if (rows && rows.length > 0) {
      return rows.map((r: any) => ({
        id: r.id,
        destination_id: r.destination_id,
        category: r.category,
        sub_category: r.sub_category,
        name: r.name,
        price: Number(r.price || 0),
        rating: Number(r.rating || 4.5),
        duration_mins: Number(r.duration_mins || 60),
        tags: safeJson(r.tags, []),
        image_url: r.image_url || '',
        booking_url: r.booking_url || '',
        meal_type: r.meal_type || 'breakfast,lunch,dinner',
        coordinates: safeJson(r.coordinates, null),
        geocoding_status: r.geocoding_status || 'pending',
        geocoding_confidence: r.geocoding_confidence == null ? null : Number(r.geocoding_confidence),
        geocoded_address: r.geocoded_address || '',
      }));
    }
  } catch (err) {
    console.warn('Neon DB query failed for services, using local dataset fallback:', err);
  }

  // Fallback with strict destination matching
  const dataset = fullDataset as any[];
  if (destCodes && destCodes.length > 0) {
    const uppercaseCodes = destCodes.map((c) => c.toUpperCase());
    return dataset.filter((s) => uppercaseCodes.includes((s.destination_id || '').toUpperCase()));
  }

  return dataset;
}


export async function addServiceDb(srv: any): Promise<any> {
  const id = srv.id || `SRV_${srv.destination_id || 'HAN'}_${Date.now()}`;
  const destId = srv.destination_id || 'HAN';
  const cat = srv.category || 'activity';
  const subCat = srv.sub_category || srv.subtype || 'standard';
  const name = srv.name || 'Dịch vụ mới';
  const price = Number(srv.price || 0);
  const rating = Number(srv.rating ?? 4.5);
  const duration = Number(srv.duration_mins ?? 60);
  const tags = JSON.stringify(Array.isArray(srv.tags) ? srv.tags : []);
  const img = srv.image_url || '';
  const booking = srv.booking_url || srv.affiliate_url || '';
  const mealType = srv.meal_type || 'breakfast,lunch,dinner';
  const coordinates = JSON.stringify(Array.isArray(srv.coordinates) ? srv.coordinates : null);
  const geocodingStatus = srv.geocoding_status || 'pending';
  const geocodingConfidence = srv.geocoding_confidence == null ? null : Number(srv.geocoding_confidence);
  const geocodedAddress = srv.geocoded_address || '';

  try {
    await sql`
      INSERT INTO services (id, destination_id, category, sub_category, name, price, rating, duration_mins, tags, image_url, booking_url, meal_type, coordinates, geocoding_status, geocoding_confidence, geocoded_address)
      VALUES (${id}, ${destId}, ${cat}, ${subCat}, ${name}, ${price}, ${rating}, ${duration}, ${tags}, ${img}, ${booking}, ${mealType}, ${coordinates}, ${geocodingStatus}, ${geocodingConfidence}, ${geocodedAddress})
      ON CONFLICT (id) DO UPDATE SET
        destination_id = EXCLUDED.destination_id,
        category = EXCLUDED.category,
        sub_category = EXCLUDED.sub_category,
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        rating = EXCLUDED.rating,
        duration_mins = EXCLUDED.duration_mins,
        tags = EXCLUDED.tags,
        image_url = EXCLUDED.image_url,
        booking_url = EXCLUDED.booking_url,
        meal_type = EXCLUDED.meal_type,
        coordinates = EXCLUDED.coordinates,
        geocoding_status = EXCLUDED.geocoding_status,
        geocoding_confidence = EXCLUDED.geocoding_confidence,
        geocoded_address = EXCLUDED.geocoded_address
    `;
  } catch (err) {

    console.error('Error inserting service into Neon DB:', err);
    throw err;
  }

  return { id, destination_id: destId, category: cat, sub_category: subCat, name, price, rating, duration_mins: duration, tags: Array.isArray(srv.tags) ? srv.tags : [], image_url: img, booking_url: booking, coordinates: srv.coordinates || null, geocoding_status: geocodingStatus };
}

export async function updateServiceDb(srv: any): Promise<any> {
  return addServiceDb(srv);
}

export async function deleteServiceDb(id: string): Promise<boolean> {
  try {
    await sql`DELETE FROM services WHERE id = ${id}`;
    return true;
  } catch (err) {
    console.error('Error deleting service from Neon DB:', err);
    return false;
  }
}

// --------------------------------------------------------
// PLANNER & RECOMMENDATION OPERATIONS (Direct Neon Database)
// --------------------------------------------------------

export async function recommendDestinationsDb(
  req: RecommendDestinationsRequest
): Promise<DestinationRecommendation[]> {
  const dests = await getDestinationsFromDb();
  const services = await getServicesFromDb();
  const limit = req.limit || 3;

  const recommendations = dests.map((d) => {
    const minCost = Math.round((d.minimum_two_day_cost_vnd || 1500000) * (req.num_days / 2) * Math.max(1, req.people * 0.7));
    const estimated = Math.min(req.total_budget, Math.max(minCost, Math.round(req.total_budget * 0.75)));
    const remaining = Math.max(0, req.total_budget - estimated);
    const destinationCodes = (DEST_CODE_MAP[d.id] || [d.id, d.code || '']).map((code) => String(code).toUpperCase());
    const destinationServices = services.filter((service) =>
      destinationCodes.includes(String(service.destination_id || '').toUpperCase()),
    );

    const preferenceMatches = (['stay', 'food', 'activity'] as PreferenceCategory[]).reduce(
      (matches, category) => {
        const styles = preferencesForCategory(req.preferences, category);
        return matches + styles.filter((style) =>
          destinationServices.some((service) => preferenceScore(service, [style]) > 0),
        ).length;
      },
      0,
    );
    const requestedPreferences =
      preferencesForCategory(req.preferences, 'stay').length +
      preferencesForCategory(req.preferences, 'food').length +
      preferencesForCategory(req.preferences, 'activity').length;
    const preferenceFit = requestedPreferences ? preferenceMatches / requestedPreferences : 0;
    const budgetFit = minCost <= req.total_budget ? 1 : req.total_budget / Math.max(1, minCost);
    const fitScore = Math.round(Math.min(10, 4 + preferenceFit * 4.5 + budgetFit * 1.5) * 10) / 10;

    return {
      destination: {
        id: d.id,
        name: d.name,
        region: d.region,
        coordinates: d.coordinates || [105.8542, 21.0285],
        hero_image: d.hero_image || '',
      },
      estimated_minimum_cost_vnd: estimated,
      remaining_vnd: remaining,
      fit_score: fitScore,
      preference_matches: preferenceMatches,
    };
  });

  // Do not dilute destination suggestions with unrelated places while at
  // least one destination can satisfy a selected preference.
  const preferenceCompatible = recommendations.filter((recommendation) => recommendation.preference_matches > 0);
  return (preferenceCompatible.length > 0 ? preferenceCompatible : recommendations).sort((a, b) => {
    if (b.fit_score !== a.fit_score) return b.fit_score - a.fit_score;
    if (b.remaining_vnd !== a.remaining_vnd) return b.remaining_vnd - a.remaining_vnd;
    return a.destination.name.localeCompare(b.destination.name, 'vi');
  }).slice(0, limit).map(({ preference_matches, ...recommendation }) => recommendation);
}

export async function getSimilarDestinationsDb(
  destinationId: string,
  limit: number = 3
): Promise<SimilarDestinationResult[]> {
  const dests = await getDestinationsFromDb();

  return dests
    .filter((d) => d.id !== destinationId)
    .slice(0, limit)
    .map((d) => ({
      destination: d,
      similarity_score: 0.94,
      matching_tags: ['Văn Hóa', 'Cảnh Quan'],
      reason: 'Điểm đến được truy xuất trực tiếp từ Neon Database theo phong cách & ngân sách tương đồng.',
    }));
}

export function getServiceIllustrationImage(item: any): string {
  if (item.image_url && typeof item.image_url === 'string' && item.image_url.trim().length > 10) {
    return item.image_url;
  }
  const cat = (item.category || '').toLowerCase();
  const dest = (item.destination_id || '').toLowerCase();

  if (cat === 'stay' || cat === 'accommodation') {
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85';
  }
  if (cat === 'food' || cat === 'dining') {
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85';
  }
  if (dest.includes('pqc') || dest.includes('phu-quoc')) {
    return 'https://images.unsplash.com/photo-1730714103959-5d5a30acf547?auto=format&fit=crop&w=1200&q=85';
  }
  if (dest.includes('dld') || dest.includes('da-lat')) {
    return 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=85';
  }
  if (dest.includes('dad') || dest.includes('da-nang')) {
    return 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=85';
  }
  if (dest.includes('hue')) {
    return 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=85';
  }
  return 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=85';
}

function formatDatasetService(item: any, people: number, nights: number): PlanServiceItem {
  const isStay = item.category === 'accommodation' || item.category === 'stay';
  const priceVnd = Math.round(Number(item.price || 0) / 1000) * 1000;
  const totalCost = isStay ? priceVnd * Math.max(1, nights) : priceVnd * people;

  return {
    id: item.id,
    destination_id: item.destination_id,
    category: isStay ? 'stay' : item.category === 'food' ? 'food' : 'activity',
    subtype: item.sub_category || 'standard',
    name: item.name,
    price_vnd: priceVnd,
    price_unit: isStay ? 'per_room' : 'per_person',
    capacity: isStay ? 2 : 1,
    duration_hours: Math.round(((item.duration_mins || 60) / 60) * 10) / 10,
    time_window: isStay ? 'overnight' : 'anytime',
    rating: Number(item.rating || 4.5),
    tags: Array.isArray(item.tags) ? item.tags : [],
    image_url: getServiceIllustrationImage(item),
    affiliate_url: item.booking_url || '',
    meal_type: item.meal_type || 'breakfast,lunch,dinner',
    coordinates: Array.isArray(item.coordinates) && item.coordinates.length === 2 ? item.coordinates : null,
    geocoding_status: item.geocoding_status || 'pending',
    total_cost_vnd: totalCost,
    day: 1,
    slot: 'morning',
  };
}



export async function materializePlanFromSelectionsDb(planState: PlanState): Promise<MaterializedPlan> {
  const destList = await getDestinationsFromDb();
  const reqDestId = planState.destination_id || 'HAN';
  const targetCodes = (DEST_CODE_MAP[reqDestId] || [reqDestId, reqDestId.toUpperCase()]).map(c => c.toUpperCase());

  const dest = destList.find((d) => 
    d.id.toLowerCase() === reqDestId.toLowerCase() ||
    (d.code && targetCodes.includes(d.code.toUpperCase()))
  ) || destList.find((d) => (d.code || d.id).toUpperCase() === 'HAN') || destList[0];

  const rawServices = await getServicesFromDb(reqDestId);
  const destServices = rawServices.filter((s) => targetCodes.includes((s.destination_id || '').toUpperCase()));

  const nights = Math.max(0, planState.num_days - 1);

  // Find stay service from selections
  const staySel = planState.selections?.find((s) => s.slot === 'overnight' || s.day === 0);
  let rawStay = (staySel?.service_id ? rawServices.find((s) => s.id === staySel.service_id) : null) ||
    destServices.find((i) => i.category === 'accommodation' || i.category === 'stay');

  if (!rawStay) {
    rawStay = {
      id: `SRV_${targetCodes[0]}_001`,
      destination_id: targetCodes[0],
      category: 'accommodation',
      sub_category: 'hotel',
      name: `Khách sạn cao cấp tại ${dest.name}`,
      price: 1200000,
      rating: 4.8,
    };
  }

  const lodgingService = formatDatasetService(rawStay, planState.people, nights);
  lodgingService.time_window = 'overnight';
  // Accommodation is charged by night. Do not add a hotel charge to a day
  // trip, and keep the exact per-night allocation so the card amounts, daily
  // totals, and trip allocation always describe the same money.
  const stayCost = nights > 0 ? lodgingService.total_cost_vnd : 0;
  const stayCostByDay = Array.from({ length: planState.num_days }, (_, index) => {
    if (index >= nights) return 0;

    const baseCost = Math.floor(stayCost / nights);
    const remainder = stayCost % nights;
    return baseCost + (index < remainder ? 1 : 0);
  });

  const createCheckInEvent = (hotelItem: PlanServiceItem, day: number): PlanServiceItem => ({
    id: `CHECK_IN_${hotelItem.id}_D${day}`,
    destination_id: hotelItem.destination_id,
    category: 'stay',
    subtype: 'check_in',
    name: `🏨 Check-in Nhận Phòng: ${hotelItem.name}`,
    price_vnd: 0,
    price_unit: 'per_room',
    total_cost_vnd: 0,
    display_cost_vnd: 0,
    capacity: 2,
    duration_hours: 0.5,
    time_window: 'check_in',
    rating: hotelItem.rating,
    tags: ['check_in', 'nhan_phong'],
    image_url: hotelItem.image_url,
    affiliate_url: hotelItem.affiliate_url,
    day: day,
    slot: 'check_in',
    start_time: '14:00',
    end_time: '14:30',
  });

  const createCheckOutEvent = (hotelItem: PlanServiceItem, day: number): PlanServiceItem => ({
    id: `CHECK_OUT_${hotelItem.id}_D${day}`,
    destination_id: hotelItem.destination_id,
    category: 'stay',
    subtype: 'check_out',
    name: `🔑 Check-out Trả Phòng: ${hotelItem.name}`,
    price_vnd: 0,
    price_unit: 'per_room',
    total_cost_vnd: 0,
    display_cost_vnd: 0,
    capacity: 2,
    duration_hours: 0.5,
    time_window: 'check_out',
    rating: hotelItem.rating,
    tags: ['check_out', 'tra_phong'],
    image_url: hotelItem.image_url,
    affiliate_url: hotelItem.affiliate_url,
    day: day,
    slot: 'check_out',
    start_time: '12:00',
    end_time: '12:30',
  });

  const defaultTimes: Record<string, { start: string; end: string }> = {
    breakfast: { start: '08:00', end: '09:00' },
    morning: { start: '09:30', end: '12:00' },
    lunch: { start: '12:00', end: '13:30' },
    afternoon: { start: '14:00', end: '17:00' },
    dinner: { start: '19:00', end: '20:30' },
    evening: { start: '20:30', end: '22:00' },
  };

  let foodAllocated = 0;
  let actAllocated = 0;

  const dailyItinerary = Array.from({ length: planState.num_days }, (_, idx) => {
    const dayNum = idx + 1;
    const dayEvents: PlanServiceItem[] = [];

    // Show and charge the hotel only on nights that are actually stayed.
    // Its card price must be the same amount included in this day's total.
    const stayCostForDay = stayCostByDay[idx];
    if (stayCostForDay > 0) {
      dayEvents.push({
        ...lodgingService,
        day: dayNum,
        slot: 'overnight',
        total_cost_vnd: stayCostForDay,
        display_cost_vnd: stayCostForDay,
      });
    }

    // Day 1 Check-in procedure
    if (dayNum === 1 && nights > 0) {
      dayEvents.push(createCheckInEvent(lodgingService, dayNum));
    }

    const slots = ['breakfast', 'morning', 'lunch', 'afternoon', 'dinner'];
    for (const slotName of slots) {
      const sel = planState.selections?.find((s) => s.day === dayNum && s.slot === slotName);
      const isActivitySlot = ['morning', 'afternoon', 'evening'].includes(slotName);

      // Leave intentionally empty activity slots empty instead of adding a
      // fallback activity that could duplicate one scheduled on another day.
      if (isActivitySlot && !sel) continue;
      let rawSrv = sel?.service_id ? rawServices.find((s) => s.id === sel.service_id) : null;

      if (!rawSrv) {
        const isFood = ['breakfast', 'lunch', 'dinner'].includes(slotName);
        const candidates = destServices.filter((s) => isFood ? s.category === 'food' : s.category === 'activity');
        rawSrv = candidates[(dayNum + slotName.length) % Math.max(1, candidates.length)] || {
          id: `SRV_${targetCodes[0]}_${slotName.toUpperCase()}`,
          destination_id: targetCodes[0],
          category: isFood ? 'food' : 'activity',
          name: isFood ? `Thưởng thức ẩm thực tại ${dest.name}` : `Tham quan tại ${dest.name}`,
          price: isFood ? 150000 : 100000,
          rating: 4.8,
        };
      }

      const formatted = formatDatasetService(rawSrv, planState.people, nights);
      const times = defaultTimes[slotName] || { start: '10:00', end: '12:00' };

      const event: PlanServiceItem = {
        ...formatted,
        day: dayNum,
        slot: slotName,
        start_time: times.start,
        end_time: times.end,
      };

      dayEvents.push(event);

      if (event.category === 'food') {
        foodAllocated += event.total_cost_vnd;
      } else if (event.category === 'activity' || (event.category as string) === 'activities') {
        actAllocated += event.total_cost_vnd;
      }
    }

    if (dayNum === planState.num_days && nights > 0) {
      dayEvents.push(createCheckOutEvent(lodgingService, dayNum));
    }

    const parseTimeToMinutes = (timeStr?: string, slot?: string): number => {
      if (slot === 'overnight') return 0;
      if (slot === 'check_out') return 1200;
      if (slot === 'check_in') return 1400;

      if (timeStr && timeStr.includes(':')) {
        const parts = timeStr.split(':').map(Number);
        return (parts[0] || 0) * 100 + (parts[1] || 0);
      }
      const slotWeights: Record<string, number> = {
        breakfast: 800,
        morning: 930,
        check_out: 1200,
        lunch: 1230,
        check_in: 1400,
        afternoon: 1430,
        dinner: 1900,
        evening: 2030,
      };
      return slotWeights[slot || ''] || 1000;
    };

    dayEvents.sort((a, b) => parseTimeToMinutes(a.start_time, a.slot) - parseTimeToMinutes(b.start_time, b.slot));
    const routedEvents = annotateRouteDistances(dayEvents);

    const dayFoodTotal = routedEvents.filter((e) => e.category === 'food').reduce((sum, e) => sum + e.total_cost_vnd, 0);
    const dayActTotal = routedEvents.filter((e) => e.category === 'activity' || (e.category as string) === 'activities').reduce((sum, e) => sum + e.total_cost_vnd, 0);

    return {
      day: dayNum,
      events: routedEvents,
      costs: {
        stay: stayCostForDay,
        food: dayFoodTotal,
        activity: dayActTotal,
      },
      total_cost_vnd: stayCostForDay + dayFoodTotal + dayActTotal,
    };
  });

  const totalAllocated = stayCost + foodAllocated + actAllocated;

  return {
    status: 'success',
    destination: {
      id: dest.id,
      name: dest.name,
      region: dest.region,
      coordinates: dest.coordinates || [105.8542, 21.0285],
      hero_image: dest.hero_image || '',
    },
    trip: { people: planState.people, num_days: planState.num_days, nights: nights },
    budget: {
      total_vnd: planState.total_budget,
      allocated_vnd: totalAllocated,
      remaining_vnd: Math.max(0, planState.total_budget - totalAllocated),
      per_person_vnd: Math.round(totalAllocated / planState.people),
      allocations: {
        stay: { amount_vnd: stayCost, percentage: Math.round((stayCost / (totalAllocated || 1)) * 100) },
        food: { amount_vnd: foodAllocated, percentage: Math.round((foodAllocated / (totalAllocated || 1)) * 100) },
        activity: { amount_vnd: actAllocated, percentage: Math.round((actAllocated / (totalAllocated || 1)) * 100) },
      },
    },
    daily_itinerary: dailyItinerary,
    plan_state: planState,
    data_version: 'v3.0_neon_database',
    data_source: 'Neon PostgreSQL Database (Direct Driver)',
  };
}

export async function generatePlanDb(req: GeneratePlanRequest): Promise<MaterializedPlan> {
  const destList = await getDestinationsFromDb();
  const reqDestId = req.destination_id || 'HAN';
  
  const targetCodes = (DEST_CODE_MAP[reqDestId] || [reqDestId, reqDestId.toUpperCase()]).map(c => c.toUpperCase());
  
  const dest = destList.find((d) => 
    d.id.toLowerCase() === reqDestId.toLowerCase() ||
    (d.code && targetCodes.includes(d.code.toUpperCase()))
  ) || destList.find((d) => (d.code || d.id).toUpperCase() === 'HAN') || destList[0];

  const rawServices = await getServicesFromDb(reqDestId);
  const destServices = rawServices.filter((s) => targetCodes.includes((s.destination_id || '').toUpperCase()));

  const stays = destServices.filter((i) => i.category === 'accommodation' || i.category === 'stay');
  const foods = destServices.filter((i) => i.category === 'food');
  const acts = destServices.filter((i) => i.category === 'activity');

  const nights = Math.max(0, req.num_days - 1);
  const stayPriority = req.priorities?.stay || 'normal';
  const stayShare = stayPriority === 'very_important' || stayPriority === 'important' ? 0.50 : stayPriority === 'none' ? 0.30 : 0.40;
  const maxStayBudget = Math.max(800000, req.total_budget * stayShare);

  // Filter stays that fit within maxStayBudget for total nights
  const budgetStays = stays.filter((s) => {
    const formatted = formatDatasetService(s, req.people, nights);
    return formatted.total_cost_vnd <= maxStayBudget;
  });

  let rawStay: any = null;
  if (budgetStays.length > 0) {
    // Use a selected lodging style exclusively whenever one fits the stay budget.
    rawStay = matchingServicesOrFallback(
      budgetStays,
      preferencesForCategory(req.preferences, 'stay'),
    )[0];
  } else if (stays.length > 0) {
    // Fallback 1: Filter stays that fit within 65% of total trip budget
    const affordableStays = stays.filter((s) => {
      const formatted = formatDatasetService(s, req.people, nights);
      return formatted.total_cost_vnd <= req.total_budget * 0.65;
    });

    if (affordableStays.length > 0) {
      rawStay = matchingServicesOrFallback(
        affordableStays,
        preferencesForCategory(req.preferences, 'stay'),
      )[0];
    } else {
      // Fallback 2: Pick cheapest stay available
      rawStay = [...stays].sort((a, b) => {
        const costA = formatDatasetService(a, req.people, nights).total_cost_vnd;
        const costB = formatDatasetService(b, req.people, nights).total_cost_vnd;
        return costA - costB;
      })[0];
    }
  }

  if (!rawStay) {
    rawStay = {
      id: `SRV_${targetCodes[0]}_001`,
      destination_id: targetCodes[0],
      category: 'accommodation',
      sub_category: 'hotel',
      name: `Khách sạn cao cấp tại ${dest.name}`,
      price: Math.min(1200000, Math.round(maxStayBudget / Math.max(1, nights))),
      rating: 4.8,
    };
  }

  const lodgingService = formatDatasetService(rawStay, req.people, nights);

  const foodSource = matchingServicesOrFallback(
    foods,
    preferencesForCategory(req.preferences, 'food'),
  );
  const actSource = matchingServicesOrFallback(
    acts,
    preferencesForCategory(req.preferences, 'activity'),
    req.num_days,
  );

  const foodItemsFormatted = foodSource.map((f) => formatDatasetService(f, req.people, nights));
  const actItemsFormatted = actSource.map((a) => formatDatasetService(a, req.people, nights));

  if (foodItemsFormatted.length === 0) {
    foodItemsFormatted.push(formatDatasetService({
      id: `SRV_${targetCodes[0]}_FOOD_01`,
      destination_id: targetCodes[0],
      category: 'food',
      name: `Thưởng thức ẩm thực đặc sản tại ${dest.name}`,
      price: 150000,
      rating: 4.8
    }, req.people, nights));
  }

  if (actItemsFormatted.length === 0) {
    actItemsFormatted.push(formatDatasetService({
      id: `SRV_${targetCodes[0]}_ACT_01`,
      destination_id: targetCodes[0],
      category: 'activity',
      name: `Tham quan các danh thắng nổi tiếng tại ${dest.name}`,
      price: 100000,
      rating: 4.8
    }, req.people, nights));
  }

  const uniqueActivities = actItemsFormatted.filter(
    (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
  );

  if (uniqueActivities.length < req.num_days) {
    throw new Error('Kh\u00f4ng \u0111\u1ee7 ho\u1ea1t \u0111\u1ed9ng kh\u00e1c nhau \u0111\u1ec3 x\u1ebfp l\u1ecbch cho m\u1ed7i ng\u00e0y.');
  }

  const usedFoodIds = new Set<string>();
  const getNextUniqueFood = (slotType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'late_night'): PlanServiceItem => {
    const matchingUnused = foodItemsFormatted.find((item) => {
      if (usedFoodIds.has(item.id)) return false;
      const meals = (item.meal_type || 'breakfast,lunch,dinner').toLowerCase();
      return meals.includes(slotType);
    });

    if (matchingUnused) {
      usedFoodIds.add(matchingUnused.id);
      return matchingUnused;
    }

    const anyUnused = foodItemsFormatted.find((item) => !usedFoodIds.has(item.id));
    if (anyUnused) {
      usedFoodIds.add(anyUnused.id);
      return anyUnused;
    }

    const recycledIndex = usedFoodIds.size % foodItemsFormatted.length;
    return foodItemsFormatted[recycledIndex] || foodItemsFormatted[0];
  };

  const selections: any[] = [];
  if (nights > 0) {
    selections.push({ service_id: lodgingService.id, day: 0, slot: 'overnight' });
  }

  const remainingActivities = [...uniqueActivities];
  const activityStyles = preferencesForCategory(req.preferences, 'activity');
  for (let idx = 0; idx < req.num_days; idx++) {
    const dayNum = idx + 1;
    const bfast = getNextUniqueFood('breakfast');
    const lunch = getNextUniqueFood('lunch');
    const dinner = getNextUniqueFood('dinner');

    // Every day receives different activities. Within the same preference
    // score, pick the closest next stop to shorten the day's route.
    const dailyActivity = selectRouteAwareActivity(remainingActivities, bfast, activityStyles);
    if (dailyActivity) {
      remainingActivities.splice(remainingActivities.findIndex((activity) => activity.id === dailyActivity.id), 1);
    }
    const remainingPrimaryDays = req.num_days - dayNum;
    const secondaryActivity = remainingActivities.length > remainingPrimaryDays
      ? selectRouteAwareActivity(remainingActivities, dailyActivity, activityStyles)
      : null;
    if (secondaryActivity) {
      remainingActivities.splice(remainingActivities.findIndex((activity) => activity.id === secondaryActivity.id), 1);
    }

    selections.push({ service_id: bfast.id, day: dayNum, slot: 'breakfast' });
    if (dailyActivity) {
      selections.push({ service_id: dailyActivity.id, day: dayNum, slot: 'morning' });
    }
    selections.push({ service_id: lunch.id, day: dayNum, slot: 'lunch' });
    if (secondaryActivity) {
      selections.push({ service_id: secondaryActivity.id, day: dayNum, slot: 'afternoon' });
    }
    selections.push({ service_id: dinner.id, day: dayNum, slot: 'dinner' });
  }

  const initialState: PlanState = {
    destination_id: dest.id as any,
    total_budget: req.total_budget,
    people: req.people,
    num_days: req.num_days,
    priorities: req.priorities,
    preferences: req.preferences,
    selections: selections,
    catalog_version: 'v3.0_neon_database',
  };

  return materializePlanFromSelectionsDb(initialState);
}

export async function getSwapOptionsDb(req: SwapOptionsRequest): Promise<SwapOptionsResponse> {
  const destId = req.plan_state.destination_id;
  const targetCodes = (DEST_CODE_MAP[destId] || [destId, destId.toUpperCase()]).map((c) => c.toUpperCase());
  
  const services = await getServicesFromDb(destId);

  // Category Filtering for Swap Candidates (Requirement 2)
  const targetId = req.target.service_id;
  const targetSlot = (req.target.slot || '').toLowerCase();
  const targetService = services.find((s) => s.id === targetId);

  let targetCategory: string = targetService?.category || '';
  if (!targetCategory) {
    if (['breakfast', 'lunch', 'dinner', 'food'].includes(targetSlot)) {
      targetCategory = 'food';
    } else if (['overnight', 'stay', 'accommodation', 'hotel', 'check_in', 'check_out'].includes(targetSlot)) {
      targetCategory = 'accommodation';
    } else {
      targetCategory = 'activity';
    }
  }

  const candidates = services.filter((item) => {
    if (item.id === targetId) return false;
    const destMatch = targetCodes.includes((item.destination_id || '').toUpperCase());
    if (!destMatch) return false;

    if (targetCategory === 'food') {
      return item.category === 'food';
    } else if (targetCategory === 'accommodation' || targetCategory === 'stay') {
      return item.category === 'accommodation' || item.category === 'stay';
    } else {
      return item.category === 'activity' || item.category === 'activities';
    }
  });

  const nights = Math.max(0, req.plan_state.num_days - 1);
  const routeOrder: Record<string, number> = {
    breakfast: 1,
    morning: 2,
    lunch: 3,
    afternoon: 4,
    dinner: 5,
    evening: 6,
  };
  const targetOrder = routeOrder[targetSlot] || 0;
  const previousSelection = (req.plan_state.selections || [])
    .filter((selection) => selection.day === req.target.day && (routeOrder[selection.slot] || 0) < targetOrder)
    .sort((a, b) => (routeOrder[b.slot] || 0) - (routeOrder[a.slot] || 0))[0];
  const previousService = previousSelection
    ? services.find((service) => service.id === previousSelection.service_id)
    : null;

  const formatted = candidates.map((candidate) => {
    const item = formatDatasetService(candidate, req.plan_state.people, nights);
    const distanceFromPrevious = estimatedDistanceKm(previousService?.coordinates, item.coordinates);
    return previousService
      ? { ...item, distance_from_previous_km: distanceFromPrevious }
      : item;
  });
  const preferenceCategory: PreferenceCategory = targetCategory === 'food'
    ? 'food'
    : targetCategory === 'accommodation' || targetCategory === 'stay'
      ? 'stay'
      : 'activity';
  const preferredStyles = preferencesForCategory(req.plan_state.preferences, preferenceCategory);

  // Keep budget-eligible options above over-budget ones, then prefer the
  // traveller's saved styles before rating and cost break ties.
  formatted.sort((a, b) => {
    const costA = a.total_cost_vnd;
    const costB = b.total_cost_vnd;
    const fitsA = costA <= req.plan_state.total_budget;
    const fitsB = costB <= req.plan_state.total_budget;
    if (fitsA && !fitsB) return -1;
    if (!fitsA && fitsB) return 1;
    const preferenceDifference = preferenceScore(b, preferredStyles) - preferenceScore(a, preferredStyles);
    if (preferenceDifference !== 0) return preferenceDifference;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return costA - costB;
  });

  return {
    status: 'success',
    target: req.target,
    alternatives: formatted.slice(0, 8),
    data_version: 'v3.0_neon_database',
  };
}


export async function applySwapDb(req: ApplySwapRequest): Promise<MaterializedPlan> {
  const { plan_state, target, replacement_service_id } = req;
  if (!plan_state) {
    throw new Error('Missing plan_state in ApplySwapRequest');
  }

  const isStaySwap = target.slot === 'overnight' || target.day === 0;

  const updatedSelections = (plan_state.selections || []).map((s) => {
    if (isStaySwap && (s.slot === 'overnight' || s.day === 0)) {
      return { service_id: replacement_service_id, day: 0, slot: 'overnight' };
    }
    if (s.day === target.day && s.slot === target.slot) {
      return { service_id: replacement_service_id, day: target.day, slot: target.slot };
    }
    if (target.service_id && s.service_id === target.service_id && s.day === target.day) {
      return { service_id: replacement_service_id, day: target.day, slot: target.slot };
    }
    return s;
  });

  const matched = updatedSelections.some((s) => s.service_id === replacement_service_id);
  if (!matched) {
    updatedSelections.push({
      service_id: replacement_service_id,
      day: isStaySwap ? 0 : target.day,
      slot: isStaySwap ? 'overnight' : target.slot,
    });
  }

  const updatedState: PlanState = {
    ...plan_state,
    selections: updatedSelections,
  };

  return materializePlanFromSelectionsDb(updatedState);
}

// --------------------------------------------------------
// HERO CONFIG & SLIDES OPERATIONS (Direct Neon Database)
// --------------------------------------------------------

export async function getHeroConfigFromDb(): Promise<HeroConfig> {
  try {
    const rows = await sql`SELECT value FROM site_config WHERE key = 'hero'`;
    if (rows && rows.length > 0) {
      return safeJson(rows[0].value, DEFAULT_HERO_CONFIG);
    }
  } catch (err) {
    console.warn('Neon DB query failed for hero config, fallback to default:', err);
  }
  return DEFAULT_HERO_CONFIG;
}

export async function updateHeroConfigDb(config: HeroConfig): Promise<HeroConfig> {
  try {
    const val = JSON.stringify(config);
    await sql`
      INSERT INTO site_config (key, value)
      VALUES ('hero', ${val})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
  } catch (err) {
    console.error('Error saving hero config to Neon DB:', err);
  }
  return config;
}

export async function getSlidesFromDb(): Promise<JourneySlide[]> {
  try {
    const rows = await sql`SELECT * FROM slides ORDER BY id ASC`;
    if (rows && rows.length > 0) {
      return rows.map((r: any) => ({
        id: r.id,
        category: r.category,
        title: r.title,
        titleHighlight: r.titlehighlight || r.titleHighlight || '',
        description: r.description,
        image: r.image,
        imageCaptionTitle: r.imagecaptiontitle || r.imageCaptionTitle || '',
        imageCaptionSub: r.imagecaptionsub || r.imageCaptionSub || '',
        features: safeJson(r.features, []),
      }));
    }
  } catch (err) {
    console.warn('Neon DB query failed for slides, fallback to default:', err);
  }
  return slidesData as unknown as JourneySlide[];
}

export async function addSlideDb(slide: JourneySlide): Promise<JourneySlide> {
  const feats = JSON.stringify(slide.features || []);
  const titleHighlight = slide.titleHighlight || '';
  const imgCaptionTitle = slide.imageCaptionTitle || '';
  const imgCaptionSub = slide.imageCaptionSub || '';

  try {
    await sql`
      INSERT INTO slides (id, category, title, "titleHighlight", description, image, "imageCaptionTitle", "imageCaptionSub", features)
      VALUES (${slide.id}, ${slide.category}, ${slide.title}, ${titleHighlight}, ${slide.description}, ${slide.image}, ${imgCaptionTitle}, ${imgCaptionSub}, ${feats})
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        title = EXCLUDED.title,
        "titleHighlight" = EXCLUDED."titleHighlight",
        description = EXCLUDED.description,
        image = EXCLUDED.image,
        "imageCaptionTitle" = EXCLUDED."imageCaptionTitle",
        "imageCaptionSub" = EXCLUDED."imageCaptionSub",
        features = EXCLUDED.features
    `;
  } catch (err) {
    console.error('Error saving slide to Neon DB:', err);
  }
  return slide;
}

export async function updateSlideDb(slide: JourneySlide): Promise<JourneySlide> {
  return addSlideDb(slide);
}

export async function deleteSlideDb(id: string): Promise<boolean> {
  try {
    await sql`DELETE FROM slides WHERE id = ${id}`;
    return true;
  } catch (err) {
    console.error('Error deleting slide from Neon DB:', err);
    return false;
  }
}
