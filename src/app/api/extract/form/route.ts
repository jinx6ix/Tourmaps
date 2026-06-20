import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveStopCoordinates, computeRouteSegments } from "@/lib/pipeline";
import type { ManualStopInput } from "@/types/itinerary";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, summary, stops } = body as {
    title?: string;
    summary?: string;
    stops?: ManualStopInput[];
  };

  if (!title || !Array.isArray(stops) || stops.length === 0) {
    return NextResponse.json(
      { error: "A title and at least one stop are required." },
      { status: 400 }
    );
  }

  try {
    const resolvedStops = await resolveStopCoordinates(stops);
    const segments = await computeRouteSegments(resolvedStops);

    return NextResponse.json({
      title,
      summary: summary ?? "",
      warnings: [],
      stops: resolvedStops,
      segments,
      sourceType: "form" as const,
      sourceReference: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
