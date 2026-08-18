/**
 * Genererer angrerettsdokument for HMS Nova via branded PDF-pipeline.
 *
 * For B2B (næringsdrivende) gjelder ikke Angrerettloven direkte — den er for forbrukere.
 * HMS Nova tilbyr likevel 14 dagers betenkningstid som en kommersiell rettighet.
 */
import { NextResponse } from "next/server";
import { generateBrandedPdf } from "@/lib/pdf-brand";

export async function GET() {
  const pdfBuffer = await generateBrandedPdf({
    type: "formal",
    reportLabel: "Juridisk dokument",
    title: "Angrerettserklæring",
    subtitle: "Frivillig 14-dagers betenkningstid for bedriftskunder",
    tenant: {
      name: "KKS AS",
      orgNumber: "931 869 266",
    },
    legalReference: "Angrerettloven 2014, Avtaleloven § 1",
    sections: [
      {
        title: "1. Avtaleparter",
        content: [
          {
            type: "keyvalue",
            pairs: [
              ["Tjenesteleverandør", "KKS AS, org.nr. 931 869 266"],
              ["Adresse", "Siver Stordahls vei 47, 6430 Bud, Norge"],
              ["E-post / nettsted", "post@hmsnova.no  |  hmsnova.no"],
              ["Kunde", "Bedriften som registrerer seg for HMS Nova-abonnement"],
            ],
          },
        ],
      },
      {
        title: "2. Bakgrunn og frivillig betenkningstid",
        content: [
          {
            type: "paragraph",
            text: "Angrerettloven (lov av 20. juni 2014 nr. 27) gjelder i utgangspunktet kun for forbrukerkjøp. HMS Nova er en B2B-tjeneste (virksomhet-til-virksomhet) og forbrukervernet i angrerettloven gjelder derfor ikke automatisk.",
          },
          {
            type: "paragraph",
            text: "KKS AS tilbyr likevel en frivillig 14-dagers betenkningstid til alle nye bedriftskunder som en del av god forretningsskikk og tillit til tjenesten. Denne retten gjelder fra bestillingsdatoen (avtaleinngåelsen).",
          },
        ],
      },
      {
        title: "3. Vilkår for betenkningstiden",
        content: [
          {
            type: "paragraph",
            text: "1.  Fristen er 14 kalenderdager regnet fra datoen du bekrefter bestillingen.\n\n2.  Retten gjelder kun dersom tjenesten ikke er tatt vesentlig i bruk (opplastede HMS-dokumenter, registrerte avvik, brukere m.m. utover testnivå).\n\n3.  Angreretten bortfaller automatisk dersom bedriften har lastet ned eller generert rapport-PDF-er under perioden, med mindre dette ble gjort i en klar testsammenheng.\n\n4.  Angreretten gjelder ikke for avtaler inngått av superadmin på vegne av kunden (manuelle aktiveringer) med mindre kunden skriftlig er informert om betenkningstiden.",
          },
        ],
      },
      {
        title: "4. Slik utøver du betenkningstiden",
        content: [
          {
            type: "paragraph",
            text: "Send en klar og utvetydig melding til oss innen 14 dager fra bestillingsdatoen. Meldingen kan sendes via:\n\n•  E-post til post@hmsnova.no\n•  Telefon: +47 97 07 07 07\n•  Skriftlig post: KKS AS, Siver Stordahls vei 47, 6430 Bud\n\nMeldingen må inneholde: bedriftsnavn, org.nr., kontaktpersonens navn og e-post, samt bestillingsdatoen.",
          },
        ],
      },
      {
        title: "5. Konsekvenser ved utøvelse av betenkningstiden",
        content: [
          {
            type: "paragraph",
            text: "Dersom du benytter deg av betenkningstiden innen fristen, vil:\n\n•  Abonnementet avsluttes uten kostnad.\n•  Evt. forhåndsbetalt beløp refunderes innen 14 virkedager.\n•  Alle data slettes fra HMS Nova innen 30 dager etter angremeldingen.",
          },
        ],
      },
      {
        title: "6. Etter betenkningstiden — binding og oppsigelse",
        content: [
          {
            type: "paragraph",
            text: "Etter utløp av 14-dagersperioden er abonnementet bindende i 12 måneder fra aktiveringsdatoen, med 3 måneders skriftlig oppsigelsestid. Se Abonnementsavtalen for fullstendige vilkår.",
          },
        ],
      },
      {
        title: "7. Lovvalg og tvisteløsning",
        content: [
          {
            type: "paragraph",
            text: "Norsk rett gjelder. Tvister løses primært gjennom forhandlinger. Dersom partene ikke kommer til enighet, er verneting Romsdal tingrett.",
          },
        ],
      },
      {
        title: "Signatur og bekreftelse",
        content: [
          {
            type: "paragraph",
            text: "Ved å krysse av for «Jeg har lest og forstått angreretten» i bestillingsskjemaet bekrefter kunden at de har mottatt og lest dette dokumentet.",
          },
          {
            type: "signature-block",
            names: ["Dato for bestilling", "Elektronisk aksept i bestillingsskjema"],
          },
        ],
      },
    ],
  });

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="HMS-Nova-Angrerett.pdf"',
      "Cache-Control": "public, max-age=86400",
    },
  });
}
