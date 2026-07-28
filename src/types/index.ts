export type PriorityLevel = 'none' | 'normal' | 'important' | 'very_important';

export type LodgingStyle = 'hotel' | 'resort' | 'homestay' | 'villa' | 'hostel' | 'casual' | 'check_in' | 'luxury' | 'nature' | 'scenic_view' | 'street_food';
export type FoodStyle = 'seafood' | 'local_specialty' | 'buffet' | 'street_food' | 'fine_dining' | 'cafe' | 'fast_food' | 'asian_food' | 'casual' | 'healthy' | 'scenic_view' | 'vegetarian' | 'western_food';
export type ActivityStyle = 'check_in' | 'culture' | 'entertainment' | 'history' | 'nature' | 'scenic_view' | 'shopping' | 'street_food';
export type DestinationId = 'ha-noi' | 'hue' | 'da-nang' | 'da-lat' | 'phu-quoc';

export interface Priorities {
  stay: PriorityLevel;
  food: PriorityLevel;
  activity: PriorityLevel;
}

export interface Preferences {
  lodging_styles: LodgingStyle[];
  food_styles: FoodStyle[];
  activity_styles: ActivityStyle[];
}

export interface TripCriteria {
  total_budget: number;
  people: number;
  num_days: number;
  priorities: Priorities;
  preferences: Preferences;
}

export interface GeneratePlanRequest extends TripCriteria {
  destination_id: DestinationId;
}

export interface RecommendDestinationsRequest extends TripCriteria {
  limit?: number;
}

export interface PlanSelection {
  service_id: string;
  day: number;
  slot: string;
}

export interface PlanState {
  destination_id: DestinationId;
  total_budget: number;
  people: number;
  num_days: number;
  priorities: Priorities;
  preferences: Preferences;
  selections: PlanSelection[];
  catalog_version: string;
}

export interface SwapOptionsRequest {
  plan_state: PlanState;
  target: PlanSelection;
}

export interface ApplySwapRequest extends SwapOptionsRequest {
  replacement_service_id: string;
}

export interface PlanServiceItem {
  id: string;
  destination_id: string;
  category: 'stay' | 'food' | 'activity';
  subtype: string;
  name: string;
  price_vnd: number;
  price_unit: 'per_person' | 'per_room';
  total_cost_vnd: number;
  display_cost_vnd?: number;
  capacity: number;
  duration_hours: number;
  time_window: string;
  rating: number;
  tags: string[];
  image_url: string;
  affiliate_url?: string | null;
  source?: string;
  updated_at?: string;
  day?: number;
  slot?: string;
  start_time?: string;
  end_time?: string;
}

export interface DailyItineraryDayCosts {
  stay: number;
  food: number;
  activity: number;
}

export interface DailyItineraryDayPlan {
  day: number;
  events: PlanServiceItem[];
  costs: DailyItineraryDayCosts;
  total_cost_vnd: number;
}

export interface BudgetAllocationCategory {
  amount_vnd: number;
  percentage: number;
}

export interface BudgetOverview {
  total_vnd: number;
  allocated_vnd: number;
  remaining_vnd: number;
  per_person_vnd: number;
  allocations: {
    stay: BudgetAllocationCategory;
    food: BudgetAllocationCategory;
    activity: BudgetAllocationCategory;
  };
}

export interface MaterializedPlan {
  status: 'success' | 'infeasible' | 'error';
  reason?: string;
  minimum_cost_vnd?: number;
  shortfall_vnd?: number;
  message?: string;
  destination?: {
    id: string;
    name: string;
    region: string;
    coordinates: [number, number];
    hero_image: string;
  };
  trip?: {
    people: number;
    num_days: number;
    nights: number;
  };
  budget?: BudgetOverview;
  daily_itinerary?: DailyItineraryDayPlan[];
  plan_state?: PlanState;
  data_version?: string;
  data_source?: string;
  data_updated_at?: string;
}

export interface DestinationRecommendation {
  destination: {
    id: string;
    name: string;
    region: string;
    coordinates: [number, number];
    hero_image: string;
  };
  estimated_minimum_cost_vnd: number;
  remaining_vnd: number;
  fit_score: number;
}

export interface SwapOptionsResponse {
  status: string;
  target: PlanSelection;
  alternatives: PlanServiceItem[];
  data_version?: string;
}

export interface SimilarDestinationResult {
  destination: Destination;
  similarity_score: number;
  matching_tags: string[];
  reason: string;
}

export interface ActivityItem {
  id: string;
  name: string;
  cost: number;
  category: 'stay' | 'food' | 'transport' | 'activities';
  duration_hrs: number;
  score: number;
  image?: string;
}

export interface TravelTipItem {
  id?: string;
  title: string;
  content: string;
}

export interface Destination {
  id: string;
  code?: string;
  name: string;
  region: string;
  category_type?: string;
  tags?: string[];
  description?: string;
  coordinates: [number, number];
  hero_image: string;
  gallery_images: string[];
  satisfaction_scores: {
    stay: number;
    food: number;
    transport: number;
    activities: number;
  };
  activities: ActivityItem[];
  travel_tips?: TravelTipItem[];
  minimum_two_day_cost_vnd?: number;
}


export interface CategoryAllocation {
  amount: number;
  percentage: number;
  daily: number;
}

export interface OptimizationParams {
  total_budget: number;
  num_days: number;
  daily_budget: number;
  tier: string;
}

export interface DailyItineraryDay {
  day: number;
  title: string;
  stay_cost: number;
  food_cost: number;
  transport_cost: number;
  activities_cost: number;
  daily_total: number;
  suggested_items: ActivityItem[];
}

export interface OptimizationResult {
  status: string;
  solver: string;
  destination: Destination;
  params: OptimizationParams;
  summary: {
    total_allocated: number;
    satisfaction_index: number;
    allocations: {
      stay: CategoryAllocation;
      food: CategoryAllocation;
      transport: CategoryAllocation;
      activities: CategoryAllocation;
    };
  };
  daily_itinerary: DailyItineraryDay[];
}

export interface UserPreferences {
  stay: number;
  food: number;
  transport: number;
  activities: number;
}

export interface JourneySlide {
  id: string;
  category: string;
  title: string;
  titleHighlight: string;
  description: string;
  image: string;
  imageCaptionTitle: string;
  imageCaptionSub: string;
  features: string[];
}

export interface HeroConfig {
  badge: string;
  titleLine1: string;
  titleLine2: string;
  titleHighlight: string;
  backgroundImage: string;
  ctaButtonText: string;
}

