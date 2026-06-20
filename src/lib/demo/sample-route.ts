import type { Stop, RouteSegment } from "@/types/itinerary";

// Demo route shown on the homepage hero — same 10-day Kenya safari used in
// the original prototype. Not persisted to the database; purely illustrative
// so first-time visitors see the product working immediately.

export const demoStops: Stop[] = [
  { id: "d1", routeId: "demo", dayNumber: 1, orderIndex: 0, stopType: "destination", name: "Nairobi", description: "Arrival, transfer to hotel for overnight stay.", lat: -1.2921, lng: 36.8219 },
  { id: "d2", routeId: "demo", dayNumber: 1, orderIndex: 1, stopType: "airport", name: "Wilson Airport", description: "Domestic departure point for onward bush flights.", lat: -1.3217, lng: 36.8147 },
  { id: "d3", routeId: "demo", dayNumber: 2, orderIndex: 0, stopType: "game_park", name: "Amboseli National Park", description: "Game drives with views of Mount Kilimanjaro.", lat: -2.6527, lng: 37.2606 },
  { id: "d4", routeId: "demo", dayNumber: 2, orderIndex: 1, stopType: "accommodation", name: "Ol Tukai Lodge", description: "Two nights, lodge facing Kilimanjaro.", lat: -2.6494, lng: 37.2563, nights: 2 },
  { id: "d5", routeId: "demo", dayNumber: 4, orderIndex: 0, stopType: "destination", name: "Lake Naivasha", description: "Boat safari and Crescent Island walk.", lat: -0.7833, lng: 36.35 },
  { id: "d6", routeId: "demo", dayNumber: 4, orderIndex: 1, stopType: "accommodation", name: "Lake Naivasha Sopa Resort", description: "One night on the lake shore.", lat: -0.7654, lng: 36.3608, nights: 1 },
  { id: "d7", routeId: "demo", dayNumber: 5, orderIndex: 0, stopType: "game_park", name: "Lake Nakuru National Park", description: "Rhino sanctuary and flamingo-lined lake.", lat: -0.3667, lng: 36.0904 },
  { id: "d8", routeId: "demo", dayNumber: 6, orderIndex: 0, stopType: "airport", name: "Maasai Mara Airstrip", description: "Scenic flight from Nakuru to the Mara.", lat: -1.4061, lng: 35.1431 },
  { id: "d9", routeId: "demo", dayNumber: 6, orderIndex: 1, stopType: "game_park", name: "Maasai Mara National Reserve", description: "Big cat and wildebeest migration territory.", lat: -1.4833, lng: 35.15 },
  { id: "d10", routeId: "demo", dayNumber: 6, orderIndex: 2, stopType: "accommodation", name: "Mara Serena Safari Lodge", description: "Three nights, hilltop overlooking the Mara plains.", lat: -1.4167, lng: 35.0167, nights: 3 },
  { id: "d11", routeId: "demo", dayNumber: 9, orderIndex: 0, stopType: "destination", name: "Nairobi", description: "Return flight, day room and departure transfer.", lat: -1.2921, lng: 36.8219 },
];

// Straight-line placeholders — production routes compute real road geometry
// server-side via the Directions API, but the homepage demo avoids burning
// API quota on every visitor by using direct lines between points.
function straight(a: Stop, b: Stop): [number, number][] {
  return [[a.lng, a.lat], [b.lng, b.lat]];
}

export const demoSegments: RouteSegment[] = [
  { id: "s1", routeId: "demo", fromStopId: "d1", toStopId: "d2", mode: "road", geometry: straight(demoStops[0], demoStops[1]) },
  { id: "s2", routeId: "demo", fromStopId: "d2", toStopId: "d3", mode: "flight", geometry: straight(demoStops[1], demoStops[2]) },
  { id: "s3", routeId: "demo", fromStopId: "d3", toStopId: "d4", mode: "road", geometry: straight(demoStops[2], demoStops[3]) },
  { id: "s4", routeId: "demo", fromStopId: "d4", toStopId: "d5", mode: "road", geometry: straight(demoStops[3], demoStops[4]) },
  { id: "s5", routeId: "demo", fromStopId: "d5", toStopId: "d6", mode: "road", geometry: straight(demoStops[4], demoStops[5]) },
  { id: "s6", routeId: "demo", fromStopId: "d6", toStopId: "d7", mode: "road", geometry: straight(demoStops[5], demoStops[6]) },
  { id: "s7", routeId: "demo", fromStopId: "d7", toStopId: "d8", mode: "flight", geometry: straight(demoStops[6], demoStops[7]) },
  { id: "s8", routeId: "demo", fromStopId: "d8", toStopId: "d9", mode: "road", geometry: straight(demoStops[7], demoStops[8]) },
  { id: "s9", routeId: "demo", fromStopId: "d9", toStopId: "d10", mode: "road", geometry: straight(demoStops[8], demoStops[9]) },
  { id: "s10", routeId: "demo", fromStopId: "d10", toStopId: "d11", mode: "flight", geometry: straight(demoStops[9], demoStops[10]) },
];
