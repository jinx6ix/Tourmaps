// Raw row shapes as returned by Supabase, matching supabase/migrations/0001_init.sql.
// Kept separate from the domain types in types/itinerary.ts, which use camelCase
// and are what the rest of the app actually works with.

export interface StopRow {
  id: string;
  route_id: string;
  day_number: number;
  order_index: number;
  stop_type: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  elevation_meters: number | null;
  nights: number | null;
  arrival_mode: string | null;
  place_id: string | null;
}

export interface RouteSegmentRow {
  id: string;
  route_id: string;
  from_stop_id: string;
  to_stop_id: string;
  mode: string;
  geometry: GeoJSON.Position[];
  distance_meters: number | null;
  duration_seconds: number | null;
}

export interface RouteRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_image_url: string | null;
  status: string;
  source_type: string;
  source_reference: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
