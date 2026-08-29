import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHtmlTable,
  buildReportMergeData,
  contentToBlock,
  stripHtml,
} from "../src/lib/report-merge-data";
import type { PdfReportConfig } from "../src/lib/pdf-brand";

test("stripHtml fjerner tagger og beholder tekst", () => {
  const text = stripHtml("<p>Rotårsak</p><ul><li>Manglende opplæring</li></ul>");
  assert.match(text, /Rotårsak/);
  assert.match(text, /Manglende opplæring/);
  assert.equal(text.includes("<p>"), false);
});

test("buildHtmlTable lager Adobe-kompatibel tabell med inline CSS", () => {
  const html = buildHtmlTable(["Tiltak", "Status"], [["Kurs", "Åpen"]]);
  assert.match(html, /<table/);
  assert.match(html, /style=/);
  assert.match(html, /Tiltak/);
  assert.match(html, /Kurs/);
});

test("contentToBlock bevarer rekkefølge og type for blandet innhold", () => {
  const kv = contentToBlock({
    type: "keyvalue",
    pairs: [["Type", "Ulykke"]],
  });
  const paragraph = contentToBlock({ type: "paragraph", text: "Beskrivelse" });
  assert.equal(kv.kind, "keyvalue");
  assert.match(kv.html, /Ulykke/);
  assert.equal(paragraph.kind, "paragraph");
  assert.equal(paragraph.text, "Beskrivelse");
});

test("buildReportMergeData mapper lovpålagte felter til mal-kontrakten", () => {
  const config: PdfReportConfig = {
    type: "formal",
    reportLabel: "Avviksrapport",
    title: "Fall fra stillas",
    subtitle: "AML § 5-2",
    tenant: { name: "Nova Bygg AS", orgNumber: "123456789", address: "Oslo", logoUrl: "/logo.png" },
    generatedBy: "Kari Nordmann",
    generatedAt: new Date("2026-03-01T10:00:00"),
    legalReference: "AML § 5-2, IK-HMS § 5",
    coverPage: true,
    sections: [
      {
        title: "Avviksdetaljer",
        legalRef: "IK-HMS § 5 nr. 7",
        content: [
          { type: "keyvalue", pairs: [["Type", "Ulykke"]] },
          { type: "paragraph", text: "Arbeider falt." },
        ],
      },
    ],
  };

  const data = buildReportMergeData(config, { tenantLogo: "data:image/png;base64,xx", hmsLogo: "" });
  assert.equal(data.tenantName, "Nova Bygg AS");
  assert.equal(data.hasOrgNumber, "true");
  assert.equal(data.hasAddress, "true");
  assert.equal(data.hasTenantLogo, "true");
  assert.equal(data.coverPage, "true");
  assert.equal(data.reportLabel, "Avviksrapport");
  assert.equal(data.REPORTLABEL, "AVVIKSRAPPORT");
  assert.equal(data.hasLegalReference, "true");
  assert.equal(data.sections.length, 1);
  assert.equal(data.sections[0].hasTitle, "true");
  assert.equal(data.sections[0].blocks[0].kind, "keyvalue");
  assert.equal(data.sections[0].blocks[1].kind, "paragraph");
  assert.equal(data.sections[0].blocks[1].text, "Arbeider falt.");
});

test("coverPage er true som standard når det ikke settes i config", () => {
  const config: PdfReportConfig = {
    type: "formal",
    reportLabel: "Tilsynsrapport",
    title: "Tilsyn",
    tenant: { name: "Nova Bygg AS" },
    sections: [{ content: [{ type: "paragraph", text: "OK" }] }],
  };

  const data = buildReportMergeData(config, { tenantLogo: "", hmsLogo: "" });
  assert.equal(data.coverPage, "true");
  assert.equal(data.REPORTLABEL, "TILSYNSRAPPORT");
});

test("coverPage kan slås av eksplisitt", () => {
  const config: PdfReportConfig = {
    type: "formal",
    title: "Kort notat",
    tenant: { name: "Nova Bygg AS" },
    coverPage: false,
    sections: [{ content: [{ type: "paragraph", text: "OK" }] }],
  };

  const data = buildReportMergeData(config, { tenantLogo: "", hmsLogo: "" });
  assert.equal(data.coverPage, "false");
  assert.equal(data.REPORTLABEL, "RAPPORT");
});
