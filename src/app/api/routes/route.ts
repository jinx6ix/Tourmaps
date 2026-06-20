import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ResolvedStop, ResolvedSegment } from "@/lib/pipeline";
import type { SourceType } from "@/types/itinerary";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    summary,
    stops,
    segments,
    sourceType,
    sourceReference,
  }: {
    title: string;
    summary?: string;
    stops: ResolvedStop[];
    segments: ResolvedSegment[];
    sourceType: SourceType;
    sourceReference?: string | null;
  } = body;

  if (!title || !Array.isArray(stops) || stops.length === 0) {
    return NextResponse.json(
      { error: "A title and at least one stop are required." },
      { status: 400 }
    );
  }

  // Generate a unique slug, appending a short suffix on collision.
  let slug = slugify(title);
  const { data: existing } = await supabase
    .from("routes")
    .select("slug")
    .ilike("slug", `${slug}%`);
  if (existing && existing.length > 0) {
    slug = `${slug}-${existing.length + 1}`;
  }

  const { data: route, error: routeError } = await supabase
    .from("routes")
    .insert({
      slug,
      title,
      summary: summary ?? null,
      status: "draft",
      source_type: sourceType,
      source_reference: sourceReference ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (routeError || !route) {
    return NextResponse.json(
      { error: routeError?.message ?? "Failed to create route" },
      { status: 500 }
    );
  }

  const stopRows = stops.map((s, index) => ({
    route_id: route.id,
    day_number: s.day,
    order_index: index,
    stop_type: s.type,
    name: s.name,
    description: s.description ?? null,
    lat: s.lat,
    lng: s.lng,
    nights: s.nights ?? null,
    arrival_mode: s.arrivalMode ?? null,
    place_id: s.placeId || null,
  }));

  const { data: insertedStops, error: stopsError } = await supabase
    .from("stops")
    .insert(stopRows)
    .select();

  if (stopsError || !insertedStops) {
    await supabase.from("routes").delete().eq("id", route.id);
    return NextResponse.json(
      { error: stopsError?.message ?? "Failed to save stops" },
      { status: 500 }
    );
  }

  if (segments.length > 0) {
    const segmentRows = segments.map((seg) => ({
      route_id: route.id,
      from_stop_id: insertedStops[seg.fromIndex].id,
      to_stop_id: insertedStops[seg.toIndex].id,
      mode: seg.mode,
      geometry: seg.geometry,
      distance_meters: seg.distanceMeters,
      duration_seconds: seg.durationSeconds,
    }));

    const { error: segmentsError } = await supabase
      .from("route_segments")
      .insert(segmentRows);

    if (segmentsError) {
      return NextResponse.json(
        { error: segmentsError.message, routeId: route.id, partial: true },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ routeId: route.id, slug: route.slug });
}
