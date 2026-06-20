/**
 * Computes a great-circle arc between two [lng, lat] points, used to render
 * bush-flight transfers (e.g. Wilson Airport -> Mara airstrip) as a curved
 * path rather than snapping them to roads, which don't apply to air travel.
 */
export function greatCircleArc(
  from: [number, number],
  to: [number, number],
  segments = 64
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const lat1 = toRad(from[1]);
  const lon1 = toRad(from[0]);
  const lat2 = toRad(to[1]);
  const lon2 = toRad(to[0]);

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
      )
    );

  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    if (d === 0) {
      coords.push(from);
      continue;
    }
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);
    coords.push([toDeg(lon), toDeg(lat)]);
  }
  return coords;
}

/** Haversine distance in meters, used for flight segment distance estimates. */
export function haversineDistance(
  from: [number, number],
  to: [number, number]
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(to[1] - from[1]);
  const dLon = toRad(to[0] - from[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from[1])) * Math.cos(toRad(to[1])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
