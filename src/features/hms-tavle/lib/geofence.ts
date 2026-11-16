/** Avstand og geofence for innsjekk på HMS-tavlen. */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface SiteGeofence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

export function distanceMeters(from: GeoPoint, to: GeoPoint): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * True når posisjonen, med oppgitt GPS-nøyaktighet, er utenfor radiusen.
 * Usikre målinger innenfor feilmarginen regnes ikke som utenfor.
 */
export function isClearlyOutside(
  point: GeoPoint,
  accuracyMeters: number,
  site: SiteGeofence
): boolean {
  const distance = distanceMeters(point, site);
  const accuracy = Number.isFinite(accuracyMeters) ? Math.max(accuracyMeters, 0) : 0;
  return distance - accuracy > site.radiusMeters;
}
