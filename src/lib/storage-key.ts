/** Normaliserer lagret fileKey til R2/lokal objektnøkkel. */
export function normalizeStorageKey(fileKey: string): string {
  const trimmed = fileKey.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const marker = "/api/files/";
    const idx = url.pathname.indexOf(marker);
    if (idx >= 0) {
      return decodeURIComponent(url.pathname.slice(idx + marker.length).replace(/^\/+/, ""));
    }
  } catch {
    // Ikke en absolut URL
  }

  if (trimmed.startsWith("/api/files/")) {
    return decodeURIComponent(trimmed.slice("/api/files/".length).replace(/^\/+/, ""));
  }

  return trimmed.replace(/^\/+/, "");
}

export function isNotFoundStorageError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    name?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    err.name === "NoSuchKey" ||
    err.Code === "NoSuchKey" ||
    err.name === "NotFound" ||
    err.$metadata?.httpStatusCode === 404
  );
}
