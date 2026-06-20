import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { listRoutesForStaff } from "@/lib/data/routes";

const STATUS_STYLE: Record<string, string> = {
  draft: "text-sage-500 border-sage-600/40",
  published: "text-gold-400 border-gold-500/40",
  archived: "text-sage-600 border-sage-700/40",
};

export default async function DashboardPage() {
  const routes = await listRoutesForStaff();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="eyebrow text-gold-400 mb-2">Staff dashboard</div>
            <h1 className="font-display text-2xl text-sand-100">Routes</h1>
          </div>
          <Link
            href="/dashboard/new"
            className="px-5 py-2.5 bg-clay-500 hover:bg-clay-600 text-bush-950 font-medium rounded-md transition-colors text-sm"
          >
            New route
          </Link>
        </div>

        {routes.length === 0 ? (
          <div className="border border-dashed border-sage-700/40 rounded-lg py-16 text-center">
            <p className="text-sage-400 mb-4">No routes yet.</p>
            <Link
              href="/dashboard/new"
              className="text-gold-400 hover:text-gold-500 text-sm underline underline-offset-4"
            >
              Build the first one
            </Link>
          </div>
        ) : (
          <div className="border border-sage-700/30 rounded-lg overflow-hidden divide-y divide-sage-700/30">
            {routes.map((route) => (
              <Link
                key={route.id}
                href={`/dashboard/${route.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-bush-800/50 transition-colors"
              >
                <div>
                  <div className="font-display text-lg text-sand-100">{route.title}</div>
                  <div className="text-xs text-sage-500 mt-0.5">
                    {route.sourceType.replace("_", " ")} · updated{" "}
                    {new Date(route.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <span
                  className={`eyebrow px-2.5 py-1 rounded border ${STATUS_STYLE[route.status]}`}
                >
                  {route.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
