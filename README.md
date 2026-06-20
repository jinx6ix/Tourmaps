# Jae Travel Expedition Maps

A 3D route-preview platform for safari itineraries. Upload a PDF, paste a link, describe
a trip in plain text, or build it stop-by-stop — see the full route flown through in 3D
terrain before anyone leaves the ground.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase** — own project, Postgres + Auth + RLS
- **Mapbox GL JS** — 3D terrain rendering, satellite imagery, route flythrough
- **Google Maps Platform** — Geocoding API (place -> coordinates) + Directions API (road routes)
- **NVIDIA NIM** (free tier, MiniMax-M3) — structures raw itinerary text into day-by-day stops

## How it fits together

```
PDF / URL / free text --> NVIDIA NIM extraction --> stops (no coordinates yet)
                                                        |
                                                        v
                                          Google Geocoding API (cached in Supabase)
                                                        |
                                                        v
                                    Google Directions API (road) / great-circle arc (flight)
                                                        |
                                                        v
                                              Mapbox GL JS 3D render
```

The manual form path skips NVIDIA extraction and maps directly to the same pipeline from
the geocoding step onward.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/migrations/0001_init.sql`.
3. Copy the project URL, anon key, and service role key into `.env.local` (see `.env.example`).

### 3. Create a staff account

Staff sign-in uses Supabase Auth (email/password). To create the first account:

1. In the Supabase dashboard: **Authentication -> Users -> Add user**. Set an email and password.
2. Copy that user's UUID.
3. Edit `supabase/seed_staff_user.sql` with the UUID and run it in the SQL editor.

Without a row in `staff_users`, a Supabase Auth user can log in but the dashboard will be
empty/inaccessible per the RLS policies -- `staff_users` membership is what grants access.

### 4. Get API keys

- **Mapbox**: account.mapbox.com/access-tokens -- a public token is fine, it's exposed to the browser by design.
- **Google Maps Platform**: enable the **Geocoding API** and **Directions API** in the Google Cloud Console, then create a server-side API key (restrict it to those two APIs and, ideally, your server's IP).
- **NVIDIA NIM**: free, no credit card -- sign up at build.nvidia.com and generate an API key (prefixed nvapi-). Same key reusable across this project and the Media Hub vision API. Free tier caps around ~40 requests/minute.

### 5. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from steps 2-4.

### 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000` for the public homepage, `http://localhost:3000/login` for
staff sign-in.

## Project structure

```
src/
  app/
    page.tsx                  Homepage (live demo map)
    tour/[slug]/page.tsx       Public tour detail page
    login/page.tsx             Staff sign-in
    dashboard/page.tsx         Staff route list
    dashboard/new/page.tsx     Ingestion tool (PDF / URL / form / free text)
    dashboard/[id]/page.tsx    Route detail + publish
    api/extract/*              Extraction endpoints, one per ingestion path
    api/routes/*                Persistence + publish endpoints
  components/
    map/ExpeditionMap.tsx       Core reusable 3D map (terrain, route, flythrough)
    dashboard/IngestTool.tsx    The four-tab ingestion UI
  lib/
    extraction/                 PDF text, URL fetch, NVIDIA NIM-based structuring
    geocoding/                  Google Geocoding wrapper with Supabase cache
    routing/                    Google Directions wrapper + great-circle arc math
    pipeline.ts                 Shared geocode-then-route-segment pipeline
    supabase/                   Browser/server/service Supabase clients
  types/itinerary.ts             Shared domain types (Stop, Route, RouteSegment, etc.)
supabase/
  migrations/0001_init.sql       Full database schema + RLS policies
  seed_staff_user.sql            Template for granting staff access
```

## Known rough edges

- **Directions API calls are sequential** during extraction -- fine for typical 5-20 stop
  itineraries, but a very long multi-country itinerary will be slow to preview. Worth
  parallelizing with a concurrency cap if that becomes common.
- **Geocoding context hint defaults to "Kenya"** (`src/lib/geocoding/google.ts`) -- itineraries
  spanning Tanzania, Uganda, Rwanda etc. will need a smarter hint, e.g. inferring country
  per-stop from the extraction step rather than hardcoding one country for the whole route.
- **No image/cover photo handling yet** -- `routes.cover_image_url` exists in the schema but
  nothing writes to it. Tour detail pages currently lead with the map, not a photo, which
  may be enough, but worth a deliberate decision either way.
- **Scanned PDF itineraries fail extraction** -- `extractPdfText` throws a clear error if it
  can't pull readable text, directing staff to the free-text or form path instead. Adding
  OCR (e.g. for old fax-quality PDFs) is a possible future improvement but not implemented.
- **No edit-after-extraction UI** -- staff can review the preview and see warnings, but can't
  yet tweak a stop's name/day/coordinates before saving. Right now the fix-it path is:
  re-run extraction with cleaner input, or fix it directly in Supabase after saving.
- **NVIDIA NIM free tier rate limit** -- shared ~40 requests/minute across the whole API key.
  If the same key is also driving the Media Hub's vision API, heavy concurrent use of both
  could trip 429s. The extraction call surfaces a clear "rate-limited, try again shortly"
  error rather than failing silently, but there's no retry/backoff yet.
- **Model output isn't 100% guaranteed-JSON** -- unlike Claude's tool-use/structured-output
  mode, NIM's chat completions don't enforce a JSON schema. `extract-text.ts` strips
  `<think>...</think>` reasoning traces some Nemotron models emit and falls back to
  extracting the outermost `{...}` block if direct parsing fails, but a sufficiently
  unusual response could still slip through. Worth monitoring in practice; if it becomes
  a recurring issue, NIM's tool-calling mode (where supported per-model) is the next step.
