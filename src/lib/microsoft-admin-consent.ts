/**
 * Admin-samtykke mot Microsoft Entra ID.
 *
 * Mange bedrifter har slått på "user consent" begrensninger i sin egen Entra-tenant.
 * Da får den første ansatte som prøver SSO feilen AADSTS65001, og en global
 * administrator må godkjenne HMS Nova én gang for hele bedriften.
 *
 * Protokoll: https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent
 */

import { createHmac, timingSafeEqual } from "crypto";
import { AZURE_AD_OIDC_SCOPE } from "./azure-ad-email";

// "organizations" og ikke "common": personlige Microsoft-kontoer kan ikke gi admin-samtykke.
const ADMIN_CONSENT_ENDPOINT = "https://login.microsoftonline.com/organizations/v2.0/adminconsent";

export const MICROSOFT_CONSENT_CALLBACK_PATH = "/api/auth/microsoft-consent";
export const MICROSOFT_CONSENT_STATE_MAX_AGE_MS = 30 * 60 * 1000;

export type MicrosoftConsentResult = "granted" | "denied" | "failed";

function getConsentSecret(): string {
  return process.env.NEXTAUTH_SECRET || "dev-microsoft-consent-secret";
}

export function createMicrosoftConsentState(
  userId: string,
  tenantId: string,
  now = Date.now()
): string {
  const exp = now + MICROSOFT_CONSENT_STATE_MAX_AGE_MS;
  const payload = `${userId}.${tenantId}.${exp}`;
  const sig = createHmac("sha256", getConsentSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyMicrosoftConsentState(
  state: string | null | undefined,
  userId: string,
  tenantId: string,
  now = Date.now()
): boolean {
  if (!state) return false;
  const parts = state.split(".");
  if (parts.length !== 4) return false;

  const [id, tenant, expRaw, sig] = parts;
  if (id !== userId || tenant !== tenantId) return false;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now) return false;

  const payload = `${id}.${tenant}.${expRaw}`;
  const expected = createHmac("sha256", getConsentSecret()).update(payload).digest("hex");
  const actual = Buffer.from(sig);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}

export function buildMicrosoftAdminConsentUrl(input: {
  clientId: string;
  appUrl: string;
  state: string;
}): string {
  const clientId = input.clientId.trim();
  const appUrl = input.appUrl.trim().replace(/\/+$/, "");
  const state = input.state.trim();

  if (!clientId) {
    throw new Error("clientId mangler for Microsoft admin-samtykke");
  }
  if (!appUrl) {
    throw new Error("appUrl mangler for Microsoft admin-samtykke");
  }
  if (!state) {
    throw new Error("state mangler for Microsoft admin-samtykke");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: AZURE_AD_OIDC_SCOPE,
    redirect_uri: `${appUrl}${MICROSOFT_CONSENT_CALLBACK_PATH}`,
    state,
  });

  return `${ADMIN_CONSENT_ENDPOINT}?${params.toString()}`;
}

/**
 * Microsoft sender `admin_consent=True` også ved feil, så `error` må sjekkes først.
 * Verdien `tenant` fra responsen brukes bevisst ikke til noe — Microsoft advarer
 * eksplisitt mot å behandle den som autentisert informasjon.
 */
export function readMicrosoftConsentResult(params: URLSearchParams): MicrosoftConsentResult {
  const error = params.get("error");

  if (error) {
    return error === "access_denied" || error === "consent_required" ? "denied" : "failed";
  }

  return params.get("admin_consent")?.toLowerCase() === "true" ? "granted" : "failed";
}
