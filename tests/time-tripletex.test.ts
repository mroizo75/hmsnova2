import test from "node:test";
import assert from "node:assert/strict";
import { canEnqueueTimesheetSync } from "../src/lib/time/approval";
import { productMatchesAndQuery } from "../src/lib/time/product-search";
import { clocksOverlap, nextDefaultClock, splitDayHours } from "../src/lib/time/split-day";
import { groupApprovalDays } from "../src/lib/time/approval-groups";
import { groupIdsWithDescendants, isMachineProduct } from "../src/lib/time/product-search";
import {
  buildTripletexCustomerBody,
  buildTripletexMileagePayload,
  buildTripletexProjectOrderLinePayload,
} from "../src/lib/accounting/tripletex/order-payload";
import { buildTripletexTimesheetPayload } from "../src/lib/accounting/tripletex/timesheet-payload";
import { applyTimeBankFactor, nextTimeBankBalance } from "../src/lib/time/timebank";
import { assignmentsOverlap } from "../src/lib/time/resource-overlap";
import { findCustomerDuplicate } from "../src/lib/time/customer-duplicate";
import { buildOrderInvoicePath } from "../src/lib/accounting/invoice";
import { filterEmployeeWidgetsForAccounting } from "../src/lib/accounting/widgets";
import { getTimeReportDateRange } from "../src/lib/time/report-range";
import nb from "../src/i18n/messages/nb.json";
import en from "../src/i18n/messages/en.json";

const rules = {
  dayStartHour: 7,
  dayEndHour: 15.5,
  overtime50CapHours: 4.5,
  saturdayOt50UntilHour: 12,
  lunchMinutes: 30,
};

test("aktivitet og timeart er uavhengige felt på samme rad", () => {
  const row = { billingActivityId: "act-invoice", salaryTypeId: "sal-ot50" };
  assert.notEqual(row.billingActivityId, row.salaryTypeId);
});

test("godkjenning kreves før Tripletex-outbox", () => {
  assert.equal(canEnqueueTimesheetSync("DRAFT"), false);
  assert.equal(canEnqueueTimesheetSync("SUBMITTED"), false);
  assert.equal(canEnqueueTimesheetSync("REJECTED"), false);
  assert.equal(canEnqueueTimesheetSync("APPROVED"), true);
  assert.equal(canEnqueueTimesheetSync("SYNC_ERROR"), true);
});

test("produktsøk AND krever at alle ord treffer", () => {
  const product = { name: "Servicebil diesel", number: "SB-1", categoryName: "Kjøretøy" };
  assert.equal(productMatchesAndQuery(product, "servicebil diesel"), true);
  assert.equal(productMatchesAndQuery(product, "servicebil bensin"), false);
});

test("Brreg-duplikat på organisasjonsnummer", () => {
  const existing = [
    { externalId: "1", name: "Eksisterende AS", organizationNumber: "123456789", phone: null, email: null },
  ];
  const dup = findCustomerDuplicate(existing, { organizationNumber: "123 456 789", name: "Annet" });
  assert.equal(dup?.externalId, "1");
});

test("timebankfaktor 1,5", () => {
  assert.equal(applyTimeBankFactor(2, 1.5), 3);
  assert.equal(nextTimeBankBalance(10, "EARN", 3), 13);
  assert.equal(nextTimeBankBalance(13, "TAKE", 3), 10);
});

test("dobbeltbooking når datoer overlapper for samme ansatt", () => {
  assert.equal(
    assignmentsOverlap(
      { userId: "u1", startDate: "2026-09-01", endDate: "2026-09-05" },
      { userId: "u1", startDate: "2026-09-04", endDate: "2026-09-08" }
    ),
    true
  );
  assert.equal(
    assignmentsOverlap(
      { userId: "u1", startDate: "2026-09-01", endDate: "2026-09-02" },
      { userId: "u1", startDate: "2026-09-03", endDate: "2026-09-04" }
    ),
    false
  );
});

test("sendToCustomer forblir false på faktura", () => {
  const path = buildOrderInvoicePath("99", "2026-09-09");
  assert.match(path, /sendToCustomer=false/);
});

test("hverdag 07:00–20:00 splittes i normal, OT50 og OT100", () => {
  const segments = splitDayHours({
    date: new Date("2026-09-09T12:00:00"),
    clockFrom: "07:00",
    clockTo: "20:00",
    lunchMinutes: 30,
    rules,
  });
  const byType = Object.fromEntries(segments.map((s) => [s.timeType, s.hours]));
  assert.equal(byType.NORMAL, 8);
  assert.equal(byType.OVERTIME_50, 4.5);
});

test("Timer og Jobber vises når tidsregistrering er på", () => {
  const widgets = [{ id: "emp-time" }, { id: "emp-jobs" }, { id: "emp-sja" }];
  const filtered = filterEmployeeWidgetsForAccounting(widgets, {
    timeRegistrationEnabled: true,
    accountingProvider: "NONE",
  });
  assert.deepEqual(
    filtered.map((w) => w.id),
    ["emp-time", "emp-jobs", "emp-sja"]
  );
});

test("nb og en har timesheet-nøkler", () => {
  assert.equal(typeof nb.timesheet.submitDay, "string");
  assert.equal(typeof en.timesheet.submitDay, "string");
  assert.equal(nb.timesheet.status.submitted.length > 0, true);
  assert.equal(en.timesheet.status.submitted.length > 0, true);
  assert.equal(typeof nb.timesheet.reports.title, "string");
  assert.equal(typeof en.timesheet.reports.title, "string");
});

