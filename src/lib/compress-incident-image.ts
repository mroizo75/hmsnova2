import { incidentImageRejection } from "@/lib/incident-image";

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.72;

function jpegName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim() || "bilde";
  return `${base}.jpg`;
}

/**
 * Forminsker mobilbilder før de sendes med avviket.
 * To ukomprimerte kamerabilder overskrider proxy-grensen, og da feiler hele innsendingen.
 */
export async function compressIncidentImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    const rejection = incidentImageRejection(file);
    if (rejection) throw new Error(rejection);
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    const rejection = incidentImageRejection(file);
    if (rejection) throw new Error(rejection);
    return file;
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_EDGE_PX ? MAX_EDGE_PX / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      const rejection = incidentImageRejection(file);
      if (rejection) throw new Error(rejection);
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", JPEG_QUALITY);
    });

    if (!blob || blob.size === 0) {
      const rejection = incidentImageRejection(file);
      if (rejection) throw new Error(rejection);
      return file;
    }

    if (blob.size >= file.size && file.type === "image/jpeg") {
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
    bitmap.close();
  }
}
