"use client";

import { ExpeditionMap } from "@/components/map/ExpeditionMap";
import { demoStops, demoSegments } from "@/lib/demo/sample-route";

export function HeroMap() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return (
      <div className="w-full min-h-[420px] rounded-lg border border-sage-700/30 bg-bush-800 flex items-center justify-center px-6 text-center">
        <p className="text-sage-400 text-sm max-w-sm">
          Set <code className="coord text-gold-400">NEXT_PUBLIC_MAPBOX_TOKEN</code> in your
          environment to load the live route preview.
        </p>
      </div>
    );
  }

  return (
    <ExpeditionMap
      mapboxToken={token}
      stops={demoStops}
      segments={demoSegments}
      className="w-full"
    />
  );
}
