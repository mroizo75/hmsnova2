import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

/**
 * Genererer standard abonnementsavtale for HMS Nova.
 *
 * Vilkår: 12 måneder binding, 3 måneders skriftlig oppsigelse.
 * Avtalen er juridisk bindende ved elektronisk aksept i registreringsskjema.
 */
export async function GET() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 20;
  const marginR = 20;
  const maxW = pageW - marginL - marginR;
  let y = 20;
  const lineH = 6;
  const sectionGap = 7;

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
      if (y > 272) {
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

  function addBullet(text: string) {
    addText(`•  ${text}`, 11, "normal", 5);
    y += 1;
  }

  // ── Topp-banner ─────────────────────────────────────────────────────────────
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("HMS NOVA · hmsnova.no", marginL, 9);
  doc.setTextColor(0, 0, 0);
  y = 22;

  addText("ABONNEMENTSAVTALE", 18, "bold");
  addText("Standard vilkår for HMS Nova — Helse, Miljø og Sikkerhet som tjeneste (SaaS)", 10);
  y += 2;
  addHRule();

  // ── § 1 Avtaleparter ────────────────────────────────────────────────────────
  addText("§ 1  AVTALEPARTER", 12, "bold");
  y += 2;
  addText("Leverandør (HMS Nova):", 11, "bold");
  addText("KKS AS, org.nr. 931 869 266", 11, "normal", 5);
  addText("Siver Stordahls vei 47, 6430 Bud, Norge", 11, "normal", 5);
  addText("E-post: post@hmsnova.no", 11, "normal", 5);
  y += 3;
  addText("Kunde:", 11, "bold");
  addText(
    "Bedriften (legal person) som registrerer seg som abonnent ved elektronisk aksept " +
      "av denne avtalen i HMS Novas bestillingsskjema.",
    11,
    "normal",
    5
  );
  y += sectionGap;
  addHRule();

  // ── § 2 Avtalens gjenstand ───────────────────────────────────────────────────
  addText("§ 2  AVTALENS GJENSTAND", 12, "bold");
  y += 2;
  addText(
    "Denne avtalen regulerer kundens tilgang til og bruk av HMS Nova — en nettbasert " +
      "programvaretjeneste (SaaS) for systematisk HMS-arbeid i henhold til " +
      "Arbeidsmiljøloven (AML) og Internkontrollforskriften (IK-HMS).",
    11
  );
  y += 3;
  addText("Tjenesten inkluderer blant annet:", 11);
  y += 2;
  addBullet("Avviksregistrering og oppfølging (jf. AML § 3-1 og IK-HMS § 5)");
  addBullet("Risikovurderinger og SJA (sikker jobb-analyse)");
  addBullet("HMS-dokumentasjon, håndbøker og maler");
  addBullet("Vernerunder og inspeksjoner");
  addBullet("Opplæringsregister og kompetanseoversikt");
  addBullet("Rapporter og statistikk");
  addBullet("Evt. tilleggstjenester ifølge valgt plan");
  y += sectionGap;
  addHRule();

  // ── § 3 Abonnementsperiode og binding ────────────────────────────────────────
  addText("§ 3  ABONNEMENTSPERIODE OG BINDING", 12, "bold");
  y += 2;
  addText("3.1  Bindingstid", 11, "bold");
  addText(
    "Abonnementet er bindende i 12 – tolv – måneder fra aktiveringstidspunktet " +
      "(datoen kontoen aktiveres av leverandøren). Kunden forplikter seg til å betale " +
      "for hele bindingsperioden uavhengig av faktisk bruk.",
    11,
    "normal",
    5
  );
  y += 3;
  addText("3.2  Oppsigelse etter bindingsperioden", 11, "bold");
  addText(
    "Etter bindingsperiodens utløp kan avtalen sies opp av begge parter med " +
      "3 – tre – måneders skriftlig varsel. Oppsigelsesvarselet må sendes til " +
      "post@hmsnova.no eller per post til leverandørens adresse i § 1.",
    11,
    "normal",
    5
  );
  y += 3;
  addText("3.3  Automatisk fornyelse", 11, "bold");
  addText(
    "Dersom skriftlig oppsigelse ikke er mottatt innen utgangen av bindingsperioden, " +
      "fornyes avtalen automatisk for ytterligere 12 måneder på gjeldende vilkår.",
    11,
    "normal",
    5
  );
  y += 3;
  addText("3.4  Prøveperiode", 11, "bold");
  addText(
    "De første 14 dagene etter aktivering er en frivillig betenkningstid (se " +
      "Angrerettserklæringen). Bindingstiden starter formelt ved utløp av prøveperioden " +
      "dersom kunden ikke har benyttet angreretten.",
    11,
    "normal",
    5
  );
  y += sectionGap;
  addHRule();

  // ── § 4 Pris og betaling ────────────────────────────────────────────────────
  addText("§ 4  PRIS OG BETALING", 12, "bold");
  y += 2;
  addText(
    "4.1  Priser fremgår av HMS Novas til enhver tid gjeldende prisliste på hmsnova.no/priser " +
      "eller av tilbudet kunden aksepterte ved bestillingen. Alle priser er ekskl. MVA.",
    11
  );
  y += 3;
  addText(
    "4.2  Fakturering skjer månedlig eller årlig avhengig av valgt faktureringsintervall. " +
      "Faktura sendes via Fiken (EHF eller e-post) med 30 dagers forfall.",
    11
  );
  y += 3;
  addText(
    "4.3  Ved forsinket betaling påløper morarente i henhold til forsinkelsesrenteloven. " +
      "Leverandøren kan suspendere tilgangen ved betalingsmislighold på over 14 dager " +
      "etter purring.",
    11
  );
  y += 3;
  addText(
    "4.4  Prisregulering: Leverandøren kan justere prisene med 3 måneders skriftlig varsel. " +
      "Kunden har rett til å si opp avtalen kostnadsfritt dersom prisøkningen overstiger KPI + 5 %.",
    11
  );
  y += sectionGap;
  addHRule();

  // ── § 5 Tjenestenivå og support ─────────────────────────────────────────────
  addText("§ 5  TJENESTENIVÅ OG SUPPORT", 12, "bold");
  y += 2;
  addText(
    "5.1  Leverandøren tilstreber minimum 99,5 % tilgjengelighet per kalendermåned " +
      "for produksjonsmiljøet, eksklusive planlagt vedlikehold.",
    11
  );
  y += 3;
  addText(
    "5.2  Support ytes på norsk via e-post (post@hmsnova.no) på hverdager " +
      "kl. 08:00–16:00. Responstid er normalt 1 virkedag.",
    11
  );
  y += 3;
  addText(
    "5.3  Planlagt vedlikehold varsles minst 48 timer i forkant via e-post og " +
      "systemvarsel.",
    11
  );
  y += sectionGap;
  addHRule();

  // ── § 6 Kundens plikter ─────────────────────────────────────────────────────
  addText("§ 6  KUNDENS PLIKTER", 12, "bold");
  y += 2;
  addBullet("Holde brukeropplysninger (e-post, passord) hemmelig og sikre eget utstyr.");
  addBullet("Sikre at bare autoriserte ansatte har tilgang til systemet.");
  addBullet(
    "Varsle leverandøren omgående dersom uautorisert tilgang mistenkes."
  );
  addBullet(
    "Ikke videresende, kopiere eller distribuere tjenesten til tredjeparter."
  );
  addBullet(
    "Bruke tjenesten i samsvar med gjeldende norsk lov, herunder GDPR/ " +
      "personopplysningsloven."
  );
  y += sectionGap;
  addHRule();

  // ── § 7 Personopplysninger og GDPR ─────────────────────────────────────────
  addText("§ 7  PERSONOPPLYSNINGER OG GDPR", 12, "bold");
  y += 2;
  addText(
    "7.1  Kunden er behandlingsansvarlig for personopplysninger registrert i HMS Nova. " +
      "Leverandøren er databehandler, jf. GDPR art. 28.",
    11
  );
  y += 3;
  addText(
    "7.2  En separat databehandleravtale (DBA) inngås ved behov og er tilgjengelig " +
      "på forespørsel til post@hmsnova.no.",
    11
  );
  y += 3;
  addText(
    "7.3  Personopplysninger slettes innen 30 dager etter avtalens opphør, med " +
      "mindre annet er påkrevd av norsk lovgivning.",
    11
  );
  y += sectionGap;
  addHRule();

  // ── § 8 Ansvarsbegrensning ──────────────────────────────────────────────────
  addText("§ 8  ANSVARSBEGRENSNING", 12, "bold");
  y += 2;
  addText(
    "8.1  Leverandørens samlede erstatningsansvar under denne avtalen er begrenset til " +
      "3 måneders abonnementsbeløp betalt av kunden de siste 12 måneder før kravet oppsto.",
    11
  );
  y += 3;
  addText(
    "8.2  Leverandøren er ikke ansvarlig for indirekte tap, tap av data eller " +
      "driftstap som følge av avbrudd, tekniske feil eller force majeure.",
    11
  );
  y += sectionGap;
  addHRule();

  // ── § 9 Oppsigelse og avslutning ────────────────────────────────────────────
  addText("§ 9  OPPSIGELSE OG AVSLUTNING", 12, "bold");
  y += 2;
  addText(
    "9.1  Oppsigelse etter bindingsperioden: 3 måneders skriftlig varsel til " +
      "post@hmsnova.no.",
    11
  );
  y += 3;
  addText(
    "9.2  Vesentlig mislighold gir den andre parten rett til heving med umiddelbar " +
      "virkning etter skriftlig advarsel.",
    11
  );
  y += 3;
  addText(
    "9.3  Ved avtalens opphør har kunden rett til eksport av egne data i " +
      "maskinlesbart format (JSON/CSV/PDF) i inntil 30 dager.",
    11
  );
  y += sectionGap;
  addHRule();

  // ── § 10 Endringer i avtalen ────────────────────────────────────────────────
  addText("§ 10  ENDRINGER I VILKÅRENE", 12, "bold");
  y += 2;
  addText(
    "Leverandøren kan endre disse vilkårene med 3 måneders varsel via e-post. " +
      "Fortsatt bruk etter ikrafttredelsesdatoen regnes som aksept av nye vilkår.",
    11
  );
  y += sectionGap;
  addHRule();

  // ── § 11 Lovvalg ────────────────────────────────────────────────────────────
  addText("§ 11  LOVVALG OG VERNETING", 12, "bold");
  y += 2;
  addText(
    "Norsk rett gjelder. Partene skal søke å løse tvister i minnelighet. " +
      "Dersom enighet ikke oppnås, er verneting Romsdal tingrett.",
    11
  );
  y += sectionGap;
  addHRule();

  // ── Signatur ────────────────────────────────────────────────────────────────
  addText("AKSEPT OG SIGNATUR", 12, "bold");
  y += 2;
  addText(
    "Avtalen inngås ved at kunden krysser av for godkjenning i HMS Novas " +
      "bestillingsskjema. Elektronisk aksept er juridisk bindende i henhold til " +
      "avtalelovens § 1 og lov om elektronisk signatur.",
    11
  );
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Bedrift / org.nr.: ___________________________", marginL, y);
  y += 8;
  doc.text("Dato: ___________________________", marginL, y);
  y += 8;
  doc.text("Elektronisk aksept i bestillingsskjema: ___________________________", marginL, y);

  // ── Footer ──────────────────────────────────────────────────────────────────
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
      "Content-Disposition": 'inline; filename="HMS-Nova-Abonnementsavtale.pdf"',
      "Cache-Control": "public, max-age=86400",
    },
  });
}
