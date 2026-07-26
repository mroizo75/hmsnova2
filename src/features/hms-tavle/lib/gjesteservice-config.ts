/**
 * Gjesteservice for Digital HMS Tavle – konfigurasjon, prioritet og SLA.
 *
 * Hjemmel: internkontrollforskriften (IK-HMS) § 5 nr. 7 (avdekke og rette opp avvik),
 * forskrift om internkontroll for å oppfylle næringsmiddellovgivningen (IK-mat) § 5 nr. 4
 * og 5 (rutine ved avvik og for å hindre gjentakelse), GDPR art. 5 (dataminimering) og
 * art. 9 (helseopplysninger ved mistanke om matforgiftning).
 *
 * Filen er klient-trygg: ingen Prisma-import, kun rene typer og funksjoner.
 */

export type GuestType =
  | "AVVIK"
  | "KLAGE"
  | "MATFORGIFTNING"
  | "SPORSMAAL"
  | "TILBAKEMELDING";

export type GuestPriority = "NORMAL" | "HOY" | "KRITISK";

export type GuestStatus = "NY" | "LEST" | "BEHANDLET" | "LUKKET";

export const GUEST_TYPE_VALUES: GuestType[] = [
  "AVVIK",
  "KLAGE",
  "MATFORGIFTNING",
  "SPORSMAAL",
  "TILBAKEMELDING",
];

export const GUEST_STATUS_ORDER: GuestStatus[] = ["NY", "LEST", "BEHANDLET", "LUKKET"];

/** Maks antall vedlegg gjesten kan laste opp per melding */
export const MAX_GUEST_ATTACHMENTS = 3;

/** Maks størrelse per vedlegg i MB */
export const MAX_GUEST_ATTACHMENT_MB = 10;

/** Lagringstid for gjestmeldinger – GDPR art. 5(1)(e) */
export const GUEST_RETENTION_MONTHS = 24;

/** Minimum antall saker før aggregerte tall vises offentlig (hindrer utledning av enkeltsaker) */
export const TRUST_PANEL_MIN_VOLUME = 5;

const DEFAULT_SLA_MINUTES: Record<GuestPriority, number> = {
  KRITISK: 60,
  HOY: 240,
  NORMAL: 1440,
};

export interface GuestAttachment {
  key: string;
  name: string;
  size: number;
}

export interface GjesteserviceConfig {
  welcomeText: string | null;
  welcomeTextEn: string | null;
  showRoomField: boolean;
  roomLabel: string | null;
  roomLabelEn: string | null;
  activeTypes: GuestType[];
  allowAttachments: boolean;
  slaMinutes: Record<GuestPriority, number>;
  notifyEmails: string[];
  notifySmsNumbers: string[];
  servicePromise: string | null;
  servicePromiseEn: string | null;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asTrimmedString(item))
    .filter((item): item is string => item !== null);
}

function asPositiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

/**
 * Leser GJEST_SKJEMA-seksjonens JSON-konfig og fyller inn trygge standardverdier.
 */
export function parseGjesteserviceConfig(raw: unknown): GjesteserviceConfig {
  const config = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const activeTypes = asStringArray(config.activeTypes).filter((type): type is GuestType =>
    GUEST_TYPE_VALUES.includes(type as GuestType)
  );

  return {
    welcomeText: asTrimmedString(config.welcomeText),
    welcomeTextEn: asTrimmedString(config.welcomeTextEn),
    showRoomField: config.showRoomField === true,
    roomLabel: asTrimmedString(config.roomLabel),
    roomLabelEn: asTrimmedString(config.roomLabelEn),
    activeTypes: activeTypes.length > 0 ? activeTypes : GUEST_TYPE_VALUES,
    allowAttachments: config.allowAttachments !== false,
    slaMinutes: {
      KRITISK: asPositiveInt(config.slaKritiskMinutes, DEFAULT_SLA_MINUTES.KRITISK),
      HOY: asPositiveInt(config.slaHoyMinutes, DEFAULT_SLA_MINUTES.HOY),
      NORMAL: asPositiveInt(config.slaNormalMinutes, DEFAULT_SLA_MINUTES.NORMAL),
    },
    notifyEmails: asStringArray(config.notifyEmails),
    notifySmsNumbers: asStringArray(config.notifySmsNumbers),
    servicePromise: asTrimmedString(config.servicePromise),
    servicePromiseEn: asTrimmedString(config.servicePromiseEn),
  };
}

/**
 * Prioritet settes automatisk ut fra meldingstype slik at kritiske saker
 * aldri blir liggende. Matforgiftning er helseopplysninger (GDPR art. 9) og krever
 * umiddelbar oppfølging etter IK-mat § 5 nr. 4, jf. matloven § 6 om forsvarlighet.
 */
export function derivePriority(type: GuestType): GuestPriority {
  if (type === "MATFORGIFTNING") return "KRITISK";
  if (type === "AVVIK") return "HOY";
  return "NORMAL";
}

/** Beregner når serviceløftet forfaller for gitt prioritet. */
export function calculateSlaDueAt(
  priority: GuestPriority,
  config: GjesteserviceConfig,
  from: Date = new Date()
): Date {
  const minutes = config.slaMinutes[priority];
  return new Date(from.getTime() + minutes * 60_000);
}

/** Normaliserer locale fra QR-lenke eller nettleser til støttet språk. */
export function normalizeGuestLocale(value: unknown): "nb" | "en" {
  return value === "en" ? "en" : "nb";
}

/** Leser vedleggslisten som er lagret som JSON i databasen. */
export function parseGuestAttachments(raw: unknown): GuestAttachment[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const key = asTrimmedString(record.key);
    if (!key) return [];

    return [
      {
        key,
        name: asTrimmedString(record.name) ?? "Vedlegg",
        size: asPositiveInt(record.size, 0),
      },
    ];
  });
}
