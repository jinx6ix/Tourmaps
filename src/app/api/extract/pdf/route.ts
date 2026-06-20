import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/extraction/pdf";
import { extractItineraryFromText } from "@/lib/extraction/extract-text";
import { resolveStopCoordinates, computeRouteSegments } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractPdfText(buffer);
    const extraction = await extractItineraryFromText(rawText);

    const resolvedStops = await resolveStopCoordinates(extraction.stops);
    const segments = await computeRouteSegments(resolvedStops);

    return NextResponse.json({
      title: extraction.title,
      summary: extraction.summary,
      warnings: extraction.warnings ?? [],
      stops: resolvedStops,
      segments,
      sourceType: "pdf" as const,
      sourceReference: file.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
