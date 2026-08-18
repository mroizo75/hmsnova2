import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/scroll-reveal";
import { RegisterDialog } from "@/components/register-dialog";
import { TrustBadges } from "@/components/trust-badges";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Scale,
  Lightbulb,
  XCircle,
  Sparkles,
  BarChart3,
  Clock,
  Brain,
  Smartphone,
  BookOpen,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  Flame,
  ListChecks,
  Target,
  FileText,
  Settings,
  LayoutDashboard,
  Users,
  TrendingUp,
  MonitorSmartphone,
} from "lucide-react";
import {
  getBransjeBySlug,
  getAllBransjeSlugs,
  MODULE_DESCRIPTIONS,
  BRANSJE_PUBLIC_DATA,
} from "@/lib/bransje-public-data";
import { BASE_SIMPLE_MODULES } from "@/lib/bransje-modules";
import {
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
  getBreadcrumbSchema,
  ROBOTS_CONFIG,
} from "@/lib/seo-config";
import { MultipleStructuredData } from "@/components/seo/structured-data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const BASE_MODULE_ICONS: Record<string, any> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/hms-handbok": BookOpen,
  "/dashboard/incidents": AlertCircle,
  "/dashboard/risks": Target,
  "/dashboard/rutiner": FileText,
  "/dashboard/inspections": ShieldCheck,
  "/dashboard/training": GraduationCap,
  "/dashboard/fire-drills": Flame,
  "/dashboard/annual-hms-plan": ListChecks,
  "/dashboard/settings": Settings,
};

