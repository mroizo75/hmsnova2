import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HardHat, CheckCircle2, ClipboardCheck, Shield, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { FAQSection } from "@/components/faq-section";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import { getBreadcrumbSchema, getCanonicalUrl, getOpenGraphDefaults, getTwitterDefaults } from "@/lib/seo-config";

export const metadata: Metadata = {
  title: "SJA - Sikker Jobb Analyse | Digital SJA-skjema | HMS Nova",
  description: "Digital Sikker Jobb Analyse (SJA) for risikofylte arbeidsoperasjoner. Identifiser farer, vurder risiko og dokumenter tiltak før arbeidet starter. Oppfyll forskriftskrav.",
  keywords: "SJA, sikker jobb analyse, SJA skjema, sikker jobb analyse mal, risikovurdering enkeltoppgave, SJA bygg, SJA offshore, farlig arbeid",
  alternates: { canonical: getCanonicalUrl("/hms-system/sja") },
  openGraph: getOpenGraphDefaults(
    "SJA - Sikker Jobb Analyse | HMS Nova",
    "Digital SJA for risikofylte arbeidsoperasjoner. Identifiser farer før arbeidet starter.",
    "/hms-system/sja"
  ),
  twitter: getTwitterDefaults(
    "SJA - Sikker Jobb Analyse | HMS Nova",
    "Digital SJA for risikofylte arbeidsoperasjoner. Identifiser farer før arbeidet starter."
  ),
};

const faqs = [
  {
    question: "Hva er en SJA (Sikker Jobb Analyse)?",
    answer: "En Sikker Jobb Analyse (SJA) er en systematisk gjennomgang av en konkret arbeidsoppgave for å identifisere farer, vurdere risiko og bestemme tiltak før arbeidet starter. SJA gjøres typisk for risikofylte, uvanlige eller nye oppgaver.",
  },
  {
    question: "Når skal man gjennomføre SJA?",
    answer: "SJA skal gjennomføres før arbeid som er risikofylt, uvanlig, sjeldent utført, eller der forholdene har endret seg. Eksempler: arbeid i høyden, varmt arbeid, arbeid i trange rom, bruk av farlige kjemikalier, arbeid nær strøm eller tunge løft med kran.",
  },
  {
    question: "Hvem skal delta i en SJA?",
    answer: "Alle som skal utføre eller påvirkes av arbeidet bør delta. Typisk inkluderer det arbeidsleder, de som utfører jobben, verneombud og eventuelt andre berørte parter. HMS Nova lar alle involverte signere digitalt.",
  },
  {
    question: "Hva er forskjellen mellom SJA og risikovurdering?",
    answer: "En risikovurdering er en overordnet, systematisk vurdering av risikoer i virksomheten (gjøres periodisk). En SJA er en operasjonell vurdering av en konkret oppgave (gjøres før hver risikofylt jobb). Begge er viktige deler av HMS-arbeidet.",
  },
];

