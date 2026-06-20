import { SiteHeader } from "@/components/layout/SiteHeader";
import { HeroMap } from "@/components/map/HeroMap";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero: map first, headline as overlay-style card above it */}
        <section className="max-w-6xl mx-auto px-6 pt-10 pb-16">
          <div className="max-w-2xl mb-8">
            <div className="eyebrow text-gold-400 mb-3">Route preview, before departure</div>
            <h1 className="font-display text-4xl md:text-5xl text-sand-100 leading-tight mb-4">
              See the safari before you fly it.
            </h1>
            <p className="text-sage-400 text-lg leading-relaxed">
              Upload an itinerary — a PDF, a link, or just describe it — and watch the
              full route unfold across real terrain: every camp, every park, every
              transfer between them, in 3D.
            </p>
          </div>

          <HeroMap />

          <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4 text-xs text-sage-500">
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-0.5 bg-sage-500" /> Road transfer
            </span>
            <span className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-0.5"
                style={{ backgroundImage: "repeating-linear-gradient(90deg, #D9AC3F 0 4px, transparent 4px 7px)" }}
              />
              Bush flight
            </span>
            <span>10-day Kenya highlights route, shown as a live example</span>
          </div>
        </section>

        {/* How it works — structured as an ingestion ledger, not generic numbered cards */}
        <section className="border-t border-sage-700/30">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="eyebrow text-gold-400 mb-3">Intake log</div>
            <h2 className="font-display text-2xl text-sand-100 mb-8">
              Four ways to bring in an itinerary
            </h2>
            <div className="grid md:grid-cols-2 gap-px bg-sage-700/30 border border-sage-700/30 rounded-lg overflow-hidden">
              <IntakeRow
                label="PDF"
                title="Upload a document"
                description="Drop in a client itinerary PDF. Stops, accommodations, and game parks are pulled out automatically."
              />
              <IntakeRow
                label="URL"
                title="Paste a link"
                description="Point at any travel itinerary webpage and the route is extracted the same way."
              />
              <IntakeRow
                label="Form"
                title="Build it by hand"
                description="Enter each day's stop directly — full control, no extraction needed."
              />
              <IntakeRow
                label="Text"
                title="Describe it freely"
                description="Write the trip in plain language. The structure is inferred from what you type."
              />
            </div>
          </div>
        </section>

        {/* Staff CTA */}
        <section className="border-t border-sage-700/30">
          <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="font-display text-2xl text-sand-100 mb-2">
                Building a route for a client?
              </h2>
              <p className="text-sage-400">
                Staff can upload an itinerary, preview it in 3D, and publish it for sharing.
              </p>
            </div>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 bg-clay-500 hover:bg-clay-600 text-bush-950 font-medium rounded-md transition-colors whitespace-nowrap"
            >
              Open staff dashboard
            </a>
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

function IntakeRow({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-bush-900 p-6 flex gap-5">
      <div className="eyebrow text-clay-400 w-12 shrink-0 pt-1">{label}</div>
      <div>
        <div className="font-display text-lg text-sand-100 mb-1">{title}</div>
        <div className="text-sm text-sage-400 leading-relaxed">{description}</div>
      </div>
    </div>
  );
}
