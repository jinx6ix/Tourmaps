import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TourMap } from "@/components/map/TourMap";
import { getPublishedRouteBySlug } from "@/lib/data/routes";
import type { StopType } from "@/types/itinerary";

const TYPE_LABEL: Record<StopType, string> = {
  destination: "Destination",
  accommodation: "Accommodation",
  game_park: "Game park",
  airport: "Airstrip",
  activity: "Activity",
};

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const route = await getPublishedRouteBySlug(slug);
  if (!route) notFound();

  const sortedStops = [...route.stops].sort(
    (a, b) => a.dayNumber - b.dayNumber || a.orderIndex - b.orderIndex
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-10 pb-8">
          <div className="eyebrow text-gold-400 mb-3">
            {sortedStops.length} stops · {Math.max(...sortedStops.map((s) => s.dayNumber))} days
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-sand-100 mb-3">
            {route.title}
          </h1>
          {route.summary && (
            <p className="text-sage-400 text-lg max-w-2xl leading-relaxed">
              {route.summary}
            </p>
          )}
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-12">
          <TourMap stops={route.stops} segments={route.segments} />
        </section>

        <section className="border-t border-sage-700/30">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="eyebrow text-gold-400 mb-6">Route log</div>
            <ol className="space-y-0 border-l border-sage-700/30 ml-1">
              {sortedStops.map((stop) => (
                <li key={stop.id} className="relative pl-8 pb-8 last:pb-0">
                  <span className="absolute left-0 top-1 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-clay-500 border-2 border-bush-900" />
                  <div className="eyebrow text-sage-500 mb-1">
                    Day {stop.dayNumber} · {TYPE_LABEL[stop.stopType]}
                    {stop.nights ? ` · ${stop.nights} night${stop.nights > 1 ? "s" : ""}` : ""}
                  </div>
                  <div className="font-display text-xl text-sand-100 mb-1">
                    {stop.name}
                  </div>
                  {stop.description && (
                    <div className="text-sage-400 text-sm leading-relaxed mb-1 max-w-2xl">
                      {stop.description}
                    </div>
                  )}
                  <div className="coord text-xs text-sage-600">
                    {stop.lat.toFixed(4)}°, {stop.lng.toFixed(4)}°
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-sage-700/30 py-8">
        <div className="max-w-6xl mx-auto px-6 text-xs text-sage-600">
          Jae Travel Expedition Maps — a route preview tool by Jae Travel Expeditions.
        </div>
      </footer>
    </div>
  );
}
