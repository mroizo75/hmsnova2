"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import {
  Monitor,
  QrCode,
  Users,
  FileText,
  AlertTriangle,
  Shield,
  Building2,
  CheckCircle2,
  ArrowRight,
  Wifi,
  Cloud,
  Smartphone,
  LayoutGrid,
  Link as LinkIcon,
  ClipboardList,
  Thermometer,
  BarChart2,
  HardHat,
  ChevronDown,
  ChevronRight,
  Star,
  AlarmClock,
  BellRing,
  ClipboardCheck,
  Languages,
  Lock,
  MessageSquare,
  ShieldCheck,
  Timer,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { PLAN_PRICES, PLAN_LABELS } from "@/features/hms-tavle/lib/tavle-plan-limits";

/* ─── Steg-sekvens ─── */
const STEPS = [
  {
    nr: 1,
    icon: Building2,
    title: "Registrer bedriften",
    desc: "Opprett konto på 2 minutter med org.nr.-oppslag mot Brreg. Velg plan og prosjektvarighet.",
    color: "bg-blue-100 text-blue-700",
  },
  {
    nr: 2,
    icon: LayoutGrid,
    title: "Bygg tavlen din",
    desc: "Velg hvilke seksjoner som skal vises: SHA-plan, mannskap, avvik, beredskap, dokumenter og mer.",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    nr: 3,
    icon: QrCode,
    title: "Del QR-koden",
    desc: "Heng opp QR-koden på byggeplassen. Mannskapet skanner og ser tavlen direkte – uten innlogging.",
    color: "bg-violet-100 text-violet-700",
  },
  {
    nr: 4,
    icon: Monitor,
    title: "Kiosk på storskjerm",
    desc: "Koble til en skjerm i brakkeriggen. Tavlen roterer automatisk mellom seksjonene i fullskjerm.",
    color: "bg-purple-100 text-purple-700",
  },
  {
    nr: 5,
    icon: Users,
    title: "UE-portal for underentreprenører",
    desc: "UE-er sender avvik, RUH og SJA direkte via portalen – uten eget HMS-system.",
    color: "bg-fuchsia-100 text-fuchsia-700",
  },
];

/* ─── Seksjon-typer ─── */
const SECTION_TYPES = [
  { icon: Shield, label: "Kontaktinfo og beredskap", desc: "Verneombud, nødetater og ansvarlige" },
  { icon: FileText, label: "SHA-plan", desc: "Lenke og status for planen (Byggherreforskriften § 7)" },
  { icon: Users, label: "Oversiktsliste", desc: "QR-innsjekk med navn, fødselsdato, arbeidsgiver og HMS-kort (§ 15)" },
  { icon: AlertTriangle, label: "Avvik og RUH", desc: "Live-statistikk fra systemet" },
  { icon: ClipboardList, label: "SJA-oversikt", desc: "Aktive sikker jobb-analyser" },
  { icon: LinkIcon, label: "Dokumenthub", desc: "Excel, PDF, egne systemer" },
  { icon: Thermometer, label: "Lokal værvarsling", desc: "Værmelding fra MET Norway for byggeplassen" },
  { icon: HardHat, label: "Lovkrav-sjekkliste", desc: "SHA-plan (§ 7+8), forhåndsmelding (§ 10) og oversiktsliste (§ 15)" },
  { icon: BarChart2, label: "KPI-dashboard", desc: "Nøkkeltall og trender" },
  { icon: Cloud, label: "Beredskapsplan", desc: "Manuell eller hentet fra HMS Nova" },
];

