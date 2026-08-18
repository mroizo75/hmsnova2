/**
 * Grunnleggende HMS-moduler som ALLTID vises i enkel meny, uansett bransje.
 * Dette er minimumssettet som dekker AML § 3-1 og IK-HMS § 5.
 */
export const BASE_SIMPLE_MODULES: string[] = [
  "/dashboard",
  "/dashboard/hms-handbok",
  "/dashboard/incidents",
  "/dashboard/risks",
  "/dashboard/rutiner",
  "/dashboard/inspections",
  "/dashboard/training",
  "/dashboard/fire-drills",
  "/dashboard/annual-hms-plan",
  "/dashboard/settings",
]

/**
 * Definerer hvilke moduler som er relevante per bransje.
 * Alle lister starter med BASE_SIMPLE_MODULES + bransje-spesifikke tillegg.
 * Speiler Industry-enum i prisma/schema.prisma.
 */
export const BRANSJE_MODULES: Record<
  string,
  { label: string; modules: string[]; description: string }
> = {
  // ── Bygg, anlegg og tungindustri ──────────────────────────────────────
  construction: {
    label: "Bygg og anlegg",
    description: "Byggeplasser, entreprenører, håndverkere og anleggsarbeid",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/sja",
      "/dashboard/chemicals",
      "/dashboard/exposure-register",
      "/dashboard/construction-compliance",
    ],
  },
  elektro: {
    label: "Elektro og energi",
    description: "Elektrisk installasjon, energiselskap og nettselskap",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/sja",
      "/dashboard/chemicals",
      "/dashboard/samsvarserklaringer",
    ],
  },
  offshore: {
    label: "Offshore og petroleum",
    description: "Offshore-installasjoner, rigg og vedlikehold",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/sja",
      "/dashboard/chemicals",
      "/dashboard/exposure-register",
      "/dashboard/beredskap-reiseliv",
    ],
  },
  marine: {
    label: "Maritim og sjøfart",
    description: "Skip, verft, havnevirksomhet og maritim service",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/sja",
      "/dashboard/chemicals",
      "/dashboard/exposure-register",
    ],
  },
  oil_gas: {
    label: "Olje og gass",
    description: "Raffineri, petrokjemi og gassanlegg",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/sja",
      "/dashboard/chemicals",
      "/dashboard/exposure-register",
    ],
  },
  fiskeri: {
    label: "Fiskeri og havbruk",
    description: "Fiske, oppdrett, foredling og havbruk",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/sja",
      "/dashboard/chemicals",
    ],
  },
  bergverk: {
    label: "Bergverk og gruvedrift",
    description: "Gruver, steinbrudd, pukkverk og mineralutvinning",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/sja",
      "/dashboard/chemicals",
      "/dashboard/exposure-register",
    ],
  },

  // ── Helse, omsorg og utdanning ────────────────────────────────────────
  healthcare: {
    label: "Helse og omsorg",
    description: "Sykehus, legekontor, sykehjem, hjemmetjeneste og omsorg",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/chemicals",
      "/dashboard/exposure-register",
      "/dashboard/bht-nattarbeid",
    ],
  },
  education: {
    label: "Utdanning",
    description: "Barnehager, skoler, høyskoler og universiteter",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/chemicals",
    ],
  },

  // ── Hotell, restaurant og reiseliv ────────────────────────────────────
  hospitality: {
    label: "Hotell og restaurant",
    description: "Hoteller, restauranter, kafeer, catering og kantine",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/chemicals",
      "/dashboard/ik-mat",
      "/dashboard/bht-nattarbeid",
    ],
  },
  aktivitet: {
    label: "Aktivitet og opplevelse",
    description: "Aktivitetsparker, guider, sport og friluftsliv",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/sja",
      "/dashboard/aktivitetssikkerhet",
      "/dashboard/beredskap-reiseliv",
    ],
  },

  // ── Transport og logistikk ────────────────────────────────────────────
  transport: {
    label: "Transport og logistikk",
    description: "Busser, båter, taxier, gods og reisearrangører",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/transport",
      "/dashboard/sja",
    ],
  },

  // ── Industri, produksjon og handel ────────────────────────────────────
  manufacturing: {
    label: "Industri og produksjon",
    description: "Fabrikker, produksjonsanlegg og verksted",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/sja",
      "/dashboard/chemicals",
      "/dashboard/exposure-register",
    ],
  },
  retail: {
    label: "Handel og service",
    description: "Butikker, kjeder, service og kundebehandling",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/chemicals",
    ],
  },

  // ── Landbruk ──────────────────────────────────────────────────────────
  agriculture: {
    label: "Landbruk",
    description: "Gårdsdrift, skogbruk, dyrehold og planteproduksjon",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/sja",
      "/dashboard/chemicals",
    ],
  },

  // ── IT og kontor ──────────────────────────────────────────────────────
  technology: {
    label: "Teknologi og IT",
    description: "Programvare, IT-drift, konsulentvirksomhet og kontor",
    modules: [
      ...BASE_SIMPLE_MODULES,
    ],
  },

  // ── Annet ─────────────────────────────────────────────────────────────
  other: {
    label: "Annen bransje",
    description: "Øvrige virksomheter",
    modules: [
      ...BASE_SIMPLE_MODULES,
      "/dashboard/chemicals",
    ],
  },
}
