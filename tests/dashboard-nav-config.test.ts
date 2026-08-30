import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DASHBOARD_NAV_CONFIG } from "../src/lib/dashboard-nav-config";
import { filterDashboardNavItems, sortDashboardNavItems } from "../src/lib/dashboard-nav-filter";
import { BRANSJE_MODULES } from "../src/lib/bransje-modules";
import { getPermissions, getVisibleNavItems } from "../src/lib/permissions";

function loadNavMessages(locale: "nb" | "en" | "nn"): Record<string, string> {
  const raw = readFileSync(new URL(`../src/i18n/messages/${locale}.json`, import.meta.url), "utf8");
  return JSON.parse(raw).nav;
}

test("bransjemoduler finnes i felles menykonfig", () => {
  const hrefs = new Set(DASHBOARD_NAV_CONFIG.map((item) => item.href));
  const extras = [
    "/dashboard/ik-mat",
    "/dashboard/beredskap",
    "/dashboard/aktivitetssikkerhet",
    "/dashboard/transport",
    "/dashboard/bht-nattarbeid",
    "/dashboard/fravaer",
    "/dashboard/onboarding",
    "/dashboard/personalarkiv",
    "/dashboard/skjenking",
  ];
  for (const href of extras) {
    assert.equal(hrefs.has(href), true, `Mangler ${href} i DASHBOARD_NAV_CONFIG`);
  }
});

test("alle bransje-tillegg finnes i menykonfig", () => {
  const hrefs = new Set(DASHBOARD_NAV_CONFIG.map((item) => item.href));
  for (const config of Object.values(BRANSJE_MODULES)) {
    for (const href of config.modules) {
      assert.equal(hrefs.has(href), true, `Bransjemodul ${href} mangler i menyen`);
    }
  }
});

test("admin ser IK-mat og bransjemoduler i avansert modus", () => {
  const items = filterDashboardNavItems({
    visibleNavItems: getVisibleNavItems("ADMIN"),
    role: "ADMIN",
    permissions: getPermissions("ADMIN"),
    moduleVisibility: null,
    tenantFeatures: [],
    tenantIndustry: "hospitality",
    isSimpleMode: false,
    simpleMenuItems: null,
  });
  const hrefs = items.map((item) => item.href);
  assert.equal(hrefs.includes("/dashboard/ik-mat"), true);
  assert.equal(hrefs.includes("/dashboard/bht-nattarbeid"), true);
  assert.equal(hrefs.includes("/dashboard/aktivitetssikkerhet"), true);
  assert.equal(hrefs.includes("/dashboard/transport"), true);
  assert.equal(hrefs.includes("/dashboard/beredskap"), true);
  assert.equal(hrefs.includes("/dashboard/skjenking"), true);
});

test("alle bransjer ser beredskap", () => {
  const construction = filterDashboardNavItems({
    visibleNavItems: getVisibleNavItems("ADMIN"),
    role: "ADMIN",
    permissions: getPermissions("ADMIN"),
    moduleVisibility: null,
    tenantFeatures: [],
    tenantIndustry: "CONSTRUCTION",
    isSimpleMode: true,
    simpleMenuItems: null,
  });
  const hospitality = filterDashboardNavItems({
    visibleNavItems: getVisibleNavItems("ADMIN"),
    role: "ADMIN",
    permissions: getPermissions("ADMIN"),
    moduleVisibility: null,
    tenantFeatures: [],
    tenantIndustry: "hospitality",
    isSimpleMode: true,
    simpleMenuItems: null,
  });
  assert.equal(construction.map((item) => item.href).includes("/dashboard/beredskap"), true);
  assert.equal(hospitality.map((item) => item.href).includes("/dashboard/beredskap"), true);
});