/* ─── Bransjer ─── */
const BRANSJER = [
  { emoji: "🏗️", label: "Bygg og anlegg",       desc: "SHA-plan, elektronisk oversiktsliste og UE-portal for avvik og SJA" },
  { emoji: "🏨", label: "Hotell og overnatting",  desc: "Rom-QR, gjesteservice, beredskap og verneombud på ett sted" },
  { emoji: "🍽️", label: "Restaurant og servering", desc: "Bord-QR, gjestemeldinger og dokumentert avviksrutine for matsaker" },
  { emoji: "🎡", label: "Attraksjon og opplevelse", desc: "Gjestesikkerhet, sesongoppstart og hendelsesmelding" },
  { emoji: "✈️", label: "Turoperatør",            desc: "Reisehendelser etter pakkereiseloven og GDPR-protokoll" },
  { emoji: "🚌", label: "Turisttransport",        desc: "Avganger, kjøre- og hviletid og hendelser underveis" },
  { emoji: "🏢", label: "Eiendom og forvaltning", desc: "Driftsavvik, beredskap, kontaktinfo for eiendommer og bygg" },
  { emoji: "🏘️", label: "Borettslag og sameie",  desc: "HMS-informasjon, beredskapsplan og avvikshåndtering" },
  { emoji: "🏥", label: "Sykehus og helse",       desc: "Beredskapsrutiner, ansattoversikt, HMS-sjekklister" },
  { emoji: "🏫", label: "Skole og barnehage",     desc: "Brannrømmingsplan, kontaktpersoner, avviksmeldinger" },
  { emoji: "📦", label: "Lager og logistikk",     desc: "Sikkerhetsinstrukser, maskinlogg, verneombud og avvik" },
  { emoji: "🏭", label: "Industri og produksjon", desc: "Risikovurdering, eksponeringslogg, lovkrav IK-HMS" },
  { emoji: "🔧", label: "Verksted og service",    desc: "Sikker jobb-analyse, vernerunder og kjemikalieoversikt" },
  { emoji: "🛒", label: "Butikk og kjede",        desc: "HMS-informasjon for ansatte, beredskapsplan per butikk" },
];

/* ─── Gjesteservice for reiseliv: den lukkede sløyfen ─── */
const GJESTESERVICE_STEG = [
  {
    nr: 1,
    icon: QrCode,
    title: "Gjesten skanner QR på rommet",
    desc: "Hver QR er knyttet til rom, bord eller sted. Rommet er ferdig utfylt, så gjesten skriver bare meldingen.",
    color: "bg-blue-100 text-blue-700",
  },
  {
    nr: 2,
    icon: Languages,
    title: "Melder fra på eget språk",
    desc: "Skjemaet finnes på norsk og engelsk, med mulighet for bilder. Ingen app og ingen innlogging.",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    nr: 3,
    icon: BellRing,
    title: "Resepsjonen varsles på sekundet",
    desc: "Varsel i dashboard og på mobil. Kritiske saker som mistanke om matforgiftning utløser SMS.",
    color: "bg-violet-100 text-violet-700",
  },
  {
    nr: 4,
    icon: Timer,
    title: "Serviceløftet starter klokken",
    desc: "Hver sak får en svarfrist ut fra alvorlighet. Saker som ikke påbegynnes i tid eskaleres til ledelsen.",
    color: "bg-purple-100 text-purple-700",
  },
  {
    nr: 5,
    icon: ClipboardCheck,
    title: "Gjesten ser hva som ble gjort",
    desc: "På en privat lenke følger gjesten saken som en pakkesporing – helt til den er løst.",
    color: "bg-fuchsia-100 text-fuchsia-700",
  },
];

const GJESTESERVICE_FORDELER = [
  {
    icon: Lock,
    title: "Konfidensielt fra første sekund",
    desc: "Klager og avvik vises aldri offentlig. Tavlen viser kun anonymiserte tall, og gjesten ser bare sin egen sak.",
  },
  {
    icon: ShieldCheck,
    title: "Tillitspanel som beviser service",
    desc: "«47 tilbakemeldinger siste 30 dager – 44 løst – median svartid 38 min.» Tall, aldri saksinnhold.",
  },
  {
    icon: UtensilsCrossed,
    title: "Mat og allergi håndteres straks",
    desc: "Saker om mat og drikke settes automatisk til kritisk, med varsling og kort svarfrist. Gir den dokumenterte avviksrutinen IK-mat § 5 nr. 4 og 5 krever.",
  },
  {
    icon: AlarmClock,
    title: "Målbar responstid",
    desc: "Median svartid, åpne saker og saker forbi frist rett i driftsbildet. Dokumentasjon når tilsynet spør.",
  },
  {
    icon: Smartphone,
    title: "Alt fra mobilen",
    desc: "Gjesten melder fra mobilen, resepsjonen behandler fra mobilen. Ingen opplæring nødvendig.",
  },
  {
    icon: MessageSquare,
    title: "Lukket sløyfe, ikke en postkasse",
    desc: "Saken kan ikke avsluttes uten at det er skrevet hva som ble gjort. Gjesten får svaret på sitt språk.",
  },
];

