import test from "node:test";
import assert from "node:assert/strict";
import { fitLogoToSlot, TENANT_LOGO_SLOT } from "../src/lib/report-logo";

test("fitLogoToSlot gir tom SVG når tenant mangler logo", () => {
  const uri = fitLogoToSlot("", TENANT_LOGO_SLOT);
  assert.match(uri, /^data:image\/svg\+xml;base64,/);
  const svg = Buffer.from(uri.split(",")[1], "base64").toString("utf8");
  assert.match(svg, /width="210"/);
  assert.equal(svg.includes("<image"), false);
});

test("fitLogoToSlot pakker tenant-logo i slot uten stretching", () => {
  const uri = fitLogoToSlot("data:image/png;base64,abc", TENANT_LOGO_SLOT);
  const svg = Buffer.from(uri.split(",")[1], "base64").toString("utf8");
  assert.match(svg, /preserveAspectRatio="xMinYMid meet"/);
  assert.match(svg, /data:image\/png;base64,abc/);
});
