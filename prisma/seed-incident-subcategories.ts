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

  // ══════════════════════════════════════════════════════════════════
  // BRANSJESPESIFIKKE UNDERKATEGORIER
  // ══════════════════════════════════════════════════════════════════

  // ── HOTELL ─────────────────────────────────────────────────────────
  { incidentType: "ULYKKE", industry: "HOTELL", key: "GJEST_ULYKKE", label: "Gjesteulykke (fall, skade i fellesareal)", sortOrder: 30 },
  { incidentType: "ULYKKE", industry: "HOTELL", key: "BRANN_EVAKUERING", label: "Brann / evakueringssvikt", sortOrder: 31 },
  { incidentType: "ULYKKE", industry: "HOTELL", key: "BASSENG_ULYKKE", label: "Basseng- / spa-ulykke", sortOrder: 32 },
  { incidentType: "ULYKKE", industry: "HOTELL", key: "MATFORGIFTNING", label: "Matforgiftning / matbåren sykdom", sortOrder: 33 },
  { incidentType: "ULYKKE", industry: "HOTELL", key: "HEIS_ULYKKE", label: "Heisulykke / fastkjøring", sortOrder: 34 },
  { incidentType: "NESTEN", industry: "HOTELL", key: "NESTEN_GJEST_FALL", label: "Nesten-fall gjest (glatt gulv, trapp)", sortOrder: 13 },
  { incidentType: "NESTEN", industry: "HOTELL", key: "NESTEN_BRANN_HOTELL", label: "Nesten-brann / falsk alarm", sortOrder: 14 },
  { incidentType: "NESTEN", industry: "HOTELL", key: "NESTEN_LEGIONELLA", label: "Legionella-risiko oppdaget", sortOrder: 15 },
  { incidentType: "FARLIG_SITUASJON", industry: "HOTELL", key: "LEGIONELLA_FARE", label: "Legionella-fare i vannforsyning", sortOrder: 11 },
  { incidentType: "FARLIG_SITUASJON", industry: "HOTELL", key: "ROMMINGSVEI_BLOKKERT", label: "Blokkert rømningsvei / nødutgang", sortOrder: 12 },
  { incidentType: "FARLIG_SITUASJON", industry: "HOTELL", key: "TRUSSEL_GJEST", label: "Trussel / aggressiv gjest", sortOrder: 13 },
  { incidentType: "HMS", industry: "HOTELL", key: "HMS_NATTARBEID_HOTELL", label: "Alenearbeid natt / resepsjon", sortOrder: 17 },
  { incidentType: "HMS", industry: "HOTELL", key: "HMS_RENHOLD_ERGONOMI", label: "Ergonomi husøkonom / renhold", sortOrder: 18 },
  { incidentType: "CUSTOMER", industry: "HOTELL", key: "KLAGE_RENHOLD_ROM", label: "Klage på renhold / romstandard", sortOrder: 10 },
  { incidentType: "CUSTOMER", industry: "HOTELL", key: "KLAGE_STOY_HOTELL", label: "Støy / forstyrrelser for gjest", sortOrder: 11 },
  { incidentType: "CUSTOMER", industry: "HOTELL", key: "KLAGE_ALLERGI_ROM", label: "Allergireaksjon (sengetøy, renhold)", sortOrder: 12 },

  // ── RESTAURANT ─────────────────────────────────────────────────────
  { incidentType: "ULYKKE", industry: "RESTAURANT", key: "BRANNSKADE_KOKK", label: "Brannskade (kokk / kjøkken)", sortOrder: 30 },
  { incidentType: "ULYKKE", industry: "RESTAURANT", key: "SKJAERESKADE", label: "Skjæreskade (kniv / maskin)", sortOrder: 31 },
  { incidentType: "ULYKKE", industry: "RESTAURANT", key: "SKLIFULYKKE_KJOKKEN", label: "Sklifulykke (fett / vann på gulv)", sortOrder: 32 },
  { incidentType: "ULYKKE", industry: "RESTAURANT", key: "FROSTSKADE", label: "Frostskade (frysehåndtering)", sortOrder: 33 },
  { incidentType: "ULYKKE", industry: "RESTAURANT", key: "ALLERGIREAKSJON_GJEST", label: "Allergireaksjon hos gjest", sortOrder: 34 },
  { incidentType: "NESTEN", industry: "RESTAURANT", key: "NESTEN_ALLERGEN", label: "Nesten-feil allergenmerking", sortOrder: 13 },
  { incidentType: "NESTEN", industry: "RESTAURANT", key: "NESTEN_TEMP_BRUDD", label: "Nesten-temperaturbrudd matvare", sortOrder: 14 },
  { incidentType: "FARLIG_SITUASJON", industry: "RESTAURANT", key: "GASS_LEKKASJE", label: "Gasslekkasje kjøkken", sortOrder: 11 },
  { incidentType: "FARLIG_SITUASJON", industry: "RESTAURANT", key: "BRANNSIKRING_KOKKEN", label: "Mangelfull brannsikring kjøkken", sortOrder: 12 },
  { incidentType: "AVVIK", industry: "RESTAURANT", key: "HACCP_AVVIK", label: "HACCP-avvik (kritisk kontrollpunkt)", sortOrder: 18 },
  { incidentType: "AVVIK", industry: "RESTAURANT", key: "MATTEMPERATUR_AVVIK", label: "Temperaturavvik matvare / kjøl", sortOrder: 19 },
  { incidentType: "AVVIK", industry: "RESTAURANT", key: "HYGIENE_AVVIK", label: "Hygieneavvik (Mattilsynet)", sortOrder: 20 },
  { incidentType: "KVALITET", industry: "RESTAURANT", key: "KVALITET_MAT", label: "Kvalitetssvikt på rett / servering", sortOrder: 10 },
  { incidentType: "CUSTOMER", industry: "RESTAURANT", key: "KLAGE_MAT_KVALITET", label: "Klage på matkvalitet / smak", sortOrder: 10 },
  { incidentType: "CUSTOMER", industry: "RESTAURANT", key: "KLAGE_ALLERGEN_SERVERING", label: "Allergen-feil ved servering", sortOrder: 11 },

  // ── RENGJØRING ─────────────────────────────────────────────────────
  { incidentType: "ULYKKE", industry: "RENGJORING", key: "KJEMISK_FORBRENNING", label: "Kjemisk forbrenning / etsing", sortOrder: 30 },
  { incidentType: "ULYKKE", industry: "RENGJORING", key: "SKLI_VATT_GULV", label: "Sklifulykke (vått gulv)", sortOrder: 31 },
  { incidentType: "ULYKKE", industry: "RENGJORING", key: "BELASTNINGSSKADE_RENGJ", label: "Belastningsskade (løft / bøying)", sortOrder: 32 },
  { incidentType: "ULYKKE", industry: "RENGJORING", key: "NAALESTIKK_RENGJ", label: "Nålestikk (avfallshåndtering)", sortOrder: 33 },
  { incidentType: "NESTEN", industry: "RENGJORING", key: "NESTEN_KJEMISK_BLANDING", label: "Nesten-blanding av kjemikalier", sortOrder: 13 },
  { incidentType: "FARLIG_SITUASJON", industry: "RENGJORING", key: "ALENEARBEID_KVELD", label: "Alenearbeid kveld / natt", sortOrder: 11 },
  { incidentType: "FARLIG_SITUASJON", industry: "RENGJORING", key: "KJEMISK_DAMP", label: "Kjemisk damp i lukket rom", sortOrder: 12 },
  { incidentType: "YRKESSYKDOM", industry: "RENGJORING", key: "ALLERGI_RENGJ_MIDDEL", label: "Allergi mot rengjøringsmidler", sortOrder: 11 },
  { incidentType: "YRKESSYKDOM", industry: "RENGJORING", key: "EKSEM_HAENDER", label: "Håndeksem / hudsykdom", sortOrder: 12 },
  { incidentType: "HMS", industry: "RENGJORING", key: "HMS_MANGLENDE_DATABLAD", label: "Manglende sikkerhetsdatablad", sortOrder: 17 },

  // ── TRANSPORT ──────────────────────────────────────────────────────
  { incidentType: "ULYKKE", industry: "TRANSPORT", key: "TRAFIKKULYKKE", label: "Trafikkuhell / kollistion", sortOrder: 30 },
  { incidentType: "ULYKKE", industry: "TRANSPORT", key: "LASTESKADE", label: "Lasteskade / lastsikring", sortOrder: 31 },
  { incidentType: "ULYKKE", industry: "TRANSPORT", key: "KJORETOYHAVARI", label: "Kjøretøyhavari / motorstopp", sortOrder: 32 },
  { incidentType: "ULYKKE", industry: "TRANSPORT", key: "AV_PAALESSING_SKADE", label: "Skade ved av-/pålessing", sortOrder: 33 },
  { incidentType: "NESTEN", industry: "TRANSPORT", key: "NESTEN_TRAFIKK", label: "Nesten-ulykke i trafikk", sortOrder: 13 },
  { incidentType: "NESTEN", industry: "TRANSPORT", key: "NESTEN_LAST_FALL", label: "Nesten-fall av last", sortOrder: 14 },
  { incidentType: "FARLIG_SITUASJON", industry: "TRANSPORT", key: "FARLIG_GODS_LEKKASJE", label: "Lekkasje av farlig gods (ADR)", sortOrder: 11 },
  { incidentType: "FARLIG_SITUASJON", industry: "TRANSPORT", key: "DEKK_BREMSE_SVIKT", label: "Dekk- / bremsesvikt oppdaget", sortOrder: 12 },
  { incidentType: "AVVIK", industry: "TRANSPORT", key: "KJORE_HVILETID_BRUDD", label: "Brudd på kjøre-/hviletidsregler", sortOrder: 18 },
  { incidentType: "AVVIK", industry: "TRANSPORT", key: "FARTSSKRIVER_AVVIK", label: "Fartsskriver / sjåførkort-avvik", sortOrder: 19 },
  { incidentType: "AVVIK", industry: "TRANSPORT", key: "ADR_DOKUMENTASJON", label: "Manglende ADR-dokumentasjon", sortOrder: 20 },
  { incidentType: "HMS", industry: "TRANSPORT", key: "HMS_KJORE_HVILETID", label: "Brudd på kjøre-/hviletidsbestemmelser", sortOrder: 17 },
  { incidentType: "HMS", industry: "TRANSPORT", key: "HMS_LASTING_ERGONOMI", label: "Ergonomi ved lasting / lossing", sortOrder: 18 },
  { incidentType: "YRKESSYKDOM", industry: "TRANSPORT", key: "VIBRASJON_SJAFOR", label: "Vibrasjonsskade (helkroppsvibrasjon)", sortOrder: 11 },
  { incidentType: "YRKESSYKDOM", industry: "TRANSPORT", key: "RYGG_NAKKE_SJAFOR", label: "Rygg-/nakkelidelse (langkjøring)", sortOrder: 12 },

  // ── VAREHANDEL ─────────────────────────────────────────────────────
  { incidentType: "ULYKKE", industry: "VAREHANDEL", key: "KUNDE_SKADE_BUTIKK", label: "Kundeskade i butikk (fall / kollisjon)", sortOrder: 30 },
  { incidentType: "ULYKKE", industry: "VAREHANDEL", key: "LOFTESKADE_VARE", label: "Løfteskade (tunge vareleveranser)", sortOrder: 31 },
  { incidentType: "ULYKKE", industry: "VAREHANDEL", key: "TRUCK_ULYKKE", label: "Truck- / palletruck-ulykke", sortOrder: 32 },
  { incidentType: "ULYKKE", industry: "VAREHANDEL", key: "RAN_OVERFALL", label: "Ran / overfall", sortOrder: 33 },
  { incidentType: "ULYKKE", industry: "VAREHANDEL", key: "REOLER_VELT", label: "Reolvelting / varenedfall", sortOrder: 34 },
  { incidentType: "NESTEN", industry: "VAREHANDEL", key: "NESTEN_VARE_FALL", label: "Nesten-fall av varer fra reol", sortOrder: 13 },
  { incidentType: "NESTEN", industry: "VAREHANDEL", key: "NESTEN_TRUCK_BUTIKK", label: "Nesten-påkjørsel med truck", sortOrder: 14 },
  { incidentType: "FARLIG_SITUASJON", industry: "VAREHANDEL", key: "TRUSLER_KUNDE", label: "Trusler / aggresjon fra kunde", sortOrder: 11 },
  { incidentType: "FARLIG_SITUASJON", industry: "VAREHANDEL", key: "OVERLAST_REOL", label: "Overlast reol / ustabil lagring", sortOrder: 12 },
  { incidentType: "HMS", industry: "VAREHANDEL", key: "HMS_ALENEARBEID_BUTIKK", label: "Alenearbeid i butikk (kveld / natt)", sortOrder: 17 },
  { incidentType: "HMS", industry: "VAREHANDEL", key: "HMS_TUNGE_LOFT_BUTIKK", label: "Tunge løft uten hjelpemidler", sortOrder: 18 },

  // ── LANDBRUK ───────────────────────────────────────────────────────
  { incidentType: "ULYKKE", industry: "LANDBRUK", key: "MASKINULYKKE_GARD", label: "Maskinulykke (traktor / redskap)", sortOrder: 30 },
  { incidentType: "ULYKKE", industry: "LANDBRUK", key: "DYREULYKKE", label: "Dyreulykke (spark / klem)", sortOrder: 31 },
  { incidentType: "ULYKKE", industry: "LANDBRUK", key: "SPROYTEMIDDEL_EKSPONERING", label: "Sprøytemiddeleksponering", sortOrder: 32 },
  { incidentType: "ULYKKE", industry: "LANDBRUK", key: "SILOGASS", label: "Silogass-eksponering", sortOrder: 33 },
  { incidentType: "ULYKKE", industry: "LANDBRUK", key: "VELT_KJORETY_GARD", label: "Velt av kjøretøy / traktor", sortOrder: 34 },
  { incidentType: "NESTEN", industry: "LANDBRUK", key: "NESTEN_PTO_KONTAKT", label: "Nesten-kontakt med PTO / kraftuttak", sortOrder: 13 },
  { incidentType: "NESTEN", industry: "LANDBRUK", key: "NESTEN_VELT_TRAKTOR", label: "Nesten-velt traktor / maskin", sortOrder: 14 },
  { incidentType: "FARLIG_SITUASJON", industry: "LANDBRUK", key: "GJODSELLAGER_GASS", label: "Gass i gjødsellager / gjødselkjeller", sortOrder: 11 },
  { incidentType: "FARLIG_SITUASJON", industry: "LANDBRUK", key: "ELEKTRISK_GJERDE_FARE", label: "Fare ved elektrisk anlegg / gjerde", sortOrder: 12 },
  { incidentType: "YRKESSYKDOM", industry: "LANDBRUK", key: "BONDELUNGE", label: "Bondelunge / organisk støv", sortOrder: 11 },
  { incidentType: "YRKESSYKDOM", industry: "LANDBRUK", key: "ZOONOSER", label: "Zoonoser (smitte fra dyr)", sortOrder: 12 },
  { incidentType: "MILJO", industry: "LANDBRUK", key: "GJODSELSOL", label: "Gjødselsøl / avrenning til vassdrag", sortOrder: 8 },
  { incidentType: "MILJO", industry: "LANDBRUK", key: "SPROYTEMIDDEL_UTSLIPP", label: "Sprøytemiddelutslipp til natur", sortOrder: 9 },

  // ── INDUSTRI / PRODUKSJON ──────────────────────────────────────────
  { incidentType: "ULYKKE", industry: "INDUSTRI", key: "MASKIN_SKADE", label: "Maskinskade (inngrep i bevegelige deler)", sortOrder: 30 },
  { incidentType: "ULYKKE", industry: "INDUSTRI", key: "TRYKKSATT_UTSTYR", label: "Ulykke med trykksatt utstyr", sortOrder: 31 },
  { incidentType: "ULYKKE", industry: "INDUSTRI", key: "VARMT_MATERIALE", label: "Brannskade (varmt materiale / sveising)", sortOrder: 32 },
  { incidentType: "ULYKKE", industry: "INDUSTRI", key: "TRANSPORTBAND_ULYKKE", label: "Transportbånd / rullebane-ulykke", sortOrder: 33 },
  { incidentType: "NESTEN", industry: "INDUSTRI", key: "NESTEN_MASKIN_INNGREP", label: "Nesten-kontakt med maskin / verktøy", sortOrder: 13 },
  { incidentType: "NESTEN", industry: "INDUSTRI", key: "NESTEN_TRYKK_UTBLASNING", label: "Nesten-utblåsning trykksatt system", sortOrder: 14 },
  { incidentType: "FARLIG_SITUASJON", industry: "INDUSTRI", key: "UTSTYRSSVIKT_PROD", label: "Utstyrs- / maskinsvikt oppdaget", sortOrder: 11 },
  { incidentType: "FARLIG_SITUASJON", industry: "INDUSTRI", key: "STOYNIVA_HOY", label: "Støynivå over grenseverdi", sortOrder: 12 },
  { incidentType: "YRKESSYKDOM", industry: "INDUSTRI", key: "STOYSKADE_IND", label: "Støyskade (industrimiljø)", sortOrder: 11 },
  { incidentType: "YRKESSYKDOM", industry: "INDUSTRI", key: "VIBRASJON_HANDARM", label: "Hånd-/armvibrasjonsskade", sortOrder: 12 },
  { incidentType: "YRKESSYKDOM", industry: "INDUSTRI", key: "SVEISEROKE", label: "Sveiserøyk-eksponering", sortOrder: 13 },
  { incidentType: "MILJO", industry: "INDUSTRI", key: "PROSESSUTSLIPP", label: "Prosessutslipp til luft / vann", sortOrder: 8 },
  { incidentType: "MILJO", industry: "INDUSTRI", key: "AVFALL_PROD", label: "Feil avfallshåndtering produksjon", sortOrder: 9 },

  // ── IT / KONTOR ────────────────────────────────────────────────────
  { incidentType: "ULYKKE", industry: "IT", key: "ERGONOMI_SKADE_KONTOR", label: "Ergonomisk skade (mus / tastatur)", sortOrder: 30 },
  { incidentType: "ULYKKE", industry: "IT", key: "FALL_KONTOR", label: "Fall / snubling (kabler, trapp)", sortOrder: 31 },
  { incidentType: "FARLIG_SITUASJON", industry: "IT", key: "INNEKLIMA_DARLIG", label: "Dårlig inneklima / ventilasjon", sortOrder: 11 },
  { incidentType: "FARLIG_SITUASJON", industry: "IT", key: "ERGONOMI_FARE_KONTOR", label: "Mangelfull ergonomi arbeidsplass", sortOrder: 12 },
  { incidentType: "YRKESSYKDOM", industry: "IT", key: "MUSKEL_SKJELETT_KONTOR", label: "Muskel-/skjelettplager (stillesitting)", sortOrder: 11 },
  { incidentType: "YRKESSYKDOM", industry: "IT", key: "OYEPLAGER_SKJERM", label: "Øyeplager / synsproblemer (skjermarbeid)", sortOrder: 12 },
  { incidentType: "HMS", industry: "IT", key: "HMS_PSYKOSOSIALT_KONTOR", label: "Psykososialt arbeidsmiljø / stress", sortOrder: 17 },
  { incidentType: "HMS", industry: "IT", key: "HMS_HJEMMEKONTOR", label: "Manglende HMS-tilrettelegging hjemmekontor", sortOrder: 18 },

  // ── EIENDOM / VEDLIKEHOLD ──────────────────────────────────────────
  { incidentType: "ULYKKE", industry: "EIENDOM", key: "FALL_VEDLIKEHOLD", label: "Fall ved vedlikeholdsarbeid", sortOrder: 30 },
  { incidentType: "ULYKKE", industry: "EIENDOM", key: "STROM_VEDLIKEHOLD", label: "Strømgjennomgang (vedlikehold)", sortOrder: 31 },
  { incidentType: "ULYKKE", industry: "EIENDOM", key: "TAKARBEID_ULYKKE", label: "Ulykke ved takarbeid", sortOrder: 32 },
  { incidentType: "NESTEN", industry: "EIENDOM", key: "NESTEN_FALL_STIGE", label: "Nesten-fall fra stige / tak", sortOrder: 13 },
  { incidentType: "FARLIG_SITUASJON", industry: "EIENDOM", key: "ASBEST_MISTANKE", label: "Asbestmistanke ved riving/renovering", sortOrder: 11 },
  { incidentType: "FARLIG_SITUASJON", industry: "EIENDOM", key: "ELEKTRISK_FARE_EIENDOM", label: "Elektrisk fare (gammel installasjon)", sortOrder: 12 },
  { incidentType: "FARLIG_SITUASJON", industry: "EIENDOM", key: "LEGIONELLA_EIENDOM", label: "Legionella-risiko i røranlegg", sortOrder: 13 },
  { incidentType: "YRKESSYKDOM", industry: "EIENDOM", key: "ASBESTOSE", label: "Asbesteksponering / asbestose", sortOrder: 11 },
  { incidentType: "HMS", industry: "EIENDOM", key: "HMS_ALENEARBEID_EIENDOM", label: "Alenearbeid ved vedlikehold", sortOrder: 17 },

  // ══════════════════════════════════════════════════════════════════
  // RUH-SPESIFIKKE UNDERKATEGORIER (observasjoner og forebygging)
  // ══════════════════════════════════════════════════════════════════
  { incidentType: "ULYKKE", industry: "RUH", key: "RUH_USIKKER_ATFERD", label: "Usikker atferd / handling", sortOrder: 1 },
  { incidentType: "ULYKKE", industry: "RUH", key: "RUH_USIKKER_TILSTAND", label: "Usikker tilstand / område", sortOrder: 2 },
  { incidentType: "ULYKKE", industry: "RUH", key: "RUH_MANGLENDE_VERN", label: "Manglende verneutstyr", sortOrder: 3 },
  { incidentType: "ULYKKE", industry: "RUH", key: "RUH_ORDEN_RENHOLD", label: "Mangelfull orden / renhold", sortOrder: 4 },
  { incidentType: "ULYKKE", industry: "RUH", key: "RUH_MANGLENDE_OPPL", label: "Mangelfull opplæring / instruks", sortOrder: 5 },
  { incidentType: "ULYKKE", industry: "RUH", key: "RUH_KOMMUNIKASJON", label: "Kommunikasjonssvikt", sortOrder: 6 },
  { incidentType: "ULYKKE", industry: "RUH", key: "RUH_ERGONOMI", label: "Ergonomisk risiko", sortOrder: 7 },
  { incidentType: "ULYKKE", industry: "RUH", key: "RUH_TIDSPRESS", label: "Tidspress / stress", sortOrder: 8 },
  { incidentType: "ULYKKE", industry: "RUH", key: "RUH_PROSEDYRE", label: "Mangelfull prosedyre", sortOrder: 9 },
  { incidentType: "ULYKKE", industry: "RUH", key: "RUH_POSITIV", label: "Positivt funn / god praksis", sortOrder: 10 },
  { incidentType: "NESTEN", industry: "RUH", key: "RUH_NESTEN_USIKKER_ATFERD", label: "Usikker atferd / handling", sortOrder: 1 },
  { incidentType: "NESTEN", industry: "RUH", key: "RUH_NESTEN_USIKKER_TILSTAND", label: "Usikker tilstand / område", sortOrder: 2 },
  { incidentType: "NESTEN", industry: "RUH", key: "RUH_NESTEN_MANGLENDE_VERN", label: "Manglende verneutstyr", sortOrder: 3 },
  { incidentType: "NESTEN", industry: "RUH", key: "RUH_NESTEN_ORDEN", label: "Mangelfull orden / renhold", sortOrder: 4 },
  { incidentType: "NESTEN", industry: "RUH", key: "RUH_NESTEN_OPPL", label: "Mangelfull opplæring / instruks", sortOrder: 5 },
  { incidentType: "NESTEN", industry: "RUH", key: "RUH_NESTEN_KOMMUNIKASJON", label: "Kommunikasjonssvikt", sortOrder: 6 },
  { incidentType: "NESTEN", industry: "RUH", key: "RUH_NESTEN_ERGONOMI", label: "Ergonomisk risiko", sortOrder: 7 },
  { incidentType: "NESTEN", industry: "RUH", key: "RUH_NESTEN_TIDSPRESS", label: "Tidspress / stress", sortOrder: 8 },
  { incidentType: "NESTEN", industry: "RUH", key: "RUH_NESTEN_PROSEDYRE", label: "Mangelfull prosedyre", sortOrder: 9 },
  { incidentType: "NESTEN", industry: "RUH", key: "RUH_NESTEN_POSITIV", label: "Positivt funn / god praksis", sortOrder: 10 },
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
