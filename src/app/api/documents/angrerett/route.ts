import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

/**
 * Genererer angrerettsdokument for HMS Nova.
 *
 * For B2B (næringsdrivende) gjelder ikke Angrerettloven (lov om opplysningsplikt og
 * angrerett ved fjernsalg) direkte — den er for forbrukere. HMS Nova tilbyr likevel
 * 14 dagers betenkningstid som en kommersiell rettighet (god forretningsskikk).
 */
export async function GET() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 20;
  const marginR = 20;
  const maxW = pageW - marginL - marginR;
  let y = 20;
  const lineH = 6;
  const sectionGap = 8;

  function addText(
    text: string,
    fontSize = 11,
    style: "normal" | "bold" = "normal",
    indent = 0
  ) {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", style);
    const lines = doc.splitTextToSize(text, maxW - indent);
    lines.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginL + indent, y);
      y += lineH;
    });
  }

  function addHRule() {
    y += 2;
    doc.setDrawColor(180, 180, 180);
    doc.line(marginL, y, pageW - marginR, y);
    y += 4;
  }

  // ── Overskrift ──────────────────────────────────────────────────────────────
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("HMS NOVA · hmsnova.no", marginL, 9);
  doc.setTextColor(0, 0, 0);
  y = 22;

  addText("ANGRERETTSERKLÆRING", 18, "bold");
  addText("Frivillig 14-dagers betenkningstid for bedriftskunder", 11, "normal");
  y += 2;
  addHRule();

  // ── Parter ──────────────────────────────────────────────────────────────────
  addText("1. AVTALEPARTER", 12, "bold");
  y += 2;
  addText("Tjenesteleverandør:", 11, "bold");
  addText("KKS AS, org.nr. 931 869 266", 11, "normal", 5);
  addText("Postboks / adresse: Siver Stordahls vei 47, 6430 Bud, Norge", 11, "normal", 5);
  addText("E-post: post@hmsnova.no  |  Nettsted: hmsnova.no", 11, "normal", 5);
  y += sectionGap;

  addText("Kunde:", 11, "bold");
  addText("Bedriften som registrerer seg for HMS Nova-abonnement.", 11, "normal", 5);
  y += sectionGap;

  addHRule();

  // ── Bakgrunn ──────────────────────────────────────────────────────────────
  addText("2. BAKGRUNN OG FRIVILLIG BETENKNINGSTID", 12, "bold");
  y += 2;
  addText(
    "Angrerettloven (lov av 20. juni 2014 nr. 27) gjelder i utgangspunktet kun for " +
      "forbrukerkjøp. HMS Nova er en B2B-tjeneste (virksomhet-til-virksomhet) og forbrukervernet " +
      "i angrerettloven gjelder derfor ikke automatisk.",
    11
  );
  y += 3;
  addText(
    "KKS AS tilbyr likevel en frivillig 14-dagers betenkningstid til alle nye bedriftskunder " +
      "som en del av god forretningsskikk og tillit til tjenesten. Denne retten gjelder fra " +
      "bestillingsdatoen (avtaleinngåelsen).",
    11
  );
  y += sectionGap;

  addHRule();

  // ── Vilkår ──────────────────────────────────────────────────────────────
  addText("3. VILKÅR FOR BETENKNINGSTIDEN", 12, "bold");
  y += 2;

  const items = [
    "Fristen er 14 kalenderdager regnet fra datoen du bekrefter bestillingen.",
    "Retten gjelder kun dersom tjenesten ikke er tatt vesentlig i bruk (opplastede HMS-dokumenter, " +
      "registrerte avvik, brukere m.m. utover testnivå).",
    "Angreretten bortfaller automatisk dersom bedriften har lastet ned eller generert rapport-PDF-er " +
      "under perioden, med mindre dette ble gjort i en klar testsammenheng.",
    "Angreretten gjelder ikke for avtaler inngått av superadmin på vegne av kunden (manuelle " +
      "aktiveringer) med mindre kunden skriftlig er informert om betenkningstiden.",
  ];

  items.forEach((item, i) => {
    addText(`${i + 1}.  ${item}`, 11, "normal", 5);
    y += 2;
  });

  y += sectionGap;
  addHRule();

  // ── Slik angrer du ──────────────────────────────────────────────────────────
  addText("4. SLIK UTØVER DU BETENKNINGSTIDEN", 12, "bold");
  y += 2;
  addText(
    "Send en klar og utvetydig melding til oss innen 14 dager fra bestillingsdatoen. " +
      "Meldingen kan sendes via:",
    11
  );
  y += 3;
  addText("• E-post til post@hmsnova.no", 11, "normal", 5);
  addText("• Telefon: +47 97 07 07 07", 11, "normal", 5);
  addText('• Skriftlig post til: KKS AS, Siver Stordahls vei 47, 6430 Bud', 11, "normal", 5);
  y += 3;
  addText(
    "Meldingen må inneholde: bedriftsnavn, org.nr., kontaktpersonens navn og e-post, " +
      "samt bestillingsdatoen.",
    11
  );
  y += sectionGap;

  addHRule();

  // ── Konsekvenser ──────────────────────────────────────────────────────────
  addText("5. KONSEKVENSER VED UTØVELSE AV BETENKNINGSTIDEN", 12, "bold");
  y += 2;
  addText(
    "Dersom du benytter deg av betenkningstiden innen fristen, vil:",
    11
  );
  y += 3;
  addText("• Abonnementet avsluttes uten kostnad.", 11, "normal", 5);
  addText("• Evt. forhåndsbetalt beløp refunderes innen 14 virkedager.", 11, "normal", 5);
  addText("• Alle data slettes fra HMS Nova innen 30 dager etter angremeldingen.", 11, "normal", 5);
  y += sectionGap;

  addHRule();

  // ── Etter fristen ──────────────────────────────────────────────────────────
  addText("6. ETTER BETENKNINGSTIDEN — BINDING OG OPPSIGELSE", 12, "bold");
  y += 2;
  addText(
    "Etter utløp av 14-dagersperioden er abonnementet bindende i 12 måneder fra " +
      "aktiveringsdatoen, med 3 måneders skriftlig oppsigelsestid. Se Abonnementsavtalen " +
      "for fullstendige vilkår.",
    11
  );
  y += sectionGap;

  addHRule();

  // ── Lovvalg ──────────────────────────────────────────────────────────────
  addText("7. LOVVALG OG TVISTELØSNING", 12, "bold");
  y += 2;
  addText(
    "Norsk rett gjelder. Tvister løses primært gjennom forhandlinger. Dersom partene " +
      "ikke kommer til enighet, er verneting Romsdal tingrett.",
    11
  );
  y += sectionGap;

  addHRule();

  // ── Dato-felt ──────────────────────────────────────────────────────────────
  addText("SIGNATUR OG BEKREFTELSE", 12, "bold");
  y += 3;
  addText(
    "Ved å krysse av for «Jeg har lest og forstått angreretten» i bestillingsskjemaet " +
      "bekrefter kunden at de har mottatt og lest dette dokumentet.",
    11
  );
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Dato for bestilling: ___________________________", marginL, y);
  y += 10;
  doc.text("Signatur (elektronisk aksept i skjema): ___________________________", marginL, y);
  y += 16;

  // ── Footer ──────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text(
      `HMS Nova · KKS AS · Org.nr. 931 869 266 · Versjon 1.0 · ${new Date().getFullYear()}  |  Side ${i} av ${totalPages}`,
      marginL,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.setTextColor(0, 0, 0);
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="HMS-Nova-Angrerettserklæring.pdf"',
      "Cache-Control": "public, max-age=86400",
    },
  });
}
