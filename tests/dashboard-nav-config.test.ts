import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DASHBOARD_NAV_CONFIG, CORE_HUB_ORDER, PINNED_FOOTER_HUB } from "../src/lib/dashboard-nav-config";
import { filterDashboardNavItems, sortDashboardNavItems, isDashboardNavHrefActive } from "../src/lib/dashboard-nav-filter";
import { BRANSJE_MODULES } from "../src/lib/bransje-modules";
import { getPermissions, getVisibleNavItems } from "../src/lib/permissions";
import { groupNavItemsByHub, partitionNavHubGroups, parseNavHubOpenState, isNavHubOpen } from "../src/lib/dashboard-nav-hub-groups";

function loadNavMessages(locale: "nb" | "en" | "nn"): Record<string, string> {
  const raw = readFileSync(new URL(`../src/i18n/messages/${locale}.json`, import.meta.url), "utf8");
  return JSON.parse(raw).nav;
}

test("bransjemoduler finnes i felles menykonfig", () => {
  const hrefs = new Set(DASHBOARD_NAV_CONFIG.map((item) => item.href));
  const extras = [
    "/dashboard/ik-mat",
    "/dashboard/bcm",
    "/dashboard/aktivitetssikkerhet",
    "/dashboard/transport",
    "/dashboard/bht-nattarbeid",
    "/dashboard/fravaer",
    "/dashboard/onboarding",
    "/dashboard/personalarkiv",
    "/dashboard/avdelinger",
    "/dashboard/hr",
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
  assert.equal(hrefs.includes("/dashboard/bcm"), true);
  assert.equal(hrefs.includes("/dashboard/skjenking"), true);
});

test("alle bransjer ser samlet beredskap", () => {
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
  assert.equal(construction.map((item) => item.href).includes("/dashboard/bcm"), true);
  assert.equal(hospitality.map((item) => item.href).includes("/dashboard/bcm"), true);
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
  assert.equal(hrefs.includes("/dashboard/bcm"), true);
});

test("meny sorteres etter arbeidsflyt i konfig, ikke alfabetisk", () => {
  const labels: Record<string, string> = {
    "/dashboard": "Oversikt",
    "/dashboard/training": "Opplæring",
    "/dashboard/incidents": "Avvik",
    "/dashboard/bcm": "Beredskap",
    "/dashboard/meldinger": "Meldinger",
  };
  const sorted = sortDashboardNavItems(
    [
      { href: "/dashboard/meldinger", label: "nav.meldinger", permission: "dashboard", defaultSimple: true, coreHub: "oversikt" },
      { href: "/dashboard/training", label: "nav.training", permission: "training", defaultSimple: true, coreHub: "organisasjon" },
      { href: "/dashboard", label: "nav.dashboard", permission: "dashboard", defaultSimple: true, coreHub: "oversikt" },
      { href: "/dashboard/incidents", label: "nav.incidents", permission: "incidents", defaultSimple: true, coreHub: "avvikTiltak" },
      { href: "/dashboard/bcm", label: "nav.bcm", permission: "beredskap", defaultSimple: true, coreHub: "risiko" },
    ],
    (item) => labels[item.href] ?? item.href,
  );
  assert.deepEqual(
    sorted.map((item) => item.href),
    [
      "/dashboard",
      "/dashboard/meldinger",
      "/dashboard/incidents",
      "/dashboard/bcm",
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

test("samlet beredskap bruker BCM-ruten og den gamle ruten er ikke i menyen", () => {
  const nav = loadNavMessages("nb");
  assert.equal(nav.beredskap, "Beredskap");
  assert.equal(nav.bcm, "Beredskap");
  assert.equal(DASHBOARD_NAV_CONFIG.some((item) => item.href === "/dashboard/bcm"), true);
  assert.equal(DASHBOARD_NAV_CONFIG.some((item) => item.href === "/dashboard/beredskap"), false);
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

test("HR-moduler ligger i HR-huben, ikke organisasjon", () => {
  const hrHrefs = DASHBOARD_NAV_CONFIG.filter((item) => item.coreHub === "hr").map((item) => item.href);
  assert.deepEqual(hrHrefs, [
    "/dashboard/hr",
    "/dashboard/personalarkiv",
    "/dashboard/fravaer",
    "/dashboard/onboarding",
    "/dashboard/medarbeidersamtale",
    "/dashboard/avdelinger",
  ]);
  assert.equal(
    DASHBOARD_NAV_CONFIG.some((item) => item.href === "/dashboard/brukere" && item.coreHub === "organisasjon"),
    true,
  );
});

test("hub-rekkefølge følger daglig arbeid og fester system nederst", () => {
  assert.deepEqual(CORE_HUB_ORDER, [
    "oversikt",
    "avvikTiltak",
    "dokumenter",
    "risiko",
    "skjema",
    "organisasjon",
    "hr",
    "system",
  ]);
  assert.equal(PINNED_FOOTER_HUB, "system");
});

test("innstillinger og hjelp ligger bare i system-huben", () => {
  const systemHrefs = DASHBOARD_NAV_CONFIG.filter((item) => item.coreHub === "system").map(
    (item) => item.href,
  );
  assert.deepEqual(systemHrefs, ["/dashboard/settings", "/dashboard/support"]);
});

test("system-huben vises som footer, ikke i arbeidsmeny", () => {
  const { workGroups, footerGroups } = partitionNavHubGroups(
    groupNavItemsByHub(DASHBOARD_NAV_CONFIG),
  );
  assert.equal(workGroups.some((group) => group.hub === "system"), false);
  assert.deepEqual(
    footerGroups.flatMap((group) => group.items.map((item) => item.href)),
    ["/dashboard/settings", "/dashboard/support"],
  );
});

test("nav-hubber forblir åpne til brukeren lukker dem", () => {
  assert.equal(isNavHubOpen("hr", {}), true);
  assert.equal(isNavHubOpen("hr", { hr: true, risiko: false }), true);
  assert.equal(isNavHubOpen("risiko", { hr: true, risiko: false }), false);
  assert.deepEqual(parseNavHubOpenState(null), {});
  assert.deepEqual(parseNavHubOpenState("{"), {});
  assert.deepEqual(parseNavHubOpenState(JSON.stringify({ hr: false, unknown: true })), { hr: false });
});

test("nav-aktivitet treffer undersider uten å treffe søskenruter", () => {
  const hrefs = DASHBOARD_NAV_CONFIG.map((item) => item.href);
  assert.equal(isDashboardNavHrefActive("/dashboard", "/dashboard", hrefs), true);
  assert.equal(isDashboardNavHrefActive("/dashboard/incidents", "/dashboard", hrefs), false);
  assert.equal(isDashboardNavHrefActive("/dashboard/fravaer/abc", "/dashboard/fravaer", hrefs), true);
  assert.equal(isDashboardNavHrefActive("/dashboard/incidents/statistics", "/dashboard/incidents", hrefs), false);
  assert.equal(
    isDashboardNavHrefActive("/dashboard/incidents/statistics", "/dashboard/incidents/statistics", hrefs),
    true,
  );
});
