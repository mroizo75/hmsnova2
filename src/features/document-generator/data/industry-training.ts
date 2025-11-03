/**
 * Bransjespesifikke opplæringskrav
 * 
 * Definerer hvilken opplæring som er påkrevd/anbefalt
 * for hver bransje.
 */

export type TrainingCourse = {
  name: string;
  required: boolean;
  duration: string;
  frequency: string;
  description?: string;
};

export type IndustryTraining = {
  [key: string]: TrainingCourse[];
};

export const INDUSTRY_TRAINING: IndustryTraining = {
  // ═══════════════════════════════════════════════════════════════
  // BYGG OG ANLEGG
  // ═══════════════════════════════════════════════════════════════
  CONSTRUCTION: [
    {
      name: "HMS-introduksjon",
      required: true,
      duration: "2 timer",
      frequency: "Ved ansettelse",
      description: "Grunnleggende HMS-opplæring for alle nye ansatte",
    },
    {
      name: "Arbeid i høyden",
      required: true,
      duration: "8 timer",
      frequency: "Hvert 3. år",
      description: "Opplæring i bruk av fallsikring, stillas, lift, etc.",
    },
    {
      name: "Stillas",
      required: true,
      duration: "16 timer",
      frequency: "Hvert 3. år",
      description: "Stillasopplæring for montering og bruk",
    },
    {
      name: "Maskinførerbevis",
      required: true,
      duration: "24 timer",
      frequency: "Hvert 5. år",
      description: "Gravemaskin, hjullaster, truck, etc.",
    },
    {
      name: "Varmt arbeid",
      required: true,
      duration: "4 timer",
      frequency: "Hvert 3. år",
      description: "Sveising, brenning, og annet varmt arbeid",
    },
    {
      name: "HMS-kort",
      required: true,
      duration: "8 timer",
      frequency: "Hvert 5. år",
      description: "Grønt HMS-kort for byggebransjen",
    },
    {
      name: "Førstehjelpskurs",
      required: true,
      duration: "16 timer",
      frequency: "Hvert 2. år",
      description: "Minimum 2 personer per arbeidsplass må ha gyldig kurs",
    },
    {
      name: "Vernerunde-opplæring",
      required: false,
      duration: "4 timer",
      frequency: "Årlig",
      description: "For HMS-ansvarlig og verneombud",
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // HELSEVESEN
  // ═══════════════════════════════════════════════════════════════
  HEALTHCARE: [
    {
      name: "HMS-introduksjon",
      required: true,
      duration: "2 timer",
      frequency: "Ved ansettelse",
      description: "Grunnleggende HMS-opplæring",
    },
    {
      name: "Smittevern",
      required: true,
      duration: "4 timer",
      frequency: "Årlig",
      description: "Opplæring i smittevernrutiner og bruk av verneutstyr",
    },
    {
      name: "Vold og trusler",
      required: true,
      duration: "3 timer",
      frequency: "Hvert 2. år",
      description: "Konflikthåndtering og forebygging av vold",
    },
    {
      name: "Ergonomi - pasienthåndtering",
      required: true,
      duration: "4 timer",
      frequency: "Hvert 3. år",
      description: "Riktig løfteteknikk og bruk av hjelpemidler",
    },
    {
      name: "Førstehjelpskurs",
      required: true,
      duration: "16 timer",
      frequency: "Hvert 2. år",
      description: "Førstehjelp og HLR",
    },
    {
      name: "Medikamenthåndtering",
      required: true,
      duration: "6 timer",
      frequency: "Ved ansettelse + oppfriskning årlig",
      description: "Sikker medikamenthåndtering",
    },
    {
      name: "Stikkskadeforebygging",
      required: true,
      duration: "2 timer",
      frequency: "Årlig",
      description: "Forebygging av stikkskader",
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // TRANSPORT OG LOGISTIKK
  // ═══════════════════════════════════════════════════════════════
  TRANSPORT: [
    {
      name: "HMS-introduksjon",
      required: true,
      duration: "2 timer",
      frequency: "Ved ansettelse",
      description: "Grunnleggende HMS-opplæring",
    },
    {
      name: "Defensiv kjøring",
      required: true,
      duration: "8 timer",
      frequency: "Hvert 3. år",
      description: "Sikker kjøring og trafikksikkerhet",
    },
    {
      name: "Sikring av last",
      required: true,
      duration: "4 timer",
      frequency: "Hvert 3. år",
      description: "Riktig sikring og fordeling av last",
    },
    {
      name: "ADR - farlig gods",
      required: false,
      duration: "24 timer",
      frequency: "Hvert 5. år",
      description: "Kun for transport av farlig gods",
    },
    {
      name: "Truck-sertifikat",
      required: false,
      duration: "16 timer",
      frequency: "Hvert 5. år",
      description: "For bruk av truck ved lasting/lossing",
    },
    {
      name: "Førstehjelpskurs",
      required: true,
      duration: "16 timer",
      frequency: "Hvert 2. år",
      description: "Minimum 2 personer må ha gyldig kurs",
    },
    {
      name: "Ergonomi - løfteteknikk",
      required: true,
      duration: "3 timer",
      frequency: "Hvert 3. år",
      description: "Forebygging av ryggskader",
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRI OG PRODUKSJON
  // ═══════════════════════════════════════════════════════════════
  MANUFACTURING: [
    {
      name: "HMS-introduksjon",
      required: true,
      duration: "2 timer",
      frequency: "Ved ansettelse",
      description: "Grunnleggende HMS-opplæring",
    },
    {
      name: "Maskinsikkerhet",
      required: true,
      duration: "4 timer",
      frequency: "Årlig",
      description: "Sikker bruk av maskiner og utstyr",
    },
    {
      name: "Kjemikaliesikkerhet",
      required: true,
      duration: "3 timer",
      frequency: "Årlig",
      description: "Håndtering av kjemikalier og lesing av SDS",
    },
    {
      name: "Hørselsvern og støy",
      required: true,
      duration: "1 time",
      frequency: "Årlig",
      description: "Bruk av hørselsvern og forebygging av hørselsskader",
    },
    {
      name: "Førstehjelpskurs",
      required: true,
      duration: "16 timer",
      frequency: "Hvert 2. år",
      description: "Minimum 2 personer må ha gyldig kurs",
    },
    {
      name: "Brannvern",
      required: true,
      duration: "2 timer",
      frequency: "Hvert 2. år",
      description: "Brannforebygging og bruk av slokkeutstyr",
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // HANDEL OG SERVICE
  // ═══════════════════════════════════════════════════════════════
  RETAIL: [
    {
      name: "HMS-introduksjon",
      required: true,
      duration: "1 time",
      frequency: "Ved ansettelse",
      description: "Grunnleggende HMS-opplæring",
    },
    {
      name: "Ranshåndtering",
      required: true,
      duration: "2 timer",
      frequency: "Årlig",
      description: "Hvordan håndtere ran og tyveri",
    },
    {
      name: "Ergonomi - løfteteknikk",
      required: true,
      duration: "2 timer",
      frequency: "Hvert 3. år",
      description: "Forebygging av belastningsskader",
    },
    {
      name: "Brannvern",
      required: true,
      duration: "2 timer",
      frequency: "Hvert 2. år",
      description: "Brannforebygging og evakuering",
    },
    {
      name: "Førstehjelpskurs",
      required: true,
      duration: "16 timer",
      frequency: "Hvert 2. år",
      description: "Minimum 1 person per avdeling",
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // HOTELL OG RESTAURANT
  // ═══════════════════════════════════════════════════════════════
  HOSPITALITY: [
    {
      name: "HMS-introduksjon",
      required: true,
      duration: "1 time",
      frequency: "Ved ansettelse",
      description: "Grunnleggende HMS-opplæring",
    },
    {
      name: "Mattrygghet og hygiene",
      required: true,
      duration: "4 timer",
      frequency: "Hvert 2. år",
      description: "HACCP og hygienesikkerhet",
    },
    {
      name: "Brannsikkerhet",
      required: true,
      duration: "2 timer",
      frequency: "Årlig",
      description: "Brannforebygging og evakuering",
    },
    {
      name: "Kjøkkensikkerhet",
      required: true,
      duration: "2 timer",
      frequency: "Årlig",
      description: "Sikker bruk av kniver og utstyr",
    },
    {
      name: "Alkoholservering (ansvarlig vertskap)",
      required: false,
      duration: "8 timer",
      frequency: "Hvert 5. år",
      description: "Lovpålagt for serveringssteder",
    },
    {
      name: "Førstehjelpskurs",
      required: true,
      duration: "16 timer",
      frequency: "Hvert 2. år",
      description: "Minimum 2 personer",
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // UTDANNING
  // ═══════════════════════════════════════════════════════════════
  EDUCATION: [
    {
      name: "HMS-introduksjon",
      required: true,
      duration: "1 time",
      frequency: "Ved ansettelse",
      description: "Grunnleggende HMS-opplæring",
    },
    {
      name: "Vold og trusler",
      required: true,
      duration: "3 timer",
      frequency: "Hvert 2. år",
      description: "Konflikthåndtering",
    },
    {
      name: "Brannsikkerhet",
      required: true,
      duration: "2 timer",
      frequency: "Årlig",
      description: "Brannforebygging og evakuering",
    },
    {
      name: "Førstehjelpskurs",
      required: true,
      duration: "16 timer",
      frequency: "Hvert 2. år",
      description: "Minimum 2 personer per avdeling",
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // TEKNOLOGI OG IT
  // ═══════════════════════════════════════════════════════════════
  TECHNOLOGY: [
    {
      name: "HMS-introduksjon",
      required: true,
      duration: "1 time",
      frequency: "Ved ansettelse",
      description: "Grunnleggende HMS-opplæring",
    },
    {
      name: "Ergonomi - skjermarbeid",
      required: true,
      duration: "2 timer",
      frequency: "Hvert 3. år",
      description: "Forebygging av belastningsskader",
    },
    {
      name: "Psykisk helse og stress",
      required: false,
      duration: "2 timer",
      frequency: "Årlig",
      description: "Stresshåndtering og psykisk helse",
    },
    {
      name: "Brannsikkerhet",
      required: true,
      duration: "1 time",
      frequency: "Hvert 2. år",
      description: "Brannforebygging og evakuering",
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LANDBRUK
  // ═══════════════════════════════════════════════════════════════
  AGRICULTURE: [
    {
      name: "HMS-introduksjon",
      required: true,
      duration: "2 timer",
      frequency: "Ved ansettelse",
      description: "Grunnleggende HMS-opplæring",
    },
    {
      name: "Maskinsikkerhet - traktor og landbruksmaskiner",
      required: true,
      duration: "8 timer",
      frequency: "Hvert 5. år",
      description: "Sikker bruk av landbruksmaskiner",
    },
    {
      name: "Kjemikaliesikkerhet - plantevernmidler",
      required: true,
      duration: "4 timer",
      frequency: "Hvert 3. år",
      description: "Sikker håndtering av plantevernmidler",
    },
    {
      name: "Dyrehåndtering",
      required: false,
      duration: "4 timer",
      frequency: "Ved ansettelse",
      description: "Sikker håndtering av dyr",
    },
    {
      name: "Førstehjelpskurs",
      required: true,
      duration: "16 timer",
      frequency: "Hvert 2. år",
      description: "Minimum 1 person",
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // ANNET
  // ═══════════════════════════════════════════════════════════════
  OTHER: [
    {
      name: "HMS-introduksjon",
      required: true,
      duration: "1-2 timer",
      frequency: "Ved ansettelse",
      description: "Grunnleggende HMS-opplæring",
    },
    {
      name: "Brannsikkerhet",
      required: true,
      duration: "2 timer",
      frequency: "Hvert 2. år",
      description: "Brannforebygging og evakuering",
    },
    {
      name: "Førstehjelpskurs",
      required: true,
      duration: "16 timer",
      frequency: "Hvert 2. år",
      description: "Minimum 1-2 personer",
    },
  ],
};