// ── Smertepunkter per bransje ──────────────────────────────────────────────
const PAIN_POINTS: Record<string, { problem: string; agitate: string }[]> = {
  "bygg-og-anlegg": [
    { problem: "SJA-er og avvik skrives for hånd på papir", agitate: "Dokumentasjonen forsvinner i brakkeriggen. Ved tilsynsbesøk mangler sporbarhet, og du risikerer overtredelsesgebyr." },
    { problem: "HMS-håndboken ligger i en perm på kontoret", agitate: "Ingen på byggeplassen vet hva som står der. Endringer etter avvik dokumenteres ikke, og Arbeidstilsynet ser ingen forbedring." },
    { problem: "Underentreprenører leverer ikke HMS-dokumentasjon", agitate: "Du har ansvaret, men mangler oversikt over UE-enes avvik, SJA-er og kompetanse. Ett alvorlig uhell kan falle tilbake på deg som byggherre." },
    { problem: "Ingen vet om sertifikater er utløpt", agitate: "Stillasbyggeren jobber med utløpt sertifikat. Kranføreren mangler oppfriskning. Du oppdager det først når tilsynet banker på." },
  ],
  "elektro-og-energi": [
    { problem: "SJA for høyspenning gjøres muntlig", agitate: "Manglende dokumentasjon ved ulykke kan føre til personlig straffeansvar iht. FSE." },
    { problem: "Samsvarserklæringer mangler sporbarhet", agitate: "Ved reklamasjon har du ikke dokumentasjon på at arbeidet er utført iht. NEK 400." },
    { problem: "Sertifikater utløper uten varsel", agitate: "Fagbrev og autorisasjoner går ut uten at noen fanger det opp. Du risikerer å sende ukvalifiserte montører på jobb." },
    { problem: "HMS-håndboken er en statisk PDF", agitate: "Den reflekterer ikke endringer i forskrifter eller lærdom fra hendelser i felten." },
  ],
  "offshore-og-petroleum": [
    { problem: "SJA-er forsvinner i papirstabelen", agitate: "Offshoreinstallasjoner har hundrevis av SJA-er. Uten digital sporbarhet finner du ikke igjen dokumentasjonen ved granskning." },
    { problem: "Eksponeringsdata registreres manuelt", agitate: "Arbeidstakere eksponeres for kjemikalier uten at det logges systematisk. Ved yrkessykdom mangler dokumentasjon." },
    { problem: "Beredskapsplaner er utdaterte", agitate: "Varslingslister med feil nummer og gamle prosedyrer. Ved en reell hendelse kan forsinkelsen koste liv." },
    { problem: "Kompetanseoversikten er i Excel", agitate: "Ingen automatisk varsling når offshorekurs utløper. Du oppdager det ved heliportsjekk." },
  ],
  "maritim-og-sjofart": [
    { problem: "HMS-dokumentasjon er spredt over flere systemer", agitate: "ISM-koden krever samlet dokumentasjon. Ved PSC-inspeksjon bruker du timer på å lete frem papirer." },
    { problem: "Støyeksponering registreres ikke", agitate: "Maskinromsarbeidere eksponeres daglig for skadelig støy uten systematisk logging mot grenseverdier." },
    { problem: "Sertifikater følges opp manuelt", agitate: "Maritime sertifikater har strenge fornyelseskrav. Én utløpt sertifikat kan holde skipet i havn." },
    { problem: "Avvik rapporteres for sent", agitate: "Hendelser ombord rapporteres først i land, dager etter. Viktige detaljer glemmes og oppfølging forsinkes." },
  ],
  "olje-og-gass": [
    { problem: "MOC-dokumentasjon er uoversiktlig", agitate: "Endringer i prosessanlegg krever sporbar dokumentasjon. Uten system risikerer du avvik fra Petroleumstilsynet." },
    { problem: "Stoffkartotek er ikke oppdatert", agitate: "Utdaterte sikkerhetsdatablad betyr feil verneutstyr. En kjemikalieulykke med utdatert SDS kan gi alvorlige konsekvenser." },
    { problem: "Beredskapsøvelser dokumenteres i Word", agitate: "Evalueringer og forbedringstiltak forsvinner. Neste øvelse repeterer samme feil." },
    { problem: "Eksponeringsregisteret er ufullstendig", agitate: "Ved yrkessykdom 20 år senere har du ikke dokumentasjon på eksponeringsnivåer." },
  ],
  "fiskeri-og-havbruk": [
    { problem: "SJA for merdarbeid gjøres ikke", agitate: "Arbeid på merd er blant det farligste i Norge. Uten SJA øker risikoen for drukningsulykker." },
    { problem: "Avlusningskjemikalier mangler i stoffkartotek", agitate: "Arbeidstakere håndterer kjemikalier uten tilgang til sikkerhetsdatablad. Ved eksponering mangler førstehjelpsinfo." },
    { problem: "Maritime sertifikater følges opp i hodet", agitate: "Driftsleder husker hvem som har hva. Når han er borte, vet ingen hvem som har gyldige sertifikater." },
    { problem: "Hendelser rapporteres muntlig", agitate: "Nestenulykker på sjøen diskuteres i lunsjen, men dokumenteres aldri. Mønsteret gjentar seg." },
  ],
  "bergverk-og-gruvedrift": [
    { problem: "Sprengnings-SJA mangler digital sporbarhet", agitate: "Direktoratet for mineralforvaltning krever dokumenterte risikovurderinger. Papir-SJA er vanskelig å finne frem i ettertid." },
    { problem: "Støvmålinger registreres i regneark", agitate: "Kvartsstøveksponering akkumuleres over år. Uten systematisk logging kan du ikke dokumentere forsvarlig arbeidsmiljø." },
    { problem: "Vedlikeholdshistorikk forsvinner", agitate: "Borerigger og knusere har lovpålagt vedlikehold. Uten sporbarhet risikerer du driftsstans og tilsynsmerknader." },
    { problem: "HMS-håndbok reflekterer ikke virkeligheten", agitate: "Bergverket utvikler seg, men håndboken er den samme som for 5 år siden." },
  ],
  "helse-og-omsorg": [
    { problem: "Stikkskader rapporteres ikke systematisk", agitate: "Ansatte unnlater å melde fordi det er tungvint. Ved blodsmitte mangler dokumentasjon på hendelsesforløpet." },
    { problem: "Nattarbeidere mangler helseoppfølging", agitate: "AML § 10-11 krever helseundersøkelser for nattarbeidere. Uten system glipper oppfølgingen." },
    { problem: "Kjemikalieeksponering hos renholdere overses", agitate: "Daglig bruk av sterke rengjøringsmidler uten systematisk eksponeringsregistrering kan føre til yrkesrelatert astma." },
    { problem: "Psykososialt arbeidsmiljø følges ikke opp", agitate: "Høyt sykefravær og turnover, men ingen systematisk kartlegging av arbeidsmiljøet." },
  ],
  "utdanning": [
    { problem: "Brannøvelser dokumenteres i en kladdebok", agitate: "Branntilsynet krever dokumenterte øvelser med evaluering. Uten system mangler du sporbarhet." },
    { problem: "Laboratoriekjemikalier mangler i stoffkartotek", agitate: "Lærere bruker kjemikalier uten oppdaterte sikkerhetsdatablad. Ved uhell vet ingen hvilke tiltak som kreves." },
    { problem: "Avvik i skolemiljøet meldes ikke", agitate: "Opplæringslova § 9A krever at elevenes miljø ivaretas. Uten meldesystem dokumenteres ikke avvik." },
    { problem: "HMS-håndbok er en uåpnet perm", agitate: "Nye ansatte vet ikke hvor den er. Vikarer har aldri sett den. Ved tilsyn er det pinlig." },
  ],
  "hotell-og-restaurant": [
    { problem: "Temperaturlogg føres på papir eller glemmes", agitate: "Mattilsynet krever dokumentert temperaturkontroll. Manglende logg gir anmerkninger på smilefjesrapporten." },
    { problem: "Allergenoversikt er ufullstendig", agitate: "EU-forordning 1169/2011 krever allergeninformasjon. Feil info kan føre til alvorlige allergiske reaksjoner." },
    { problem: "Rengjøringskjemikalier mangler i stoffkartotek", agitate: "Kjøkkenpersonale bruker sterke midler daglig uten tilgang til sikkerhetsdatablad." },
    { problem: "Nattarbeid i restaurant følges ikke opp", agitate: "Ansatte i kvelds- og nattskift har krav på helseundersøkelse. Uten påminnelse glipper det." },
  ],
  "aktivitet-og-opplevelse": [
    { problem: "Aktivitetssikkerhetsvurdering gjøres ad hoc", agitate: "Forskrift om sikkerhet ved aktiviteter krever dokumenterte vurderinger. Uten system mangler du sporbarhet ved ulykke." },
    { problem: "Beredskapsplaner finnes bare på kontoret", agitate: "Turguiden er i fjellet når noe skjer. Uten mobilapp har hen ikke tilgang til nødprosedyrer." },
    { problem: "Guidekompetanse dokumenteres ikke", agitate: "Du vet ikke om alle guider har gyldig førstehjelp, breksertifikat eller turlederkurs." },
    { problem: "Hendelser rapporteres dagene etter", agitate: "Viktige detaljer glemmes. Forsikringsselskapet stiller spørsmål ved forsinkede rapporter." },
  ],
  "transport-og-logistikk": [
    { problem: "Kjøretøykontroll skjer på papir", agitate: "Sjåføren signerer en slitt lapp. Ved ulykke kan du ikke dokumentere at daglig sjekk er utført." },
    { problem: "ADR-sertifikater utløper uten varsel", agitate: "Sjåfører med utløpt ADR-sertifikat frakter farlig gods. Ved kontroll risikerer du kjøreforbud og bøter." },
    { problem: "Avvik fra sjåfører meldes ikke", agitate: "Hendelser på veien diskuteres muntlig. Ingen systematisk oppfølging av nestenulykker." },
    { problem: "Kjøre- og hviletid dokumenteres manuelt", agitate: "Statens vegvesen krever sporbar dokumentasjon. Manuell registrering er feilutsatt og tidkrevende." },
  ],
  "industri-og-produksjon": [
    { problem: "LOTO-prosedyrer er i papirform", agitate: "Ved vedlikeholdsstans mangler sporbarhet på hvem som har låst ut hva. Livstruende feil kan oppstå." },
    { problem: "Støyeksponering dokumenteres ikke", agitate: "Produksjonsarbeidere eksponeres daglig over 85 dB(A) uten systematisk logging. Hørselsskade utvikles over tid." },
    { problem: "Nye kjemikalier tas i bruk uten risikovurdering", agitate: "Innkjøp bestiller nytt rengjøringsmiddel. Ingen sjekker SDS eller vurderer eksponeringsrisiko." },
    { problem: "Vernerunder avdekker de samme feilene", agitate: "Tiltak opprettes, men følges ikke opp. Neste vernerunde finner identiske avvik." },
  ],
  "handel-og-service": [
    { problem: "Ran og trusler meldes ikke systematisk", agitate: "Ansatte opplever ubehagelige situasjoner, men det finnes ikke et enkelt meldesystem. Hendelsene usynliggjøres." },
    { problem: "Ergonomi ved kassen ignoreres", agitate: "Kassepersonale utvikler muskel- og skjelettplager. Uten dokumenterte vurderinger mangler grunnlag for tiltak." },
    { problem: "HMS-opplæring for deltidsansatte glipper", agitate: "Høy turnover betyr mange nyansatte. Uten system vet du ikke hvem som har gjennomført HMS-opplæring." },
    { problem: "Brannøvelse gjennomføres sjelden", agitate: "Butikken har ikke øvd brannrømming på to år. Ansatte vet ikke hvor slokkeutstyr er." },
  ],
  "landbruk": [
    { problem: "SJA for hogst gjøres ikke", agitate: "Skogsdrift er blant de farligste yrkene i Norge. Uten SJA øker risikoen for alvorlige ulykker." },
    { problem: "Plantevernmidler mangler i stoffkartotek", agitate: "Forskrift om plantevernmidler krever dokumentasjon. Uten oversikt risikerer du feil håndtering og helsefare." },
    { problem: "Sesongarbeidere får ikke HMS-opplæring", agitate: "Innleid arbeidskraft starter uten å kjenne risikofaktorer. Du har likevel arbeidsgiveransvaret." },
    { problem: "Alenearbeid dokumenteres ikke", agitate: "Forskriften krever risikovurdering ved alenearbeid. Bonden jobber alene daglig uten at dette er vurdert." },
  ],
  "teknologi-og-it": [
    { problem: "Ergonomi ved skjermarbeid ignoreres", agitate: "Forskrift om arbeid ved dataskjerm krever tilrettelegging. Utviklere med nakke- og ryggplager koster dyrt i sykefravær." },
    { problem: "Psykososialt arbeidsmiljø kartlegges ikke", agitate: "Stress, tidspress og konflikter bygger seg opp. Uten systematisk kartlegging eskalerer problemene." },
    { problem: "Brannøvelse nedprioriteres", agitate: "Kontorbygget har ikke øvd evakuering på over et år. Ingen vet hvor møteplass er." },
    { problem: "HMS-håndbok er et Google-dokument fra 2019", agitate: "Ingen har lest den. Den dekker ikke gjeldende lovkrav. Ved tilsyn blir det ubehagelig." },
  ],
  "annen-bransje": [
    { problem: "HMS-arbeidet er spredt i permer og Excel", agitate: "Avvik i én mappe, risikovurderinger i en annen, rutiner i en tredje. Ingen har oversikt." },
    { problem: "Ingen vet hvem som har lest rutinene", agitate: "Rutiner sendes på e-post, men du aner ikke om ansatte har lest og forstått dem." },
    { problem: "Vernerunder gir ingen varig endring", agitate: "Tiltak noteres, men oppfølging glipper. Samme avvik dukker opp igjen og igjen." },
    { problem: "Arbeidstilsynet spør etter dokumentasjon du ikke har", agitate: "Du vet at du gjør HMS-arbeid, men kan ikke bevise det. Manglende dokumentasjon er like ille som manglende arbeid." },
  ],
};

