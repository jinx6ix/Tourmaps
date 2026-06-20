"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExpeditionMap } from "@/components/map/ExpeditionMap";
import type { Stop, RouteSegment, StopType, ManualStopInput } from "@/types/itinerary";

type Tab = "pdf" | "url" | "form" | "text";
type SaveMode = "draft" | "publish";

interface PreviewData {
  title: string;
  summary: string;
  warnings: string[];
  stops: (Stop & { geocodeWarning?: string })[];
  segments: RouteSegment[];
  sourceType: "pdf" | "url" | "form" | "free_text";
  sourceReference: string | null;
  /** Raw text the model actually saw, before extraction. Only present for
   * pdf/url sources — useful for telling apart "the model misread good
   * text" from "the model correctly read bad/garbled text." */
  rawText?: string;
}

// Shape returned by the /api/extract/* endpoints, before normalization
// into the app's domain Stop/RouteSegment types.
interface ExtractApiStop {
  day: number;
  type: StopType;
  name: string;
  description?: string;
  nights?: number;
  arrivalMode?: "road" | "air" | null;
  lat: number;
  lng: number;
  placeId?: string;
  geocodeWarning?: string;
}

interface ExtractApiSegment {
  fromIndex: number;
  toIndex: number;
  mode: "road" | "flight";
  geometry: [number, number][];
  distanceMeters?: number;
  durationSeconds?: number;
}

interface ExtractApiResponse {
  title: string;
  summary?: string;
  warnings?: string[];
  stops: ExtractApiStop[];
  segments: ExtractApiSegment[];
  sourceType: "pdf" | "url" | "form" | "free_text";
  sourceReference: string | null;
  rawText?: string;
}

interface ApiErrorResponse {
  error: string;
}

const TAB_LABEL: Record<Tab, string> = {
  pdf: "PDF",
  url: "URL",
  form: "Form",
  text: "Free text",
};

const STOP_TYPES: StopType[] = ["destination", "accommodation", "game_park", "airport", "activity"];

