import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/extraction/pdf";
import { extractItineraryFromText } from "@/lib/extraction/extract-text";
import { resolveStopCoordinates, computeRouteSegments } from "@/lib/pipeline";

export const maxDuration = 60;

// PDF data arrives as a base64 string in a JSON body rather than
// multipart/form-data. This sidesteps a Next.js 14.2.x dev-server bug where
// multipart POSTs to Route Handlers are misidentified as stale Server
// Action calls and rejected with a 404 ("Failed to find Server Action"),
// even on routes with no Server Actions involved at all. JSON POSTs (used
// here and by the URL/text extraction routes) aren't affected.
//
// Note: App Router Route Handlers have no built-in/configurable body size
// limit the way Pages Router API routes did (`export const config = { api:
// { bodyParser: ... } }` is a Pages Router convention and has no effect
// here — Next.js doesn't currently support a per-route body size config in
// App Router). The MAX_FILE_SIZE_BYTES check below is the real guard.
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB raw PDF (≈20MB base64-encoded)

interface PdfExtractRequestBody {
  fileName?: string;
  fileBase64?: string;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PdfExtractRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { fileName, fileBase64 } = body;
  if (!fileBase64 || typeof fileBase64 !== "string") {
    return NextResponse.json({ error: "No file data received" }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    // Accept either a raw base64 string or a data URI
    // (data:application/pdf;base64,...) — strip the prefix if present.
    const base64Content = fileBase64.includes(",")
      ? fileBase64.split(",")[1]
      : fileBase64;
    buffer = Buffer.from(base64Content, "base64");
  } catch {
    return NextResponse.json({ error: "Could not decode file data" }, { status: 400 });
  }

  if (buffer.length === 0) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `PDF is too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Maximum supported size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
      },
      { status: 413 }
    );
  }

  // Light signature check — first bytes of a real PDF are always "%PDF-".
  // Catches the common mistake of a non-PDF file slipping through the
  // client-side accept filter, with a clearer error than a pdf-parse crash.
  const isPdfSignature = buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (!isPdfSignature) {
    return NextResponse.json(
      { error: "File does not appear to be a valid PDF" },
      { status: 400 }
    );
  }

  try {
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
      sourceReference: fileName ?? "uploaded.pdf",
      rawText: rawText.slice(0, 20000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}