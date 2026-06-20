import { PDFParse } from "pdf-parse";

/**
 * Extracts raw text from an uploaded itinerary PDF. This is intentionally
 * dumb text extraction — the Claude extraction layer handles the actual
 * structuring. Scanned/image-only PDFs will yield little or no text; in
 * that case the caller should surface a clear error to the staff user
 * rather than silently producing an empty route.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result.text?.trim() ?? "";

    if (text.length < 50) {
      throw new Error(
        "Could not extract readable text from this PDF. It may be a scanned image — try the free-text or manual form option instead."
      );
    }

    return text;
  } finally {
    await parser.destroy();
  }
}
