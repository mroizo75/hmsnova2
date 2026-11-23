import type { Metadata } from "next";
import Link from "next/link";
import { RegisterDialog } from "@/components/register-dialog";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import {
  getBreadcrumbSchema,
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
  ROBOTS_CONFIG,
} from "@/lib/seo-config";
import { AI_ADDON_NET_MONTHLY_NOK } from "@/lib/ai-addon";

const path = "/hms-system-for-sma-bedrifter";
const title = "HMS-system for små bedrifter";
const description =
  "HMS-system for små bedrifter: 300 kr/mnd eks. mva, ubegrenset antall brukere. Internkontroll, avvik, risiko og håndbøker er inkludert. AI-tillegg er valgfritt.";

const faqs = [
  {
    question: "Må en liten bedrift ha et HMS-system?",
    answer:
      "Arbeidsgiver skal drive systematisk HMS-arbeid etter arbeidsmiljøloven § 3-1 og internkontrollforskriften § 5, uavhengig av om bedriften er liten. Kravene tilpasses virksomhetens art, aktiviteter og risiko. Et digitalt system er ikke pålagt, men det gjør det mulig å samle det arbeidet på ett sted.",
  },
  {
    question: "Hva koster HMS Nova for en liten bedrift?",
    answer: `300 kr/mnd eks. mva per bedrift, med ubegrenset antall brukere. Prisen er den samme om dere er 3 eller 30. AI-assistenten koster ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd eks. mva og er av til dere slår den på.`,
  },
  {
    question: "Må vi ha verneombud?",
    answer:
      "I virksomheter med færre enn ti ansatte kan partene skriftlig avtale en annen ordning enn valgt verneombud, jf. arbeidsmiljøloven § 6-1. Ansvaret for et fullt forsvarlig arbeidsmiljø ligger likevel hos arbeidsgiver.",
  },
];

export const metadata: Metadata = {
  title,
  description,
  keywords: "hms system for små bedrifter, hms småbedrift, hms system pris, internkontroll liten bedrift",
  alternates: { canonical: getCanonicalUrl(path) },
  robots: ROBOTS_CONFIG,
  openGraph: getOpenGraphDefaults(title, description, path),
  twitter: getTwitterDefaults(title, description),
};

export default function HmsSystemForSmaBedrifterPage() {
  return (
    <>
      <MultipleStructuredData
        dataArray={[
          getBreadcrumbSchema([
            { name: "Hjem", url: "/" },
            { name: "HMS-system", url: "/hms-system" },
            { name: title, url: path },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ]}
      />
      <article className="container mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm font-medium text-[#0B6E4F]">Små bedrifter</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          En liten bedrift har de samme grunnkravene til systematisk HMS-arbeid som en stor, men
          omfanget skal stå i forhold til risikoen. HMS Nova samler internkontroll, avvik,
          risikovurdering og håndbøker til 300 kr/mnd eks. mva, uten pris per ansatt.
        </p>
        <ul className="mt-8 space-y-3">
          {[
            "KS-, HMS- og Personalhåndbok med standardtekst etter ISO 9001, ISO 45001 og internkontrollforskriften",
            "Avvik, risikovurdering, vernerunde og stoffkartotek inkludert",
            "Ubegrenset antall brukere. AI-assistenten er et tillegg på 49 kr/mnd eks. mva og er av som standard",
          ].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-10 space-y-6">
          {faqs.map((faq) => (
            <section key={faq.question}>
              <h2 className="text-xl font-semibold">{faq.question}</h2>
              <p className="mt-2 text-muted-foreground">{faq.answer}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <RegisterDialog>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#0B6E4F] px-6 font-semibold text-white"
            >
              Registrer bedrift
            </button>
          </RegisterDialog>
          <Link href="/bransjer" className="inline-flex h-12 items-center justify-center rounded-full border px-6 font-semibold">
            Se bransjer
          </Link>
        </div>
      </article>
    </>
  );
}
