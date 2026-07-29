import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMicrosoftAdminConsentUrl,
  readMicrosoftConsentResult,
} from "../src/lib/microsoft-admin-consent";

const clientId = "8ad2dc50-0d84-4625-8ac0-75335cdc9503";

test("samtykke-URL peker på organizations og ikke common", () => {
  const url = new URL(buildMicrosoftAdminConsentUrl({ clientId, appUrl: "https://www.hmsnova.no" }));

  // Personlige Microsoft-kontoer kan ikke gi admin-samtykke via /common.
  assert.equal(url.pathname, "/organizations/v2.0/adminconsent");
  assert.equal(url.host, "login.microsoftonline.com");
});

test("samtykke-URL inneholder client_id, scope og registrert redirect_uri", () => {
  const url = new URL(buildMicrosoftAdminConsentUrl({ clientId, appUrl: "https://www.hmsnova.no" }));

  assert.equal(url.searchParams.get("client_id"), clientId);
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "https://www.hmsnova.no/api/auth/microsoft-consent"
  );
  assert.equal(
    url.searchParams.get("scope"),
    "openid profile email https://graph.microsoft.com/User.Read"
  );
});

test("etterfølgende skråstrek i app-URL gir ikke dobbel skråstrek", () => {
  const url = new URL(buildMicrosoftAdminConsentUrl({ clientId, appUrl: "http://localhost:3000/" }));

  assert.equal(
    url.searchParams.get("redirect_uri"),
    "http://localhost:3000/api/auth/microsoft-consent"
  );
});

test("manglende konfigurasjon gir feil i stedet for ugyldig URL", () => {
  assert.throws(() => buildMicrosoftAdminConsentUrl({ clientId: "", appUrl: "https://x.no" }));
  assert.throws(() => buildMicrosoftAdminConsentUrl({ clientId, appUrl: "  " }));
});

test("godkjent samtykke leses som granted", () => {
  const params = new URLSearchParams("admin_consent=True&tenant=some-guid");
  assert.equal(readMicrosoftConsentResult(params), "granted");
});

test("avvist samtykke leses som denied selv om admin_consent er True", () => {
  // Microsoft sender admin_consent=True også i feilresponsen.
  const declined = new URLSearchParams("admin_consent=True&error=consent_required");
  const cancelled = new URLSearchParams("admin_consent=True&error=access_denied");

  assert.equal(readMicrosoftConsentResult(declined), "denied");
  assert.equal(readMicrosoftConsentResult(cancelled), "denied");
});

test("andre feil og tomme svar leses som failed", () => {
  assert.equal(readMicrosoftConsentResult(new URLSearchParams("error=invalid_client")), "failed");
  assert.equal(readMicrosoftConsentResult(new URLSearchParams()), "failed");
});
