export async function drivingDistanceKm(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): Promise<number | null> {
  const route = await drivingRoute(from, to);
  return route?.km ?? null;
}

export async function drivingRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): Promise<{ km: number; points: Array<{ lat: number; lon: number }> } | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=simplified&geometries=geojson`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    routes?: Array<{ distance?: number; geometry?: { coordinates?: Array<[number, number]> } }>;
  };
  const meters = data.routes?.[0]?.distance;
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters <= 0) return null;
  const coordinates = data.routes?.[0]?.geometry?.coordinates ?? [];
  const points = coordinates
    .map(([lon, lat]) => ({ lat, lon }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  return {
    km: Math.max(1, Math.round(meters / 1000)),
    points: points.length >= 2 ? points : [from, to],
  };
}
