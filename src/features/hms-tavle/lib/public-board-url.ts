/**
 * Offentlig tavle-adresse uten intern lytteport.
 * Produksjon lytter på 3040. Den porten skal ikke inn i en QR-kode.
 */
export function stripListenPort(value: string): string {
  try {
    const url = new URL(value);
    if (url.port === "3040") url.port = "";
    return url.origin;
  } catch {
    return value.replace(/\/$/, "");
  }
}

export function boardUrl(originOrAppUrl: string, path: string): string {
  const base = stripListenPort(originOrAppUrl).replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