export default function SJAPage() {
  return (
    <>
      <MultipleStructuredData dataArray={[
        getBreadcrumbSchema([
          { name: "Hjem", url: "/" },
          { name: "HMS-system", url: "/hms-system" },
          { name: "SJA", url: "/hms-system/sja" },
        ]),
      ]} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <section className="container mx-auto px-4 pt-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Hjem</Link>
            <span>/</span>
            <Link href="/hms-system" className="hover:text-foreground">HMS-system</Link>
            <span>/</span>
            <span className="text-foreground">SJA – Sikker Jobb Analyse</span>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4" variant="secondary">Operasjonell sikkerhet</Badge>
            <h1 className="text-5xl font-bold mb-6">SJA – Sikker Jobb Analyse</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Identifiser farer og bestem tiltak før risikofylte arbeidsoperasjoner starter.
              Digital SJA fra mobilen — signering, dokumentasjon og historikk inkludert.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg"><Link href="/registrer-bedrift">Registrer bedrift<ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/hms-system"><ArrowLeft className="mr-2 h-5 w-5" />Tilbake til HMS-system</Link></Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-8 prose prose-lg max-w-none">
                <h2 className="text-3xl font-bold mb-4">Hva er en Sikker Jobb Analyse?</h2>
                <p>
                  En <strong>SJA</strong> er en kortfattet risikovurdering som gjennomføres i felten,
                  rett før et risikofylt arbeid starter. Den sikrer at alle involverte forstår farene
                  og at nødvendige tiltak er på plass.
                </p>
                <h3 className="text-xl font-semibold mt-6 mb-3">Forskriftskrav</h3>
                <ul>
                  <li><strong>Forskrift om utførelse av arbeid § 2-2</strong> — Krav om risikovurdering av arbeidsoperasjoner</li>
                  <li><strong>AML § 3-1</strong> — Systematisk HMS-arbeid inkludert vurdering av farer</li>
                  <li><strong>Byggherreforskriften § 19</strong> — SJA ved risikofylte aktiviteter på bygg- og anleggsplasser</li>
                  <li><strong>Rammeforskriften (offshore)</strong> — Krav til SJA for petroleumsvirksomhet</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">SJA-prosessen i HMS Nova</h2>
            <div className="space-y-6">
              {[
                { step: "1", title: "Beskriv arbeidsoppgaven", desc: "Hva skal gjøres, hvor, når og hvem er involvert? Fyll ut direkte fra mobilen på arbeidsplassen." },
                { step: "2", title: "Identifiser farer", desc: "Gå systematisk gjennom hvert trinn i jobben. Hva kan gå galt? HMS Nova har ferdige sjekklister per type arbeid." },
                { step: "3", title: "Vurder risiko og bestem tiltak", desc: "For hver fare: vurder sannsynlighet og konsekvens. Bestem hvilke tiltak som må være på plass før arbeidet starter." },
                { step: "4", title: "Signer og start", desc: "Alle involverte signerer digitalt. Arbeidet kan starte. SJA-en er lagret og sporbar for ettertiden." },
              ].map((item) => (
                <Card key={item.step}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">{item.step}</div>
                      <CardTitle>{item.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent><p className="text-muted-foreground">{item.desc}</p></CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Fordeler med digital SJA</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><HardHat className="h-10 w-10 text-primary mb-2" /><CardTitle>Fra mobilen i felt</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Gjennomfør SJA der arbeidet skjer. Fungerer offline — synkroniserer når du er tilbake online.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><ClipboardCheck className="h-10 w-10 text-primary mb-2" /><CardTitle>Ferdige sjekklister</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Bransjespesifikke sjekklister for varmt arbeid, arbeid i høyden, kran, el-arbeid og mer.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CheckCircle2 className="h-10 w-10 text-primary mb-2" /><CardTitle>Digital signering</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Alle involverte signerer SJA-en digitalt. Dokumentasjonen er komplett og kan ikke endres i ettertid.</p></CardContent>
              </Card>
              <Card>
                <CardHeader><Shield className="h-10 w-10 text-primary mb-2" /><CardTitle>Historikk og revisjon</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Alle SJA-er lagres og er søkbare. Perfekt dokumentasjon ved tilsyn, revisjon eller granskningsarbeid.</p></CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6">Del av HMS Nova HMS-system</h3>
            <p className="text-muted-foreground mb-6">Se også:</p>
            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/hms-system/stoffkartotek"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Stoffkartotek</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Kjemikalier og eksponering →</p></CardContent></Card></Link>
              <Link href="/hms-system/risikovurdering"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Risikovurdering</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Overordnet 5x5 matrise →</p></CardContent></Card></Link>
              <Link href="/hms-system/vernerunde"><Card className="hover:shadow-lg transition-shadow cursor-pointer h-full"><CardHeader><CardTitle className="text-base">Vernerunde</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Digital vernerunde →</p></CardContent></Card></Link>
            </div>
          </div>
        </section>

        <FAQSection faqs={faqs} title="Ofte stilte spørsmål om SJA" />

        <section className="container mx-auto px-4 py-20">
          <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Digitalisér SJA-arbeidet</h2>
              <p className="text-lg mb-8 text-primary-foreground/90">Fra papir til mobil. 14 dagers angrefrist, deretter 12 måneders binding.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-gray-100"><Link href="/registrer-bedrift">Registrer bedrift</Link></Button>
                <Button asChild size="lg" className="border-2 border-white text-white hover:bg-white/10"><Link href="/priser">Se priser</Link></Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
