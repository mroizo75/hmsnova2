export const PRODUCT_UPDATE_KINDS = ["NEW_FEATURE", "IMPROVEMENT", "PLANNED", "FIX"] as const;

export type ProductUpdateKindValue = (typeof PRODUCT_UPDATE_KINDS)[number];

export const PRODUCT_UPDATE_KIND_LABELS: Record<ProductUpdateKindValue, string> = {
  NEW_FEATURE: "Ny funksjon",
  IMPROVEMENT: "Forbedret",
  PLANNED: "Planlagt oppgradering",
  FIX: "Rettet",
};

const OSLO = "Europe/Oslo";

function osloPart(date: Date, type: Intl.DateTimeFormatPartTypes): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OSLO,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  return parts.find((part) => part.type === type)?.value ?? "";
}

function osloOffsetMinutes(date: Date): number {
  const asUtc = Date.UTC(
    Number(osloPart(date, "year")),
    Number(osloPart(date, "month")) - 1,
    Number(osloPart(date, "day")),
    Number(osloPart(date, "hour")),
    Number(osloPart(date, "minute")),
    Number(osloPart(date, "second")),
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}

export function parseOsloDateTimeLocal(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new Error("Velg dag og klokkeslett");
  }
  const utcGuess = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  ));
  const offset = osloOffsetMinutes(utcGuess);
  const instant = new Date(utcGuess.getTime() - offset * 60000);
  const corrected = osloOffsetMinutes(instant);
  return corrected === offset ? instant : new Date(utcGuess.getTime() - corrected * 60000);
}

export function toDatetimeLocalValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${osloPart(date, "year")}-${osloPart(date, "month")}-${osloPart(date, "day")}T${osloPart(date, "hour")}:${osloPart(date, "minute")}`;
}

export function formatUpgradeSchedule(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const day = new Intl.DateTimeFormat("nb-NO", {
    timeZone: OSLO,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("nb-NO", {
    timeZone: OSLO,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${day} kl. ${time}`;
}

export function isProductUpdateKind(value: string): value is ProductUpdateKindValue {
  return (PRODUCT_UPDATE_KINDS as readonly string[]).includes(value);
}

export function productUpdateNotificationTitle(kind: ProductUpdateKindValue, title: string): string {
  return `${PRODUCT_UPDATE_KIND_LABELS[kind]}: ${title.trim()}`;
}

export function productUpdateExcerpt(body: string, max = 160): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

export function productUpdateNotificationMessage(body: string, scheduledAt: Date | null): string {
  const excerpt = productUpdateExcerpt(body, scheduledAt ? 120 : 160);
  if (!scheduledAt) return excerpt;
  return `Oppgradering ${formatUpgradeSchedule(scheduledAt)}. ${excerpt}`;
}
