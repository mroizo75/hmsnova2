import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RegisterDialog } from "@/components/register-dialog";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import { AI_ADDON_NET_MONTHLY_NOK } from "@/lib/ai-addon";
import {
  featurePublicPath,
  featureSlug,
  PUBLIC_FEATURE_GROUPS,
  type PublicFeature,
} from "@/lib/public-feature-catalog";
import {
  getBreadcrumbSchema,
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
  ROBOTS_CONFIG,
} from "@/lib/seo-config";

type FeaturePage = {
  feature: PublicFeature;
  groupTitle: string;
  groupId: string;
  related: PublicFeature[];
};

function pages(): FeaturePage[] {
  return PUBLIC_FEATURE_GROUPS.flatMap((group) =>
    group.features
      .filter((feature) => !feature.href)
      .map((feature) => ({
        feature,
        groupTitle: group.title,
        groupId: group.id,
        related: group.features.filter((item) => item.name !== feature.name).slice(0, 4),
      }))
  );
}

function findPage(slug: string): FeaturePage | undefined {
  return pages().find((page) => featureSlug(page.feature.name) === slug);
}

function isAi(name: string) {
  return name === "AI-assistent" || name === "Tale-til-tekst";
}

export function generateStaticParams() {
  return pages().map((page) => ({ slug: featureSlug(page.feature.name) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = findPage(slug);
  if (!page) return {};
  const path = featurePublicPath(page.feature);
  const title = `${page.feature.name} i HMS-system`;
  const description = `${page.feature.description} Inkludert i HMS Nova, 300 kr/mnd eks. mva.`;
  return {
    title,
    description,
    alternates: { canonical: getCanonicalUrl(path) },
    robots: ROBOTS_CONFIG,
    openGraph: getOpenGraphDefaults(title, description, path),
    twitter: getTwitterDefaults(title, description),
  };
}

export default async function FeatureSeoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = findPage(slug);
  if (!page) notFound();

  const { feature, groupTitle, related } = page;
  const path = featurePublicPath(feature);
  const ai = isAi(feature.name);
  const priceAnswer = ai
    ? `${feature.name} følger AI-tillegget på ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd eks. mva. Tillegget er av til en administrator slår det på. Resten av HMS Nova koster 300 kr/mnd eks. mva.`
    : `${feature.name} er inkludert i HMS Nova til 300 kr/mnd eks. mva per bedrift. Antall brukere er ubegrenset. AI-tillegget på ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd er valgfritt.`;

  const faqs = [
    {
      question: `Hva er ${feature.name.toLowerCase()} i HMS Nova?`,
      answer: feature.description,
    },
    {
      question: `Er ${feature.name.toLowerCase()} inkludert i prisen?`,
      answer: priceAnswer,
    },
    {
      question: `Hvilken del av HMS-systemet hører ${feature.name.toLowerCase()} til?`,
      answer: `${feature.name} ligger under ${groupTitle}. Funksjonen brukes sammen med de andre modulene i samme bolk, og inngår i det samme systemet.`,
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <MultipleStructuredData
        dataArray={[
          faqSchema,
          getBreadcrumbSchema([
            { name: "Hjem", url: "/" },
            { name: "Funksjoner", url: "/funksjoner" },
            { name: feature.name, url: path },
          ]),
        ]}
      />
      <article className="bg-[#F6F5F1] text-[#101C18]">
        <div className="container mx-auto max-w-3xl px-4 py-16">
          <p className="text-sm text-[#101C18]/55">
            <Link href="/" className="hover:text-[#0B6E4F]">Hjem</Link>
            <span className="mx-2">/</span>
            <Link href="/funksjoner" className="hover:text-[#0B6E4F]">Funksjoner</Link>
            <span className="mx-2">/</span>
            {feature.name}
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#0B6E4F]">{groupTitle}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{feature.name}</h1>
          <p className="mt-5 text-lg leading-relaxed text-[#101C18]/80">{feature.description}</p>

          <h2 className="mt-12 text-2xl font-semibold">Hva gjør funksjonen?</h2>
          <p className="mt-3 leading-relaxed text-[#101C18]/75">
            {feature.name} hører til bolken {groupTitle} i HMS Nova.
            Det ligger i samme system som håndbøkene, avvikene og risikovurderingen,
            så oppfølgingen ikke spres på filer og e-post.
          </p>

          <h2 className="mt-10 text-2xl font-semibold">Pris</h2>
          <p className="mt-3 leading-relaxed text-[#101C18]/75">{priceAnswer}</p>

          <h2 className="mt-10 text-2xl font-semibold">Ofte stilte spørsmål</h2>
          <dl className="mt-4 divide-y divide-[#101C18]/10 border-y border-[#101C18]/10">
            {faqs.map((faq) => (
              <div key={faq.question} className="py-4">
                <dt className="font-medium">{faq.question}</dt>
                <dd className="mt-2 text-[#101C18]/75">{faq.answer}</dd>
              </div>
            ))}
          </dl>

          {related.length > 0 ? (
            <>
              <h2 className="mt-10 text-2xl font-semibold">I samme bolk</h2>
              <ul className="mt-4 space-y-2">
                {related.map((item) => (
                  <li key={item.name}>
                    <Link href={featurePublicPath(item)} className="font-medium text-[#0B6E4F]">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className="mt-12">
            <RegisterDialog>
              <button type="button" className="h-12 rounded-full bg-[#0B6E4F] px-6 font-semibold text-white">
                Registrer bedrift
              </button>
            </RegisterDialog>
            <p className="mt-3 text-sm text-[#101C18]/55">
              300 kr/mnd eks. mva. 14 dagers angrefrist.
            </p>
          </div>
        </div>
      </article>
    </>
  );
}
