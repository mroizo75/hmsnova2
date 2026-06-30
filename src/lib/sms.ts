/**
 * SMS Service
 * Støtter norske SMS-providers (Link Mobility, IntelliSMS, ProSMS) og proSMS.se for Ring meg
 */

/** Godkjent avsendernavn for proSMS.se – bruk kun "HMS Nova" */
export const RING_MEG_SENDER_NAME = "HMS Nova";


interface SmsOptions {
  to: string;      // Telefonnummer (E.164 eller norsk +47XXXXXXXX)
  message: string; // SMS-melding (maks 160 tegn for best praksis)
}

/**
 * Send SMS via konfigurert provider
 */
export async function sendSms(options: SmsOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const provider = process.env.SMS_PROVIDER || "link_mobility"; // "link_mobility", "intellisms", "prosms", eller "mock"

  // Valider telefonnummer (norsk format)
  if (!options.to.match(/^\+47\d{8}$/)) {
    return {
      success: false,
      error: "Ugyldig norsk telefonnummer. Format: +47XXXXXXXX",
    };
  }

  // Valider meldingslengde
  if (options.message.length > 160) {
    console.warn(`SMS message too long (${options.message.length} chars). Will be split.`);
  }

  try {
    switch (provider) {
      case "link_mobility":
        return await sendViaLinkMobility(options);
      case "intellisms":
        return await sendViaIntelliSMS(options);
      case "prosms":
        return await sendViaProSMS(options);
      case "mock":
        return mockSendSms(options);
      default:
        return mockSendSms(options);
    }
  } catch (error: unknown) {
    console.error("SMS send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ukjent feil",
    };
  }
}

/**
 * Send via Link Mobility (tidligere PSWinCom)
 * Norges største SMS-leverandør
 * https://www.linkmobility.com/no/
 */
async function sendViaLinkMobility(options: SmsOptions) {
  const username = process.env.LINK_MOBILITY_USERNAME;
  const password = process.env.LINK_MOBILITY_PASSWORD;
  const fromName = process.env.LINK_MOBILITY_FROM || "HMS Nova";

  if (!username || !password) {
    throw new Error("Link Mobility miljøvariabler ikke satt");
  }

  const url = "https://simple.pswin.com/";
  
  const params = new URLSearchParams({
    USER: username,
    PW: password,
    RCV: options.to.replace("+", ""), // Fjern + fra nummer
    SND: fromName,
    TXT: options.message,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const responseText = await response.text();

  // Link Mobility returnerer "OK" ved suksess
  if (responseText.startsWith("OK")) {
    const messageId = responseText.split(" ")[1] || `lm-${Date.now()}`;
    return {
      success: true,
      messageId,
    };
  } else {
    throw new Error(`Link Mobility error: ${responseText}`);
  }
}

/**
 * Send via IntelliSMS
 * Norsk SMS-leverandør med god API
 * https://www.intellisms.no/
 */
async function sendViaIntelliSMS(options: SmsOptions) {
  const username = process.env.INTELLISMS_USERNAME;
  const password = process.env.INTELLISMS_PASSWORD;
  const fromName = process.env.INTELLISMS_FROM || "HMS Nova";

  if (!username || !password) {
    throw new Error("IntelliSMS miljøvariabler ikke satt");
  }

  const url = "https://www.intellisms.no/sms/send";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
      to: options.to.replace("+47", ""), // Kun 8-sifret nummer
      from: fromName,
      text: options.message,
    }),
  });

  const data = await response.json();

  if (data.status === "ok") {
    return {
      success: true,
      messageId: data.messageId || `is-${Date.now()}`,
    };
  } else {
    throw new Error(`IntelliSMS error: ${data.error || "Ukjent feil"}`);
  }
}

/**
 * Normaliser telefonnummer for proSMS.se API (receiver som tall med landskode).
 * Eksempel: +4799112916 → 4799112916, 99112916 → 4799112916
 */
function normalizePhoneForProSMS(phone: string): string {
  let normalized = phone.replace(/[\s\-]/g, "");
  if (normalized.startsWith("+")) {
    normalized = normalized.substring(1);
  }
  if (normalized.startsWith("47") && normalized.length > 8) {
    normalized = normalized.substring(2);
  }
  if (normalized.length === 8 && !normalized.startsWith("47")) {
    normalized = "47" + normalized;
  }
  return normalized;
}

/**
 * Send via ProSMS.se API (v1)
 * Dokumentasjon: https://docs.prosms.se/
 * Krever: PROSMS_API_KEY eller PRO_SMS_API_KEY (Bearer), PROSMS_FROM for avsendernavn (f.eks. "HMS Nova")
 */
