import { createHash } from "crypto";

/** Pixel-ID er offentlig i nettleseren. API-nøkkelen ligger kun i OPENAI_ADS_API_KEY. */
export const OPENAI_ADS_PIXEL_ID = "Ma7SyeFCFrbqHoatUtbLUn";

const EVENTS_URL = "https://bzr.openai.com/v1/events";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Beholder landskode. Norske 8-sifrede nummer får 47. */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[^\d]/g, "");
  digits = digits.replace(/^0+/, "");
  if (digits.length === 8) digits = `47${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export type OpenAiRegistrationEvent = {
  eventId: string;
  sourceUrl: string;
  email: string;
  phone?: string | null;
  externalId: string;
  city?: string | null;
  postalCode?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  oppref?: string | null;
  obref?: string | null;
};

export async function sendOpenAiRegistrationCompleted(event: OpenAiRegistrationEvent): Promise<void> {
  const apiKey = process.env.OPENAI_ADS_API_KEY?.trim();
  if (!apiKey) return;

  const pixelId = process.env.OPENAI_ADS_PIXEL_ID?.trim() || OPENAI_ADS_PIXEL_ID;
  const phone = event.phone ? normalizePhone(event.phone) : null;
  const payload = {
    validate_only: false,
    events: [
      {
        id: event.eventId,
        type: "registration_completed",
        timestamp_ms: Date.now(),
        ...(event.oppref ? { oppref: event.oppref } : {}),
        source_url: event.sourceUrl,
        action_source: "web",
        user: {
          emails_sha256: [sha256Hex(normalizeEmail(event.email))],
          external_ids_sha256: [sha256Hex(event.externalId.trim())],
          ...(phone ? { phone_numbers_sha256: [sha256Hex(phone)] } : {}),
          ...(event.obref ? { obref: event.obref } : {}),
          ...(event.city ? { cities: [event.city] } : {}),
          ...(event.postalCode ? { postal_codes: [event.postalCode] } : {}),
          countries: ["NO"],
          ...(event.ipAddress ? { ip_address: event.ipAddress } : {}),
          ...(event.userAgent ? { user_agent: event.userAgent } : {}),
        },
        data: {
          type: "customer_action",
        },
      },
    ],
  };

  try {
    const response = await fetch(`${EVENTS_URL}?pid=${encodeURIComponent(pixelId)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error("OpenAI ads event failed", response.status);
    }
  } catch (error) {
    console.error(
      "OpenAI ads event failed",
      error instanceof Error ? error.message : "unknown"
    );
  }
}
