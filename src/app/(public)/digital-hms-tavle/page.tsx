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
  { icon: Users, label: "Mannskapsliste", desc: "QR-innsjekk av alle på byggeplassen (§ 15)" },
  { icon: AlertTriangle, label: "Avvik og RUH", desc: "Live-statistikk fra systemet" },
  { icon: ClipboardList, label: "SJA-oversikt", desc: "Aktive sikker jobb-analyser" },
  { icon: LinkIcon, label: "Dokumenthub", desc: "Excel, PDF, egne systemer" },
  { icon: Thermometer, label: "Yr.no-vær", desc: "Lokal værmelding for byggeplassen" },
  { icon: HardHat, label: "Lovkrav-sjekkliste", desc: "§ 8, § 15, § 18 status i sanntid" },
  { icon: BarChart2, label: "KPI-dashboard", desc: "Nøkkeltall og trender" },
  { icon: Cloud, label: "Beredskapsplan", desc: "Manuell eller hentet fra HMS Nova" },
];

/* ─── Bransjer ─── */
const BRANSJER = [
  { emoji: "🏗️", label: "Bygg og anlegg",       desc: "SHA-plan, mannskapsliste, SJA, Byggherreforskriften §7–18" },
  { emoji: "🏢", label: "Eiendom og forvaltning", desc: "Driftsavvik, beredskap, kontaktinfo for eiendommer og bygg" },
  { emoji: "🏘️", label: "Borettslag og sameie",  desc: "HMS-informasjon, beredskapsplan og avvikshåndtering" },
  { emoji: "🏥", label: "Sykehus og helse",       desc: "Beredskapsrutiner, ansattoversikt, HMS-sjekklister" },
  { emoji: "🏫", label: "Skole og barnehage",     desc: "Brannrømmingsplan, kontaktpersoner, avviksmeldinger" },
  { emoji: "📦", label: "Lager og logistikk",     desc: "Sikkerhetsinstrukser, maskinlogg, verneombud og avvik" },
  { emoji: "🏭", label: "Industri og produksjon", desc: "Risikovurdering, eksponeringslogg, lovkrav IK-HMS" },
  { emoji: "🔧", label: "Verksted og service",    desc: "Sikker jobb-analyse, vernerunder og kjemikalieoversikt" },
  { emoji: "🛒", label: "Butikk og kjede",        desc: "HMS-informasjon for ansatte, beredskapsplan per butikk" },
];

/* ─── Hvem passer det for ─── */
const TARGETS = [
  { icon: Building2, title: "Totalentreprenører og BH", desc: "Fullfør lovkrav etter Byggherreforskriften. En tavle per prosjekt." },
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
    a: "Ja. Tavlen brukes i dag av eiendomsselskaper, borettslag, sykehus, skoler, barnehager, lager- og logistikkbedrifter, industri, verksteder og butikkjeder. Seksjonstekster og lovkrav-referanser tilpasses automatisk til valgt bransje.",
  },
  {
    q: "Hvilke lovkrav støttes?",
    a: "For bygg og anlegg: Byggherreforskriften §7, §8, §15 og §18. For øvrige bransjer: Arbeidsmiljøloven, IK-HMS §5, GDPR og ISO 45001:2018.",
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
      "PDF-innsending fra UE",
      "Avvik og mannskapsliste live",
      "Yr.no-værvarsling",
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
      "Lovkrav-sjekkliste (§ 8, § 15, § 18)",
      "KPI-dashboard",
      "AI-innsikt og rapporter",
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

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 md:py-28 w-full">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2 mb-5">
              {["🏗️ Bygg", "🏥 Helse", "📦 Lager", "🏭 Industri", "🏫 Skole", "🛒 Butikk"].map((b) => (
                <Badge key={b} className="bg-blue-500/30 text-blue-100 border-blue-400/30 text-xs">
                  {b}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 drop-shadow-lg">
              Digital HMS Tavle
              <br />
              <span className="text-blue-300">for alle bransjer</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed drop-shadow">
              Én løsning for bygg og anlegg, sykehus, skoler, lager, industri, butikkjeder og mer.
              Dekker lovkrav etter AML, IK-HMS og Byggherreforskriften — ingen HMS Nova-abonnement nødvendig.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/tavle-registrering">
                <Button size="lg" className="bg-white text-blue-800 hover:bg-blue-50 font-semibold h-12 px-8 shadow-lg">
                  Bestill nå – fra kr {PLAN_PRICES.ENKEL}/mnd
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#slik-virker-det">
                <Button size="lg" variant="outline" className="border-white/40 text-white bg-transparent hover:bg-white/10 h-12 px-8">
                  Se hvordan det virker
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LOVKRAV-BANNER ═══ */}
      <section className="bg-blue-50 border-y border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-6 text-sm text-blue-800">
          {[
            "✅ Byggherreforskriften § 7 – SHA-plan",
            "✅ § 8 – Forhåndsmelding",
            "✅ § 15 – Elektronisk mannskapsliste",
            "✅ § 18 – Koordineringsansvar",
            "✅ AML § 5-2 – Avviksregistrering",
          ].map((krav) => (
            <span key={krav} className="font-medium">{krav}</span>
          ))}
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

          <div className="grid md:grid-cols-5 gap-6 relative z-10">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.nr} className="flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${step.color} shadow-sm`}>
                    <Icon className="h-9 w-9" />
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
                <p className="text-xs text-gray-500">Mannskap skanner QR-koden og sjekker inn direkte fra mobilen – oppfyller Byggherreforskriften § 15.</p>
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
            <p className="text-blue-200/80 max-w-2xl mx-auto text-lg leading-relaxed">
              Digital HMS Tavle er ikke bare for byggeplassen. Samme løsning brukes av
              sykehus, skoler, lager, industribedrifter og butikkjeder — tilpasset din bransjes krav og terminologi.
            </p>
          </div>

          {/* Bransjegrid */}
          <div className="grid sm:grid-cols-3 lg:grid-cols-3 gap-4 mb-14">
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
                "Byggherreforskriften §7, §8, §15, §18",
                "Arbeidsmiljøloven §2-3, §5-1, §5-2, §6-2",
                "IK-HMS §5",
                "GDPR / Personopplysningsloven",
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
          <p className="text-blue-200 text-lg mb-8">
            Kom i gang på 2 minutter. Konto aktiveres umiddelbart etter registrering.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/tavle-registrering">
              <Button size="lg" className="bg-white text-blue-800 hover:bg-blue-50 font-semibold h-12 px-10">
                Bestill Digital HMS Tavle
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="mailto:hei@hmsnova.no">
              <Button size="lg" variant="outline" className="border-white/40 text-white bg-transparent hover:bg-white/10 h-12 px-8">
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
