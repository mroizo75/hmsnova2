import sharp from "sharp";

/** Visningsstørrelse i Adobe HTML-taggen. A4-innholdet er smalere enn pikslene. */
export const PDF_IMAGE_MAX_WIDTH = 420;
export const PDF_IMAGE_MAX_HEIGHT = 520;

export type PdfImageItem = {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function pdfImageDisplaySize(
  width: number,
  height: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: PDF_IMAGE_MAX_WIDTH, height: PDF_IMAGE_MAX_HEIGHT };
  }
  const scale = Math.min(PDF_IMAGE_MAX_WIDTH / width, PDF_IMAGE_MAX_HEIGHT / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * JPEG som Adobe Document Generation og jsPDF kan legge inn.
 * WebP, HEIC og PNG gjøres om. IK-HMS § 5 nr. 7: bildet dokumenterer avviket.
 */
export async function toPdfJpeg(bytes: Buffer): Promise<Omit<PdfImageItem, "name"> | null> {
  if (bytes.length === 0) return null;
  try {
    const rendered = await sharp(bytes, { failOn: "none", pages: 1 })
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72 })
      .toBuffer({ resolveWithObject: true });
    if (!rendered.info.width || !rendered.info.height || rendered.data.length === 0) {
      return null;
    }
    return {
      dataUrl: `data:image/jpeg;base64,${rendered.data.toString("base64")}`,
      width: rendered.info.width,
      height: rendered.info.height,
    };
  } catch {
    return null;
  }
}

export function buildPdfImageHtml(items: PdfImageItem[]): string {
  return items
    .map((item) => {
      const caption = `<p>${escapeHtml(item.name)}</p>`;
      if (!item.dataUrl.startsWith("data:image/jpeg;base64,")) return caption;
      const size = pdfImageDisplaySize(item.width, item.height);
      return `${caption}<img src="${item.dataUrl}" width="${size.width}" height="${size.height}">`;
    })
    .join("");
}