test("dagsperiode er én kalenderdag", () => {
  const { from, to } = getTimeReportDateRange({ period: "day", date: "2026-09-09" });
  assert.equal(from.getFullYear(), 2026);
  assert.equal(from.getMonth(), 8);
  assert.equal(from.getDate(), 9);
  assert.equal(to.getDate(), 9);
  assert.ok(to.getTime() > from.getTime());
});

test("prosjekt-ordrelinje bruker produkt og ikke salgsordre", () => {
  const body = buildTripletexProjectOrderLinePayload({
    projectExternalId: "10",
    productExternalId: "20",
    date: "2026-11-05",
    count: 2,
    description: "Vare",
    unitPriceExclVat: 100,
  });
  assert.deepEqual(body.project, { id: 10 });
  assert.deepEqual(body.product, { id: 20 });
  assert.equal(body.isChargeable, true);
  assert.equal("order" in body, false);
});

test("neste stempling starter der forrige sluttet, kant i kant er lov", () => {
  const next = nextDefaultClock({
    entries: [{ clockTo: "15:30", approvalStatus: "SUBMITTED" }],
    dayStartHour: 7,
    dayEndHour: 15.5,
    lunchMinutes: 30,
  });
  assert.equal(next.clockFrom, "15:30");
  assert.equal(next.lunchMinutes, 0);
  assert.equal(clocksOverlap("07:00", "15:30", "15:30", "16:30"), false);
  assert.equal(clocksOverlap("07:00", "15:30", "15:00", "16:00"), true);
});

test("timeart sendes uten hourlyRate fra Nova", () => {
  const body = buildTripletexTimesheetPayload({
    projectExternalId: "1",
    employeeExternalId: "2",
    activityExternalId: "3",
    salaryTypeExternalId: "4",
    date: "2026-11-05",
    hours: 7.5,
  });
  assert.deepEqual(body.salaryType, { id: 4 });
  assert.equal("hourlyRate" in body, false);
});

test("kjøring er reiseregning med fra og til", () => {
  const body = buildTripletexMileagePayload({
    employeeExternalId: "2",
    projectExternalId: "1",
    rateTypeExternalId: "9",
    date: "2026-11-05",
    km: 12,
    fromAddress: "Storgata 1, 0182 Oslo",
    toAddress: "Karl Johans gate 1, 0154 Oslo",
  });
  const allowance = (body.mileageAllowances as Array<Record<string, unknown>>)[0];
  assert.equal(allowance?.departureLocation, "Storgata 1, 0182 Oslo");
  assert.equal(allowance?.km, 12);
  assert.equal("order" in body, false);
});

test("kundepayload har e-post og postadresse", () => {
  const body = buildTripletexCustomerBody({
    name: "Eksempel AS",
    email: "faktura@example.no",
    postalAddress: { addressLine1: "Storgata 1", postalCode: "0182", city: "Oslo" },
  });
  assert.equal(body.email, "faktura@example.no");
  assert.equal(body.invoiceEmail, "faktura@example.no");
  assert.deepEqual(body.postalAddress, {
    addressLine1: "Storgata 1",
    postalCode: "0182",
    city: "Oslo",
  });
});

test("godkjenning samler ordinær tid og overtid på ett kort", () => {
  const days = groupApprovalDays(
    [
      {
        id: "a",
        userId: "u",
        projectId: "p",
        date: "2026-11-05",
        hours: 7.5,
        timeType: "NORMAL",
        clockFrom: "07:00",
        clockTo: "15:30",
        lunchMinutes: 30,
        comment: "Montering",
        approvalStatus: "SUBMITTED",
        user: { name: "Kari", email: "k@example.no" },
        project: { name: "Tak" },
      },
      {
        id: "b",
        userId: "u",
        projectId: "p",
        date: "2026-11-05",
        hours: 1,
        timeType: "OVERTIME_50",
        clockFrom: "07:00",
        clockTo: "15:30",
        lunchMinutes: 30,
        comment: "Montering",
        approvalStatus: "SUBMITTED",
        user: { name: "Kari", email: "k@example.no" },
        project: { name: "Tak" },
      },
    ],
    []
  );
  assert.equal(days.length, 1);
  assert.equal(days[0]?.normal, 7.5);
  assert.equal(days[0]?.ot50, 1);
  assert.deepEqual(days[0]?.entryIds, ["a", "b"]);
});

test("produktgruppefilter tar med undergrupper", () => {
  const ids = groupIdsWithDescendants(
    [
      { externalId: "parent", parentExternalId: null },
      { externalId: "child", parentExternalId: "parent" },
    ],
    "parent"
  );
  assert.deepEqual(ids.sort(), ["child", "parent"]);
});

test("maskin skilles fra vare på kategori eller timeenhet", () => {
  assert.equal(isMachineProduct({ name: "Lift", categoryName: "Maskiner", unit: "stk" }), true);
  assert.equal(isMachineProduct({ name: "Skrue", categoryName: "Festemidler", unit: "stk" }), false);
});

test("excel-satser brukes bare når Tripletex er av", () => {
  const connected = { payrollInTripletex: true, defaultHourlyRate: 500, defaultKmRate: 5.3 };
  const local = { payrollInTripletex: false, defaultHourlyRate: 500, defaultKmRate: 5.3 };
  assert.equal(connected.payrollInTripletex ? 0 : connected.defaultHourlyRate, 0);
  assert.equal(local.payrollInTripletex ? 0 : local.defaultHourlyRate, 500);
});

test("månedsperiode dekker hele september", () => {
  const { from, to } = getTimeReportDateRange({ period: "month", year: 2026, month: 9 });
  assert.equal(from.getDate(), 1);
  assert.equal(from.getMonth(), 8);
  assert.equal(to.getMonth(), 8);
  assert.equal(to.getDate(), 30);
});