async function sendViaProSMS(options: SmsOptions) {
  const apiKey = process.env.PROSMS_API_KEY ?? process.env.PRO_SMS_API_KEY;
  const fromName = process.env.PROSMS_FROM || RING_MEG_SENDER_NAME;
  const baseUrl = process.env.PROSMS_API_URL || "https://api.prosms.se/v1/sms/send";

  if (!apiKey) {
    throw new Error("ProSMS API key ikke satt (PROSMS_API_KEY eller PRO_SMS_API_KEY)");
  }

  const normalizedPhone = normalizePhoneForProSMS(options.to);
  if (!normalizedPhone || normalizedPhone.length < 8) {
    throw new Error("Ugyldig telefonnummer for ProSMS");
  }

  const receiverNumber = parseInt(normalizedPhone, 10);

  const requestBody = {
    receiver: receiverNumber,
    senderName: fromName,
    message: options.message,
    format: "gsm",
    encoding: "utf8",
  };

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errMessage = `ProSMS error: ${response.status}`;
    try {
      const errJson = JSON.parse(responseText);
      errMessage = (errJson as { message?: string }).message ?? errMessage;
    } catch {
      if (responseText) errMessage = responseText;
    }
    throw new Error(errMessage);
  }

  let data: { status?: string; message?: string; result?: { report?: { accepted?: Array<{ receiver?: number }> } } };
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`ProSMS ugyldig svar: ${responseText}`);
  }

  if (data.status === "success") {
    const messageId =
      data.result?.report?.accepted?.[0]?.receiver?.toString() ?? `prosms-${Date.now()}`;
    if (process.env.NODE_ENV !== "production") {
      console.info("[prosms] SMS akseptert, receiver (siste 4): ***" + String(receiverNumber).slice(-4));
    }
    return { success: true, messageId };
  }

  throw new Error(data.message ?? "ProSMS ukjent feil");
}

/**
 * Send SMS uten norsk-nummer-validering (f.eks. til salgsnummer i Sverige).
 * Bruker samme provider som sendSms.
 */
export async function sendSmsToNumber(options: SmsOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const provider = process.env.SMS_PROVIDER || "link_mobility";
  if (options.message.length > 160) {
    console.warn(`SMS message too long (${options.message.length} chars). May be split.`);
  }
  try {
    switch (provider) {
      case "link_mobility":
        return await sendViaLinkMobility(options);
      case "intellisms":
        return await sendViaIntelliSMS(options);
      case "prosms":
        return await sendViaProSMS(options);
      case "mock":
        return mockSendSms(options);
      default:
        return mockSendSms(options);
    }
  } catch (error: unknown) {
    console.error("SMS send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ukjent feil",
    };
  }
}

/**
 * Ring meg: sender SMS til salgsavdeling med kundens navn og telefon.
 * Bruker ProSMS når PROSMS_API_KEY er satt (anbefalt for Ring meg); ellers fallback til SMS_PROVIDER.
 * Krever: RING_MEG_SALES_PHONE, og enten PROSMS_API_KEY eller konfigurert SMS_PROVIDER.
 */
export async function sendRingMegSms(customerName: string, customerPhone: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const salesPhone = process.env.RING_MEG_SALES_PHONE;
  if (!salesPhone || !salesPhone.trim()) {
    return { success: false, error: "RING_MEG_SALES_PHONE er ikke satt" };
  }
  const to = salesPhone.trim().startsWith("+") ? salesPhone.trim() : `+47${salesPhone.trim()}`;
  const message = `Ring meg: ${customerName} ${customerPhone}. Ønsker mer info/kjøp HMS Nova.`;

  const apiKey = process.env.PROSMS_API_KEY ?? process.env.PRO_SMS_API_KEY;
  if (apiKey) {
    try {
      return await sendViaProSMS({ to, message });
    } catch (error: unknown) {
      console.error("SMS send error (Ring meg via ProSMS):", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Kunne ikke sende via ProSMS",
      };
    }
  }

  return sendSmsToNumber({ to, message });
}

/**
 * Mock SMS (for testing uten å sende ekte SMS)
 */
function mockSendSms(options: SmsOptions) {
  console.log("=".repeat(60));
  console.log("📱 MOCK SMS");
  console.log("=".repeat(60));
  console.log(`To: ${options.to}`);
  console.log(`Message: ${options.message}`);
  console.log("=".repeat(60));

  return {
    success: true,
    messageId: `mock-${Date.now()}`,
  };
}

/**
 * Normaliser norsk telefonnummer til E.164-format (+47XXXXXXXX).
 * Aksepterer: 8-sifret, 4712345678, +4712345678.
 * Returnerer null hvis input er tom eller resultatet er ugyldig.
 */
export function formatPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");

  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("47") && cleaned.length === 10) {
      cleaned = "+" + cleaned;
    } else if (cleaned.startsWith("0")) {
      cleaned = "+47" + cleaned.substring(1);
    } else {
      cleaned = "+47" + cleaned;
    }
  }

  return /^\+47\d{8}$/.test(cleaned) ? cleaned : null;
}

/**
 * Valider norsk telefonnummer
 */
export function isValidNorwegianPhone(phone: string): boolean {
  return formatPhoneNumber(phone) !== null;
}

