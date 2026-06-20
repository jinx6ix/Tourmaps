import { createClient } from "@/lib/supabase/server";
import type { Route, Stop, RouteSegment, RouteWithStops } from "@/types/itinerary";
import type { StopRow, RouteSegmentRow, RouteRow } from "@/lib/data/row-types";

function mapStopRow(row: StopRow): Stop {
  return {
    id: row.id,
    routeId: row.route_id,
    dayNumber: row.day_number,
    orderIndex: row.order_index,
    stopType: row.stop_type as Stop["stopType"],
    name: row.name,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    elevationMeters: row.elevation_meters,
    nights: row.nights,
    arrivalMode: row.arrival_mode as Stop["arrivalMode"],
    placeId: row.place_id,
  };
}

function mapSegmentRow(row: RouteSegmentRow): RouteSegment {
  return {
    id: row.id,
    routeId: row.route_id,
    fromStopId: row.from_stop_id,
    toStopId: row.to_stop_id,
    mode: row.mode as RouteSegment["mode"],
    geometry: row.geometry,
    distanceMeters: row.distance_meters,
    durationSeconds: row.duration_seconds,
  };
}

function mapRouteRow(row: RouteRow): Route {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverImageUrl: row.cover_image_url,
    status: row.status as Route["status"],
    sourceType: row.source_type as Route["sourceType"],
    sourceReference: row.source_reference,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Fetches a published route by slug for the public tour detail page. */
export async function getPublishedRouteBySlug(
  slug: string
): Promise<RouteWithStops | null> {
  const supabase = createClient();

  const { data: routeRow } = await supabase
    .from("routes")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!routeRow) return null;

  const [{ data: stopRows }, { data: segmentRows }] = await Promise.all([
    supabase
      .from("stops")
      .select("*")
      .eq("route_id", routeRow.id)
      .order("day_number")
      .order("order_index"),
    supabase.from("route_segments").select("*").eq("route_id", routeRow.id),
  ]);

  return {
    ...mapRouteRow(routeRow),
    stops: (stopRows ?? []).map(mapStopRow),
    segments: (segmentRows ?? []).map(mapSegmentRow),
  };
}

/** Fetches any route (any status) by id, for staff preview/edit views. */
export async function getRouteById(id: string): Promise<RouteWithStops | null> {
  const supabase = createClient();

  const { data: routeRow } = await supabase
    .from("routes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!routeRow) return null;

  const [{ data: stopRows }, { data: segmentRows }] = await Promise.all([
    supabase
      .from("stops")
      .select("*")
      .eq("route_id", id)
      .order("day_number")
      .order("order_index"),
    supabase.from("route_segments").select("*").eq("route_id", id),
  ]);

  return {
    ...mapRouteRow(routeRow),
    stops: (stopRows ?? []).map(mapStopRow),
    segments: (segmentRows ?? []).map(mapSegmentRow),
  };
}

/** Lists all routes for the staff dashboard, most recently updated first. */
export async function listRoutesForStaff(): Promise<Route[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("routes")
    .select("*")
    .order("updated_at", { ascending: false });

  return (data ?? []).map(mapRouteRow);
}
