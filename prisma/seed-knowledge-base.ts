import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const KNOWLEDGE_ENTRIES = [
  {
    category: "AML",
    lawReference: "AML_2_3",
    title: "Arbeidstakers medvirkningsplikt",
    content:
      "Arbeidstaker skal medvirke ved gjennomføring av tiltak som settes i verk for å skape et godt og sikkert arbeidsmiljø. Arbeidstaker skal bruke påbudt verneutstyr, vise aktsomhet og ellers medvirke til å hindre ulykker og helseskader.",
    summary: "Ansatte plikter å melde fra om farlige forhold og bruke verneutstyr",
    applicableAreas: JSON.stringify(["avvik", "vernerunde", "opplæring"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["RECURRING_INCIDENT", "COMPLIANCE_DRIFT"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§2-3",
  },
  {
    category: "AML",
    lawReference: "AML_3_1",
    title: "Krav til systematisk HMS-arbeid",
    content:
      "Arbeidsgiver skal sørge for at det utføres systematisk helse-, miljø- og sikkerhetsarbeid på alle plan i virksomheten. Dette skal gjøres i samarbeid med arbeidstakerne og deres tillitsvalgte.",
    summary: "Arbeidsgiver plikter systematisk HMS-arbeid i samarbeid med ansatte",
    applicableAreas: JSON.stringify(["avvik", "risiko", "rutine", "vernerunde"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["RECURRING_INCIDENT", "INSPECTION_TREND"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§3-1",
  },
  {
    category: "AML",
    lawReference: "AML_3_2",
    title: "Opplæring",
    content:
      "Arbeidsgiver skal sørge for at arbeidstaker som har til oppgave å lede eller kontrollere andre arbeidstakere, har nødvendig kompetanse til å føre kontroll med at arbeidet blir utført på en helse- og sikkerhetsmessig forsvarlig måte.",
    summary: "Arbeidsgiver skal sørge for nødvendig opplæring av ansatte",
    applicableAreas: JSON.stringify(["opplæring", "avvik"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["TRAINING_GAP"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§3-2",
  },
  {
    category: "AML",
    lawReference: "AML_5_1",
    title: "Registrering av skader og sykdom",
    content:
      "Arbeidsgiver skal sørge for registrering av alle personskader som oppstår under utførelse av arbeid. Registreringen skal omfatte skader som medfører fravær eller behov for medisinsk behandling.",
    summary: "Plikt til å registrere alle arbeidsrelaterte personskader",
    applicableAreas: JSON.stringify(["avvik"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["RECURRING_INCIDENT"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§5-1",
  },
  {
    category: "AML",
    lawReference: "AML_5_2",
    title: "Varsling om arbeidsulykker",
    content:
      "Dersom arbeidstaker omkommer eller blir alvorlig skadet ved en arbeidsulykke, skal arbeidsgiver straks og på hurtigste måte varsle Arbeidstilsynet og nærmeste politimyndighet.",
    summary: "Varslingspliktig ved alvorlig skade eller dødsfall",
    applicableAreas: JSON.stringify(["avvik"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["RECURRING_INCIDENT"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§5-2",
  },
  {
    category: "IK_HMS",
    lawReference: "IK_HMS_5_4",
    title: "Dokumentasjon av organisering",
    content:
      "Internkontrollen skal dokumentere at arbeidstakernes kompetanse og opplæring er tilpasset virksomhetens art, aktiviteter, risikoforhold og størrelse.",
    summary: "Dokumenter kompetanse og opplæring tilpasset virksomheten",
    applicableAreas: JSON.stringify(["opplæring", "rutine"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["TRAINING_GAP"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/forskrift/1996-12-06-1127/§5",
  },
  {
    category: "IK_HMS",
    lawReference: "IK_HMS_5_5",
    title: "Oversikt over lovkrav",
    content:
      "Internkontrollen skal inneholde en oversikt over krav i helse-, miljø- og sikkerhetslovgivningen som gjelder for virksomheten.",
    summary: "Ha oversikt over hvilke HMS-lover som gjelder din virksomhet",
    applicableAreas: JSON.stringify(["rutine", "håndbok"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["COMPLIANCE_DRIFT"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/forskrift/1996-12-06-1127/§5",
  },
  {
    category: "IK_HMS",
    lawReference: "IK_HMS_5_6",
    title: "Kartlegging og risikovurdering",
    content:
      "Internkontrollen skal inneholde kartlegging av farer og problemer, og på denne bakgrunn vurdere risiko. Det skal utarbeides tilhørende planer og tiltak for å redusere risikoforholdene.",
    summary: "Kartlegg farer, vurder risiko, og lag tiltak for å redusere risiko",
    applicableAreas: JSON.stringify(["risiko", "vernerunde"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["RISK_ESCALATION", "INSPECTION_TREND"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/forskrift/1996-12-06-1127/§5",
  },
  {
    category: "IK_HMS",
    lawReference: "IK_HMS_5_7",
    title: "Rutiner for avviksbehandling",
    content:
      "Internkontrollen skal inneholde rutiner for å avdekke, rette opp og forebygge overtredelser av krav fastsatt i eller i medhold av helse-, miljø- og sikkerhetslovgivningen.",
    summary: "Rutiner for å avdekke, rette opp og forebygge avvik",
    applicableAreas: JSON.stringify(["avvik", "rutine", "tiltak"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify([
      "RECURRING_INCIDENT",
      "COMPLIANCE_DRIFT",
      "MEASURE_INEFFECTIVE",
    ]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/forskrift/1996-12-06-1127/§5",
  },
  {
    category: "IK_HMS",
    lawReference: "IK_HMS_5_8",
    title: "Systematisk overvåking og gjennomgang",
    content:
      "Internkontrollen skal inneholde systematisk overvåking og gjennomgang av internkontrollen for å sikre at den fungerer som forutsatt.",
    summary: "Overvåk og gjennomgå internkontrollen systematisk",
    applicableAreas: JSON.stringify(["håndbok", "rutine", "revisjon"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["MEASURE_INEFFECTIVE", "COMPLIANCE_DRIFT"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/forskrift/1996-12-06-1127/§5",
  },
  {
    category: "AML",
    lawReference: "AML_6_2",
    title: "Verneombudets oppgaver",
    content:
      "Verneombudet skal se til at virksomheten er innrettet og vedlikeholdt slik at hensynet til arbeidstakernes sikkerhet, helse og velferd er ivaretatt. Verneombudet skal delta i planlegging og gjennomføring av vernerunder.",
    summary: "Verneombudet skal gjennomføre vernerunder og sikre arbeidsmiljøet",
    applicableAreas: JSON.stringify(["vernerunde", "risiko"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["INSPECTION_TREND"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/lov/2005-06-17-62/§6-2",
  },
  {
    category: "FORSKRIFT",
    lawReference: "FORSKRIFT_ARBEIDSUTSTYR",
    title: "Forskrift om utførelse av arbeid – bruk av arbeidsutstyr",
    content:
      "Arbeidsgiver skal sørge for at arbeidsutstyr som stilles til arbeidstakers disposisjon er egnet for det arbeid som skal utføres. Arbeidsgiver skal sørge for at arbeidsutstyret vedlikeholdes og kontrolleres.",
    summary: "Arbeidsutstyr skal være egnet, vedlikeholdt og kontrollert",
    applicableAreas: JSON.stringify(["vernerunde", "avvik", "risiko"]),
    industry: JSON.stringify(["bygg", "industri", "transport"]),
    triggerPatterns: JSON.stringify(["RECURRING_INCIDENT", "INSPECTION_TREND"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/forskrift/2011-12-06-1357",
  },
  {
    category: "FORSKRIFT",
    lawReference: "FORSKRIFT_KJEMIKALIER",
    title: "Forskrift om tiltaks- og grenseverdier – kjemisk eksponering",
    content:
      "Arbeidsgiver skal sørge for at arbeidstakere ikke utsettes for kjemisk eksponering over administrative normer. Alle kjemikalier skal ha oppdatert sikkerhetsdatablad og stoffkartotek.",
    summary: "Sikre at kjemikalieeksponering holdes under grenseverdier",
    applicableAreas: JSON.stringify(["kjemikalier", "risiko"]),
    industry: JSON.stringify(["industri", "renhold", "bygg"]),
    triggerPatterns: JSON.stringify(["RISK_ESCALATION"]),
    lastVerified: new Date(),
    sourceUrl: "https://lovdata.no/forskrift/2011-12-06-1358",
  },
  {
    category: "VEILEDNING",
    lawReference: "VEIL_VERNERUNDE",
    title: "Arbeidstilsynets veiledning om vernerunder",
    content:
      "Vernerunder bør gjennomføres minst en gang i halvåret, oftere i virksomheter med høy risiko. Alle avdekkte avvik bør dokumenteres med frist og ansvarlig for oppfølging.",
    summary: "Vernerunder minst halvårlig, dokumenter funn med frist og ansvarlig",
    applicableAreas: JSON.stringify(["vernerunde"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["INSPECTION_TREND"]),
    lastVerified: new Date(),
    sourceUrl: "https://www.arbeidstilsynet.no/hms/verneombud/vernerunder/",
  },
  {
    category: "VEILEDNING",
    lawReference: "VEIL_RISIKOVURDERING",
    title: "Arbeidstilsynets veiledning om risikovurdering",
    content:
      "Risikovurdering skal gjennomføres regelmessig og ved endringer i virksomheten. Den skal omfatte kartlegging av farer, vurdering av sannsynlighet og konsekvens, og forslag til risikoreduserende tiltak.",
    summary: "Gjennomfør risikovurdering regelmessig og ved endringer",
    applicableAreas: JSON.stringify(["risiko"]),
    industry: JSON.stringify(["alle"]),
    triggerPatterns: JSON.stringify(["RISK_ESCALATION"]),
    lastVerified: new Date(),
    sourceUrl: "https://www.arbeidstilsynet.no/hms/risikovurdering/",
  },
]

async function seedKnowledgeBase() {
  for (const entry of KNOWLEDGE_ENTRIES) {
    await prisma.hmsKnowledgeEntry.upsert({
      where: { lawReference: entry.lawReference },
      create: entry,
      update: {
        title: entry.title,
        content: entry.content,
        summary: entry.summary,
        applicableAreas: entry.applicableAreas,
        industry: entry.industry,
        triggerPatterns: entry.triggerPatterns,
        lastVerified: entry.lastVerified,
        sourceUrl: entry.sourceUrl,
      },
    })
  }
  console.log(`Seeded ${KNOWLEDGE_ENTRIES.length} knowledge entries`)
}

seedKnowledgeBase()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
