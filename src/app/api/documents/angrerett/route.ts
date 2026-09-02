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
    subtitle: "Avtalt 14-dagers angrefrist for bedriftskunder — ikke gratis prøveperiode",
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
        title: "2. Bakgrunn og avtalt angrefrist",
        content: [
          {
            type: "paragraph",
            text: "Angrerettloven (lov av 20. juni 2014 nr. 27) § 1 gjelder salg til forbruker. HMS Nova er en B2B-tjeneste. Lovfestet angrerett etter angrerettloven gjelder derfor ikke automatisk.",
          },
          {
            type: "paragraph",
            text: "KKS AS gir likevel alle nye bedriftskunder en avtalt angrefrist på 14 kalenderdager fra avtaleinngåelsen (elektronisk aksept i bestillingsskjemaet). Dette erstatter enhver tidligere omtale av «gratis prøveperiode». Angrefristen er en kontraktsfestet rett til kostnadsfri oppsigelse, ikke en prøve uten forpliktelse utover 14 dager.",
          },
        ],
      },
      {
        title: "3. Vilkår for angrefristen",
        content: [
          {
            type: "paragraph",
            text: "1.  Fristen er 14 kalenderdager, regnet fra og med datoen for elektronisk aksept i bestillingsskjemaet.\n\n2.  Oppsigelse i angrefristperioden er kostnadsfri. Kunden skal ikke belastes for abonnementet dersom gyldig oppsigelse er mottatt innen fristen.\n\n3.  Bruk av tjenesten i angrefristperioden medfører ikke at angrefristen bortfaller.\n\n4.  Angrefristen gjelder registreringer gjort av kunden selv i bestillingsskjemaet. For manuelle aktiveringer av superadmin gjelder angrefristen bare dersom kunden skriftlig er informert om den.",
          },
        ],
      },
      {
        title: "4. Slik utøver du angrefristen",
        content: [
          {
            type: "paragraph",
            text: "Send en klar og utvetydig skriftlig melding innen 14 kalenderdager fra avtaleinngåelsen. Meldingen kan sendes via:\n\n•  E-post til post@hmsnova.no\n•  Skriftlig post: KKS AS, Siver Stordahls vei 47, 6430 Bud\n\nMeldingen må inneholde: bedriftsnavn, org.nr., kontaktpersonens navn og e-post, samt dato for registrering. Muntlig melding alene er ikke tilstrekkelig.",
          },
        ],
      },
      {
        title: "5. Konsekvenser ved utøvelse av angrefristen",
        content: [
          {
            type: "paragraph",
            text: "Dersom du benytter angrefristen innen fristen, vil:\n\n•  Abonnementet avsluttes uten kostnad for bindingsperioden.\n•  Evt. forhåndsbetalt beløp refunderes innen 14 virkedager.\n•  Alle data slettes fra HMS Nova innen 30 dager etter angremeldingen, med mindre loven krever lengre lagring.",
          },
        ],
      },
      {
        title: "6. Etter angrefristen — 12 måneders binding og 3 måneders oppsigelse",
        content: [
          {
            type: "paragraph",
            text: "Dersom skriftlig oppsigelse ikke er mottatt innen utløpet av 14-dagersfristen, er abonnementet bindende i 12 måneder fra bindingsstart (dagen etter angrefristens utløp). Etter bindingsperioden kan avtalen sies opp med 3 måneders skriftlig varsel. Se abonnementsavtalen for fullstendige vilkår. Manglende kjennskap til vilkårene kan ikke påberopes når vilkårene er akseptert elektronisk i bestillingsskjemaet.",
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
            text: "Ved å krysse av for angrerett, 12 måneders binding og abonnementsavtalen i bestillingsskjemaet bekrefter kunden at dokumentene er mottatt, lest og forstått. Aksepten lagres med tidspunkt, IP-adresse og avtaleversjon.",
          },
          {
            type: "signature-block",
            signatures: [
              { name: "Dato for bestilling", date: "" },
              { name: "Elektronisk aksept i bestillingsskjema", date: "" },
            ],
          },
        ],
      },
    ],
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="HMS-Nova-Angrerett.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
