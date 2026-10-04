import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("proxy beskytter mutasjoner og unntar verifiserte integrasjoner", () => {
  const source = readSource("src/proxy.ts");

  assert.match(source, /MUTATION_METHODS/);
  assert.match(source, /request\.headers\.has\("next-action"\)/);
  assert.match(source, /policy: "authenticatedMutation"/);
  assert.match(source, /"\/api\/webhooks\/"/);
  assert.match(source, /"\/api\/cron\/"/);
  assert.match(source, /"\/api\/internal\/"/);
});

test("credentials-innlogging begrenses på både IP og konto", () => {
  const source = readSource("src/lib/auth.ts");

  assert.match(source, /scope: "login-ip"/);
  assert.match(source, /scope: "login-account"/);
  assert.match(source, /policy: "login"/);
  assert.match(source, /policy: "sensitiveLookup"/);
});

test("representative offentlige og autentiserte skjemaer er beskyttet", () => {
  const expectedPolicies: Array<[string, string]> = [
    [
      "src/app/api/whistleblowing/track/route.ts",
      'policy: "sensitiveLookup"',
    ],
    [
      "src/app/api/hms-tavle/standalone-register/route.ts",
      'policy: "publicSignup"',
    ],
    [
      "src/app/api/subcontractor/[portalToken]/submit/route.ts",
      'policy: "publicForm"',
    ],
    [
      "src/app/api/incidents/report/route.ts",
      'policy: "employeeSubmission"',
    ],
    ["src/app/api/forms/submit/route.ts", 'policy: "employeeSubmission"'],
    ["src/app/api/ai/transcribe/route.ts", 'policy: "expensiveOperation"'],
    ["src/app/api/ai/sja-draft/route.ts", 'policy: "expensiveOperation"'],
    ["src/app/api/sja/upload/route.ts", 'policy: "upload"'],
  ];

  for (const [path, policy] of expectedPolicies) {
    assert.equal(
      readSource(path).includes(policy),
      true,
      `${path} mangler ${policy}`
    );
  }
});
