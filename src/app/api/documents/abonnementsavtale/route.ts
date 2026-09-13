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
            text: "Denne avtalen regulerer kundens tilgang til og bruk av HMS Nova — en nettbasert programvaretjeneste (SaaS) for systematisk HMS-arbeid i henhold til Arbeidsmiljøloven (AML) og Internkontrollforskriften (IK-HMS). Opplistingen nedenfor er illustrerende, ikke en fastlåst spesifikasjon av skjermbilder eller menyplassering, jf. § 5.\n\nTjenesten omfatter blant annet verktøy for:\n•  Avviksregistrering og oppfølging (jf. AML § 3-1 og IK-HMS § 5)\n•  Risikovurderinger og SJA (sikker jobb-analyse)\n•  HMS-dokumentasjon, håndbøker og maler\n•  Vernerunder og inspeksjoner\n•  Opplæringsregister og kompetanseoversikt\n•  Rapporter og statistikk\n•  Evt. tilleggstjenester ifølge valgt plan",
          },
        ],
      },
      {
        title: "§ 3  Abonnementsperiode og binding",
        content: [
          {
            type: "paragraph",
            text: "3.1  Bindingstid\nDersom kunden ikke benytter den avtalte 14-dagers angrefrist, er abonnementet bindende i 12 – tolv – måneder fra første dag etter at angrefristens utløp (bindingsstart). Kunden forplikter seg da til å betale for hele bindingsperioden uavhengig av faktisk bruk.\n\n3.2  Oppsigelse etter bindingsperioden\nEtter bindingsperiodens utløp kan avtalen sies opp av begge parter med 3 – tre – måneders skriftlig varsel. Oppsigelsesvarselet må sendes til post@hmsnova.no eller per post til leverandørens adresse i § 1.\n\n3.3  Automatisk fornyelse\nDersom skriftlig oppsigelse ikke er mottatt senest 3 måneder før utgangen av bindingsperioden, fornyes avtalen automatisk for ytterligere 12 måneder på gjeldende vilkår, med 3 måneders oppsigelse.\n\n3.4  Avtalt angrefrist — ikke gratis prøveperiode\nDe første 14 kalenderdagene fra avtaleinngåelsen (elektronisk aksept i bestillingsskjemaet) er en avtalt angrefrist. Kunden kan i denne perioden si opp kostnadsfritt. Dette er ikke en gratis prøveperiode. Tjenesten er tilgjengelig i angrefristperioden. Bindingstiden i § 3.1 starter automatisk dersom skriftlig oppsigelse ikke er mottatt innen fristen.",
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
        title: "§ 5  Løpende utvikling av tjenesten",
        legalRef: "AML, IK-HMS, Avtaleloven § 36",
        content: [
          {
            type: "paragraph",
            text: "5.1  Skybasert tjeneste under fortløpende oppgradering\nHMS Nova leveres som programvare som tjeneste (SaaS). Tjenesten utvikles og oppgraderes fortløpende for å følge norsk lov og forskrift (herunder arbeidsmiljøloven og internkontrollforskriften), tilsynspraksis, relevante ISO-standarder og tekniske sikkerhetskrav. Kunden aksepterer at tjenesten ikke er et statisk produkt, og at innhold, arbeidsflyt og utforming kan endres i avtaleperioden uten at dette i seg selv er mangel eller mislighold.\n\n5.2  Endring av utforming, plassering og betegnelser\nLeverandøren kan uten særskilt samtykke:\n•  endre menyer, navigasjon, skjermbilder, feltplassering, ikoner og rapportlayout\n•  flytte, slå sammen eller gi funksjoner nytt navn, så lenge tilsvarende formål fortsatt dekkes i tjenesten\n•  oppdatere maler, hjelpetekster og lovhenvisninger når regelverk eller praksis endres\n\nAt en funksjon ligger et annet sted enn ved avtaleinngåelsen, har annet navn, eller at brukergrensesnittet er endret, gir ikke grunnlag for prisavslag, heving, erstatning eller påstand om at tjenesten «ikke er i samsvar med loven», så lenge tjenesten fortsatt gir verktøy for det systematiske HMS-arbeidet som omfattes av avtalen.\n\n5.3  Kundens lovpålagte plikter\nKunden er og forblir ansvarlig for å oppfylle egne plikter som arbeidsgiver og virksomhet etter arbeidsmiljøloven, internkontrollforskriften, personopplysningsloven/GDPR og annet relevant regelverk. Tjenesten er et digitalt verktøy som understøtter dette arbeidet. Leverandøren yter ikke juridisk rådgivning og garanterer ikke at kundens registreringer, rutiner eller faktiske HMS-arbeid er lovmessige. Rettmessig klage gjelder vesentlig svikt i avtalt tjeneste, ikke at skjermbilder, menyer eller arbeidsflyt er endret.\n\n5.4  Vesentlig innskrenkning av kjernefunksjon\nDersom leverandøren fjerner en kjernefunksjon som inngår i kundens betalte plan, uten å tilby tilsvarende funksjonalitet, varsles kunden i rimelig tid. Kunden kan da si opp avtalen skriftlig med virkning fra endringen. Alminnelig videreutvikling, omorganisering av menyer, endret plassering og lovpålagte tilpasninger er ikke vesentlig innskrenkning.\n\n5.5  Forholdet til vilkårsendringer\nEndringer i selve avtalevilkårene varsles etter § 11. § 5 gjelder endringer i tjenestens utforming og innhold, ikke i betalings- og bindingsvilkår.",
          },
        ],
      },
      {
        title: "§ 6  Tjenestenivå og support",
        content: [
          {
            type: "paragraph",
            text: "6.1  Leverandøren tilstreber minimum 99,5 % tilgjengelighet per kalendermåned for produksjonsmiljøet, eksklusive planlagt vedlikehold.\n\n6.2  Support ytes på norsk via e-post (post@hmsnova.no) på hverdager kl. 08:00–16:00. Responstid er normalt 1 virkedag.\n\n6.3  Planlagt vedlikehold varsles minst 48 timer i forkant via e-post og systemvarsel.",
          },
        ],
      },
      {
        title: "§ 7  Kundens plikter",
        content: [
          {
            type: "paragraph",
            text: "•  Holde brukeropplysninger (e-post, passord) hemmelig og sikre eget utstyr.\n•  Sikre at bare autoriserte ansatte har tilgang til systemet.\n•  Varsle leverandøren omgående dersom uautorisert tilgang mistenkes.\n•  Ikke videresende, kopiere eller distribuere tjenesten til tredjeparter.\n•  Bruke tjenesten i samsvar med gjeldende norsk lov, herunder GDPR/personopplysningsloven.\n•  Sørge for at virksomhetens eget HMS-arbeid og registreringer oppfyller arbeidsmiljøloven, internkontrollforskriften og annet regelverk som gjelder kunden. Tjenesten erstatter ikke dette ansvaret, jf. § 5.3.",
          },
        ],
      },
      {
        title: "§ 8  Personopplysninger og GDPR",
        legalRef: "GDPR art. 28, Personopplysningsloven",
        content: [
          {
            type: "paragraph",
            text: "8.1  Kunden er behandlingsansvarlig for personopplysninger registrert i HMS Nova. Leverandøren er databehandler, jf. GDPR art. 28.\n\n8.2  En separat databehandleravtale (DBA) inngås ved behov og er tilgjengelig på forespørsel til post@hmsnova.no.\n\n8.3  Personopplysninger slettes innen 30 dager etter avtalens opphør, med mindre annet er påkrevd av norsk lovgivning.\n\n8.4  For varslingssaker (AML kap. 2 A) er kunden behandlingsansvarlig og HMS Nova databehandler for den tekniske løsningen. Kunden dokumenterer formål, behandlingsgrunnlag, mottakere, innsyn, lagrings- og slettefrister, og beskyttelse mot gjengjeldelse. Supportinnsyn skjer kun som nødinnsyn med kundens godkjenning og full logging. GDPR-innsyn i varslingssaker behandles manuelt av kunden og utleveres ikke automatisk fra systemet.",
          },
        ],
      },
      {
        title: "§ 9  Ansvarsbegrensning",
        content: [
          {
            type: "paragraph",
            text: "9.1  Leverandørens samlede erstatningsansvar under denne avtalen er begrenset til 3 måneders abonnementsbeløp betalt av kunden de siste 12 måneder før kravet oppsto.\n\n9.2  Leverandøren er ikke ansvarlig for indirekte tap, tap av data eller driftstap som følge av avbrudd, tekniske feil eller force majeure.",
          },
        ],
      },
      {
        title: "§ 10  Oppsigelse og avslutning",
        content: [
          {
            type: "paragraph",
            text: "10.1  Oppsigelse etter bindingsperioden: 3 måneders skriftlig varsel til post@hmsnova.no.\n\n10.2  Vesentlig mislighold gir den andre parten rett til heving med umiddelbar virkning etter skriftlig advarsel.\n\n10.3  Ved avtalens opphør har kunden rett til eksport av egne data i maskinlesbart format (JSON/CSV/PDF) i inntil 30 dager.",
          },
        ],
      },
      {
        title: "§ 11  Endringer i vilkårene",
        content: [
          {
            type: "paragraph",
            text: "Leverandøren kan endre disse vilkårene med 3 måneders varsel via e-post. Fortsatt bruk etter ikrafttredelsesdatoen regnes som aksept av nye vilkår.",
          },
        ],
      },
      {
        title: "§ 12  Lovvalg og verneting",
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
            signatures: [
              { name: "Bedrift / org.nr.", date: "" },
              { name: "Dato", date: "" },
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
      "Content-Disposition": 'inline; filename="HMS-Nova-Abonnementsavtale.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