const PERSONVERN_FLATER = [
  {
    title: "Offentlig tavle og kiosk",
    body: "HMS-informasjon virksomheten selv velger, «Meld fra»-QR og anonymiserte tall. Aldri saksinnhold, navn eller romnummer.",
    tone: "border-green-200 bg-green-50",
  },
  {
    title: "Gjestens private lenke",
    body: "Kun den ene saken lenken peker på: status, tidsstempler og hva som ble gjort. Ikke indeksert, ingen oversikt over andre saker.",
    tone: "border-blue-200 bg-blue-50",
  },
  {
    title: "Dashboard for ansatte",
    body: "Full sak for roller med tavle-tilgang, inkludert interne notater som aldri deles utad. Alle statusendringer logges.",
    tone: "border-slate-200 bg-white",
  },
];

/* ─── Hvem passer det for ─── */
const TARGETS = [
  { icon: Building2, title: "Totalentreprenører og BH", desc: "Dokumenter SHA-arbeidet etter Byggherreforskriften. En tavle per prosjekt." },
  { icon: HardHat, title: "Underentreprenører", desc: "Send inn avvik og SJA via portal – uten eget system." },
  { icon: Shield, title: "Verneombud og HMS-ledere", desc: "Full oversikt over status, avvik og mannskap i sanntid." },
  { icon: Smartphone, title: "Eksisterende HMS Nova-kunder", desc: "Aktiver som tilleggsmodul (kr 290/mnd). All data hentet live." },
];

/* ─── FAQ ─── */
const FAQ = [
  {
    q: "Trenger vi et HMS Nova-abonnement?",
    a: "Nei. Digital HMS Tavle kan kjøpes som et selvstendig produkt per lokasjon eller prosjekt. Eksisterende HMS Nova-kunder kan aktivere det som et tillegg.",
  },
  {
    q: "Fungerer det for andre bransjer enn bygg og anlegg?",
    a: "Ja. Tavlen brukes i dag av hoteller, restauranter, attraksjoner, turoperatører, turisttransport, eiendomsselskaper, borettslag, sykehus, skoler, barnehager, lager- og logistikkbedrifter, industri, verksteder og butikkjeder. Seksjonstekster og lovkrav-referanser tilpasses automatisk til valgt bransje.",
  },
  {
    q: "Hvilke lovkrav støttes?",
    a: "Tavlen er et verktøy for å vise og dokumentere HMS-informasjon – virksomheten er selv ansvarlig for at innholdet er korrekt og oppdatert. For bygg og anlegg: SHA-planen (Byggherreforskriften § 7 og § 8), forhåndsmeldingen som skal stå synlig på plassen (§ 10), elektronisk oversiktsliste med navn, fødselsdato, arbeidsgiver og HMS-kortnummer (§ 15 bokstav e) og informasjon til arbeidstakere og verneombud (§ 19). For hotell og reiseliv: en dokumentert avviksrutine etter internkontrollforskriften § 5 og IK-mat § 5 nr. 4 og 5, der ingen sak kan lukkes uten at det er skrevet hva som ble gjort. Personopplysninger behandles etter GDPR artikkel 5, 6 og 9. HACCP, temperaturkontroll og allergenoversikt ligger i IK-mat-modulen i HMS Nova, ikke i tavlen.",
  },
  {
    q: "Kan andre gjester se klagen min?",
    a: "Nei. Klager og avvik er alltid konfidensielle. Den offentlige tavlen viser kun anonymiserte tall, aldri saksinnhold, navn eller romnummer. Gjesten får en privat sporingslenke som bare viser egen sak, og lenken indekseres ikke av søkemotorer.",
  },
  {
    q: "Hva skjer hvis en gjest melder om matforgiftning?",
    a: "Saken settes automatisk til kritisk prioritet, resepsjonen får varsel i dashboard, push og SMS, og svarfristen er som standard én time. Slike saker er helseopplysninger etter GDPR artikkel 9 og vises aldri på tavlen.",
  },
  {
    q: "Må gjesten laste ned en app?",
    a: "Nei. Gjesten skanner QR-koden med mobilkameraet og melder fra i nettleseren. Ingen app og ingen innlogging.",
  },
  {
    q: "Hvilke språk støttes for gjesten?",
    a: "Meldingsskjema, kvittering, statusside og e-post finnes på norsk og engelsk. Svaret fra virksomheten sendes på det språket gjesten valgte.",
  },
  {
    q: "Hvor lenge lagres gjestmeldinger?",
    a: "Gjestmeldinger og vedlegg slettes automatisk etter 24 måneder, i tråd med GDPR artikkel 5 om lagringsbegrensning. Kontaktopplysninger brukes kun til å følge opp den aktuelle saken.",
  },
  {
    q: "Hva skjer med dataene etter prosjektet er ferdig?",
    a: "Dataene beholdes i 90 dager etter abonnementet utløper. Du kan eksportere alt som PDF eller CSV.",
  },
  {
    q: "Kan vi ha tavlen på flere lokasjoner?",
    a: "Standard-planen gir 3 tavler, Avansert gir ubegrenset. Enkel er for én lokasjon.",
  },
  {
    q: "Fungerer det på storskjerm/TV?",
    a: "Ja. Avansert-plan inkluderer kiosk-modus med automatisk rotasjon mellom seksjoner – optimalisert for store skjermer og velkomstskjermer.",
  },
  {
    q: "Kan vi bruke tavlen uten internett?",
    a: "Tavlen krever internettilgang for å hente live-data og værvarsling. Den kan vises på alle enheter med nettleser – PC, nettbrett, TV eller storskjerm.",
  },
];