// ── Løsninger per bransje ──────────────────────────────────────────────────
const SOLUTIONS: Record<string, { title: string; description: string }[]> = {
  "bygg-og-anlegg": [
    { title: "Digital SJA fra mobilen", description: "Formannen oppretter SJA på 3 minutter rett fra byggeplassen. Farer, tiltak og godkjenning -- alt sporbart og tilgjengelig for tilsyn." },
    { title: "Levende HMS-håndbok", description: "Håndboken oppdateres automatisk når avvik avdekker svakheter. AI-motoren foreslår konkrete forbedringer, og alt versjonskontrolleres." },
    { title: "Alt på mobilen", description: "Avvik, vernerunder, SJA og signering fungerer fra lomma. Ingen PC nødvendig på byggeplassen." },
    { title: "Automatiske varsler", description: "HMS-ansvarlig får varsel når avvik opprettes, årsaksanalyse fullføres eller sertifikater utløper. Ingenting faller mellom to stoler." },
  ],
  "elektro-og-energi": [
    { title: "SJA tilpasset elektrisk arbeid", description: "Ferdigmaler for høyspenning, lavspenning og AUS-arbeid med automatisk risikovurdering." },
    { title: "Digitale samsvarserklæringer", description: "Generer samsvarserklæringer iht. NEK 400 og FEL direkte fra systemet med full sporbarhet." },
    { title: "Sertifikatvarsler", description: "Automatisk varsling når autorisasjoner og fagbrev nærmer seg utløpsdato." },
    { title: "Levende HMS-håndbok", description: "HMS-håndboken oppdateres når nye forskrifter trer i kraft eller hendelser avdekker forbedringsområder." },
  ],
  "offshore-og-petroleum": [
    { title: "Digital SJA for offshore", description: "Opprett SJA på mobil eller nettbrett offshore. Farer, barrierer og godkjenninger dokumenteres digitalt." },
    { title: "Komplett eksponeringsregister", description: "Registrer eksponering for kjemikalier og fysiske faktorer. Systemet varsler ved grenseverdier." },
    { title: "Beredskapssystem", description: "Oppdaterte varslingslister, beredskapsplaner og øvelsesdokumentasjon -- alltid tilgjengelig." },
    { title: "Sporbarhet for Ptil", description: "Komplett endringslogg og rapporter som tilfredsstiller Petroleumstilsynets krav." },
  ],
  "maritim-og-sjofart": [
    { title: "Alt samlet på ett sted", description: "SJA, stoffkartotek, avvik og kompetanseoversikt i samme system. Klar for PSC-inspeksjon." },
    { title: "Eksponeringsregistrering", description: "Støy, vibrasjoner og kjemisk eksponering logges systematisk mot grenseverdier." },
    { title: "Automatisk sertifikatvarsling", description: "Systemet varsler når maritime sertifikater nærmer seg utløp -- i god tid." },
    { title: "Mobil avviksrapportering", description: "Rapporter hendelser direkte fra skipet mens detaljene er ferske." },
  ],
  "olje-og-gass": [
    { title: "Sporbar endringskontroll", description: "Alle endringer i prosessanlegg dokumenteres med risikovurdering og godkjenningsprosess." },
    { title: "Alltid oppdatert stoffkartotek", description: "Sikkerhetsdatablad oppdateres og knyttes til eksponeringsvurderinger automatisk." },
    { title: "Digital beredskapsdokumentasjon", description: "Øvelser dokumenteres med deltakerliste, evaluering og forbedringstiltak som følges opp." },
    { title: "Komplett eksponeringsregister", description: "Full historikk over kjemisk eksponering for alle arbeidstakere -- sporbart i tiår." },
  ],
  "fiskeri-og-havbruk": [
    { title: "SJA for merd og fartøy", description: "Digitale SJA-maler tilpasset dykking, notskifte og merdarbeid. Godkjenning på mobil." },
    { title: "Kjemikalieoversikt", description: "Alle avlusnings- og behandlingskjemikalier med oppdaterte sikkerhetsdatablad." },
    { title: "Sertifikatstyring", description: "Full oversikt over maritime sertifikater med automatisk varsling ved utløp." },
    { title: "Mobil hendelsesrapportering", description: "Rapporter avvik og nestenulykker direkte fra båt eller merd -- med bilde og GPS." },
  ],
  "bergverk-og-gruvedrift": [
    { title: "Digital SJA for sprengning", description: "Risikovurdering med sikkerhetssoner, varslingsprosedyre og evakueringsplan -- sporbart og godkjent digitalt." },
    { title: "Eksponeringsregister for støv", description: "Systematisk logging av kvartsstøveksponering mot grenseverdier med automatiske varsler." },
    { title: "Vedlikeholdslogg", description: "Digital vedlikeholdshistorikk for borerigger, knusere og annet tungt utstyr." },
    { title: "Levende HMS-håndbok", description: "Håndboken oppdateres basert på avvik og nye risikovurderinger. Alltid oppdatert for tilsyn." },
  ],
  "helse-og-omsorg": [
    { title: "Enkel hendelsesrapportering", description: "Stikkskader, vold og trusler meldes på mobilen på under 2 minutter. HMS-ansvarlig varsles automatisk." },
    { title: "BHT-oppfølging for nattarbeid", description: "Automatisk innkalling til helseundersøkelse for ansatte i turnus iht. AML § 10-11." },
    { title: "Eksponeringsregister", description: "Systematisk registrering av eksponering for biologiske og kjemiske faktorer." },
    { title: "Psykososialt arbeidsmiljø", description: "Verktøy for kartlegging, oppfølging og dokumentasjon av det psykososiale arbeidsmiljøet." },
  ],
  "utdanning": [
    { title: "Digital brannøvelsesdokumentasjon", description: "Planlegg, gjennomfør og evaluer brannøvelser. Evakueringstid, observasjoner og tiltak -- alt dokumentert." },
    { title: "Stoffkartotek for lab og verksted", description: "Alle kjemikalier med oppdaterte sikkerhetsdatablad. Lærere ser riktig verneutstyr for hvert forsøk." },
    { title: "Enkel avviksmelding", description: "Ansatte melder avvik i skolemiljøet på 2 minutter via mobil. Tiltak opprettes automatisk." },
    { title: "HMS-håndbok for skolen", description: "Ferdig mal tilpasset utdanningssektoren. Signering og versjonskontroll inkludert." },
  ],
  "hotell-og-restaurant": [
    { title: "Digital temperaturlogg", description: "Registrer temperatur i kjølerom og frysere via mobil. Avvik flagges automatisk med tiltak." },
    { title: "Komplett allergenoversikt", description: "Alle 14 EU-allergener per rett. Tilgjengelig for servitører på mobil i sanntid." },
    { title: "Stoffkartotek for kjøkken", description: "Rengjøringsmidler og kjemikalier med sikkerhetsdatablad -- alltid oppdatert." },
    { title: "BHT for nattarbeid", description: "Automatisk oppfølging av helseundersøkelser for ansatte i kvelds- og nattskift." },
  ],
  "aktivitet-og-opplevelse": [
    { title: "Aktivitetssikkerhetsvurdering", description: "Dokumenterte sikkerhetsvurderinger for alle aktiviteter iht. forskriften. Sporbart for DSB." },
    { title: "Beredskapsplan på mobil", description: "Turguiden har nødnumre, førstehjelp og evakueringsruter tilgjengelig offline i lomma." },
    { title: "Kompetansematrise", description: "Full oversikt over guidekompetanse, sertifikater og kurs med automatiske påminnelser." },
    { title: "Mobil hendelsesrapportering", description: "Rapporter hendelser fra fjellet, vannet eller parken -- med bilde og posisjon." },
  ],
  "transport-og-logistikk": [
    { title: "Digital kjøretøykontroll", description: "Sjåfør gjennomfører dagskontroll på mobil med sjekkliste. Mangler rapporteres automatisk til verksted." },
    { title: "Sertifikatvarsler", description: "Automatisk varsling når ADR, yrkessjåførbevis eller andre sertifikater nærmer seg utløp." },
    { title: "Mobil avviksrapportering", description: "Sjåfør melder hendelser underveis via mobil. HMS-ansvarlig varsles i sanntid." },
    { title: "SJA for spesialtransport", description: "Risikovurdering for farlig gods og spesialtransporter med digital godkjenning." },
  ],
  "industri-og-produksjon": [
    { title: "Digital LOTO-dokumentasjon", description: "Sporbar Lock-Out/Tag-Out med hvem som har låst ut hva, når og hvorfor." },
    { title: "Eksponeringsregister for støy", description: "Daglig støyeksponering logges mot 85 dB(A) grenseverdi. Akkumulert dose beregnes automatisk." },
    { title: "Stoffkartotek med SDS", description: "Alle kjemikalier med oppdaterte sikkerhetsdatablad. Risikovurdering gjøres før ny kjemikalie tas i bruk." },
    { title: "Tiltaksoppfølging fra vernerunder", description: "Tiltak fra vernerunder tildeles ansvarlig med frist og automatisk purring." },
  ],
  "handel-og-service": [
    { title: "Enkel hendelsesrapportering", description: "Ansatte melder ran, trusler og hendelser på mobilen. HMS-ansvarlig varsles automatisk." },
    { title: "Ergonomisk sjekkliste", description: "Digital vernerunde for kassearbeidsplasser med sjekkliste for ergonomi og belysning." },
    { title: "Automatisk onboarding", description: "Nyansatte og vikarer får automatisk tildelt HMS-opplæring med frist og kvittering." },
    { title: "Brannøvelsesplan", description: "Planlegg og dokumenter brannøvelser for hver butikk med evaluering og oppfølging." },
  ],
  "landbruk": [
    { title: "SJA for skogsdrift", description: "Risikovurdering for hogst, sprøyting og maskinarbeid med sikkerhetssoner og verneutstyr." },
    { title: "Stoffkartotek for gården", description: "Plantevernmidler og gjødsel med sikkerhetsdatablad og krav til verneutstyr." },
    { title: "HMS-opplæring for sesongarbeidere", description: "Innleid arbeidskraft får automatisk tildelt opplæring og kvitterer digitalt før de starter." },
    { title: "Risikovurdering av alenearbeid", description: "Dokumenterte vurderinger av alenearbeid iht. forskriftskravene." },
  ],
  "teknologi-og-it": [
    { title: "Ergonomisk risikovurdering", description: "Digital sjekkliste for skjermarbeidsplasser med tiltak for belysning, stol og pulserende pauser." },
    { title: "Psykososialt arbeidsmiljø", description: "Systematisk kartlegging med spørreundersøkelser. Resultater kobles til HMS-håndbok og handlingsplan." },
    { title: "Brannøvelsesdokumentasjon", description: "Planlegg og dokumenter evakueringsøvelser med evakueringstid og evaluering." },
    { title: "Moderne HMS-håndbok", description: "Digital HMS-håndbok som dekker IK-HMS § 5 fullstendig. Signering og versjonskontroll inkludert." },
  ],
  "annen-bransje": [
    { title: "Alt på ett sted", description: "Avvik, risikovurderinger, rutiner, vernerunder og HMS-håndbok samlet i ett system." },
    { title: "Lesebekreftelse på rutiner", description: "Ansatte kvitterer digitalt for at de har lest og forstått rutiner og instrukser." },
    { title: "Tiltaksoppfølging", description: "Tiltak fra vernerunder tildeles ansvarlig med frist. Automatisk purring ved oversittelse." },
    { title: "Dokumentasjon for tilsyn", description: "Alt er sporbart og klart til fremvisning. Generer rapporter med ett klikk." },
  ],
};

