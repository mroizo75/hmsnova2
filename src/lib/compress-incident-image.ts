import { incidentImageRejection } from "@/lib/incident-image";

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.72;
/** Ett bilde om gangen skal komme under vanlige grenser foran serveren. */
export const INCIDENT_IMAGE_UPLOAD_TARGET_BYTES = 900 * 1024;

export function compressionStillTooLarge(size: number): boolean {
  return size > INCIDENT_IMAGE_UPLOAD_TARGET_BYTES;
}

function jpegName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim() || "bilde";
  return `${base}.jpg`;
}

/**
 * Forminsker mobilbilder før de sendes med avviket.
 * To ukomprimerte kamerabilder overskrider proxy-grensen, og da feiler hele innsendingen.
 */
async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("unreadable"));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderJpeg(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
  quality: number,
): Promise<Blob | null> {
  const longest = Math.max(sourceWidth, sourceHeight);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(source, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
  });
}

export async function compressIncidentImage(file: File): Promise<File> {
  if (typeof document === "undefined") {
    const rejection = incidentImageRejection(file);
    if (rejection) throw new Error(rejection);
    return file;
  }

  let source: CanvasImageSource | null = null;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let bitmap: ImageBitmap | null = null;

  if (typeof createImageBitmap === "function") {
    try {
      bitmap = await createImageBitmap(file);
      source = bitmap;
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
    } catch {
      bitmap = null;
    }
  }

  if (!source) {
    try {
      const image = await loadImageElement(file);
      source = image;
      sourceWidth = image.naturalWidth;
      sourceHeight = image.naturalHeight;
    } catch {
      source = null;
    }
  }

  if (!source || sourceWidth < 1 || sourceHeight < 1) {
    bitmap?.close();
    throw new Error("Bildet kunne ikke leses. Velg bildet på nytt fra albumet.");
  }

  try {
    let maxEdge = MAX_EDGE_PX;
    let quality = JPEG_QUALITY;
    let blob = await renderJpeg(source, sourceWidth, sourceHeight, maxEdge, quality);
    while (blob && compressionStillTooLarge(blob.size) && (maxEdge > 1024 || quality > 0.55)) {
      maxEdge = Math.max(1024, Math.round(maxEdge * 0.75));
      quality = Math.max(0.55, Number((quality - 0.12).toFixed(2)));
      blob = await renderJpeg(source, sourceWidth, sourceHeight, maxEdge, quality);
    }

    if (!blob || blob.size === 0 || compressionStillTooLarge(blob.size)) {
      throw new Error("Bildet er for stort til å sendes. Velg et mindre bilde.");
    }

    if (blob.size >= file.size && file.type === "image/jpeg" && !compressionStillTooLarge(file.size)) {
      const rejection = incidentImageRejection(file);
      if (rejection) throw new Error(rejection);
      return file;
    }

    const compressed = new File([blob], jpegName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    const rejection = incidentImageRejection(compressed);
    if (rejection) throw new Error(rejection);
    return compressed;
  } finally {
    bitmap?.close();
  }
}
