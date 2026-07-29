/**
 * Admin-samtykke mot Microsoft Entra ID.
 *
 * Mange bedrifter har slått på "user consent" begrensninger i sin egen Entra-tenant.
 * Da får den første ansatte som prøver SSO feilen AADSTS65001, og en global
 * administrator må godkjenne HMS Nova én gang for hele bedriften.
 *
 * Protokoll: https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent
 */

// "organizations" og ikke "common": personlige Microsoft-kontoer kan ikke gi admin-samtykke.
const ADMIN_CONSENT_ENDPOINT = "https://login.microsoftonline.com/organizations/v2.0/adminconsent";

/**
 * Må speile `authorization.params.scope` i AzureADProvider (src/lib/auth.ts).
 * Ber vi om mindre her, dekker ikke samtykket den faktiske innloggingen.
 */
const ADMIN_CONSENT_SCOPE = "openid profile email https://graph.microsoft.com/User.Read";

export const MICROSOFT_CONSENT_CALLBACK_PATH = "/api/auth/microsoft-consent";

export type MicrosoftConsentResult = "granted" | "denied" | "failed";

export function buildMicrosoftAdminConsentUrl(input: {
  clientId: string;
  appUrl: string;
}): string {
  const clientId = input.clientId.trim();
  const appUrl = input.appUrl.trim().replace(/\/+$/, "");

  if (!clientId) {
    throw new Error("clientId mangler for Microsoft admin-samtykke");
  }
  if (!appUrl) {
    throw new Error("appUrl mangler for Microsoft admin-samtykke");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: ADMIN_CONSENT_SCOPE,
    redirect_uri: `${appUrl}${MICROSOFT_CONSENT_CALLBACK_PATH}`,
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
