import { getDocumentProxy, extractText } from "unpdf";

/**
 * Extracts raw text from an uploaded itinerary PDF. This is intentionally
 * dumb text extraction — the Claude/NVIDIA extraction layer handles the
 * actual structuring. Scanned/image-only PDFs will yield little or no
 * text; in that case the caller should surface a clear error to the staff
 * user rather than silently producing an empty route.
 *
 * Uses unpdf instead of pdf-parse. pdf-parse (via pdfjs-dist) spawns a
 * worker thread that pdf.js "fakes" in Node by dynamically importing
 * pdf.worker.mjs from a path relative to wherever the code is running —
 * which breaks inside Next.js's webpack-bundled Route Handler output
 * (.next/server/app/api/...), since that worker file is never copied
 * there. unpdf ships a serverless-converted build of PDF.js specifically
 * built for bundler/Node environments like this one, with no worker
 * thread or dynamic file resolution involved at all.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  const trimmed = text?.trim() ?? "";

  if (trimmed.length < 50) {
    throw new Error(
      "Could not extract readable text from this PDF. It may be a scanned image — try the free-text or manual form option instead."
    );
  }

  return trimmed;
}