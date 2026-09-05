import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  ClipboardCheck,
  FileCheck,
  TrendingUp,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { FAQSection } from "@/components/faq-section";
import { TrustBadges } from "@/components/trust-badges";

export const metadata: Metadata = {
  title: "HMS-system - Komplett guide og oversikt | HMS Nova",
  description: "Alt du trenger å vite om HMS-systemer. Lær om risikovurdering, vernerunde, avvikshåndtering, digital signatur og ISO 9001. Komplett guide fra HMS Nova.",
  keywords: "hms-system, hms system norge, hms programvare, hms software, digitalt hms, hms løsning",
  openGraph: {
    title: "HMS-system - Komplett guide og oversikt",
    description: "Alt om HMS-systemer: Funksjoner, fordeler og hvordan velge riktig løsning for din bedrift.",
  },
};

// Content clusters - disse sidene skal lenke hit og tilbake
const HMS_SYSTEM_TOPICS = [
  {
    title: "Avvikshåndtering",
    description: "Registrer, følg opp og lær av avvik og hendelser.",
    details: "Ansatte melder avvik fra mobil eller PC. Systemet styrer hele behandlingsflyten: kategorisering, rotårsaksanalyse (5 Whys), korrigerende tiltak med frist og ansvarlig, og til slutt lukking med godkjenning. Alle involvert får varsler automatisk.",
    legalRef: "AML § 5-2 (varslingspliktige hendelser), IK-HMS § 5 punkt 7-8",
    icon: ClipboardCheck,
    href: "/hms-system/avvikshandtering",
    badge: "Essensielt",
  },
  {
    title: "Risikovurdering",
    description: "5x5-matrise med tiltaksoppfølging og revisjonshistorikk.",
    details: "Bygg risikovurderinger med innebygd 5x5-matrise. Velg bransjemal eller start fra scratch. For hvert risikoelement registreres sannsynlighet, konsekvens og tiltak. Systemet beregner risikoverdi, fargemarkerer og sender påminnelser om årlig revisjon.",
    legalRef: "AML § 3-1, IK-HMS § 5 punkt 6, ISO 9001:2015 kap. 6.1",
    icon: AlertTriangle,
    href: "/hms-system/risikovurdering",
    badge: "Kritisk",
  },
  {
    title: "Vernerunde",
    description: "Digital vernerunde fra mobil med sjekklister og automatisk oppfølging.",
    details: "Gjennomfør vernerunder med ferdige sjekklister tilpasset din bransje. Registrer funn med bilder direkte fra mobilen. Avvik som oppdages kan konverteres til hendelser med ett trykk. Rapport genereres automatisk for verneombudet og ledelsen.",
    legalRef: "AML § 6-2, Forskrift om organisering kap. 2",
    icon: Users,
    href: "/hms-system/vernerunde",
    badge: "Lovpålagt",
  },
  {
    title: "Dokumenthåndtering",
    description: "Alle HMS-dokumenter samlet med versjonskontroll og digital signatur.",
    details: "Last opp rutiner, prosedyrer og policyer. Systemet holder styr på versjoner, hvem som har lest hva, og sender påminnelse når dokumenter må oppdateres. Digital signatur er inkludert — ansatte signerer direkte i appen.",
    legalRef: "IK-HMS § 5 punkt 4-5",
    icon: FileText,
    href: "/hms-system/dokumenter",
    badge: "Organisering",
  },
  {
    title: "Digital signatur",
    description: "Elektronisk godkjenning av HMS-dokumenter uten ekstrakostnad.",
    details: "Alle ansatte kan signere HMS-dokumenter, rutiner og sjekklister digitalt. Signaturen er sporbar med tidsstempel og IP-adresse. Inkludert i prisen — ingen tilleggsavgift per signatur.",
    icon: FileCheck,
    href: "/hms-system/digital-signatur",
    badge: "Inkludert",
  },
  {
    title: "HMS-håndbok",
    description: "Ferdig håndbok tilpasset bedriften med automatisk oppdatering.",
    details: "Velg bransje så genererer systemet en komplett HMS-håndbok basert på gjeldende lovkrav. Bedriften kan tilpasse innhold, slå av seksjoner og legge til egne rutiner. Håndboken er alltid tilgjengelig digitalt for alle ansatte.",
    legalRef: "IK-HMS § 5 punkt 1-5",
    icon: BookOpen,
    href: "/hms-handbok",
    badge: "Inkludert",
  },
  {
    title: "Psykososialt arbeidsmiljø",
    description: "Kartlegg trivsel og arbeidsmiljø med anonyme pulsundersøkelser.",
    details: "Send ut korte, anonyme undersøkelser til ansatte med jevne mellomrom. Resultater vises aggregert per avdeling — ingen enkeltpersoner kan identifiseres. Trendrapporter viser utvikling over tid slik at ledelsen kan handle tidlig.",
    legalRef: "AML § 4-3 (psykososialt arbeidsmiljø), AML § 3-1",
    icon: BookOpen,
    href: "/hms-system/psykososialt-arbeidsmiljo",
    badge: "Lovpålagt",
  },
  {
    title: "Stoffkartotek og eksponeringsregister",
    description: "Sikkerhetsdatablad, kjemikalier og lovpålagt eksponeringslogg.",
    details: "Registrer alle kjemiske stoffer bedriften bruker med tilhørende sikkerhetsdatablad. Eksponeringsregisteret logger hvem som eksponeres for hva, varighet og målte verdier. Loven krever 60 års oppbevaring — HMS Nova håndterer dette automatisk.",
    legalRef: "AML § 4-5, Forskrift om utførelse av arbeid § 2-1 og kap. 31",
    icon: TrendingUp,
    href: "/hms-system/stoffkartotek",
    badge: "Lovpålagt",
  },
  {
    title: "Varsling (whistleblowing)",
    description: "Anonym varslingskanal for kritikkverdige forhold.",
    details: "Bedrifter med 5+ ansatte plikter å ha varslingsrutiner. HMS Nova tilbyr en anonym varslingsportal der ansatte kan melde fra uten å oppgi identitet. Saksbehandler kommuniserer med varsleren via kryptert kanal med sporingsnummer.",
    legalRef: "AML kap. 2A (§ 2A-1 til § 2A-7)",
    icon: Shield,
    href: "/hms-system/varsling",
    badge: "Lovpålagt",
  },
  {
    title: "SJA – Sikker Jobb Analyse",
    description: "Risikovurdering for enkeltoppgaver i felt.",
    details: "Før risikofylte oppgaver gjennomføres en SJA direkte fra mobilen. Beskriv oppgaven, identifiser farer, bestem tiltak og la alle involverte signere digitalt. SJA-en lagres som dokumentasjon — viktig ved tilsyn eller granskning.",
    legalRef: "Forskrift om utførelse av arbeid § 2-2, Byggherreforskriften § 19",
    icon: CheckCircle2,
    href: "/hms-system/sja",
    badge: "Operasjonelt",
  },
  {
    title: "Konsern-løsning",
    description: "HMS-portal for konsern med flere datterselskaper.",
    details: "Konsern-portalen gir ledelsen oversikt over HMS-status i alle selskaper. Distribuer rutiner og policyer sentralt, sammenlign HMS-score på tvers, og hent ut samlet rapportering. Hver bedrift har sitt eget miljø — konsernledelsen ser helheten.",
    icon: BookOpen,
    href: "/hms-system/konsern",
    badge: "Enterprise",
  },
  {
    title: "HR og personaladministrasjon",
    description: "Personalarkiv, onboarding, offboarding og opplæring.",
    details: "Komplett personalmodul med digitalt personalarkiv, sjekklister for onboarding av nye ansatte og offboarding ved avslutning. Hold oversikt over kompetanse, sertifikater og kurshistorikk. Automatiske påminnelser når sertifikater utløper eller opplæring forfaller.",
    legalRef: "AML § 4-2 (tilrettelegging), GDPR art. 5 og 9 (behandling av personaldata)",
    icon: Users,
    href: "/hms-system",
    badge: "HR",
  },
  {
    title: "ISO 9001-støtte",
    description: "Følger ISO 9001:2015 kravene — klargjort for revisjon.",
    details: "HMS Nova dekker kravene i ISO 9001:2015 for avvik (kap. 10.2), risiko (kap. 6.1), dokumentstyring (kap. 7.5) og revisjon. Revisjonsmodulen har ferdige sjekklister for alle 27 ISO-klausuler. Vi er ikke selv sertifisert, men gjør det enkelt for bedrifter å bli det.",
    icon: CheckCircle2,
    href: "/hms-system/iso-9001",
    badge: "Kvalitet",
  },
];

