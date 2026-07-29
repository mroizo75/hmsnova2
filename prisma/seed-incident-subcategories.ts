import { PrismaClient } from "@prisma/client";

/**
 * Systemstandard underkategorier for feltet "Hendelsen dreier seg om".
 * tenantId = null gjør dem synlige for alle virksomheter, og industry styrer
 * hvilke som vises: GENERELL gjelder alle bransjer, resten legges til i tillegg.
 *
 * Hjemler: AML § 5-2 (ulykke og tilløp), § 5-1 (yrkessykdom), § 2-3 (farlige
 * forhold), IK-HMS § 5 (systematisk HMS-arbeid), ISO 9001 kap. 10.2 (kvalitet),
 * ISO 14001 (miljø) og ISO 10002 (kundeklager).
 */
export interface IncidentSubcategoryDefault {
  incidentType: string;
  industry: string;
  key: string;
  label: string;
  sortOrder: number;
}

export const INCIDENT_SUBCATEGORY_DEFAULTS: IncidentSubcategoryDefault[] = [
  // ── ULYKKE / RUH ────────────────────────────────────────────────
  { incidentType: "ULYKKE", industry: "GENERELL", key: "PERSONSKADE", label: "Personskade", sortOrder: 1 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "MATERIELL_SKADE", label: "Materiell skade", sortOrder: 2 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "STROMGJENNOMGANG", label: "Strømgjennomgang", sortOrder: 3 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "FALL_SAMEPLAN", label: "Fall i same plan", sortOrder: 4 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "FALL_HOYDE", label: "Fall fra høyde", sortOrder: 5 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "KLEM_KNUS", label: "Klem / knusing", sortOrder: 6 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "KUTT_STIKK", label: "Kutt / stikk", sortOrder: 7 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "KJEMISK_EKSPONERING", label: "Kjemisk eksponering", sortOrder: 8 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "MILJOPAVIRKNING", label: "Miljøpåvirkning", sortOrder: 9 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "BRANN_EKSPLOSJON", label: "Brann / eksplosjon", sortOrder: 10 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "BRUDD_RUTINER", label: "Brudd på rutiner / lovverk", sortOrder: 11 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "FEIL_UTSTYR", label: "Feil / mangel ved utstyr", sortOrder: 12 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "MANGLENDE_VEDLIKEHOLD", label: "Manglende vedlikehold", sortOrder: 13 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "MANGLENDE_OPPLAERING", label: "Manglende opplæring", sortOrder: 14 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "ORDEN_RENHOLD", label: "Orden / renhold", sortOrder: 15 },
  { incidentType: "ULYKKE", industry: "GENERELL", key: "TRUSLER_VOLD", label: "Trusler / vold", sortOrder: 16 },

  // BYGG
  { incidentType: "ULYKKE", industry: "BYGG", key: "GRAVEULYKKE", label: "Graveulykke / ras", sortOrder: 17 },
  { incidentType: "ULYKKE", industry: "BYGG", key: "KRAN_LOFT", label: "Kran / løfteoperasjon", sortOrder: 18 },
  { incidentType: "ULYKKE", industry: "BYGG", key: "STILLASVELT", label: "Stillasulykke", sortOrder: 19 },

  // ATEX
  { incidentType: "ULYKKE", industry: "ATEX", key: "EX_GASS_UTSLIPP", label: "Gassutslipp i Ex-sone", sortOrder: 20 },
  { incidentType: "ULYKKE", industry: "ATEX", key: "EX_TENNKILDE", label: "Utilsiktet tennkilde", sortOrder: 21 },

  // HELSE
  { incidentType: "ULYKKE", industry: "HELSE", key: "PASIENTFALL", label: "Pasientfall", sortOrder: 22 },
  { incidentType: "ULYKKE", industry: "HELSE", key: "FEILMEDISINERING", label: "Feilmedisinering", sortOrder: 23 },
  { incidentType: "ULYKKE", industry: "HELSE", key: "NAALESTIKK", label: "Nålestikk / stikkskade", sortOrder: 24 },
  { incidentType: "ULYKKE", industry: "HELSE", key: "VOLD_PASIENT", label: "Vold fra pasient", sortOrder: 25 },

  // OFFSHORE
  { incidentType: "ULYKKE", industry: "OFFSHORE", key: "MOB", label: "Mann over bord (MOB)", sortOrder: 26 },
  { incidentType: "ULYKKE", industry: "OFFSHORE", key: "H2S", label: "H2S-eksponering", sortOrder: 27 },
  { incidentType: "ULYKKE", industry: "OFFSHORE", key: "BRONNKONTROLL", label: "Brønnkontroll-hendelse", sortOrder: 28 },

  // ── NESTEN / RUH ────────────────────────────────────────────────
  { incidentType: "NESTEN", industry: "GENERELL", key: "POTENSIELL_PERSONSKADE", label: "Potensiell fare for personskade", sortOrder: 1 },
  { incidentType: "NESTEN", industry: "GENERELL", key: "NESTEN_FALL", label: "Nesten-fall", sortOrder: 2 },
  { incidentType: "NESTEN", industry: "GENERELL", key: "NESTEN_KLEM", label: "Nesten-klem / knusing", sortOrder: 3 },
  { incidentType: "NESTEN", industry: "GENERELL", key: "NESTEN_STROM", label: "Nesten-strømgjennomgang", sortOrder: 4 },
  { incidentType: "NESTEN", industry: "GENERELL", key: "NESTEN_KJEMIKALIE", label: "Nesten-kjemikalieeksponering", sortOrder: 5 },
  { incidentType: "NESTEN", industry: "GENERELL", key: "FEIL_UTSTYR_NESTEN", label: "Feil / mangel ved utstyr", sortOrder: 6 },
  { incidentType: "NESTEN", industry: "GENERELL", key: "ORDEN_RENHOLD_NESTEN", label: "Orden / renholdsproblem", sortOrder: 7 },
  { incidentType: "NESTEN", industry: "GENERELL", key: "BRUDD_RUTINER_NESTEN", label: "Brudd på rutiner / lovverk", sortOrder: 8 },
  { incidentType: "NESTEN", industry: "GENERELL", key: "MILJORISIKO", label: "Miljørisiko / nesten-utslipp", sortOrder: 9 },
  { incidentType: "NESTEN", industry: "HELSE", key: "NESTEN_MEDIKAMENT", label: "Nesten-feil i medikamenthåndtering", sortOrder: 10 },
  { incidentType: "NESTEN", industry: "HELSE", key: "NESTEN_FALL_HJEMMEBESOK", label: "Nesten-fall ved hjemmebesøk", sortOrder: 11 },
  { incidentType: "NESTEN", industry: "HELSE", key: "NESTEN_STIKK_KUTT", label: "Nesten stikk-/kuttskade", sortOrder: 12 },

  // ── FARLIG SITUASJON ────────────────────────────────────────────
  { incidentType: "FARLIG_SITUASJON", industry: "GENERELL", key: "FARLIG_TILSTAND", label: "Farlig tilstand / område", sortOrder: 1 },
  { incidentType: "FARLIG_SITUASJON", industry: "GENERELL", key: "MANGELFULL_SIKRING", label: "Mangelfull sikring / vern", sortOrder: 2 },
  { incidentType: "FARLIG_SITUASJON", industry: "GENERELL", key: "FEIL_UTSTYR_FARLIG", label: "Feil / defekt utstyr", sortOrder: 3 },
  { incidentType: "FARLIG_SITUASJON", industry: "GENERELL", key: "KJEMISK_FARE", label: "Kjemisk fare oppdaget", sortOrder: 4 },
  { incidentType: "FARLIG_SITUASJON", industry: "GENERELL", key: "BRANN_FARE", label: "Brann- / eksplosjonsfare", sortOrder: 5 },
  { incidentType: "FARLIG_SITUASJON", industry: "GENERELL", key: "ERGONOMISK_FARE", label: "Ergonomisk fare", sortOrder: 6 },
  { incidentType: "FARLIG_SITUASJON", industry: "GENERELL", key: "PSYKOSOSIAL_BELASTNING", label: "Psykososial belastning", sortOrder: 7 },
  { incidentType: "FARLIG_SITUASJON", industry: "HELSE", key: "ALENEARBEID_HOY_RISIKO", label: "Alenearbeid med forhøyet risiko", sortOrder: 8 },
  { incidentType: "FARLIG_SITUASJON", industry: "HELSE", key: "SMITTERISIKO_OPPDRAG", label: "Smitterisiko i oppdragssituasjon", sortOrder: 9 },
  { incidentType: "FARLIG_SITUASJON", industry: "HELSE", key: "TRUSSEL_BRUKER_PARORENDE", label: "Trussel fra bruker/pårørende", sortOrder: 10 },

  // ── HMS-AVVIK (IK-HMS § 5) ──────────────────────────────────────
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_RUTINE_BRUDD", label: "Brudd på HMS-rutine eller prosedyre", sortOrder: 1 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_VERNEUTSTYR", label: "Manglende bruk av verneutstyr", sortOrder: 2 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_MANGELFULL_SIKRING", label: "Mangelfull sikring eller verneinnretning", sortOrder: 3 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_FEIL_UTSTYR", label: "Feil eller mangel ved utstyr / maskin", sortOrder: 4 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_MANGLENDE_RISIKOVURDERING", label: "Manglende risikovurdering eller SJA før arbeid", sortOrder: 5 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_MANGLENDE_OPPLAERING", label: "Manglende opplæring eller instruksjon", sortOrder: 6 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_KJEMIKALIER", label: "Mangelfull håndtering eller merking av kjemikalier", sortOrder: 7 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_ORDEN_RENHOLD", label: "Orden og renhold på arbeidsstedet", sortOrder: 8 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_ERGONOMI", label: "Ergonomi eller tungt manuelt arbeid", sortOrder: 9 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_PSYKOSOSIALT", label: "Psykososialt arbeidsmiljø, mobbing eller trakassering", sortOrder: 10 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_ARBEIDSTID", label: "Brudd på arbeidstidsbestemmelser", sortOrder: 11 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_BRANNSIKKERHET", label: "Blokkert rømningsvei eller manglende brannsikring", sortOrder: 12 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_DOKUMENTASJON", label: "Manglende eller feil HMS-dokumentasjon", sortOrder: 13 },
  { incidentType: "HMS", industry: "GENERELL", key: "HMS_LOVBRUDD", label: "Brudd på lov eller forskrift", sortOrder: 14 },
  { incidentType: "HMS", industry: "BYGG", key: "HMS_SIKKER_JOBB_BYGG", label: "Avvik i sikring av byggeplass eller adkomst", sortOrder: 15 },
  { incidentType: "HMS", industry: "HELSE", key: "HMS_SMITTEVERN", label: "Brudd på smittevernrutiner", sortOrder: 16 },

  // ── AVVIK (eldre generell type, beholdes for historiske registreringer) ──
  { incidentType: "AVVIK", industry: "GENERELL", key: "INTERN_AVVIK", label: "Internt avvik", sortOrder: 1 },
  { incidentType: "AVVIK", industry: "GENERELL", key: "REKLAMASJON", label: "Reklamasjon", sortOrder: 2 },
  { incidentType: "AVVIK", industry: "GENERELL", key: "GARANTI", label: "Garantisak", sortOrder: 3 },
  { incidentType: "AVVIK", industry: "GENERELL", key: "VAREMOTTAK", label: "Varemottak / leverandøravvik", sortOrder: 4 },
  { incidentType: "AVVIK", industry: "GENERELL", key: "SKADE_KUNDENS_EIENDELER", label: "Skade på kundens eiendeler", sortOrder: 5 },
  { incidentType: "AVVIK", industry: "GENERELL", key: "PROSEDYRE_BRUDD", label: "Brudd på prosedyre / rutine", sortOrder: 6 },
  { incidentType: "AVVIK", industry: "GENERELL", key: "LOVBRUDD", label: "Brudd på lov / forskrift", sortOrder: 7 },
  { incidentType: "AVVIK", industry: "GENERELL", key: "DOKUMENTASJON", label: "Manglende / feil dokumentasjon", sortOrder: 8 },

  // ATEX-avvik
  { incidentType: "AVVIK", industry: "ATEX", key: "EX_ENHETSSERTIFISERING", label: "Ex-produkt enhetssertifisering", sortOrder: 9 },
  { incidentType: "AVVIK", industry: "ATEX", key: "EX_TYPESERTIFISERING", label: "Ex-produkt typesertifisering", sortOrder: 10 },
  { incidentType: "AVVIK", industry: "ATEX", key: "TILBAKEKALLING_IKKE_EX", label: "Tilbakekalling – ikke Ex-produkt", sortOrder: 11 },
  { incidentType: "AVVIK", industry: "ATEX", key: "TILBAKEKALLING_EX_ENHET", label: "Tilbakekalling Ex-enhetssertifisering", sortOrder: 12 },
  { incidentType: "AVVIK", industry: "ATEX", key: "TILBAKEKALLING_EX_TYPE", label: "Tilbakekalling Ex-typesertifisering", sortOrder: 13 },
  { incidentType: "AVVIK", industry: "ATEX", key: "SERTIFISERINGSORGAN_VARSLET", label: "Eksternt sertifiseringsorgan varslet", sortOrder: 14 },
  { incidentType: "AVVIK", industry: "HELSE", key: "MEDIKAMENT_AVVIK", label: "Avvik i medikamenthåndtering", sortOrder: 15 },
  { incidentType: "AVVIK", industry: "HELSE", key: "DOKUMENTASJON_PASIENTOPPDRAG", label: "Mangelfull dokumentasjon i pasientoppdrag", sortOrder: 16 },
  { incidentType: "AVVIK", industry: "HELSE", key: "SMITTEVERN_BRUDD", label: "Brudd på smittevernrutiner", sortOrder: 17 },

  // ── YRKESSYKDOM ─────────────────────────────────────────────────
  { incidentType: "YRKESSYKDOM", industry: "GENERELL", key: "MUSKEL_SKJELETT", label: "Muskel- og skjelettlidelse", sortOrder: 1 },
  { incidentType: "YRKESSYKDOM", industry: "GENERELL", key: "HORSELSKADE", label: "Hørselskade", sortOrder: 2 },
  { incidentType: "YRKESSYKDOM", industry: "GENERELL", key: "LUNGESKADE", label: "Lungeskade / luftveissykdom", sortOrder: 3 },
  { incidentType: "YRKESSYKDOM", industry: "GENERELL", key: "HUDSKADE", label: "Hudlidelse / allergi", sortOrder: 4 },
  { incidentType: "YRKESSYKDOM", industry: "GENERELL", key: "KJEMISK_SYKDOM", label: "Kjemisk betinget sykdom", sortOrder: 5 },
  { incidentType: "YRKESSYKDOM", industry: "GENERELL", key: "PSYKISK_BELASTNING", label: "Psykisk belastningslidelse", sortOrder: 6 },
  { incidentType: "YRKESSYKDOM", industry: "GENERELL", key: "VIBRASJONSSKADE", label: "Vibrasjonsskade", sortOrder: 7 },
  { incidentType: "YRKESSYKDOM", industry: "GENERELL", key: "SMITTE", label: "Smittsom sykdom / infeksjon", sortOrder: 8 },
  { incidentType: "YRKESSYKDOM", industry: "HELSE", key: "BIOLOGISK_EKSPONERING", label: "Biologisk eksponering", sortOrder: 9 },
  { incidentType: "YRKESSYKDOM", industry: "HELSE", key: "MUSKEL_SKJELETT_HELSE", label: "Muskel- og skjelettplager ved pasienthåndtering", sortOrder: 10 },

  // ── MILJØAVVIK ───────────────────────────────────────────────────
  { incidentType: "MILJO", industry: "GENERELL", key: "UTSLIPP_VANN", label: "Utslipp til vann / avløp", sortOrder: 1 },
  { incidentType: "MILJO", industry: "GENERELL", key: "UTSLIPP_LUFT", label: "Utslipp til luft", sortOrder: 2 },
  { incidentType: "MILJO", industry: "GENERELL", key: "FARLIG_AVFALL", label: "Feil håndtering av farlig avfall", sortOrder: 3 },
  { incidentType: "MILJO", industry: "GENERELL", key: "SORUTSLIPP", label: "Søl / lekkasje av kjemikalier", sortOrder: 4 },
  { incidentType: "MILJO", industry: "GENERELL", key: "ENERGIOVERFORBRUK", label: "Uønsket energiforbruk", sortOrder: 5 },
  { incidentType: "MILJO", industry: "GENERELL", key: "AVFALLSSORTERING", label: "Mangelfull avfallssortering", sortOrder: 6 },
  { incidentType: "MILJO", industry: "GENERELL", key: "STOY_NABO", label: "Støy eller støv mot omgivelsene", sortOrder: 7 },

  // ── KVALITETSAVVIK ───────────────────────────────────────────────
  { incidentType: "KVALITET", industry: "GENERELL", key: "PRODUKT_FEIL", label: "Produktfeil / defekt", sortOrder: 1 },
  { incidentType: "KVALITET", industry: "GENERELL", key: "TJENESTE_FEIL", label: "Tjenestefeil / mangel", sortOrder: 2 },
  { incidentType: "KVALITET", industry: "GENERELL", key: "LEVERANDOR_FEIL", label: "Leverandørfeil", sortOrder: 3 },
  { incidentType: "KVALITET", industry: "GENERELL", key: "PROSESS_FEIL", label: "Prosess- / fremstillingsfeil", sortOrder: 4 },
  { incidentType: "KVALITET", industry: "GENERELL", key: "KALIBRERING", label: "Kalibreringsavvik (måleutstyr)", sortOrder: 5 },
  { incidentType: "KVALITET", industry: "GENERELL", key: "KVALITET_UTFORELSE", label: "Mangelfull utførelse av arbeid", sortOrder: 6 },
  { incidentType: "KVALITET", industry: "GENERELL", key: "KVALITET_VAREMOTTAK", label: "Varemottak / feil leveranse", sortOrder: 7 },
  { incidentType: "KVALITET", industry: "GENERELL", key: "KVALITET_DOKUMENTASJON", label: "Manglende eller feil dokumentasjon", sortOrder: 8 },
  { incidentType: "KVALITET", industry: "GENERELL", key: "KVALITET_FRIST", label: "Forsinkelse eller brutt frist", sortOrder: 9 },

  // ── KUNDEKLAGE (ISO 10002) ───────────────────────────────────────
  { incidentType: "CUSTOMER", industry: "GENERELL", key: "KLAGE_UTFORELSE", label: "Mangelfull utførelse eller kvalitet på arbeid", sortOrder: 1 },
  { incidentType: "CUSTOMER", industry: "GENERELL", key: "KLAGE_PRODUKT", label: "Feil eller mangel ved levert produkt", sortOrder: 2 },
  { incidentType: "CUSTOMER", industry: "GENERELL", key: "KLAGE_LEVERING", label: "Forsinket eller uteblitt leveranse", sortOrder: 3 },
  { incidentType: "CUSTOMER", industry: "GENERELL", key: "KLAGE_REKLAMASJON", label: "Reklamasjon eller garantisak", sortOrder: 4 },
  { incidentType: "CUSTOMER", industry: "GENERELL", key: "KLAGE_SKADE_EIENDOM", label: "Skade på kundens eiendom", sortOrder: 5 },
  { incidentType: "CUSTOMER", industry: "GENERELL", key: "KLAGE_SERVICE", label: "Service, kommunikasjon eller oppfølging", sortOrder: 6 },
  { incidentType: "CUSTOMER", industry: "GENERELL", key: "KLAGE_FAKTURA", label: "Faktura, pris eller avtalevilkår", sortOrder: 7 },
  { incidentType: "CUSTOMER", industry: "GENERELL", key: "KLAGE_ORDEN", label: "Rydding, renhold eller avfall etter arbeid", sortOrder: 8 },
  { incidentType: "CUSTOMER", industry: "GENERELL", key: "KLAGE_HMS", label: "HMS-forhold hos kunde", sortOrder: 9 },
];

export async function seedIncidentSubcategories(prisma: PrismaClient): Promise<void> {
  console.log("🌱 Seeder underkategorier for avvik/hendelser...");

  let created = 0;
  let skipped = 0;

  for (const category of INCIDENT_SUBCATEGORY_DEFAULTS) {
    const existing = await prisma.incidentSubcategoryOption.findFirst({
      where: {
        tenantId: null,
        incidentType: category.incidentType as never,
        key: category.key,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.incidentSubcategoryOption.create({
      data: {
        tenantId: null,
        incidentType: category.incidentType as never,
        industry: category.industry,
        key: category.key,
        label: category.label,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
    created++;
  }

  console.log(`✅ Underkategorier: ${created} opprettet, ${skipped} eksisterte allerede`);
}
