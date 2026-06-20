import { geocodePlace } from "@/lib/geocoding/google";
import { getRoadGeometry } from "@/lib/routing/directions";
import { greatCircleArc, haversineDistance } from "@/lib/routing/arc";
import type { ExtractedStop, ManualStopInput } from "@/types/itinerary";

export interface ResolvedStop extends ExtractedStop {
  lat: number;
  lng: number;
  placeId: string;
  geocodeWarning?: string;
}

export interface ResolvedSegment {
  fromIndex: number;
  toIndex: number;
  mode: "road" | "flight";
  geometry: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Geocodes every stop in order. Stops that fail to geocode are kept in the
 * list with a warning rather than dropped, so staff can see and fix them
 * in the preview before publishing — silently dropping a stop would make
 * the route quietly wrong.
 */
export async function resolveStopCoordinates(
  stops: (ExtractedStop | ManualStopInput)[],
  contextHint = "Kenya"
): Promise<ResolvedStop[]> {
  const resolved: ResolvedStop[] = [];

  for (const stop of stops) {
    const geocoded = await geocodePlace(stop.name, contextHint);
    if (!geocoded) {
      resolved.push({
        ...stop,
        lat: 0,
        lng: 0,
        placeId: "",
        geocodeWarning: `Could not locate "${stop.name}" — set coordinates manually before publishing.`,
      });
      continue;
    }
    resolved.push({
      ...stop,
      lat: geocoded.lat,
      lng: geocoded.lng,
      placeId: geocoded.placeId,
    });
  }

  return resolved;
}

/**
 * Computes geometry for each consecutive pair of resolved stops. Mode is
 * taken from the stop's arrivalMode when set; otherwise it's inferred from
 * distance, since itineraries don't always state the transfer mode
 * explicitly (a >250km hop between two stops on the same day is almost
 * always a flight in the Kenya/Tanzania safari context).
 */
export async function computeRouteSegments(
  stops: ResolvedStop[]
): Promise<ResolvedSegment[]> {
  const segments: ResolvedSegment[] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    if (!from.lat || !to.lat) continue; // skip unresolved stops

    const fromCoord: [number, number] = [from.lng, from.lat];
    const toCoord: [number, number] = [to.lng, to.lat];

    const straightLineDistance = haversineDistance(fromCoord, toCoord);
    const inferredMode =
      to.arrivalMode ?? (straightLineDistance > 250_000 ? "air" : "road");

    if (inferredMode === "air") {
      segments.push({
        fromIndex: i,
        toIndex: i + 1,
        mode: "flight",
        geometry: greatCircleArc(fromCoord, toCoord),
        distanceMeters: straightLineDistance,
        durationSeconds: 0,
      });
    } else {
      const road = await getRoadGeometry(fromCoord, toCoord);
      segments.push({
        fromIndex: i,
        toIndex: i + 1,
        mode: "road",
        geometry: road.coordinates,
        distanceMeters: road.distanceMeters || straightLineDistance,
        durationSeconds: road.durationSeconds,
      });
    }
  }

  return segments;
}
