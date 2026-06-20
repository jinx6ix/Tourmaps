import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-sage-700/30">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D9AC3F" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" strokeWidth="0.75" opacity="0.5" />
          </svg>
          <div>
            <div className="font-display text-lg leading-none text-sand-100">
              Jae Travel
            </div>
            <div className="eyebrow text-sage-500 leading-none mt-1">
              Expedition Maps
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-sage-400 hover:text-sand-200 transition-colors">
            Staff dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
