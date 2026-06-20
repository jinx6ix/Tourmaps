/**
 * Fetches a travel itinerary webpage and strips it down to readable text
 * for the extraction layer. This is a generic any-URL fetcher (per scope:
 * "any travel itinerary webpage", not just JaeTravel's own pages).
 */
export async function fetchUrlText(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  const res = await fetch(parsed.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; JaeExpeditionMaps/1.0; +https://jaetravel.co.ke)",
    },
    // Avoid hanging forever on slow/unresponsive third-party sites.
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Could not fetch that page (status ${res.status}).`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error("That URL doesn't appear to be a webpage.");
  }

  const html = await res.text();
  return htmlToReadableText(html);
}

/**
 * Strips scripts, styles, and tags down to plain text. Deliberately simple —
 * the Claude extraction layer is robust to messy whitespace and doesn't need
 * a full readability/DOM parser for this use case.
 */
function htmlToReadableText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const withLineBreaks = withoutScripts.replace(
    /<\/(p|div|h[1-6]|li|tr|br)>/gi,
    "\n"
  );

  const textOnly = withLineBreaks
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

  return textOnly
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 80000);
}
