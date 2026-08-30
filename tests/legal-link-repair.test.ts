import test from "node:test";
import assert from "node:assert/strict";
import {
  repairDashboardRoute,
  canonicalRequirementTitle,
  DASHBOARD_ROUTE_ALIASES,
} from "../src/lib/legal-link-repair";
import { REGULATORY_REQUIREMENTS } from "../src/lib/regulatory-requirements-seed";
import { ALLE_SNARVEIER } from "../src/features/hms-tavle/lib/snarveier-config";

test("gamle internstier mappes til eksisterende moduler", () => {
  assert.equal(repairDashboardRoute("/dashboard/stoffkartotek"), "/dashboard/chemicals");
  assert.equal(repairDashboardRoute("/dashboard/opplaering"), "/dashboard/training");
  assert.equal(repairDashboardRoute("/dashboard/haccp"), "/dashboard/ik-mat/haccp");
  assert.equal(repairDashboardRoute("/dashboard/sha-plan"), "/dashboard/construction-compliance");
  assert.equal(repairDashboardRoute("/dashboard/varsling"), "/dashboard/whistleblowing");
  assert.equal(repairDashboardRoute("/dashboard/training"), "/dashboard/training");
});

test("seedede krav peker ikke på utdaterte internstier", () => {
  const outdated = new Set(Object.keys(DASHBOARD_ROUTE_ALIASES));
  for (const req of REGULATORY_REQUIREMENTS) {
    if (!req.hmsNovaRoute) continue;
    assert.equal(
      outdated.has(req.hmsNovaRoute),
      false,
      `${req.title} peker på utdatert sti ${req.hmsNovaRoute}`,
    );
  }
});

test("gamle kravtitler mappes til seed-titler", () => {
  assert.equal(
    canonicalRequirementTitle("Allergenoversikt"),
    "Allergenoversikt og allergenrutine",
  );
  assert.equal(
    canonicalRequirementTitle("Brannvernrutine og rømningsplan"),
    "Brannvernrutine, rømningsplan og brannøvelser",
  );
});

test("mattrygghet og skjenking har internlenker i seed", () => {
  const routes = new Set(
    REGULATORY_REQUIREMENTS.map((req) => req.hmsNovaRoute).filter(Boolean),
  );
  assert.equal(routes.has("/dashboard/ik-mat/varemottak"), true);
  assert.equal(routes.has("/dashboard/ik-mat/renhold"), true);
  assert.equal(routes.has("/dashboard/ik-mat/temperatur"), true);
  assert.equal(routes.has("/dashboard/skjenking"), true);
});

test("tavle-snarveier peker ikke på utdaterte internstier", () => {
  const outdated = new Set(Object.keys(DASHBOARD_ROUTE_ALIASES));
  for (const snarvei of ALLE_SNARVEIER) {
    if (!snarvei.hmsFunksjon) continue;
    assert.equal(
      outdated.has(snarvei.hmsFunksjon),
      false,
      `${snarvei.id} peker på utdatert sti ${snarvei.hmsFunksjon}`,
    );
  }
});
