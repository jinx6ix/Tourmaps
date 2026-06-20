import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TourMap } from "@/components/map/TourMap";
import { PublishButton } from "@/components/dashboard/PublishButton";
import { getRouteById } from "@/lib/data/routes";

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const route = await getRouteById(id);
  if (!route) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <Link href="/dashboard" className="text-sm text-sage-500 hover:text-sage-300 mb-6 inline-block">
          ← All routes
        </Link>

        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="eyebrow text-gold-400 mb-2">
              {route.sourceType.replace("_", " ")} import
            </div>
            <h1 className="font-display text-2xl text-sand-100 mb-2">{route.title}</h1>
            {route.summary && <p className="text-sage-400 max-w-xl">{route.summary}</p>}
          </div>
          <PublishButton routeId={route.id} status={route.status} />
        </div>

        {route.status === "published" && (
          <div className="mb-6 px-4 py-3 bg-bush-800 border border-sage-700/30 rounded-md text-sm text-sage-400">
            Live at{" "}
            <Link href={`/tour/${route.slug}`} className="text-gold-400 hover:underline">
              /tour/{route.slug}
            </Link>
          </div>
        )}

        <TourMap stops={route.stops} segments={route.segments} />
      </main>
    </div>
  );
}
