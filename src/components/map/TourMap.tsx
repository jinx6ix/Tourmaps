"use client";

import { useState } from "react";
import { ExpeditionMap } from "@/components/map/ExpeditionMap";
import type { Stop, RouteSegment } from "@/types/itinerary";

export function TourMap({
  stops,
  segments,
}: {
  stops: Stop[];
  segments: RouteSegment[];
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [, setActiveStop] = useState<Stop | null>(null);

  if (!token) {
    return (
      <div className="w-full min-h-[480px] rounded-lg border border-sage-700/30 bg-bush-800 flex items-center justify-center px-6 text-center">
        <p className="text-sage-400 text-sm">Map preview is not configured.</p>
      </div>
    );
  }

  return (
    <ExpeditionMap
      mapboxToken={token}
      stops={stops}
      segments={segments}
      onStopChange={(stop) => setActiveStop(stop)}
      className="w-full h-[480px]"
    />
  );
}