export function IngestTool() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pdf");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [publishing, setPublishing] = useState(false);

  // PDF tab state
  const [file, setFile] = useState<File | null>(null);
  // URL tab state
  const [url, setUrl] = useState("");
  // Free text tab state
  const [freeText, setFreeText] = useState("");
  // Form tab state
  const [formTitle, setFormTitle] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formStops, setFormStops] = useState<ManualStopInput[]>([
    { day: 1, type: "destination", name: "", description: "" },
  ]);

  function normalizePreview(data: ExtractApiResponse): PreviewData {
    return {
      title: data.title,
      summary: data.summary ?? "",
      warnings: data.warnings ?? [],
      stops: data.stops.map((s, i) => ({
        id: `preview-${i}`,
        routeId: "preview",
        dayNumber: s.day,
        orderIndex: i,
        stopType: s.type,
        name: s.name,
        description: s.description,
        lat: s.lat,
        lng: s.lng,
        nights: s.nights,
        arrivalMode: s.arrivalMode,
        placeId: s.placeId,
        geocodeWarning: s.geocodeWarning,
      })),
      segments: data.segments.map((seg, i) => ({
        id: `seg-${i}`,
        routeId: "preview",
        fromStopId: `preview-${seg.fromIndex}`,
        toStopId: `preview-${seg.toIndex}`,
        mode: seg.mode,
        geometry: seg.geometry,
        distanceMeters: seg.distanceMeters,
        durationSeconds: seg.durationSeconds,
      })),
      sourceType: data.sourceType,
      sourceReference: data.sourceReference,
      rawText: data.rawText,
    };
  }

  async function runExtraction(endpoint: string, jsonBody: string) {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonBody,
      });
      const data: ExtractApiResponse | ApiErrorResponse = await res.json();
      if (!res.ok) {
        throw new Error((data as ApiErrorResponse).error || "Extraction failed");
      }
      setPreview(normalizePreview(data as ExtractApiResponse));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Client-side mirror of the server's MAX_FILE_SIZE_BYTES in
  // api/extract/pdf/route.ts — gives instant feedback instead of waiting
  // on a round trip just to be told the file is too large.
  const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

  function readFileAsBase64(targetFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // result is a data URI ("data:application/pdf;base64,...."); the
        // server strips this prefix too, but stripping here keeps the
        // payload a bit smaller and the intent explicit.
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Could not read the file"));
      reader.readAsDataURL(targetFile);
    });
  }

  async function handlePdfSubmit() {
    if (!file) {
      setError("Choose a PDF file first.");
      return;
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      setError(
        `PDF is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum supported size is ${MAX_PDF_SIZE_BYTES / 1024 / 1024}MB.`
      );
      return;
    }

    setError(null);
    setLoading(true);
    let fileBase64: string;
    try {
      fileBase64 = await readFileAsBase64(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the file");
      setLoading(false);
      return;
    }

    // runExtraction manages its own loading/error state from here, including
    // turning loading back off in its finally block.
    await runExtraction(
      "/api/extract/pdf",
      JSON.stringify({ fileName: file.name, fileBase64 })
    );
  }

  function handleUrlSubmit() {
    if (!url.trim()) {
      setError("Enter a URL first.");
      return;
    }
    runExtraction("/api/extract/url", JSON.stringify({ url }));
  }

  function handleTextSubmit() {
    if (freeText.trim().length < 20) {
      setError("Add a bit more detail about the trip.");
      return;
    }
    runExtraction("/api/extract/text", JSON.stringify({ text: freeText }));
  }

  function handleFormSubmit() {
    if (!formTitle.trim() || formStops.some((s) => !s.name.trim())) {
      setError("Give the route a title and name every stop.");
      return;
    }
    runExtraction(
      "/api/extract/form",
      JSON.stringify({ title: formTitle, summary: formSummary, stops: formStops })
    );
  }

  async function handleSave(mode: SaveMode) {
    if (!preview) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: preview.title,
          summary: preview.summary,
          stops: preview.stops.map((s) => ({
            day: s.dayNumber,
            type: s.stopType,
            name: s.name,
            description: s.description,
            nights: s.nights,
            arrivalMode: s.arrivalMode,
            lat: s.lat,
            lng: s.lng,
            placeId: s.placeId ?? "",
          })),
          segments: preview.segments.map((seg) => ({
            fromIndex: preview.stops.findIndex((s) => s.id === seg.fromStopId),
            toIndex: preview.stops.findIndex((s) => s.id === seg.toStopId),
            mode: seg.mode,
            geometry: seg.geometry,
            distanceMeters: seg.distanceMeters,
            durationSeconds: seg.durationSeconds,
          })),
          sourceType: preview.sourceType,
          sourceReference: preview.sourceReference,
        }),
      });
      const data: { routeId: string; slug?: string } | ApiErrorResponse = await res.json();
      if (!res.ok) throw new Error((data as ApiErrorResponse).error || "Failed to save route");

      const { routeId, slug } = data as { routeId: string; slug?: string };

      if (mode === "publish") {
        const publishRes = await fetch(`/api/routes/${routeId}/publish`, { method: "POST" });
        const publishData: { slug: string } | ApiErrorResponse = await publishRes.json();
        if (!publishRes.ok) throw new Error((publishData as ApiErrorResponse).error || "Failed to publish route");
        router.push(`/tour/${(publishData as { slug: string }).slug}`);
      } else {
        router.push(`/dashboard/${routeId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save route");
    } finally {
      setPublishing(false);
    }
  }

  function updateStop(index: number, patch: Partial<ManualStopInput>) {
    setFormStops((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStop() {
    const lastDay = formStops[formStops.length - 1]?.day ?? 1;
    setFormStops((prev) => [
      ...prev,
      { day: lastDay, type: "destination", name: "", description: "" },
    ]);
  }

  function removeStop(index: number) {
    setFormStops((prev) => prev.filter((_, i) => i !== index));
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapStops: Stop[] = preview?.stops ?? [];
  const mapSegments: RouteSegment[] = preview?.segments ?? [];
  const geocodeWarnings = preview?.stops.filter((s) => s.geocodeWarning) ?? [];

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div>
        <div className="flex border-b border-sage-700/30 mb-6">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={`eyebrow px-4 py-3 border-b-2 transition-colors ${
                tab === t
                  ? "border-gold-500 text-gold-400"
                  : "border-transparent text-sage-500 hover:text-sage-300"
              }`}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        {tab === "pdf" && (
          <div className="space-y-4">
            <label className="block">
              <span className="block text-sm text-sage-400 mb-1.5">Itinerary PDF</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-sage-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-bush-800 file:text-sand-200 file:cursor-pointer hover:file:bg-bush-700"
              />
            </label>
            <button
              onClick={handlePdfSubmit}
              disabled={loading}
              className="px-5 py-2.5 bg-clay-500 hover:bg-clay-600 disabled:opacity-50 text-bush-950 font-medium rounded-md text-sm transition-colors"
            >
              {loading ? "Extracting…" : "Extract route"}
            </button>
          </div>
        )}

        {tab === "url" && (
          <div className="space-y-4">
            <label className="block">
              <span className="block text-sm text-sage-400 mb-1.5">Itinerary webpage URL</span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/safari-itinerary"
                className="w-full px-3 py-2.5 bg-bush-800 border border-sage-700/40 rounded-md text-sand-100 placeholder:text-sage-600 focus:border-gold-500 outline-none"
              />
            </label>
            <button
              onClick={handleUrlSubmit}
              disabled={loading}
              className="px-5 py-2.5 bg-clay-500 hover:bg-clay-600 disabled:opacity-50 text-bush-950 font-medium rounded-md text-sm transition-colors"
            >
              {loading ? "Extracting…" : "Extract route"}
            </button>
          </div>
        )}

        {tab === "text" && (
          <div className="space-y-4">
            <label className="block">
              <span className="block text-sm text-sage-400 mb-1.5">Describe the trip</span>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={10}
                placeholder="Day 1: arrive Nairobi, overnight at hotel. Day 2-3: fly to Amboseli, stay at Ol Tukai Lodge for game drives with Kilimanjaro views..."
                className="w-full px-3 py-2.5 bg-bush-800 border border-sage-700/40 rounded-md text-sand-100 placeholder:text-sage-600 focus:border-gold-500 outline-none resize-y"
              />
            </label>
            <button
              onClick={handleTextSubmit}
              disabled={loading}
              className="px-5 py-2.5 bg-clay-500 hover:bg-clay-600 disabled:opacity-50 text-bush-950 font-medium rounded-md text-sm transition-colors"
            >
              {loading ? "Extracting…" : "Extract route"}
            </button>
          </div>
        )}

        {tab === "form" && (
          <div className="space-y-4">
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Route title, e.g. 7-Day Tanzania Northern Circuit"
              className="w-full px-3 py-2.5 bg-bush-800 border border-sage-700/40 rounded-md text-sand-100 placeholder:text-sage-600 focus:border-gold-500 outline-none"
            />
            <input
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              placeholder="Short summary (optional)"
              className="w-full px-3 py-2.5 bg-bush-800 border border-sage-700/40 rounded-md text-sand-100 placeholder:text-sage-600 focus:border-gold-500 outline-none"
            />

            <div className="space-y-3">
              {formStops.map((stop, i) => (
                <div key={i} className="border border-sage-700/30 rounded-md p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={stop.day}
                      onChange={(e) => updateStop(i, { day: Number(e.target.value) })}
                      className="w-16 px-2 py-1.5 bg-bush-900 border border-sage-700/40 rounded text-sand-100 text-sm coord"
                      aria-label="Day number"
                    />
                    <select
                      value={stop.type}
                      onChange={(e) => updateStop(i, { type: e.target.value as StopType })}
                      className="px-2 py-1.5 bg-bush-900 border border-sage-700/40 rounded text-sand-100 text-sm flex-1"
                      aria-label="Stop type"
                    >
                      {STOP_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    {formStops.length > 1 && (
                      <button
                        onClick={() => removeStop(i)}
                        aria-label="Remove stop"
                        className="px-2 text-sage-500 hover:text-clay-400"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <input
                    value={stop.name}
                    onChange={(e) => updateStop(i, { name: e.target.value })}
                    placeholder="Place name, e.g. Maasai Mara National Reserve"
                    className="w-full px-2 py-1.5 bg-bush-900 border border-sage-700/40 rounded text-sand-100 text-sm placeholder:text-sage-600"
                  />
                  <input
                    value={stop.description ?? ""}
                    onChange={(e) => updateStop(i, { description: e.target.value })}
                    placeholder="Short description (optional)"
                    className="w-full px-2 py-1.5 bg-bush-900 border border-sage-700/40 rounded text-sand-100 text-sm placeholder:text-sage-600"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={addStop}
                className="px-4 py-2 border border-sage-700/40 text-sage-300 hover:border-sage-500 rounded-md text-sm transition-colors"
              >
                + Add stop
              </button>
              <button
                onClick={handleFormSubmit}
                disabled={loading}
                className="px-5 py-2.5 bg-clay-500 hover:bg-clay-600 disabled:opacity-50 text-bush-950 font-medium rounded-md text-sm transition-colors"
              >
                {loading ? "Processing…" : "Build route"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-clay-400" role="alert">
            {error}
          </p>
        )}

        {preview && (
          <div className="mt-6 space-y-3">
            {preview.warnings.length > 0 && (
              <div className="border border-gold-500/30 bg-gold-500/5 rounded-md p-3">
                <div className="eyebrow text-gold-400 mb-1">Review needed</div>
                <ul className="text-sm text-sage-300 list-disc list-inside space-y-0.5">
                  {preview.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {geocodeWarnings.length > 0 && (
              <div className="border border-clay-500/30 bg-clay-500/5 rounded-md p-3">
                <div className="eyebrow text-clay-400 mb-1">Couldn&apos;t locate</div>
                <ul className="text-sm text-sage-300 list-disc list-inside space-y-0.5">
                  {geocodeWarnings.map((s, i) => (
                    <li key={i}>{s.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {preview.rawText && (
              <details className="border border-sage-700/30 rounded-md group">
                <summary className="eyebrow text-sage-500 px-3 py-2.5 cursor-pointer hover:text-sage-300 select-none list-none flex items-center gap-2">
                  <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                  Show text the model read
                </summary>
                <div className="px-3 pb-3">
                  <p className="text-xs text-sage-500 mb-2">
                    This is what extraction actually saw, before it ran. If a stop is
                    missing or wrong here, check this first — a wrong result over correct
                    text is a different problem than a correct result over garbled text.
                  </p>
                  <pre className="text-xs text-sage-400 bg-bush-950 border border-sage-700/20 rounded p-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                    {preview.rawText}
                  </pre>
                </div>
              </details>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => handleSave("draft")}
                disabled={publishing}
                className="flex-1 px-5 py-3 border border-sage-600 hover:border-sage-500 disabled:opacity-50 text-sage-300 font-medium rounded-md transition-colors"
              >
                {publishing ? "Saving…" : "Save as draft"}
              </button>
              <button
                onClick={() => handleSave("publish")}
                disabled={publishing}
                className="flex-1 px-5 py-3 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-bush-950 font-medium rounded-md transition-colors"
              >
                {publishing ? "Saving…" : "Save & publish"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="eyebrow text-sage-500 mb-3">Live preview</div>
        {preview && token ? (
          <ExpeditionMap
            mapboxToken={token}
            stops={mapStops}
            segments={mapSegments}
            className="h-[560px]"
          />
        ) : (
          <div className="h-[560px] rounded-lg border border-dashed border-sage-700/40 flex items-center justify-center text-center px-6">
            <p className="text-sage-500 text-sm">
              {token
                ? "Extract a route to see it rendered in 3D before saving."
                : "Map preview is not configured."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}