/* ─── Prisplaner ─── */
const PLANS = [
  {
    key: "ENKEL",
    highlight: false,
    badge: null,
    features: [
      "1 digital tavle",
      "Kontaktinfo og beredskap",
      "SHA-plan lenke",
      "Dokumenthub (Excel, PDF)",
      "QR-tilgang for mannskap",
      "Offentlig tilgangslenke",
    ],
    missing: ["QR-innsjekk (§ 15)", "UE-portal", "Kiosk-modus"],
  },
  {
    key: "STANDARD",
    highlight: true,
    badge: "Mest populær",
    features: [
      "3 digitale tavler",
      "Alt i Enkel",
      "QR-innsjekk av mannskap (§ 15)",
      "UE-portal (avvik, RUH, SJA)",
      "UE melder avvik, RUH og SJA direkte",
      "Mannskapsliste live + avviksstatistikk",
      "Lokal værvarsling",
    ],
    missing: ["Kiosk-modus storskjerm", "KPI-dashboard"],
  },
  {
    key: "AVANSERT",
    highlight: false,
    badge: "Komplett",
    features: [
      "Ubegrenset antall tavler",
      "Alt i Standard",
      "Kiosk-modus (auto-rotasjon)",
      "Lovkrav-sjekkliste (§ 7+8, § 10, § 15)",
      "KPI-dashboard",
    ],
    missing: [],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button
        className="w-full text-left py-4 flex items-center justify-between gap-4 text-sm font-medium text-gray-900 hover:text-blue-700 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {q}
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
      </button>
      {open && <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>}
    </div>
  );
}

