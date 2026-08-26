export type RegulatoryRequirementSeed = {
  title: string;
  description: string;
  legalBasis: string;
  sourceUrl?: string;
  triggerActivities: string[];
  hmsNovaFeature?: string;
  hmsNovaRoute?: string;
  routineCategory?: string;
  severity: "MANDATORY" | "RECOMMENDED" | "OPTIONAL";
};

export const REGULATORY_REQUIREMENTS: RegulatoryRequirementSeed[] = [
  // === IK-HMS generelle krav (alle virksomheter med ansatte) ===
  {
    title: "Systematisk HMS-arbeid (internkontroll)",
    description:
      "Virksomheten skal ha et system for internkontroll som sikrer at krav i HMS-lovgivningen overholdes. Systemet skal dokumenteres skriftlig.",
    legalBasis: "Internkontrollforskriften § 5",
    sourceUrl: "https://lovdata.no/forskrift/1996-12-06-1127/§5",
    triggerActivities: ["employees"],
    hmsNovaFeature: "hms_handbook",
    hmsNovaRoute: "/dashboard/hms-handbok",
    severity: "MANDATORY",
  },
  {
    title: "Risikovurdering",
    description:
      "Arbeidsgiver skal kartlegge farer og vurdere risiko, og på bakgrunn av dette planlegge og gjennomføre tiltak for å redusere risikoen.",
    legalBasis: "IK-HMS § 5 nr. 6, AML § 3-1 (2) c",
    sourceUrl: "https://lovdata.no/forskrift/1996-12-06-1127/§5",
    triggerActivities: ["employees"],
    hmsNovaFeature: "risk_assessment",
    hmsNovaRoute: "/dashboard/risks",
    severity: "MANDATORY",
  },
  {
    title: "Avvikshåndtering",
    description:
      "Virksomheten skal ha rutiner for å avdekke, rette opp og forebygge overtredelser av krav fastsatt i eller i medhold av HMS-lovgivningen.",
    legalBasis: "IK-HMS § 5 nr. 7",
    sourceUrl: "https://lovdata.no/forskrift/1996-12-06-1127/§5",
    triggerActivities: ["employees"],
    hmsNovaFeature: "incident_management",
    hmsNovaRoute: "/dashboard/incidents",
    routineCategory: "AVVIK",
    severity: "MANDATORY",
  },
  {
    title: "Verneombud",
    description:
      "Virksomheter med minst 10 arbeidstakere skal ha verneombud. Virksomheter med færre enn 10 kan avtale annen ordning skriftlig.",
    legalBasis: "AML § 6-1",
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§6-1",
    triggerActivities: ["employees"],
    hmsNovaFeature: "org_chart",
    hmsNovaRoute: "/dashboard/organisasjonskart",
    severity: "MANDATORY",
  },
  {
    title: "Opplæring i HMS",
    description:
      "Arbeidsgiver skal sørge for at arbeidstaker som har til oppgave å lede eller kontrollere andre arbeidstakere, har nødvendig kompetanse til å føre kontroll med at arbeidet blir utført på en helse- og sikkerhetsmessig forsvarlig måte.",
    legalBasis: "AML § 3-5",
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§3-5",
    triggerActivities: ["employees"],
    hmsNovaFeature: "training",
    hmsNovaRoute: "/dashboard/training",
    severity: "MANDATORY",
  },
  // === Kjemikalier ===
  {
    title: "Stoffkartotek",
    description:
      "Arbeidsgiver skal opprette stoffkartotek for helsefarlige stoffer som brukes i virksomheten. Stoffkartoteket skal inneholde sikkerhetsdatablad for alle aktuelle kjemikalier.",
    legalBasis: "Forskrift om utførelse av arbeid § 2-1 til § 2-6",
    sourceUrl: "https://lovdata.no/forskrift/2011-12-06-1357/§2-1",
    triggerActivities: ["chemicals", "chemical_register"],
    hmsNovaFeature: "chemical_register",
    hmsNovaRoute: "/dashboard/chemicals",
    routineCategory: "KJEMIKALIER",
    severity: "MANDATORY",
  },
  {
    title: "Eksponeringsvurdering for kjemikalier",
    description:
      "Arbeidsgiver skal vurdere arbeidstakernes eksponering for kjemikalier og iverksette nødvendige tiltak for å redusere eksponeringen.",
    legalBasis: "Forskrift om utførelse av arbeid kap. 3",
    sourceUrl: "https://lovdata.no/forskrift/2011-12-06-1357/§3-1",
    triggerActivities: ["chemicals"],
    hmsNovaFeature: "exposure_register",
    hmsNovaRoute: "/dashboard/exposure-register",
    severity: "MANDATORY",
  },
  // === Arbeid i høyden ===
  {
    title: "Sikker jobb-analyse for høydearbeid",
    description:
      "Ved arbeid i høyden skal det gjennomføres risikovurdering/SJA og iverksettes tiltak som sikrer mot fall.",
    legalBasis: "Forskrift om utførelse av arbeid kap. 17",
    sourceUrl: "https://lovdata.no/forskrift/2011-12-06-1357/§17-1",
    triggerActivities: ["height_work", "fall_protection"],
    hmsNovaFeature: "sja",
    hmsNovaRoute: "/dashboard/sja",
    routineCategory: "BYGG_ANLEGG",
    severity: "MANDATORY",
  },
  // === Bygg og anlegg ===
  {
    title: "SHA-plan (byggherre)",
    description:
      "Byggherren skal sørge for at det utarbeides en skriftlig plan for sikkerhet, helse og arbeidsmiljø (SHA-plan).",
    legalBasis: "Byggherreforskriften § 7-8",
    sourceUrl: "https://lovdata.no/forskrift/2009-08-03-1028/§7",
    triggerActivities: ["construction"],
    hmsNovaFeature: "sha_plan",
    hmsNovaRoute: "/dashboard/sja",
    severity: "MANDATORY",
  },
  // === Maskiner ===
  {
    title: "Dokumentert sikkerhetsopplæring",
    description:
      "Arbeidsgiver skal sørge for at arbeidstaker som bruker arbeidsutstyr har fått nødvendig opplæring. For visse typer arbeidsutstyr kreves dokumentert sikkerhetsopplæring eller sertifikat.",
    legalBasis: "Forskrift om utførelse av arbeid kap. 10",
    sourceUrl: "https://lovdata.no/forskrift/2011-12-06-1357/§10-1",
    triggerActivities: ["machinery", "certified_equipment"],
    hmsNovaFeature: "training",
    hmsNovaRoute: "/dashboard/training",
    severity: "MANDATORY",
  },
  // === Nattarbeid ===
  {
    title: "BHT-plikt ved nattarbeid",
    description:
      "Virksomheter med nattarbeid i visse bransjer er pålagt å ha bedriftshelsetjeneste.",
    legalBasis: "AML § 3-3, Forskrift om organisering mv. § 13-1",
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§3-3",
    triggerActivities: ["night_shift"],
    hmsNovaFeature: "bht",
    hmsNovaRoute: "/dashboard/bht-nattarbeid",
    severity: "MANDATORY",
  },
  {
    title: "Arbeidstidsbestemmelser for skift/nattarbeid",
    description:
      "Spesielle regler for arbeidstid ved natt- og skiftarbeid, inkludert krav til hvileperioder og kompenserende tiltak.",
    legalBasis: "AML kap. 10, særlig § 10-11",
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§10-11",
    triggerActivities: ["night_shift"],
    hmsNovaFeature: "time_registration",
    hmsNovaRoute: "/dashboard/time-registration",
    routineCategory: "ARBEIDSTID",
    severity: "MANDATORY",
  },
  // === Mat og servering ===
  {
    title: "HACCP-plan",
    description:
      "Virksomheter som håndterer mat skal ha et system basert på HACCP-prinsippene for å sikre trygg mat.",
    legalBasis: "Matloven § 5, Næringsmiddelhygieneforskriften",
    sourceUrl: "https://lovdata.no/lov/2003-12-19-124/§5",
    triggerActivities: ["food_handling", "haccp"],
    hmsNovaFeature: "haccp",
    hmsNovaRoute: "/dashboard/ik-mat/haccp",
    routineCategory: "MAT_SERVERING",
    severity: "MANDATORY",
  },
  {
    title: "Allergenoversikt og allergenrutine",
    description:
      "Serveringssteder skal ha rutine for allergenhåndtering og oversikt over allergener i alle retter (EU-forordning 1169/2011).",
    legalBasis: "Matinformasjonsforskriften § 6, EU-forordning 1169/2011",
    triggerActivities: ["food_handling"],
    hmsNovaFeature: "allergen",
    hmsNovaRoute: "/dashboard/rutiner",
    severity: "MANDATORY",
  },
  // === Brann ===
  {
    title: "Brannvernrutine, rømningsplan og brannøvelser",
    description:
      "Virksomheten skal ha brannvernrutine og rømningsplan, samt gjennomføre regelmessige brannøvelser.",
    legalBasis: "Forskrift om brannforebygging kap. 2-3",
    sourceUrl: "https://lovdata.no/forskrift/2015-12-17-1710",
    triggerActivities: ["fire_hazard", "flammable_goods"],
    hmsNovaFeature: "fire_drill",
    hmsNovaRoute: "/dashboard/rutiner",
    routineCategory: "BRANN",
    severity: "MANDATORY",
  },
  // === Vold og trusler ===
  {
    title: "Rutine for vold og trusler",
    description:
      "Arbeidsgiver skal kartlegge risiko for vold og trusler og iverksette nødvendige tiltak. Ansatte skal ha opplæring i håndtering av vold og trusler.",
    legalBasis: "AML § 4-3 (3), Forskrift om utførelse av arbeid § 23A",
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§4-3",
    triggerActivities: ["violence_risk"],
    hmsNovaFeature: "routines",
    hmsNovaRoute: "/dashboard/rutiner",
    routineCategory: "VOLD_TRUSLER",
    severity: "MANDATORY",
  },
  // === Alenearbeid ===
  {
    title: "Alenearbeid-rutine",
    description:
      "Arbeidsgiver skal vurdere risiko ved alenearbeid og iverksette nødvendige tiltak, herunder innsjekksystemer og beredskapsplaner.",
    legalBasis: "AML § 4-1, Forskrift om organisering mv. § 2-1",
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§4-1",
    triggerActivities: ["lone_work"],
    hmsNovaFeature: "routines",
    hmsNovaRoute: "/dashboard/rutiner",
    routineCategory: "ALENEARBEID",
    severity: "MANDATORY",
  },
  // === Støy ===
  {
    title: "Støyvurdering og tiltak",
    description:
      "Arbeidsgiver skal kartlegge og vurdere arbeidstakernes eksponering for støy. Ved eksponering over tiltaksverdier skal det gjennomføres tiltak.",
    legalBasis: "Forskrift om tiltaks- og grenseverdier kap. 2",
    sourceUrl: "https://lovdata.no/forskrift/2011-12-06-1358",
    triggerActivities: ["noise_exposure"],
    hmsNovaFeature: "exposure_register",
    hmsNovaRoute: "/dashboard/exposure-register",
    severity: "MANDATORY",
  },
  // === Helsefarlige stoffer ===
  {
    title: "Eksponeringsregister for helsefarlige stoffer",
    description:
      "Arbeidsgiver skal føre register over arbeidstakere som er eksponert for kreftfremkallende eller mutagene kjemikalier, bly, asbest og biologiske faktorer.",
    legalBasis: "Forskrift om utførelse av arbeid § 31-1",
    sourceUrl: "https://lovdata.no/forskrift/2011-12-06-1357/§31-1",
    triggerActivities: ["hazardous_substances"],
    hmsNovaFeature: "exposure_register",
    hmsNovaRoute: "/dashboard/exposure-register",
    severity: "MANDATORY",
  },
  // === Innleid arbeidskraft ===
  {
    title: "HMS for innleid arbeidskraft",
    description:
      "Innleier har ansvar for å sikre at innleid arbeidskraft har samme arbeidsmiljø som egne ansatte. Opplæring og informasjon om risikoer skal gis.",
    legalBasis: "AML § 2-2, Forskrift om organisering mv. § 3-1",
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§2-2",
    triggerActivities: ["temporary_workers"],
    hmsNovaFeature: "routines",
    hmsNovaRoute: "/dashboard/rutiner",
    severity: "MANDATORY",
  },
  // === Personvern ===
  {
    title: "Personvernrutiner (GDPR)",
    description:
      "Virksomheter som behandler personopplysninger skal ha dokumenterte rutiner for behandlingen, herunder behandlingsprotokoll, risikovurdering og informasjon til registrerte.",
    legalBasis: "Personopplysningsloven, GDPR art. 5, 6, 30",
    sourceUrl: "https://lovdata.no/lov/2018-06-15-38",
    triggerActivities: ["privacy_processing"],
    hmsNovaFeature: "routines",
    hmsNovaRoute: "/dashboard/rutiner",
    routineCategory: "PERSONVERN",
    severity: "MANDATORY",
  },
  // === Miljø ===
  {
    title: "Avfallshåndtering og utslippskontroll",
    description:
      "Virksomheter med regulert avfall eller utslipp skal ha rutiner for håndtering, rapportering og minimering av miljøpåvirkning.",
    legalBasis: "Forurensningsloven § 7, Avfallsforskriften",
    sourceUrl: "https://lovdata.no/lov/1981-03-13-6/§7",
    triggerActivities: ["waste_emissions"],
    hmsNovaFeature: "routines",
    hmsNovaRoute: "/dashboard/rutiner",
    routineCategory: "MILJO",
    severity: "MANDATORY",
  },
  // === Ergonomi ===
  {
    title: "Ergonomisk tilrettelegging",
    description:
      "Arbeidsgiver skal tilrettelegge arbeidet slik at arbeidstaker ikke utsettes for uheldige fysiske belastninger.",
    legalBasis: "AML § 4-4, Forskrift om utførelse av arbeid kap. 23",
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§4-4",
    triggerActivities: ["ergonomic_risk"],
    hmsNovaFeature: "risk_assessment",
    hmsNovaRoute: "/dashboard/risks",
    severity: "RECOMMENDED",
  },
  // === Varsling ===
  {
    title: "Varslingsrutine",
    description:
      "Arbeidsgiver skal utarbeide rutiner for intern varsling om kritikkverdige forhold. Rutinene skal være skriftlige og lett tilgjengelige.",
    legalBasis: "AML § 2A-6",
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§2a-6",
    triggerActivities: ["employees"],
    hmsNovaFeature: "whistleblowing",
    hmsNovaRoute: "/dashboard/whistleblowing",
    routineCategory: "VARSLING",
    severity: "MANDATORY",
  },
];