test("hotell i enkel modus uten lagret meny viser IK-mat via bransje", () => {
  const items = filterDashboardNavItems({
    visibleNavItems: getVisibleNavItems("ADMIN"),
    role: "ADMIN",
    permissions: getPermissions("ADMIN"),
    moduleVisibility: null,
    tenantFeatures: [],
    tenantIndustry: "hospitality",
    isSimpleMode: true,
    simpleMenuItems: null,
  });
  const hrefs = items.map((item) => item.href);
  assert.equal(hrefs.includes("/dashboard/ik-mat"), true);
  assert.equal(hrefs.includes("/dashboard/bht-nattarbeid"), true);
  assert.equal(hrefs.includes("/dashboard/skjenking"), true);
  assert.equal(hrefs.includes("/dashboard/beredskap"), true);
});

test("meny sorteres med Oversikt først og resten på navn", () => {
  const labels: Record<string, string> = {
    "/dashboard": "Oversikt",
    "/dashboard/training": "Opplæring",
    "/dashboard/incidents": "Avvik",
    "/dashboard/beredskap": "Beredskap",
    "/dashboard/meldinger": "Meldinger",
  };
  const sorted = sortDashboardNavItems(
    [
      { href: "/dashboard/meldinger", label: "nav.meldinger", permission: "dashboard", defaultSimple: true },
      { href: "/dashboard/training", label: "nav.training", permission: "training", defaultSimple: true },
      { href: "/dashboard", label: "nav.dashboard", permission: "dashboard", defaultSimple: true },
      { href: "/dashboard/incidents", label: "nav.incidents", permission: "incidents", defaultSimple: true },
      { href: "/dashboard/beredskap", label: "nav.beredskap", permission: "beredskap", defaultSimple: true },
    ],
    (item) => labels[item.href] ?? item.href,
  );
  assert.deepEqual(
    sorted.map((item) => item.href),
    [
      "/dashboard",
      "/dashboard/incidents",
      "/dashboard/beredskap",
      "/dashboard/meldinger",
      "/dashboard/training",
    ],
  );
});

test("konsernmeldinger vises bare med konserntilgang", () => {
  const withoutKonsern = filterDashboardNavItems({
    visibleNavItems: getVisibleNavItems("ADMIN"),
    role: "ADMIN",
    permissions: getPermissions("ADMIN"),
    moduleVisibility: null,
    tenantFeatures: [],
    tenantIndustry: "hospitality",
    isSimpleMode: false,
    simpleMenuItems: null,
  });
  const withKonsern = filterDashboardNavItems({
    visibleNavItems: getVisibleNavItems("ADMIN"),
    role: "ADMIN",
    permissions: getPermissions("ADMIN"),
    moduleVisibility: null,
    tenantFeatures: [],
    tenantIndustry: "hospitality",
    isSimpleMode: false,
    simpleMenuItems: null,
    hasKonsernMenu: true,
  });
  assert.equal(withoutKonsern.some((item) => item.href === "/dashboard/meldinger"), false);
  assert.equal(withKonsern.some((item) => item.href === "/dashboard/meldinger"), true);
});

test("menyoversettelser finnes i nb, en og nn", () => {
  const locales = ["nb", "en", "nn"] as const;
  for (const locale of locales) {
    const nav = loadNavMessages(locale);
    for (const item of DASHBOARD_NAV_CONFIG) {
      const key = item.label.replace(/^nav\./, "");
      assert.equal(typeof nav[key], "string", `Mangler nav.${key} i ${locale}.json`);
      assert.ok(nav[key].trim().length > 0, `Tom nav.${key} i ${locale}.json`);
    }
  }
});

test("Beredskap og BCM har ulike visningsnavn", () => {
  const nav = loadNavMessages("nb");
  assert.equal(nav.beredskap, "Beredskap");
  assert.equal(nav.bcm, "Beredskap og kontinuitet");
  assert.notEqual(nav.bcm, nav.beredskap);
});

test("getVisibleNavItems har nøkler for bransjemoduler", () => {
  const visible = getVisibleNavItems("ADMIN");
  assert.equal(visible.ikMat, true);
  assert.equal(visible.aktivitetssikkerhet, true);
  assert.equal(visible.transport, true);
  assert.equal(visible.bhtNattarbeid, true);
  assert.equal(visible.beredskap, true);
  assert.equal(visible.skjenking, true);
});
