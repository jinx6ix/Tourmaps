// Shared domain types — mirror the Supabase schema in supabase/migrations/0001_init.sql
// This is the contract between extraction (PDF/URL/form/free-text), geocoding, and the 3D map.

export type StopType =
  | "destination"
  | "accommodation"
  | "game_park"
  | "airport"
  | "activity";

export type ArrivalMode = "road" | "air" | null;

export type SourceType = "pdf" | "url" | "form" | "free_text";

export type RouteStatus = "draft" | "published" | "archived";

export type SegmentMode = "road" | "flight";

export interface Stop {
  id: string;
  routeId: string;
  dayNumber: number;
  orderIndex: number;
  stopType: StopType;
  name: string;
  description?: string | null;
  lat: number;
  lng: number;
  elevationMeters?: number | null;
  nights?: number | null;
  arrivalMode?: ArrivalMode;
  placeId?: string | null;
}

export interface RouteSegment {
  id: string;
  routeId: string;
  fromStopId: string;
  toStopId: string;
  mode: SegmentMode;
  geometry: GeoJSON.Position[]; // [lng, lat][]
  distanceMeters?: number | null;
  durationSeconds?: number | null;
}

export interface Route {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  coverImageUrl?: string | null;
  status: RouteStatus;
  sourceType: SourceType;
  sourceReference?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteWithStops extends Route {
  stops: Stop[];
  segments: RouteSegment[];
}

// ─────────────────────────────────────────────
// Extraction layer contract
// What the PDF / URL / free-text extractor must return before geocoding.
// Coordinates are not required yet — geocoding fills lat/lng from `name`.
// ─────────────────────────────────────────────
export interface ExtractedStop {
  day: number;
  type: StopType;
  name: string;
  description?: string;
  nights?: number;
  arrivalMode?: ArrivalMode;
}

export interface ExtractionResult {
  title: string;
  summary?: string;
  stops: ExtractedStop[];
  warnings?: string[]; // e.g. "Could not confidently parse day 4"
}

// ─────────────────────────────────────────────
// Manual structured form input (day-by-day)
// ─────────────────────────────────────────────
export interface ManualStopInput {
  day: number;
  type: StopType;
  name: string;
  description?: string;
  nights?: number;
  arrivalMode?: ArrivalMode;
}
