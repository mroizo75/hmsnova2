/**
 * Genererer standard abonnementsavtale for HMS Nova via branded PDF-pipeline.
 *
 * Vilkår: 12 måneder binding, 3 måneders skriftlig oppsigelse.
 * Juridisk bindende ved elektronisk aksept i bestillingsskjema (Avtaleloven § 1).
 */
import { NextResponse } from "next/server";
import { generateBrandedPdf } from "@/lib/pdf-brand";

export async function GET() {
  const pdfBuffer = await generateBrandedPdf({
    type: "formal",
    reportLabel: "Juridisk dokument",
    title: "Abonnementsavtale",
    subtitle: "Standard vilkår for HMS Nova — Helse, Miljø og Sikkerhet som tjeneste (SaaS)",
    tenant: {
      name: "KKS AS",
      orgNumber: "931 869 266",
    },
    legalReference: "Avtaleloven § 1, GDPR art. 28, AML, IK-HMS",
    sections: [
      {
        title: "§ 1  Avtaleparter",
        content: [
          {
            type: "keyvalue",
            pairs: [
              ["Leverandør (HMS Nova)", "KKS AS, org.nr. 931 869 266"],
              ["Adresse", "Siver Stordahls vei 47, 6430 Bud, Norge"],
              ["E-post", "post@hmsnova.no"],
              ["Kunde", "Bedriften som registrerer seg som abonnent ved elektronisk aksept av denne avtalen i HMS Novas bestillingsskjema"],
            ],
          },
        ],
      },
      {
        title: "§ 2  Avtalens gjenstand",
        content: [
          {
            type: "paragraph",
            text: "Denne avtalen regulerer kundens tilgang til og bruk av HMS Nova — en nettbasert programvaretjeneste (SaaS) for systematisk HMS-arbeid i henhold til Arbeidsmiljøloven (AML) og Internkontrollforskriften (IK-HMS).\n\nTjenesten inkluderer blant annet:\n•  Avviksregistrering og oppfølging (jf. AML § 3-1 og IK-HMS § 5)\n•  Risikovurderinger og SJA (sikker jobb-analyse)\n•  HMS-dokumentasjon, håndbøker og maler\n•  Vernerunder og inspeksjoner\n•  Opplæringsregister og kompetanseoversikt\n•  Rapporter og statistikk\n•  Evt. tilleggstjenester ifølge valgt plan",
          },
        ],
      },
      {
        title: "§ 3  Abonnementsperiode og binding",
        content: [
          {
            type: "paragraph",
            text: "3.1  Bindingstid\nAbonnementet er bindende i 12 – tolv – måneder fra aktiveringstidspunktet (datoen kontoen aktiveres av leverandøren). Kunden forplikter seg til å betale for hele bindingsperioden uavhengig av faktisk bruk.\n\n3.2  Oppsigelse etter bindingsperioden\nEtter bindingsperiodens utløp kan avtalen sies opp av begge parter med 3 – tre – måneders skriftlig varsel. Oppsigelsesvarselet må sendes til post@hmsnova.no eller per post til leverandørens adresse i § 1.\n\n3.3  Automatisk fornyelse\nDersom skriftlig oppsigelse ikke er mottatt innen utgangen av bindingsperioden, fornyes avtalen automatisk for ytterligere 12 måneder på gjeldende vilkår.\n\n3.4  Prøveperiode\nDe første 14 dagene etter aktivering er en frivillig betenkningstid (se Angrerettserklæringen). Bindingstiden starter formelt ved utløp av prøveperioden dersom kunden ikke har benyttet angreretten.",
          },
        ],
      },
      {
        title: "§ 4  Pris og betaling",
        content: [
          {
            type: "paragraph",
            text: "4.1  Priser fremgår av HMS Novas til enhver tid gjeldende prisliste på hmsnova.no/priser eller av tilbudet kunden aksepterte ved bestillingen. Alle priser er ekskl. MVA.\n\n4.2  Fakturering skjer månedlig eller årlig avhengig av valgt faktureringsintervall. Faktura sendes via Fiken (EHF eller e-post) med 30 dagers forfall.\n\n4.3  Ved forsinket betaling påløper morarente i henhold til forsinkelsesrenteloven. Leverandøren kan suspendere tilgangen ved betalingsmislighold på over 14 dager etter purring.\n\n4.4  Prisregulering: Leverandøren kan justere prisene med 3 måneders skriftlig varsel. Kunden har rett til å si opp avtalen kostnadsfritt dersom prisøkningen overstiger KPI + 5 %.",
          },
        ],
      },
      {
        title: "§ 5  Tjenestenivå og support",
        content: [
          {
            type: "paragraph",
            text: "5.1  Leverandøren tilstreber minimum 99,5 % tilgjengelighet per kalendermåned for produksjonsmiljøet, eksklusive planlagt vedlikehold.\n\n5.2  Support ytes på norsk via e-post (post@hmsnova.no) på hverdager kl. 08:00–16:00. Responstid er normalt 1 virkedag.\n\n5.3  Planlagt vedlikehold varsles minst 48 timer i forkant via e-post og systemvarsel.",
          },
        ],
      },
      {
        title: "§ 6  Kundens plikter",
        content: [
          {
            type: "paragraph",
            text: "•  Holde brukeropplysninger (e-post, passord) hemmelig og sikre eget utstyr.\n•  Sikre at bare autoriserte ansatte har tilgang til systemet.\n•  Varsle leverandøren omgående dersom uautorisert tilgang mistenkes.\n•  Ikke videresende, kopiere eller distribuere tjenesten til tredjeparter.\n•  Bruke tjenesten i samsvar med gjeldende norsk lov, herunder GDPR/personopplysningsloven.",
          },
        ],
      },
      {
        title: "§ 7  Personopplysninger og GDPR",
        legalRef: "GDPR art. 28, Personopplysningsloven",
        content: [
          {
            type: "paragraph",
            text: "7.1  Kunden er behandlingsansvarlig for personopplysninger registrert i HMS Nova. Leverandøren er databehandler, jf. GDPR art. 28.\n\n7.2  En separat databehandleravtale (DBA) inngås ved behov og er tilgjengelig på forespørsel til post@hmsnova.no.\n\n7.3  Personopplysninger slettes innen 30 dager etter avtalens opphør, med mindre annet er påkrevd av norsk lovgivning.",
          },
        ],
      },
      {
        title: "§ 8  Ansvarsbegrensning",
        content: [
          {
            type: "paragraph",
            text: "8.1  Leverandørens samlede erstatningsansvar under denne avtalen er begrenset til 3 måneders abonnementsbeløp betalt av kunden de siste 12 måneder før kravet oppsto.\n\n8.2  Leverandøren er ikke ansvarlig for indirekte tap, tap av data eller driftstap som følge av avbrudd, tekniske feil eller force majeure.",
          },
        ],
      },
      {
        title: "§ 9  Oppsigelse og avslutning",
        content: [
          {
            type: "paragraph",
            text: "9.1  Oppsigelse etter bindingsperioden: 3 måneders skriftlig varsel til post@hmsnova.no.\n\n9.2  Vesentlig mislighold gir den andre parten rett til heving med umiddelbar virkning etter skriftlig advarsel.\n\n9.3  Ved avtalens opphør har kunden rett til eksport av egne data i maskinlesbart format (JSON/CSV/PDF) i inntil 30 dager.",
          },
        ],
      },
      {
        title: "§ 10  Endringer i vilkårene",
        content: [
          {
            type: "paragraph",
            text: "Leverandøren kan endre disse vilkårene med 3 måneders varsel via e-post. Fortsatt bruk etter ikrafttredelsesdatoen regnes som aksept av nye vilkår.",
          },
        ],
      },
      {
        title: "§ 11  Lovvalg og verneting",
        legalRef: "Avtaleloven § 1",
        content: [
          {
            type: "paragraph",
            text: "Norsk rett gjelder. Partene skal søke å løse tvister i minnelighet. Dersom enighet ikke oppnås, er verneting Romsdal tingrett.",
          },
        ],
      },
      {
        title: "Aksept og signatur",
        content: [
          {
            type: "paragraph",
            text: "Avtalen inngås ved at kunden krysser av for godkjenning i HMS Novas bestillingsskjema. Elektronisk aksept er juridisk bindende i henhold til avtaleloven § 1 og lov om elektronisk signatur.",
          },
          {
            type: "signature-block",
            names: ["Bedrift / org.nr.", "Dato", "Elektronisk aksept i bestillingsskjema"],
          },
        ],
      },
    ],
  });

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="HMS-Nova-Abonnementsavtale.pdf"',
      "Cache-Control": "public, max-age=86400",
    },
  });
}
