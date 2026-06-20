import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractItineraryFromText } from "@/lib/extraction/extract-text";
import { resolveStopCoordinates, computeRouteSegments } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await request.json();
  if (!text || typeof text !== "string" || text.trim().length < 20) {
    return NextResponse.json(
      { error: "Please provide more itinerary detail (at least a few sentences)." },
      { status: 400 }
    );
  }

  try {
    const extraction = await extractItineraryFromText(text);

    const resolvedStops = await resolveStopCoordinates(extraction.stops);
    const segments = await computeRouteSegments(resolvedStops);

    return NextResponse.json({
      title: extraction.title,
      summary: extraction.summary,
      warnings: extraction.warnings ?? [],
      stops: resolvedStops,
      segments,
      sourceType: "free_text" as const,
      sourceReference: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}