import test from "node:test";
import assert from "node:assert/strict";
import { getVisibleNavItems } from "../src/lib/permissions";
import {
  filterDashboardWidgets,
  isDashboardWidgetAllowed,
} from "../src/lib/dashboard-widget-access";

test("varslingsansvarlig får bare varslingsflis, ikke avvik eller risikokartlegging", () => {
  const nav = getVisibleNavItems("VARSLINGSANSVARLIG");
  assert.equal(
    isDashboardWidgetAllowed({ permission: "whistleblowing", href: "/dashboard/whistleblowing" }, nav),
    true,
  );
  assert.equal(
    isDashboardWidgetAllowed({ permission: "incidents", href: "/dashboard/incidents" }, nav),
    false,
  );
  assert.equal(
    isDashboardWidgetAllowed({ permission: "risks", href: "/dashboard/risks" }, nav),
    false,
  );
  assert.equal(
    isDashboardWidgetAllowed({ permission: "hmsHandbok", href: "/dashboard/hms-handbok" }, nav),
    false,
  );
  assert.equal(
    isDashboardWidgetAllowed({ href: "/dashboard/actions" }, nav),
    false,
  );
  assert.equal(
    isDashboardWidgetAllowed({ permission: "support", href: "/dashboard/support" }, nav),
    true,
  );
});

test("admin beholder avvik-flis", () => {
  const nav = getVisibleNavItems("ADMIN");
  assert.equal(
    isDashboardWidgetAllowed({ permission: "incidents", href: "/dashboard/incidents" }, nav),
    true,
  );
});

test("filter fjerner forbudte fliser og beholder varsling", () => {
  const nav = getVisibleNavItems("VARSLINGSANSVARLIG");
  const kept = filterDashboardWidgets(
    [
      { id: "incidents", permission: "incidents", href: "/dashboard/incidents" },
      { id: "whistleblowing", permission: "whistleblowing", href: "/dashboard/whistleblowing" },
      { id: "support", permission: "support", href: "/dashboard/support" },
    ],
    nav,
  );
  assert.deepEqual(
    kept.map((item) => item.id),
    ["whistleblowing", "support"],
  );
});
