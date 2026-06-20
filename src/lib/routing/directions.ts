/**
 * Fetches a driving route polyline between two points via Google Directions API.
 * Falls back to a straight line if the API call fails, so the map still renders
 * something rather than breaking the whole route.
 */
export async function getRoadGeometry(
  from: [number, number],
  to: [number, number]
): Promise<{ coordinates: [number, number][]; distanceMeters: number; durationSeconds: number }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${from[1]},${from[0]}`);
  url.searchParams.set("destination", `${to[1]},${to[0]}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== "OK" || !data.routes?.length) {
      return fallbackStraightLine(from, to);
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const coordinates = decodePolyline(route.overview_polyline.points);

    return {
      coordinates,
      distanceMeters: leg.distance.value,
      durationSeconds: leg.duration.value,
    };
  } catch {
    return fallbackStraightLine(from, to);
  }
}

function fallbackStraightLine(from: [number, number], to: [number, number]) {
  return {
    coordinates: [from, to] as [number, number][],
    distanceMeters: 0,
    durationSeconds: 0,
  };
}

/** Decodes Google's encoded polyline format into [lng, lat] coordinate pairs. */
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coords.push([lng / 1e5, lat / 1e5]);
  }

  return coords;
}