// ── Hero-tekster per bransje ───────────────────────────────────────────────
const HERO_HEADLINES: Record<string, { headline: string; subline: string }> = {
  "bygg-og-anlegg": {
    headline: "Slutt på papir-SJA og HMS-permer på byggeplassen",
    subline: "HMS Nova gir deg digital SJA, levende HMS-håndbok og full sporbarhet -- rett fra mobilen på byggeplassen. Klar for tilsyn til enhver tid.",
  },
  "elektro-og-energi": {
    headline: "HMS og samsvar for elektrobransjen -- på ett sted",
    subline: "SJA for strømførende arbeid, samsvarserklæringer iht. NEK 400, og kompetanseoversikt med sertifikatvarsler.",
  },
  "offshore-og-petroleum": {
    headline: "HMS-system som tåler offshorekrav",
    subline: "SJA, eksponeringsregister, beredskapsplaner og full sporbarhet for Petroleumstilsynet -- tilgjengelig på og offshore.",
  },
  "maritim-og-sjofart": {
    headline: "HMS for skipsfart og verft -- samlet og sporbart",
    subline: "SJA for ombordarbeid, eksponeringsregister for støy og kjemikalier, og kompetansestyring som holder skipet seilende.",
  },
  "olje-og-gass": {
    headline: "Storulykkeberedskap og HMS i ett system",
    subline: "Komplett HMS for raffinerier og prosessanlegg. SJA, stoffkartotek, eksponeringsregister og sporbarhet for Ptil og DSB.",
  },
  "fiskeri-og-havbruk": {
    headline: "Tryggere arbeid på merd og fartøy",
    subline: "Digital SJA for merdarbeid, stoffkartotek for behandlingskjemikalier, og sertifikatoversikt -- tilgjengelig fra båt og kai.",
  },
  "bergverk-og-gruvedrift": {
    headline: "HMS-system for sprengning, boring og knusing",
    subline: "SJA med digital sporbarhet, eksponeringsregister for kvartsstøv, og dokumentasjon som tilfredsstiller Direktoratet for mineralforvaltning.",
  },
  "helse-og-omsorg": {
    headline: "HMS tilpasset helsesektorens hverdag",
    subline: "Enkel hendelsesrapportering, BHT-oppfølging for nattarbeid, eksponeringsregister og psykososialt arbeidsmiljø -- alt i ett.",
  },
  "utdanning": {
    headline: "Enkel HMS for skoler og barnehager",
    subline: "Brannøvelsesdokumentasjon, stoffkartotek for lab, avviksmelding og HMS-håndbok -- uten unødvendig kompleksitet.",
  },
  "hotell-og-restaurant": {
    headline: "IK-mat, HACCP og HMS samlet for serveringsbransjen",
    subline: "Temperaturlogg, allergenoversikt, stoffkartotek og BHT-oppfølging -- alt Mattilsynet og Arbeidstilsynet forventer.",
  },
  "aktivitet-og-opplevelse": {
    headline: "Sikkerhet for opplevelser og guidede turer",
    subline: "Aktivitetssikkerhetsvurdering, beredskapsplan på mobil, kompetansematrise og hendelsesrapportering fra felten.",
  },
  "transport-og-logistikk": {
    headline: "HMS for sjåfører, verksted og terminal",
    subline: "Digital kjøretøykontroll, SJA for farlig gods, sertifikatvarsler og mobil avviksrapportering -- rett fra førersetet.",
  },
  "industri-og-produksjon": {
    headline: "HMS-system for fabrikk og produksjonsanlegg",
    subline: "LOTO-dokumentasjon, eksponeringsregister for støy og kjemikalier, SJA for vedlikeholdsstans og digital vernerunde.",
  },
  "handel-og-service": {
    headline: "Enkel HMS for butikk og service",
    subline: "Hendelsesrapportering, ergonomiske sjekklister, automatisk onboarding og brannøvelser -- tilpasset handelsnæringen.",
  },
  "landbruk": {
    headline: "HMS for gård, skog og sesongarbeid",
    subline: "SJA for hogst og sprøyting, stoffkartotek for plantevernmidler, og HMS-opplæring for sesongarbeidere.",
  },
  "teknologi-og-it": {
    headline: "HMS for kontor og teknologibedrifter",
    subline: "Ergonomi, psykososialt arbeidsmiljø, brannøvelser og HMS-håndbok -- uten unødvendig kompleksitet for kontorvirksomheter.",
  },
  "annen-bransje": {
    headline: "HMS-system som tilpasses din bransje",
    subline: "Avvik, risikovurderinger, rutiner, vernerunder og HMS-håndbok -- alt samlet i ett system. Klar på 15 minutter.",
  },
};