const faqs = [
  {
    question: "Hva er et HMS-system?",
    answer: `Et HMS-system er et digitalt verktøy for å organisere og systematisere helse, miljø og sikkerhet (HMS) i bedrifter. 
    HMS Nova er Norges mest moderne HMS-system som digitaliserer hele HMS-arbeidet - fra risikovurdering til hendelsesrapportering.
    Systemet sikrer at bedriften oppfyller lovkrav i Arbeidsmiljøloven og Internkontrollforskriften.`,
  },
  {
    question: "Hvorfor trenger bedrifter et HMS-system?",
    answer: `Alle norske arbeidsgivere er pålagt å ha systematisk HMS-arbeid (internkontroll). 
    Et digitalt HMS-system gjør dette enkelt ved å:
    • Strukturere HMS-arbeidet
    • Automatisere påminnelser
    • Sikre dokumentasjon
    • Spare tid (10+ timer/uke)
    • Redusere risiko for bøter fra Arbeidstilsynet`,
  },
  {
    question: "Hva koster et HMS-system?",
    answer: `HMS Nova koster 300 kr/mnd + mva (3 600 kr/år + mva) med 12 måneders binding. 
    Ubegrenset antall brukere inkludert. Digital signatur, mobilapp og alle funksjoner er inkludert i prisen. 
    Ingen oppstartskostnader eller skjulte avgifter.`,
  },
  {
    question: "Hva er forskjellen på HMS Nova og konkurrentene?",
    answer: `HMS Nova skiller seg ut ved å være:
    • 100% digitalt og moderne (ikke legacy-system)
    • Betydelig billigere (300 kr/mnd + mva vs 500-1200 kr/mnd hos konkurrentene)
    • Ingen skjult ekstrakostnader for digital signatur
    • Forutsigbar prismodell med 12 måneders binding
    • Mobilapp med offline-støtte
    • Norsk kundeservice`,
  },
];