export default function DigitalHmsTavlePage() {
  return (
    <div className="bg-white">

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden min-h-[560px] md:min-h-[680px] flex items-center text-white">
        {/* Bakgrunnsbilde */}
        <Image
          src="/images/hms-tavle-hero.png"
          alt="Byggarbeider med HMS Tavle på nettbrett foran Oslo-skyline"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Mørk gradient over bildet for lesbarhet */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-blue-900/75 to-blue-900/30" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 sm:py-20 md:py-28 w-full">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-5">
              {["🏗️ Bygg", "🏨 Hotell", "🍽️ Servering", "🏥 Helse", "📦 Lager", "🏭 Industri", "🏫 Skole", "🛒 Butikk"].map((b) => (
                <Badge key={b} className="bg-blue-500/30 text-blue-100 border-blue-400/30 text-[11px] sm:text-xs">
                  {b}
                </Badge>
              ))}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold leading-tight mb-5 sm:mb-6 drop-shadow-lg">
              Digital HMS Tavle
              <br />
              <span className="text-blue-300">for alle bransjer</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-8 leading-relaxed drop-shadow">
              Én løsning for bygg og anlegg, hotell og reiseliv, sykehus, skoler, lager, industri og butikkjeder.
              Bygget på dokumentasjonskravene i Byggherreforskriften, internkontrollforskriften § 5 og
              arbeidsmiljøloven — ingen HMS Nova-abonnement nødvendig.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <Link href="/tavle-registrering" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-white text-blue-800 hover:bg-blue-50 font-semibold h-12 px-6 sm:px-8 shadow-lg">
                  Bestill nå – fra kr {PLAN_PRICES.ENKEL}/mnd
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#slik-virker-det" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/40 text-white bg-transparent hover:bg-white/10 h-12 px-6 sm:px-8">
                  Se hvordan det virker
                </Button>
              </a>
            </div>
            <a
              href="#gjesteservice"
              className="inline-flex items-center gap-2 mt-6 text-sm text-blue-200 hover:text-white transition-colors"
            >
              <QrCode className="h-4 w-4 shrink-0" />
              Nytt: gjesteservice med serviceløfte for hotell og reiseliv
              <ChevronRight className="h-4 w-4 shrink-0" />
            </a>
          </div>
        </div>
      </section>

      {/* ═══ LOVKRAV-BANNER ═══ */}
      <section className="bg-blue-50 border-y border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6 text-xs sm:text-sm text-blue-800">
            {[
              "✅ Byggherreforskriften § 7+8 – SHA-plan",
              "✅ § 15 – Elektronisk oversiktsliste",
              "✅ § 19 – Informasjon til ansatte og verneombud",
              "✅ IK-HMS § 5 – Dokumentert avviksrutine",
              "✅ IK-mat § 5 nr. 4 – Avviksrutine ved matsaker",
              "✅ GDPR art. 5, 6 og 9",
            ].map((krav) => (
              <span key={krav} className="font-medium">{krav}</span>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] sm:text-xs text-blue-700/80">
            Tavlen er et verktøy for å vise og dokumentere HMS-informasjon. Virksomheten er
            selv ansvarlig for at innholdet er korrekt og oppdatert.
          </p>
        </div>
      </section>

      {/* ═══ SLIK VIRKER DET ═══ */}
      <section id="slik-virker-det" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3">Slik virker det</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Kom i gang på 5 enkle steg</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Fra bestilling til ferdig tavle på byggeplassen – alt på under 15 minutter.
          </p>
        </div>

        {/* Steg-sekvens med piler */}
        <div className="relative">
          {/* Linje mellom stegene */}
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-blue-200 via-violet-200 to-fuchsia-200 z-0" />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-8 relative z-10">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.nr} className="flex flex-col items-center text-center last:col-span-2 md:last:col-span-1">
                  <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 ${step.color} shadow-sm`}>
                    <Icon className="h-7 w-7 sm:h-9 sm:w-9" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold mb-3">
                    {step.nr}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm leading-tight">{step.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ SKJERMBILDER ═══ */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">Slik ser det ut</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tre skjermbilder – én løsning
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Fra dashboard i brakkeriggen til mobil QR-innsjekk på byggeplassen.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Bilde 1 – Dashboard */}
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                <Image
                  src="/images/hms-tavle-dashboard.png"
                  alt="HMS Tavle dashboard – oversikt over SHA-plan, mannskap, avvik og vær"
                  width={800}
                  height={500}
                  className="w-full object-cover"
                />
              </div>
              <div className="px-1">
                <p className="font-semibold text-gray-900 text-sm">Dashboard-oversikt</p>
                <p className="text-xs text-gray-500">Alle seksjoner samlet på ett sted – SHA-plan, mannskap, avvik, dokumenter og vær.</p>
              </div>
            </div>

            {/* Bilde 2 – Kiosk */}
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                <Image
                  src="/images/hms-tavle-kiosk.png"
                  alt="HMS Tavle kiosk-modus på storskjerm i brakkeriggen"
                  width={800}
                  height={500}
                  className="w-full object-cover"
                />
              </div>
              <div className="px-1">
                <p className="font-semibold text-gray-900 text-sm">Kiosk på storskjerm</p>
                <p className="text-xs text-gray-500">Auto-roterende fullskjerm-modus – perfekt for TV/skjerm i brakkeriggen (Avansert-plan).</p>
              </div>
            </div>

            {/* Bilde 3 – Innsjekk */}
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                <Image
                  src="/images/hms-tavle-innsjekk.png"
                  alt="QR-innsjekk via mobil på byggeplassen – Byggherreforskriften § 15"
                  width={800}
                  height={500}
                  className="w-full object-cover"
                />
              </div>
              <div className="px-1">
                <p className="font-semibold text-gray-900 text-sm">QR-innsjekk på mobil</p>
                <p className="text-xs text-gray-500">Mannskap skanner QR-koden og sjekker inn direkte fra mobilen – oversiktslisten føres elektronisk etter Byggherreforskriften § 15.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SEKSJONER PÅ TAVLEN ═══ */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">Modulær oppbygging</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Velg seksjonene du trenger
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Tavlen er bygget opp av seksjoner. Du velger selv hva som vises – og kan endre det når som helst.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {SECTION_TYPES.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="font-semibold text-sm text-gray-900 leading-tight mb-1">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ GJESTESERVICE FOR REISELIV ═══ */}
      <section id="gjesteservice" className="border-y bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center mb-10 sm:mb-12">
            <Badge variant="outline" className="mb-3">Hotell og reiseliv</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Gjesteservice med serviceløfte
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Reiselivet mangler noe mellom gjesteboka og et tungt avvikssystem. Gjesten skanner QR på
              rommet, melder fra på eget språk og følger saken på en privat lenke. Klager og avvik er
              alltid konfidensielle.
            </p>
          </div>

          {/* Den lukkede sløyfen */}
          <div className="relative mb-14 sm:mb-16">
            <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-blue-200 via-violet-200 to-fuchsia-200 z-0" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-8 relative z-10">
              {GJESTESERVICE_STEG.map((steg) => {
                const Icon = steg.icon;
                return (
                  <div key={steg.nr} className="flex flex-col items-center text-center last:col-span-2 md:last:col-span-1">
                    <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 ${steg.color} shadow-sm`}>
                      <Icon className="h-7 w-7 sm:h-9 sm:w-9" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold mb-3">
                      {steg.nr}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm leading-tight">{steg.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{steg.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personvern – tre flater */}
          <div className="mb-14 sm:mb-16">
            <div className="text-center mb-8">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Sensitivt innhold forlater aldri huset
              </h3>
              <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
                Tre flater, tre nivåer av innsyn. Det er ingen vei fra tavlen inn i en enkeltsak.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
              {PERSONVERN_FLATER.map((flate) => (
                <Card key={flate.title} className={flate.tone}>
                  <CardContent className="p-5 sm:p-6 space-y-2">
                    <h4 className="font-semibold text-gray-900">{flate.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{flate.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Fordeler */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {GJESTESERVICE_FORDELER.map((fordel) => {
              const Icon = fordel.icon;
              return (
                <Card key={fordel.title}>
                  <CardContent className="p-5 sm:p-6 space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="font-semibold text-gray-900">{fordel.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{fordel.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/tavle-registrering?plan=STANDARD" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 sm:px-8">
                Kom i gang med gjesteservice
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-gray-500 flex items-center gap-2 text-center">
              <Lock className="h-4 w-4 shrink-0" />
              Ingen app for gjesten. Ingen saksinnhold på tavlen.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ INFOGRAFIK – FLYT ═══ */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3">Integrering</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Koble til det du allerede bruker
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Link Excel-filer, PDF-er og andre systemer direkte inn i tavlen. For HMS Nova-kunder hentes data automatisk.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Standalone */}
          <Card className="border-2 border-gray-200">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
              <CardTitle className="text-base">Standalone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p className="font-medium text-gray-900 text-xs uppercase tracking-wide mb-3">Manuell data du laster opp</p>
              {["SHA-plan (PDF-lenke)", "Kontaktpersoner", "Beredskapsplan", "Dokumenter og lenker", "Fremmøte via QR-skanning"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pil */}
          <div className="hidden md:flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <Wifi className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-blue-700">HMS Nova tillegg</span>
                <span className="text-xs text-gray-500 max-w-[140px] text-center">Aktiver som add-on og få live-data</span>
              </div>
              <div className="flex items-center gap-2 text-blue-500">
                <div className="h-px flex-1 bg-blue-200" />
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* HMS Nova */}
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-base">HMS Nova Add-on</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p className="font-medium text-gray-900 text-xs uppercase tracking-wide mb-3">Live data fra HMS Nova</p>
              {["Avvik og RUH – automatisk", "SJA-oversikt live", "Mannskapsliste fra prosjekt", "SHA-plan status", "Tiltaksoversikt", "Statistikk og KPI"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
              <Badge className="mt-2 bg-blue-100 text-blue-800 border-blue-200 text-xs">+ kr 290/mnd</Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══ BRANSJER ═══ */}
      <section className="bg-gradient-to-b from-slate-900 to-blue-950 text-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/30 mb-3">For alle bransjer</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Én tavle — alle arbeidsplasser</h2>
            <p className="text-blue-200/80 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Digital HMS Tavle er ikke bare for byggeplassen. Samme løsning brukes av
              hoteller, restauranter, sykehus, skoler, lager, industribedrifter og butikkjeder — tilpasset
              din bransjes krav og terminologi.
            </p>
          </div>

          {/* Bransjegrid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-14">
            {BRANSJER.map((b) => (
              <div
                key={b.label}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/40 rounded-2xl p-5 transition-all group cursor-default"
              >
                <div className="text-4xl mb-3">{b.emoji}</div>
                <h3 className="font-semibold text-white mb-1.5 group-hover:text-blue-300 transition-colors">{b.label}</h3>
                <p className="text-sm text-blue-200/60 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* Lovkrav-banner */}
          <div className="bg-blue-900/50 border border-blue-700/40 rounded-2xl p-6 text-center">
            <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-2">Lovkrav som støttes</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "Byggherreforskriften §7, §8, §10, §15, §19",
                "Arbeidsmiljøloven §2-3, §5-1, §5-2, §6-2",
                "IK-HMS §5",
                "IK-mat §5 nr. 4 og 5",
                "Pakkereiseloven §14",
                "GDPR art. 5, 6 og 9",
                "ISO 45001:2018",
              ].map((ref) => (
                <span key={ref} className="bg-white/10 rounded-full px-3 py-1 text-xs text-blue-200">
                  {ref}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HVEM PASSER DET FOR ═══ */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Hvem passer det for?</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg">
              Uansett bransje — HMS-ansvarlige, verneombud og ledere får full oversikt på ett sted.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TARGETS.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.title} className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{t.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{t.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ PRISER ═══ */}
      <section id="priser" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3">Priser</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Betal kun for prosjektets varighet
          </h2>
          <p className="text-lg text-gray-600">
            Ingen binding etter prosjektet er ferdig. Velg 1–24 måneder.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border-2 p-6 flex flex-col ${
                plan.highlight
                  ? "border-blue-500 shadow-xl shadow-blue-100"
                  : "border-gray-200"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-4 py-1">
                    <Star className="h-3 w-3 mr-1 inline" />{plan.badge}
                  </Badge>
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">{PLAN_LABELS[plan.key as keyof typeof PLAN_LABELS]}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">kr {PLAN_PRICES[plan.key as keyof typeof PLAN_PRICES]}</span>
                  <span className="text-gray-500 text-sm">/mnd</span>
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-400 line-through">
                    <CheckCircle2 className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={`/tavle-registrering?plan=${plan.key}`}>
                <Button
                  className={`w-full ${plan.highlight ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  Bestill {PLAN_LABELS[plan.key as keyof typeof PLAN_LABELS]}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* HMS Nova Add-on */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Eksisterende HMS Nova-kunde?</span>
            </div>
            <p className="text-sm text-gray-600">
              Aktiver Digital HMS Tavle som tilleggsmodul for bare{" "}
              <strong>kr {PLAN_PRICES.ADDON}/mnd</strong>. All data hentes live fra systemet.
            </p>
          </div>
          <Link href="/dashboard/hms-tavle">
            <Button variant="outline" className="border-blue-400 text-blue-700 hover:bg-blue-100 shrink-0">
              Aktiver i dashbordet
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Vanlige spørsmål</h2>
          </div>
          <Card>
            <CardContent className="pt-6 divide-y">
              {FAQ.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══ CTA-BUNN ═══ */}
      <section className="bg-blue-700 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Klar til å digitalisere byggeplassen?
          </h2>
          <p className="text-blue-200 text-base sm:text-lg mb-8">
            Kom i gang på 2 minutter. Konto aktiveres umiddelbart etter registrering.
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-3 sm:gap-4">
            <Link href="/tavle-registrering" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-white text-blue-800 hover:bg-blue-50 font-semibold h-12 px-6 sm:px-10">
                Bestill Digital HMS Tavle
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="mailto:hei@hmsnova.no" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/40 text-white bg-transparent hover:bg-white/10 h-12 px-6 sm:px-8">
                Ta kontakt
              </Button>
            </a>
          </div>
          <p className="text-blue-300 text-sm mt-6">
            Spørsmål? Ring oss på <a href="tel:+4791556931" className="underline">91 55 69 31</a> eller send e-post til{" "}
            <a href="mailto:hei@hmsnova.no" className="underline">hei@hmsnova.no</a>
          </p>
        </div>
      </section>
    </div>
  );
}