// ── Mockup-bilder per bransje ──────────────────────────────────────────────
const MOCKUP_IMAGES: Record<string, string> = {
  "bygg-og-anlegg": "/images/mockups/dashboard-bygg.png",
};

export async function generateStaticParams() {
  return getAllBransjeSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const bransje = getBransjeBySlug(slug);
  if (!bransje) return {};

  const title = `HMS-system for ${bransje.label} | HMS Nova`;
  const description = bransje.heroDescription;

  return {
    title,
    description,
    keywords: `hms system ${bransje.label.toLowerCase()}, hms ${bransje.slug}, internkontroll ${bransje.label.toLowerCase()}, hms-system ${bransje.label.toLowerCase()}, avvik ${bransje.label.toLowerCase()}, risikovurdering ${bransje.label.toLowerCase()}`,
    alternates: { canonical: getCanonicalUrl(`/bransjer/${slug}`) },
    robots: ROBOTS_CONFIG,
    openGraph: getOpenGraphDefaults(title, description, `/bransjer/${slug}`),
    twitter: getTwitterDefaults(title, description),
  };
}

export default async function BransjeSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const bransje = getBransjeBySlug(slug);
  if (!bransje) notFound();

  const Icon = bransje.icon;
  const painPoints = PAIN_POINTS[slug] ?? [];
  const solutions = SOLUTIONS[slug] ?? [];
  const heroContent = HERO_HEADLINES[slug] ?? {
    headline: bransje.heroTitle,
    subline: bransje.heroDescription,
  };
  const mockupSrc = MOCKUP_IMAGES[slug] ?? "/images/mockups/dashboard.png";

  const extraModules = bransje.extraModulePaths
    .map((path) => MODULE_DESCRIPTIONS[path])
    .filter(Boolean);

  const baseModules = BASE_SIMPLE_MODULES
    .filter((path) => path !== "/dashboard" && path !== "/dashboard/settings")
    .map((path) => ({
      ...MODULE_DESCRIPTIONS[path],
      icon: BASE_MODULE_ICONS[path] ?? MODULE_DESCRIPTIONS[path]?.icon,
    }))
    .filter(Boolean);

  const relatedBransjer = BRANSJE_PUBLIC_DATA
    .filter((b) => b.key !== bransje.key && b.key !== "other")
    .slice(0, 4);

  const structuredData = [
    getBreadcrumbSchema([
      { name: "Hjem", url: "/" },
      { name: "Bransjer", url: "/bransjer" },
      { name: bransje.label, url: `/bransjer/${slug}` },
    ]),
  ];

  return (
    <>
      <MultipleStructuredData dataArray={structuredData} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* ── Breadcrumb ── */}
        <div className="container mx-auto px-4 pt-8">
          <Link
            href="/bransjer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Alle bransjer
          </Link>
        </div>

        {/* ══════════════════════════════════════════════════
            SEKSJON 1: HERO -- Smertepunkt-først
        ══════════════════════════════════════════════════ */}
        <section className="container mx-auto px-4 pt-8 pb-16">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
                <Icon className="h-4 w-4 mr-2" />
                HMS for {bransje.label.toLowerCase()}
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-tight">
                {heroContent.headline}
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
                {heroContent.subline}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <RegisterDialog>
                  <Button size="lg" className="text-lg px-8 bg-green-700 hover:bg-green-800 text-white">
                    Start gratis i 14 dager
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </RegisterDialog>
                <Link href="/priser">
                  <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
                    Se priser
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Ingen kredittkort &middot; Full tilgang &middot; Fra 300 kr/mnd
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="mt-12">
              <TrustBadges variant="compact" />
            </div>
          </ScrollReveal>
        </section>

        {/* ══════════════════════════════════════════════════
            SEKSJON 2: PROBLEMET -- Smertepunkter
        ══════════════════════════════════════════════════ */}
        {painPoints.length > 0 && (
          <section className="bg-red-50/50 dark:bg-red-950/10 py-20 border-y border-red-100 dark:border-red-900/20">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <ScrollReveal>
                  <div className="text-center mb-12">
                    <Badge variant="outline" className="mb-4 border-red-200 text-red-700 dark:text-red-400">
                      Kjenner du deg igjen?
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                      Vanlige HMS-utfordringer i {bransje.label.toLowerCase()}
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                      Disse problemene ser vi hos bedrifter som fortsatt bruker papir, Excel eller utdaterte systemer.
                    </p>
                  </div>
                </ScrollReveal>

                <div className="grid md:grid-cols-2 gap-6">
                  {painPoints.map((pain, i) => (
                    <ScrollReveal key={i} delay={i * 100}>
                      <Card className="h-full border-red-100 dark:border-red-900/30 bg-white dark:bg-card">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-base mb-2">{pain.problem}</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed">{pain.agitate}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════
            SEKSJON 3: LØSNINGEN -- HMS Nova fikser dette
        ══════════════════════════════════════════════════ */}
        {solutions.length > 0 && (
          <section className="py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <ScrollReveal>
                  <div className="text-center mb-12">
                    <Badge variant="secondary" className="mb-4">
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Løsningen
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                      HMS Nova løser dette for {bransje.label.toLowerCase()}
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                      Alt du trenger for å oppfylle lovkravene og ha full kontroll -- på ett sted.
                    </p>
                  </div>
                </ScrollReveal>

                <div className="grid md:grid-cols-2 gap-6">
                  {solutions.map((sol, i) => (
                    <ScrollReveal key={i} delay={i * 100}>
                      <Card className="h-full border-green-100 dark:border-green-900/30 hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-base mb-2">{sol.title}</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed">{sol.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════
            SEKSJON 4: PRODUKT-SHOWCASE -- Mockup + USPer
        ══════════════════════════════════════════════════ */}
        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-12">
                  <Badge variant="outline" className="mb-4">
                    <MonitorSmartphone className="h-3.5 w-3.5 mr-1.5" />
                    Se produktet
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Slik ser HMS Nova ut for {bransje.label.toLowerCase()}
                  </h2>
                </div>
              </ScrollReveal>

              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <ScrollReveal direction="left">
                  <div className="relative rounded-xl overflow-hidden shadow-2xl border bg-white dark:bg-card">
                    <Image
                      src={mockupSrc}
                      alt={`HMS Nova dashboard tilpasset ${bransje.label.toLowerCase()}`}
                      width={1200}
                      height={675}
                      className="w-full h-auto"
                      priority
                    />
                  </div>
                </ScrollReveal>

                <ScrollReveal direction="right" delay={200}>
                  <div>
                    <h3 className="text-2xl font-bold mb-6">
                      Alt du trenger for {bransje.label.toLowerCase()}
                    </h3>
                    <ul className="space-y-4">
                      {bransje.usps.map((usp, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                          <span className="text-[15px]">{usp}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8">
                      <RegisterDialog>
                        <Button className="bg-green-700 hover:bg-green-800 text-white">
                          Prøv gratis i 14 dager
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </RegisterDialog>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            SEKSJON 5: BRANSJEMODULER -- Spesialtilpasset
        ══════════════════════════════════════════════════ */}
        {extraModules.length > 0 && (
          <section className="py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <ScrollReveal>
                  <div className="text-center mb-12">
                    <Badge variant="secondary" className="mb-4">
                      <Icon className="h-3.5 w-3.5 mr-1.5" />
                      Bransjetilpasset
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                      Spesialmoduler for {bransje.label.toLowerCase()}
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                      I tillegg til alle kjernefunksjoner får du disse modulene som er utviklet spesielt for din bransje.
                    </p>
                  </div>
                </ScrollReveal>

                <div className="grid md:grid-cols-2 gap-6">
                  {extraModules.map((mod, i) => {
                    const ModIcon = mod.icon;
                    return (
                      <ScrollReveal key={mod.path} delay={i * 100}>
                        <Card className="h-full border-primary/20 hover:shadow-md transition-shadow">
                          <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <ModIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{mod.name}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
                            </div>
                          </CardHeader>
                        </Card>
                      </ScrollReveal>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════
            SEKSJON 6: INTELLIGENT HMS -- AI-motoren
        ══════════════════════════════════════════════════ */}
        <section className="bg-gradient-to-br from-primary/5 to-primary/10 py-20 border-y">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-12">
                  <Badge variant="secondary" className="mb-4">
                    <Brain className="h-3.5 w-3.5 mr-1.5" />
                    Intelligent HMS
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    HMS Nova lærer av dine data
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Vår intelligensmotor analyserer avvik, risikoer og hendelser for å gi deg konkrete forslag til forbedring -- automatisk.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    icon: TrendingUp,
                    title: "Mønster i avviksdata",
                    description: "Systemet oppdager når flere avvik peker på samme rotårsak og foreslår endringer i rutiner eller HMS-håndbok.",
                  },
                  {
                    icon: BookOpen,
                    title: "HMS-håndbok som lever",
                    description: "Når AI-motoren foreslår en forbedring, kan du godkjenne den direkte. Håndboken oppdateres og ny versjon opprettes automatisk.",
                  },
                  {
                    icon: BarChart3,
                    title: "Rapport til tilsynet",
                    description: "Generer komplett endringslogg med alle forbedringer, godkjenninger og signeringer -- klar for Arbeidstilsynet.",
                  },
                ].map((feature, i) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <ScrollReveal key={i} delay={i * 100}>
                      <Card className="h-full text-center bg-white/80 dark:bg-card/80 backdrop-blur">
                        <CardContent className="p-6 pt-8">
                          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <FeatureIcon className="h-7 w-7 text-primary" />
                          </div>
                          <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                        </CardContent>
                      </Card>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            SEKSJON 7: BRUKSSCENARIOER -- I praksis
        ══════════════════════════════════════════════════ */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-12">
                  <Badge variant="outline" className="mb-4">
                    <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
                    I praksis
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Slik brukes HMS Nova i {bransje.label.toLowerCase()}
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Konkrete eksempler på hvordan HMS Nova forenkler hverdagen.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid md:grid-cols-3 gap-6">
                {bransje.scenarios.map((scenario, i) => (
                  <ScrollReveal key={i} delay={i * 100}>
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                          <span className="text-sm font-bold text-primary">{i + 1}</span>
                        </div>
                        <CardTitle className="text-base">{scenario.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {scenario.description}
                        </p>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            SEKSJON 8: LOVKRAV + PRIS-CTA
        ══════════════════════════════════════════════════ */}
        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3">
                  <ScrollReveal>
                    <Badge variant="outline" className="mb-4">
                      <Scale className="h-3.5 w-3.5 mr-1.5" />
                      Lovkrav
                    </Badge>
                    <h2 className="text-3xl font-bold mb-4">
                      Relevante lover og forskrifter for {bransje.label.toLowerCase()}
                    </h2>
                    <p className="text-muted-foreground mb-8">
                      HMS Nova hjelper deg å oppfylle alle lovkrav. Systemet er bygd med norsk lov som utgangspunkt.
                    </p>
                  </ScrollReveal>

                  <div className="space-y-4">
                    {bransje.legalRefs.map((ref, i) => (
                      <ScrollReveal key={i} delay={i * 80}>
                        <Card>
                          <CardContent className="p-5">
                            <div className="flex items-start gap-3">
                              <Scale className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                              <div>
                                <p className="font-semibold text-sm">{ref.law}</p>
                                <p className="text-sm text-muted-foreground mt-1">{ref.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <ScrollReveal direction="right" delay={200}>
                    <Card className="border-2 border-primary/20 sticky top-8">
                      <CardContent className="p-8">
                        <div className="text-center">
                          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <Icon className="h-8 w-8 text-primary" />
                          </div>
                          <h3 className="text-2xl font-bold mb-2">Klar for bedre HMS?</h3>
                          <p className="text-muted-foreground mb-6 text-sm">
                            Start gratis i 14 dager med alle funksjoner tilpasset {bransje.label.toLowerCase()}.
                          </p>
                          <div className="p-4 bg-muted rounded-lg mb-6">
                            <div className="text-3xl font-bold">Fra 300 kr/mnd</div>
                            <div className="text-sm text-muted-foreground mt-1">Alt inkludert, ubegrenset brukere</div>
                          </div>
                          <RegisterDialog>
                            <Button size="lg" className="w-full bg-green-700 hover:bg-green-800 text-white">
                              Start gratis prøveperiode
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                          </RegisterDialog>
                          <p className="text-xs text-muted-foreground mt-3">
                            Ingen kredittkort nødvendig
                          </p>

                          <div className="mt-6 pt-6 border-t text-left space-y-3">
                            {[
                              { icon: Clock, text: "Satt opp på 15 minutter" },
                              { icon: Smartphone, text: "Fungerer på mobil og nettbrett" },
                              { icon: Users, text: "Ubegrenset antall brukere" },
                              { icon: Brain, text: "Intelligent AI-motor inkludert" },
                            ].map((item, i) => {
                              const ItemIcon = item.icon;
                              return (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <ItemIcon className="h-4 w-4 text-primary shrink-0" />
                                  <span>{item.text}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            SEKSJON 9: KJERNEFUNKSJONER -- Alle bransjer
        ══════════════════════════════════════════════════ */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold mb-4">
                    Kjernefunksjoner inkludert i alle bransjer
                  </h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Disse funksjonene dekker grunnkravene i internkontrollforskriften og Arbeidsmiljøloven,
                    og er inkludert uansett bransje.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {baseModules.map((mod, i) => {
                  const ModIcon = mod.icon;
                  return (
                    <ScrollReveal key={mod.path} delay={i * 50}>
                      <Card className="hover:shadow-sm transition-shadow h-full">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                              <ModIcon className="h-4.5 w-4.5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{mod.shortName ?? mod.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{mod.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            SEKSJON 10: RELATERTE BRANSJER
        ══════════════════════════════════════════════════ */}
        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <h2 className="text-2xl font-bold mb-8 text-center">Se også HMS Nova for andre bransjer</h2>
              </ScrollReveal>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedBransjer.map((rel, i) => {
                  const RelIcon = rel.icon;
                  return (
                    <ScrollReveal key={rel.slug} delay={i * 80}>
                      <Link href={`/bransjer/${rel.slug}`}>
                        <Card className="h-full hover:shadow-md transition-shadow hover:border-primary/30">
                          <CardContent className="p-5 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <RelIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{rel.label}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{rel.description}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </ScrollReveal>
                  );
                })}
              </div>
              <div className="text-center mt-6">
                <Link href="/bransjer">
                  <Button variant="outline" className="bg-transparent">
                    Se alle bransjer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            SEKSJON 11: FINAL CTA
        ══════════════════════════════════════════════════ */}
        <section className="container mx-auto px-4 py-20">
          <ScrollReveal>
            <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
              <CardContent className="p-12 text-center">
                <Icon className="h-16 w-16 mx-auto mb-6 opacity-90" />
                <h2 className="text-3xl font-bold mb-4">
                  Klar for bedre HMS i {bransje.label.toLowerCase()}?
                </h2>
                <p className="text-lg mb-8 text-primary-foreground/90 max-w-xl mx-auto">
                  HMS Nova er tilpasset din bransje og klar til bruk på 15 minutter.
                  Alt inkludert fra 300 kr/mnd med ubegrenset antall brukere.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <RegisterDialog>
                    <Button size="lg" variant="secondary" className="text-lg px-8">
                      Start gratis prøveperiode
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </RegisterDialog>
                  <Link href="/hva-er-hms-nova">
                    <Button size="lg" variant="ghost" className="text-lg px-8 text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10">
                      Les mer om HMS Nova
                    </Button>
                  </Link>
                </div>
                <p className="text-sm mt-6 text-primary-foreground/70">
                  14 dagers gratis test &middot; Ingen kredittkort &middot; Norsk support
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        </section>
      </div>
    </>
  );
}
