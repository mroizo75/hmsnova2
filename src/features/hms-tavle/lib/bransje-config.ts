/**
 * Bransjekonfigurasjon for Digital HMS Tavle.
 *
 * Brukes til å tilpasse seksjonstekster, lovkrav-referanser og seksjonsforslag
 * basert på hvilken bransje tavlen er konfigurert for.
 */

export const BRANSJE_OPTIONS = [
  { value: "BYGG_ANLEGG",          label: "Bygg og anlegg",              emoji: "🏗️" },
  { value: "EIENDOM",              label: "Eiendom og forvaltning",      emoji: "🏢" },
  { value: "BORETTSLAG",           label: "Borettslag og sameie",        emoji: "🏘️" },
  { value: "SYKEHUS_HELSE",        label: "Sykehus og helse",            emoji: "🏥" },
  { value: "SKOLE_BARNEHAGE",      label: "Skole og barnehage",          emoji: "🏫" },
  { value: "LAGER_LOGISTIKK",      label: "Lager og logistikk",          emoji: "📦" },
  { value: "INDUSTRI",             label: "Industri og produksjon",      emoji: "🏭" },
  { value: "VERKSTED",             label: "Verksted og service",         emoji: "🔧" },
  { value: "BUTIKK_KJEDE",         label: "Butikk og kjede",             emoji: "🛒" },
  // ─── Reiseliv-bransjer ──────────────────────────────────────────────────────
  { value: "HOTELL_OVERNATTING",   label: "Hotell og overnatting",       emoji: "🏨" },
  { value: "RESTAURANT_SERVERING", label: "Restaurant og servering",     emoji: "🍽️" },
  { value: "ATTRAKSJON_OPPLEVELSE",label: "Attraksjon og opplevelse",    emoji: "🎡" },
  { value: "TUROPERATOR",          label: "Turoperatør og reisearrangør",emoji: "✈️" },
  { value: "TURISTTRANSPORT",      label: "Turisttransport",             emoji: "🚌" },
  { value: "ANNET",                label: "Annet",                       emoji: "🏢" },
] as const;

export type BransjeValue = typeof BRANSJE_OPTIONS[number]["value"];

export function getBransjeLabel(value: string | null | undefined): string {
  return BRANSJE_OPTIONS.find((b) => b.value === value)?.label ?? "Bygg og anlegg";
}

export function getBransjeEmoji(value: string | null | undefined): string {
  return BRANSJE_OPTIONS.find((b) => b.value === value)?.emoji ?? "🏗️";
}

/**
 * Returnerer tilpassede seksjonstekster basert på bransje.
 * Bygg og anlegg bruker Byggherreforskriften-paragrafer.
 * Reiseliv bruker tilpassede tjeneste-/gjestetekster.
 * Andre bransjer bruker AML/IK-HMS-referanser.
 */
export function getSectionLabels(bransje: string | null | undefined): Record<string, string> {
  const isConstruction = !bransje || bransje === "BYGG_ANLEGG";
  const isReiseliv = [
    "HOTELL_OVERNATTING", "RESTAURANT_SERVERING", "ATTRAKSJON_OPPLEVELSE",
    "TUROPERATOR", "TURISTTRANSPORT",
  ].includes(bransje ?? "");

  const baseLabels: Record<string, string> = {
    SHA_PLAN:            isConstruction ? "SHA-plan"           : isReiseliv ? "HMS-plan"          : "HMS-plan",
    MANNSKAPSLISTE:      isConstruction ? "Mannskapsliste"     : isReiseliv ? "Personelloversikt" : "Personelloversikt",
    AVVIK_STATISTIKK:    "Avvik / RUH statistikk",
    RUH_LISTE:           "RUH",
    SJA_AKTIVE:          isReiseliv ? "Risikovurderinger" : "SJA",
    VERNERUNDE_STATUS:   "Vernerunde",
    KONTAKTINFO:         isReiseliv ? "Kontakter" : "Kontaktpersoner",
    BEREDSKAPSPLAN:      isReiseliv ? "Beredskapsplan / Evakuering" : "Beredskapsplan",
    DOKUMENT_HUB:        "Dokumenter",
    EKSTERN_LENKE:       "Eksterne lenker",
    VAERMELDING:         "Værvarsling",
    KPI_DASHBOARD:       "KPI og nøkkeltall",
    HMS_PLAN_AARSHJUL:   "HMS-årshjul",
    FREMDRIFTSPLAN:      isConstruction ? "Fremdriftsplan"     : isReiseliv ? "Sesongplan" : "Aktivitetsplan",
    RIGGPLAN:            isConstruction ? "Riggplan"           : isReiseliv ? "Plantegning / Rømningsveier" : "Plantegning",
    RISIKOMATRISE:       "Risikomatrise",
    OPPLARING_STATUS:    isReiseliv ? "Opplæring og kompetanse" : "Opplæring",
    LOVKRAV_SJEKKLISTE:  "Lovkrav",
    NYHETER_MELDINGER:   isReiseliv ? "Meldinger til gjester og ansatte" : "Meldinger",
    SNARVEIER:           "Hurtigtilganger",
    GJEST_SKJEMA:        isReiseliv ? "Gjesteskjema" : "Tilbakemeldingsskjema",
  };

  return baseLabels;
}