export default function HMSSystemPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-4" variant="secondary">
          Pillar Guide
        </Badge>
        <h1 className="text-5xl font-bold mb-6">
          HMS-system: Komplett guide
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          Alt du trenger å vite om HMS-systemer. Fra risikovurdering til ISO 9001-støtte.
          Lær hvordan HMS Nova bygger trygghet i norske bedrifter.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/registrer-bedrift">
              Registrer bedrift
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/priser">
              Se priser
            </Link>
          </Button>
        </div>
      </section>

      {/* Intro Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 prose prose-lg max-w-none">
              <h2 className="text-2xl font-bold mb-4">Hva er et HMS-system?</h2>
              <p>
                Et <strong>HMS-system</strong> er en digital plattform som hjelper bedrifter med å:
              </p>
              <ul>
                <li>Oppfylle lovkrav i Arbeidsmiljøloven og Internkontrollforskriften</li>
                <li>Systematisere HMS-arbeid (helse, miljø og sikkerhet)</li>
                <li>Forebygge ulykker og sykefravær</li>
                <li>Dokumentere alt HMS-arbeid på ett sted</li>
                <li>Spare tid på administrasjon (10+ timer per uke)</li>
              </ul>
              
              <p className="text-lg font-semibold text-primary mt-6">
                HMS Nova bygger trygghet ved å digitalisere hele HMS-arbeidet - fra små bedrifter til store konsern.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Funksjoner med utfyllende innhold */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Alle funksjoner i HMS Nova
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            HMS Nova dekker alle lovpålagte HMS-krav og gir deg verktøyene du trenger for systematisk HMS-arbeid.
          </p>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          {HMS_SYSTEM_TOPICS.map((topic) => (
            <Card key={topic.href} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <topic.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <CardTitle className="text-lg">{topic.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">{topic.badge}</Badge>
                  </div>
                  <CardDescription className="text-sm">{topic.description}</CardDescription>
                  {topic.details && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{topic.details}</p>
                  )}
                  {topic.legalRef && (
                    <p className="text-xs text-muted-foreground/70 mt-2 italic">{topic.legalRef}</p>
                  )}
                </div>
                <Button asChild variant="ghost" size="sm" className="flex-shrink-0">
                  <Link href={topic.href}>
                    Les mer <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Lovkrav-oversikt */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Hvilke lovkrav dekker HMS Nova?
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Norske bedrifter har en rekke HMS-plikter. Her er en oversikt over de viktigste lovkravene og hvordan HMS Nova hjelper deg å oppfylle dem.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Arbeidsmiljøloven (AML)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p><strong>§ 3-1</strong> — Systematisk HMS-arbeid (internkontroll)</p>
                <p><strong>§ 4-3</strong> — Psykososialt arbeidsmiljø</p>
                <p><strong>§ 4-5</strong> — Kjemisk og biologisk helsefare</p>
                <p><strong>§ 5-1 til § 5-3</strong> — Registrering av skader og sykdom</p>
                <p><strong>Kap. 2A</strong> — Varsling av kritikkverdige forhold</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Internkontrollforskriften (IK-HMS)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p><strong>§ 5, punkt 6</strong> — Kartlegge farer og vurdere risiko</p>
                <p><strong>§ 5, punkt 7</strong> — Iverksette tiltak for å redusere risiko</p>
                <p><strong>§ 5, punkt 8</strong> — Avvikshåndtering og korrigerende tiltak</p>
                <p>HMS Nova dokumenterer alle disse punktene automatisk.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">ISO-standarder</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p><strong>ISO 9001:2015</strong> — Kvalitetsstyring (kap. 10.2 avvik)</p>
                <p><strong>ISO 45001:2018</strong> — Arbeidsmiljøstyring</p>
                <p><strong>ISO 14001:2015</strong> — Miljøstyring</p>
                <p>HMS Nova følger disse kravene og klargjør deg for revisjon.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Øvrige forskrifter</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p><strong>Forskrift om utførelse av arbeid</strong> — Stoffkartotek og eksponeringsregister</p>
                <p><strong>Forskrift om tiltaksverdier</strong> — Grenseverdier for eksponering</p>
                <p><strong>Byggherreforskriften</strong> — SJA på bygg og anlegg</p>
                <p><strong>GDPR / Personopplysningsloven</strong> — Personvern i HMS-data</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="container mx-auto px-4 py-12">
        <TrustBadges variant="default" />
      </section>

      {/* FAQ */}
      <FAQSection 
        faqs={faqs}
        title="Ofte stilte spørsmål om HMS-systemer"
        description="Svar på de vanligste spørsmålene om HMS-systemer"
      />

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Klar til å digitalisere HMS-arbeidet?
            </h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Registrer bedrift. Se hvordan et moderne HMS-system 
              kan transformere din bedrift.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-gray-100">
                <Link href="/registrer-bedrift">
                  Registrer bedrift
                </Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                className="border-2 border-white text-white hover:bg-white/10"
              >
                <Link href="/priser">
                  Se priser
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
