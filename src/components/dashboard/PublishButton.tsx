"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishButton({
  routeId,
  status,
}: {
  routeId: string;
  status: string;
}) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/routes/${routeId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  if (status === "published") {
    return (
      <span className="eyebrow px-3 py-2 rounded border border-gold-500/40 text-gold-400">
        Published
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handlePublish}
        disabled={publishing}
        className="px-5 py-2.5 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-bush-950 font-medium rounded-md text-sm transition-colors"
      >
        {publishing ? "Publishing…" : "Publish route"}
      </button>
      {error && <p className="text-xs text-clay-400">{error}</p>}
    </div>
  );
}
