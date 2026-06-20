import { SiteHeader } from "@/components/layout/SiteHeader";
import { IngestTool } from "@/components/dashboard/IngestTool";

export default function NewRoutePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <div className="mb-8">
          <div className="eyebrow text-gold-400 mb-2">New route</div>
          <h1 className="font-display text-2xl text-sand-100 mb-2">
            Bring in an itinerary
          </h1>
          <p className="text-sage-400 text-sm max-w-xl">
            Choose how the itinerary is coming in, extract the route, review it in 3D,
            then save it as a draft. You can publish it from the route page once it
            looks right.
          </p>
        </div>

        <IngestTool />
      </main>
    </div>
  );
}
