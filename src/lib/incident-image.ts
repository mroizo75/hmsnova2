export const INCIDENT_IMAGE_MAX_COUNT = 5;
export const INCIDENT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

export interface IncidentImageMeta {
  name: string;
  type: string;
  size: number;
}

export function incidentImageRejection(file: IncidentImageMeta): string | null {
  if (file.size <= 0) {
    return "Bildet er tomt. Ta bildet på nytt.";
  }
  if (file.size > INCIDENT_IMAGE_MAX_BYTES) {
    return "Et av bildene er for stort. Maks 8 MB per bilde.";
  }

  const type = file.type.trim().toLowerCase();
  const looksLikeImage = type.startsWith("image/") || (!type && IMAGE_EXTENSION.test(file.name));
  if (!looksLikeImage) {
    return "Bare bildefiler kan legges ved avviket.";
  }

  return null;
}