/**
 * Lovkrav-sjekkliste tilpasset bransje.
 * Hjemmel: AML / IK-HMS / Matlovforskriften / Pakkereiseloven / Vegtransportloven
 */
export function getLovkravItems(bransje: string | null | undefined, isAddon: boolean, tavle: any): Array<{
  label: string; ok: boolean | null; ref: string;
}> {
  const isConstruction = !bransje || bransje === "BYGG_ANLEGG";
  const shaPlan = tavle?.project?.constructionShaPlan;
  const preNotif = tavle?.project?.constructionPreNotification;

  if (isConstruction) {
    return [
      { label: "SHA-plan godkjent",           ok: isAddon ? shaPlan?.status === "ACTIVE" : null, ref: "§ 7+8" },
      { label: "Forhåndsmelding sendt",        ok: isAddon ? !!preNotif?.sentAt : null,           ref: "§ 12" },
      { label: "Mannskapsliste aktiv",         ok: null,                                           ref: "§ 15" },
      { label: "Koordineringsansvar avklart",  ok: null,                                           ref: "§ 18" },
    ];
  }

  if (bransje === "HOTELL_OVERNATTING") {
    return [
      { label: "HMS-plan oppdatert",               ok: null, ref: "IK-HMS § 5" },
      { label: "Risikovurdering gjennomført",       ok: null, ref: "AML § 3-1" },
      { label: "Beredskapsplan – brann/evakuering", ok: null, ref: "AML § 4-2 + Brannloven" },
      { label: "Verneombud valgt",                  ok: null, ref: "AML § 6-1" },
      { label: "BHT-tilknytning dokumentert",       ok: null, ref: "Forskrift kode 55.1" },
      { label: "Kjemikalier/stoffkartotek oppdatert", ok: null, ref: "AML § 4-5" },
    ];
  }

  if (bransje === "RESTAURANT_SERVERING") {
    return [
      { label: "HMS-plan oppdatert",               ok: null, ref: "IK-HMS § 5" },
      { label: "IK-mat / HACCP dokumentert",        ok: null, ref: "Matlovforskriften" },
      { label: "Registrert hos Mattilsynet",        ok: null, ref: "Næringsmiddelforskriften" },
      { label: "Allergeninformasjon tilgjengelig",  ok: null, ref: "EU-forordning 1169/2011" },
      { label: "BHT-tilknytning dokumentert",       ok: null, ref: "Forskrift kode 56.11/56.3" },
      { label: "Ansvarlig alkoholservering",        ok: null, ref: "Alkoholloven § 1-7c" },
    ];
  }

  if (bransje === "ATTRAKSJON_OPPLEVELSE") {
    return [
      { label: "HMS-plan oppdatert",               ok: null, ref: "IK-HMS § 5" },
      { label: "Risikovurdering gjennomført",       ok: null, ref: "AML § 3-1" },
      { label: "Gjestesikkerhet dokumentert",       ok: null, ref: "Produktkontrolloven § 3" },
      { label: "Beredskapsplan klar",               ok: null, ref: "AML § 4-2" },
      { label: "Sesongoppstartsprotokoll OK",       ok: null, ref: "IK-HMS § 5" },
    ];
  }

  if (bransje === "TUROPERATOR") {
    return [
      { label: "HMS-plan oppdatert",               ok: null, ref: "IK-HMS § 5" },
      { label: "Risikovurdering gjennomført",       ok: null, ref: "AML § 3-1" },
      { label: "Beredskapsplan – reisehendelser",  ok: null, ref: "Pakkereiseloven § 14" },
      { label: "Reisegaranti dokumentert",          ok: null, ref: "Pakkereiseloven § 3" },
      { label: "GDPR / behandlingsprotokoll",       ok: null, ref: "GDPR art. 30" },
    ];
  }

  if (bransje === "TURISTTRANSPORT") {
    return [
      { label: "HMS-plan oppdatert",               ok: null, ref: "IK-HMS § 5" },
      { label: "Løyvedokumentasjon gyldig",        ok: null, ref: "Yrkestransportlova § 4" },
      { label: "Kjøre-/hviletid dokumentert",      ok: null, ref: "Vegtransportloven § 7" },
      { label: "Sjåførkompetanse dokumentert",      ok: null, ref: "Forskrift om yrkessjåfør" },
      { label: "BHT-tilknytning dokumentert",       ok: null, ref: "Forskrift kode 49" },
    ];
  }

  // Generisk for øvrige bransjer
  return [
    { label: "HMS-plan oppdatert",            ok: null, ref: "IK-HMS § 5" },
    { label: "Risikovurdering gjennomført",   ok: null, ref: "AML § 3-1" },
    { label: "Beredskapsplan på plass",       ok: null, ref: "AML § 4-2" },
    { label: "Verneombud valgt",              ok: null, ref: "AML § 6-1" },
    { label: "Opplæring gjennomført",         ok: null, ref: "AML § 3-2" },
  ];
}
