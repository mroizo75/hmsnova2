import Link from "next/link";
import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { RegisterDialog } from "@/components/register-dialog";
import { RingMegDialog } from "@/components/ring-meg-dialog";
import { HomeWizard } from "@/components/home/home-wizard";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import { HomeFaq } from "@/components/home/home-faq";
import { HomePrice } from "@/components/home/home-price";
import { HomeSteps } from "@/components/home/home-steps";
import { FEATURE_CARDS, HOME_FAQS, RISK_ROWS } from "@/components/home/home-content";
import { PUBLIC_FEATURE_COUNT, PUBLIC_FEATURE_GROUPS } from "@/lib/public-feature-catalog";
import {
  PAGE_METADATA,
  getOpenGraphDefaults,
  getTwitterDefaults,
  getCanonicalUrl,
  SOFTWARE_PRODUCT_SCHEMA,
  getBreadcrumbSchema,
  ROBOTS_CONFIG,
} from "@/lib/seo-config";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
});

const h2 =
  "font-[family-name:var(--font-display)] font-extrabold tracking-[-0.03em] leading-[1.04] text-[32px] lg:text-[clamp(34px,4.4vw,52px)]";

export const metadata: Metadata = {
  title: { absolute: PAGE_METADATA.home.title },
  description: PAGE_METADATA.home.description,
  keywords: PAGE_METADATA.home.keywords,
  alternates: { canonical: getCanonicalUrl("/") },
  robots: ROBOTS_CONFIG,
  openGraph: getOpenGraphDefaults(PAGE_METADATA.home.title, PAGE_METADATA.home.description, "/"),
  twitter: getTwitterDefaults(PAGE_METADATA.home.title, PAGE_METADATA.home.description),
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOME_FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

const TRUST = [
  "ISO 9001",
  "ISO 45001",
  "Internkontrollforskriften",
  "Arbeidsmiljøloven",
  "GDPR",
  "Servere i EU/EØS",
  "HMS-erfaring siden 2009",
];

const BOOKS = [
  {
    mark: "KS",
    stamp: "ISO 9001",
    title: "KS-håndbok",
    body: "Kvalitetssystemet med prosesser, dokumentstyring, avvik og ledelsens gjennomgang – ferdig beskrevet.",
    chips: ["Kvalitetspolicy", "Prosesser", "Dokumentstyring"],
  },
  {
    mark: "HMS",
    stamp: "ISO 45001 · IK-forskriften",
    title: "HMS-håndbok",
    body: "Alt Arbeidstilsynet ser etter: mål, ansvar, rutiner, risikovurdering, verneombud og beredskap.",
    chips: ["HMS-mål", "Verneombud", "Beredskap"],
  },
  {
    mark: "P",
    stamp: "Arbeidsmiljøloven",
    title: "Personalhåndbok",
    body: "Rutiner for ansettelse, fravær, arbeidstid, permisjon og on- og offboarding – klar til å deles.",
    chips: ["Arbeidstid", "Fravær", "Onboarding"],
  },
];

const ORG_UNITS = [
  { title: "Prosjekt", leader: "Ola H.", people: ["Mari S.", "Jonas L."] },
  { title: "Verksted", leader: "Per K.", people: ["Ali B.", "Sara N."] },
  { title: "Administrasjon", leader: "Lise M.", people: ["Tor R."] },
];

function featureCount(id: string) {
  return PUBLIC_FEATURE_GROUPS.find((group) => group.id === id)?.features.length ?? 0;
}

export default function HomePage() {
  return (
    <>
      <MultipleStructuredData
        dataArray={[
          SOFTWARE_PRODUCT_SCHEMA,
          faqSchema,
          getBreadcrumbSchema([{ name: "Hjem", url: "/" }]),
        ]}
      />
      <div className={`${display.variable} bg-[#F6F5F1] text-[#0F1C17]`}>
        <section className="container mx-auto grid items-center gap-12 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E2E1DA] bg-white py-1.5 pl-2 pr-3.5 text-sm font-medium">
              <span className="rounded-full bg-[#E3F1EA] px-2.5 py-0.5 text-[13px] font-bold text-[#0B6E4F]">500+</span>
              norske bedrifter bruker HMS Nova
            </p>
            <h1 className="my-[18px] max-w-[560px] font-[family-name:var(--font-display)] text-[40px] font-extrabold leading-[1.02] tracking-[-0.035em] lg:my-[22px] lg:text-[clamp(44px,6vw,72px)] lg:leading-none">
              Hele HMS-systemet er allerede skrevet.{" "}
              <br className="hidden lg:block" />
              <span className="text-[#0B6E4F]">Du fyller bare inn bedriften.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-[#46534D] lg:hidden">
              KS-, HMS- og Personalhåndboka er ferdig utfylt etter ISO 9001, ISO 45001 og internkontrollforskriften. Følg veiviseren – så er du i gang.
            </p>
            <p className="mt-6 hidden max-w-xl text-[19px] leading-relaxed text-[#46534D] lg:block">
              KS-, HMS- og Personalhåndboka er ferdig utfylt med standardtekst etter ISO 9001, ISO 45001 og
              internkontrollforskriften. Følg veiviseren, gjør risikovurderingen – og inviter de ansatte. Ferdig.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <RegisterDialog>
                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#0B6E4F] px-6 text-base font-semibold text-white"
                >
                  Registrer bedrift
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
              </RegisterDialog>
              <RingMegDialog
                trigger={
                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#101C18]/15 bg-white px-6 text-base font-semibold text-[#101C18]"
                  >
                    Ring meg
                  </button>
                }
              />
            </div>
            <p className="mt-5 text-sm text-[#101C18]/60">
              <span className="font-semibold text-[#101C18]">300 kr/mnd</span> eks. mva · Ubegrenset antall brukere · Ingen oppstartskostnad
            </p>
          </div>

          <HomeWizard />
        </section>

        <section className="border-y border-[#E2E1DA] bg-white" aria-label="Standarder systemet er bygget på">
          <div className="container mx-auto hidden flex-wrap items-center justify-between gap-x-7 gap-y-3 px-6 py-[22px] text-sm font-semibold text-[#34403A] lg:flex">
            <span className="font-medium text-[#5A665F]">Bygget på</span>
            {TRUST.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 py-4 lg:hidden">
            {TRUST.map((item) => (
              <span
                key={item}
                className="shrink-0 whitespace-nowrap rounded-full border border-[#E2E1DA] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#34403A]"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B6E4F]">Ferdig skrevet fra dag én</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <h2 className={`max-w-[640px] ${h2}`}>Tre håndbøker. Null blanke ark.</h2>
            <p className="max-w-[420px] text-[17px] text-[#46534D] lg:hidden">
              Alt er fylt ut med standardtekst – du tilpasser bare det som er spesielt for dere.
            </p>
            <p className="hidden max-w-[420px] text-[17px] text-[#46534D] lg:block">
              Du starter ikke fra bunnen. Alt er fylt ut med standardtekst som følger standardene – du tilpasser bare det som er spesielt for dere.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 lg:hidden">
            {BOOKS.map((book) => (
              <article key={book.title} className="flex items-start gap-3.5 rounded-[18px] border border-[#E2E1DA] bg-white p-[18px]">
                <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-[#E3F1EA] text-[17px] font-extrabold text-[#0B6E4F]">
                  {book.mark}
                </span>
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">{book.title}</h3>
                    <span className="rounded-full border border-[#D5D4CC] px-2 py-0.5 text-[11px] font-semibold">{book.stamp}</span>
                  </div>
                  <p className="text-sm text-[#46534D]">{book.body}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-10 hidden gap-5 lg:grid lg:grid-cols-3">
            {BOOKS.map((book) => (
              <article key={book.title} className="flex flex-col gap-4 rounded-[22px] border border-[#E2E1DA] bg-white p-[30px]">
                <div className="flex items-center justify-between">
                  <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#E3F1EA] text-xl font-extrabold text-[#0B6E4F]">
                    {book.mark}
                  </span>
                  <span className="rounded-full border border-[#D5D4CC] px-2.5 py-1 text-xs font-semibold text-[#34403A]">{book.stamp}</span>
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-[26px] font-bold tracking-[-0.02em]">{book.title}</h3>
                <p className="text-[#46534D]">{book.body}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  {book.chips.map((chip) => (
                    <span key={chip} className="rounded-lg bg-[#F6F5F1] px-2.5 py-1 text-[13px]">
                      {chip}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20">
          <div className="rounded-[32px] bg-[#101C18] p-6 text-white sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8FE0BF]">Slik kommer du i gang</p>
            <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
              <h2 className={`max-w-[640px] ${h2}`}>
                <span className="lg:hidden">Fire steg. Så er systemet i bruk.</span>
                <span className="hidden lg:inline">Fire steg. Så er HMS-systemet i bruk.</span>
              </h2>
              <p className="max-w-md text-white/70">
                De fleste er ferdige på 1–2 timer. Veiviseren tar deg gjennom alt – du trenger ingen HMS-rådgiver.
              </p>
            </div>
            <div className="mt-8">
              <HomeSteps />
            </div>
          </div>
        </section>

        <section className="container mx-auto grid items-center gap-10 px-4 pb-20 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-[#0B6E4F]">AI-tillegg · 49 kr/mnd</p>
            <h2 className={`mt-3 max-w-[640px] ${h2}`}>
              <span className="lg:hidden">Risikovurdering alene – eller med AI.</span>
              <span className="hidden lg:inline">Risikovurdering alene – eller la AI gjøre grovarbeidet.</span>
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-[#101C18]/70">
              Med AI aktivert får du forslag til farer, sannsynlighet, konsekvens og tiltak – tilpasset bransjen og avdelingene dine. AI hjelper også med rutiner, avvik og tekster i håndbøkene. Du har alltid siste ord.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#101C18]/10 bg-white p-4">
                <p className="font-semibold">Uten AI</p>
                <p className="mt-1 text-sm text-[#101C18]/65">Ferdige maler og risikomatrise. Du fyller ut selv.</p>
              </div>
              <div className="rounded-2xl border border-[#0B6E4F]/30 bg-[#E7F6EE] p-4">
                <p className="font-semibold">Med AI</p>
                <p className="mt-1 text-sm text-[#101C18]/70">Forslag på alt – du godkjenner, justerer eller forkaster.</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-[0_16px_40px_-28px_rgba(16,28,24,0.45)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Risikovurdering · Verksted</p>
              <span className="rounded-full bg-[#E7F6EE] px-2.5 py-1 text-xs font-medium text-[#0B6E4F]">4 forslag fra AI</span>
            </div>
            <div className="mt-4 hidden grid-cols-[1.1fr_0.6fr_1.4fr_auto] gap-3 px-2 text-xs font-semibold uppercase tracking-wide text-[#101C18]/40 sm:grid">
              <span>Fare</span>
              <span>Risiko</span>
              <span>Foreslått tiltak</span>
              <span />
            </div>
            <ul className="mt-2 divide-y divide-[#101C18]/8">
              {RISK_ROWS.map((row) => (
                <li key={row.fare} className="grid gap-2 py-3 sm:grid-cols-[1.1fr_0.6fr_1.4fr_auto] sm:items-center">
                  <p className="font-medium">{row.fare}</p>
                  <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${row.tone}`}>{row.risiko}</span>
                  <p className="text-sm text-[#101C18]/70">{row.tiltak}</p>
                  <span className="w-fit rounded-full border border-[#0B6E4F]/30 px-3 py-1 text-xs font-medium text-[#0B6E4F]">
                    Godkjenn
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="container mx-auto grid items-center gap-10 px-4 pb-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[24px] bg-white p-4 sm:p-8">
            <p className="text-center text-xs text-[#101C18]/40">Eksempel</p>
            <div className="mt-4 lg:hidden">
              <div className="flex items-center justify-between gap-3 rounded-md bg-[#2b6f7e] px-3 py-2 text-white shadow-sm">
                <p className="text-sm font-semibold leading-tight">Daglig leder</p>
                <p className="text-xs text-white/80">Kari Nordmann</p>
              </div>
              <ul className="home-org-mobile">
                {ORG_UNITS.map((unit) => (
                  <li key={unit.title}>
                    <div className="flex items-center justify-between gap-3 rounded-md bg-[#1e3a5f] px-3 py-2 text-white shadow-sm">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Avdeling</p>
                        <p className="text-sm font-semibold leading-tight">{unit.title}</p>
                      </div>
                    </div>
                    <ul className="home-org-people">
                      <li className="flex items-center justify-between gap-3 rounded-md bg-[#2b6f7e] px-3 py-1.5 text-white">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Leder</p>
                        <p className="text-sm font-semibold">{unit.leader}</p>
                      </li>
                      {unit.people.map((name) => (
                        <li key={name} className="flex items-center justify-between gap-3 rounded-md bg-[#F6F5F1] px-3 py-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5A665F]">Ansatt</p>
                          <p className="text-sm font-semibold text-[#101C18]">{name}</p>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
                <li>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-[#9a3412] px-3 py-2 text-white shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Verneombud</p>
                    <p className="text-sm font-semibold">Emma V.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="mt-4 hidden flex-col items-center lg:flex">
              <div className="rounded-[14px] bg-[#2b6f7e] px-5 py-3 text-center text-white shadow-md">
                <p className="text-[15px] font-bold leading-tight">Daglig leder</p>
                <p className="mt-0.5 text-xs text-white/80">Kari Nordmann</p>
              </div>
              <div className="h-[22px] w-0.5 bg-[#94a3b8]" />
              <div className="h-0.5 w-[78%] bg-[#94a3b8]" />
              <div className="grid w-full grid-cols-3 gap-4">
                {ORG_UNITS.map((unit) => (
                  <div key={unit.title} className="flex flex-col items-center">
                    <div className="h-5 w-0.5 bg-[#94a3b8]" />
                    <div className="w-full rounded-[14px] bg-[#1e3a5f] px-3 py-2.5 text-center text-white shadow-md">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Avdeling</p>
                      <p className="text-sm font-bold">{unit.title}</p>
                    </div>
                    <div className="h-3.5 w-0.5 bg-[#94a3b8]" />
                    <div className="w-full rounded-[14px] bg-[#2b6f7e] px-3 py-2 text-center text-white shadow-md">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Leder</p>
                      <p className="text-sm font-bold">{unit.leader}</p>
                    </div>
                    <div className="h-3.5 w-0.5 bg-[#94a3b8]" />
                    <div className="flex w-full flex-col gap-1.5">
                      {unit.people.map((name) => (
                        <div
                          key={name}
                          className="flex items-center gap-2 rounded-[10px] border border-[#E2E1DA] bg-white px-2.5 py-1.5 text-[13px]"
                        >
                          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#E3F1EA] text-[11px] font-bold text-[#0B6E4F]">
                            {name.split(" ").map((part) => part[0]).join("")}
                          </span>
                          <span className="min-w-0 flex-1 font-medium">{name}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5A665F]">Ansatt</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[14px] bg-[#9a3412] px-4 py-2 text-center text-white shadow-md">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Verneombud</p>
                <p className="text-sm font-bold">Emma V.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-[#5A665F]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#1e3a5f]" />
                Avdeling
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#2b6f7e]" />
                Linje
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#9a3412]" />
                Verneombud
              </span>
            </div>
            <style>{`
              .home-org-mobile, .home-org-people { list-style: none; margin: 0; padding: 0; }
              .home-org-mobile { margin-top: 8px; padding-left: 14px; border-left: 4px solid #1e5a66; display: flex; flex-direction: column; gap: 12px; }
              .home-org-people { margin-top: 6px; margin-left: 8px; padding-left: 10px; border-left: 2px solid #94a3b8; display: flex; flex-direction: column; gap: 6px; }
            `}</style>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B6E4F]">Organisasjonskart</p>
            <h2 className={`mt-3 ${h2}`}>
              <span className="lg:hidden">Kartet tegner seg selv.</span>
              <span className="hidden lg:inline">Organisasjonskartet tegner seg selv.</span>
            </h2>
            <p className="mt-4 leading-relaxed text-[#101C18]/70">
              Legg inn avdelinger, ledere og ansatte – så bygges kartet automatisk og holdes oppdatert. Trenger du en annen struktur, overstyrer du det manuelt.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Ansvar og verneombud blir synlige for alle",
                "Avvik rutes automatisk til riktig leder",
                "Fungerer også på tvers av konsern",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B6E4F]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="funksjoner" className="container mx-auto scroll-mt-24 px-4 pb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B6E4F]">Alt er inkludert</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-end">
            <h2 className={h2}>{PUBLIC_FEATURE_COUNT} funksjoner. Én pris.</h2>
            <p className="max-w-md text-[#101C18]/70">
              Ingen moduler å kjøpe til, ingen pris per bruker. Du får hele plattformen fra første dag.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FEATURE_CARDS.map((card) => (
              <article key={card.id} className="rounded-3xl bg-white p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold">{card.title}</h3>
                  <span className="text-sm font-semibold text-[#0B6E4F]">{featureCount(card.id)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {card.chips.map((chip) => (
                    <span key={chip} className="rounded-full bg-[#F6F5F1] px-2.5 py-1 text-xs">
                      {chip}
                    </span>
                  ))}
                </div>
              </article>
            ))}
            <article className="flex flex-col justify-between rounded-3xl bg-[#0B6E4F] p-5 text-white">
              <p className="text-2xl font-semibold leading-snug">
                Spar 10+ timer i uka med påminnelser, struktur og rapporter med ett klikk.
              </p>
              <Link href="/funksjoner" className="mt-6 text-sm font-medium text-[#8FE0BF]">
                Se hele funksjonslisten
              </Link>
            </article>
          </div>
        </section>

        <section className="container mx-auto grid gap-4 px-4 pb-20 md:grid-cols-2">
          <article className="rounded-3xl bg-white p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B6E4F]">Tripletex-integrasjon</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-[22px] font-extrabold leading-[1.15] tracking-[-0.02em] lg:text-[30px]">
              Godkjenn i HMS Nova. Fakturagrunnlaget ligger i Tripletex.
            </h2>
            <p className="mt-4 leading-relaxed text-[#101C18]/70">
              Godkjente timer (ordinære, 50 % og 100 % overtid), nye prosjekter, varer og kjøring går rett over som fakturalinjer.
            </p>
            <Link href="/tripletex-integrasjon" className="mt-5 inline-block text-sm font-semibold text-[#0B6E4F]">
              Les om Tripletex
            </Link>
          </article>
          <article className="rounded-3xl bg-white p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B6E4F]">Mobilapp for alle ansatte</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-[22px] font-extrabold leading-[1.15] tracking-[-0.02em] lg:text-[30px]">
              Meld avvik rett fra mobilen – også uten dekning.
            </h2>
            <p className="mt-4 leading-relaxed text-[#101C18]/70">
              iOS og Android, og fungerer offline. Tale-til-tekst følger AI-tillegget. Når de ansatte faktisk bruker systemet, blir avvikene meldt.
            </p>
          </article>
        </section>

        <section className="container mx-auto px-4 pb-20">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B6E4F]">Pris</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] lg:text-[clamp(34px,4.4vw,56px)]">
              Enkel pris. Alt inkludert.
            </h2>
            <p className="mt-3 text-[#101C18]/70">Én pris per bedrift – uansett hvor mange ansatte dere er.</p>
          </div>
          <HomePrice featureCount={PUBLIC_FEATURE_COUNT} />
        </section>

        <section className="container mx-auto max-w-3xl px-4 pb-20">
          <h2 className="font-[family-name:var(--font-display)] text-[28px] font-extrabold tracking-[-0.03em] lg:text-[clamp(30px,3.6vw,42px)]">
            Ofte stilte spørsmål
          </h2>
          <div className="mt-6">
            <HomeFaq />
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-[#0B6E4F] px-6 py-10 text-white sm:px-10 lg:flex-row lg:items-center">
            <h2 className="max-w-[700px] font-[family-name:var(--font-display)] text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em] lg:text-[clamp(34px,4.6vw,58px)] lg:leading-[1.02]">
              Hvis Arbeidstilsynet kommer i morgen – er du klar?
            </h2>
            <div className="shrink-0">
              <RegisterDialog>
                <button
                  type="button"
                  className="h-12 rounded-full bg-white px-6 text-base font-semibold text-[#101C18]"
                >
                  Registrer bedrift
                </button>
              </RegisterDialog>
              <p className="mt-2 text-center text-sm text-white/75">Klar til bruk på 1–2 timer</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
