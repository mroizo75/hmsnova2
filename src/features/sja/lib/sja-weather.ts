export interface SjaWeatherData {
  displayName: string;
  current: {
    temp: number;
    label: string;
    windSpeed: number;
    humidity: number;
  };
}

export function isSjaWeatherData(value: unknown): value is SjaWeatherData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  if (typeof data.displayName !== "string" || !data.current || typeof data.current !== "object") {
    return false;
  }
  const current = data.current as Record<string, unknown>;
  return (
    typeof current.temp === "number" &&
    typeof current.label === "string" &&
    typeof current.windSpeed === "number" &&
    typeof current.humidity === "number"
  );
}

export function formatSjaWeatherConditions(data: SjaWeatherData): string {
  const location = data.displayName.split(",").slice(0, 2).join(",").trim();
  const conditions = [
    data.current.label,
    `${data.current.temp} °C`,
    `vind ${data.current.windSpeed} m/s`,
    `luftfuktighet ${data.current.humidity} %`,
  ];

  return `${conditions.join(", ")}${location ? ` – ${location}` : ""}`;
}
