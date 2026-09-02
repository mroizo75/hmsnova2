"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RegisterDialog } from "@/components/register-dialog";
import { RingMegDialog } from "@/components/ring-meg-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  ArrowRight,
  Heart,
  Shield,
  Users,
  Stethoscope,
  Phone,
  TrendingDown,
  AlertCircle,
  Zap,
  Award,
  HeartPulse,
  Briefcase,
  GraduationCap,
  ClipboardList,
  BookOpen,
  Loader2,
} from "lucide-react";

const PRICING = [
  {
    tier: "SMALL",
    label: "START – 1–5 ansatte",
    price: 6900,
    priceNote: "575 kr/mnd",
    description: "Perfekt for verksted, bygg, små håndverkere",
    includes: [
      "Godkjent BHT-tilknytning",
      "HMS Nova komplett system",
      "Årlig HMS-gjennomgang (digital)",
      "Årsrapport til Arbeidstilsynet",
      "2 timer HMS-rådgivning",
      "Maler, risikovurdering, avvik, stoffkartotek",
      "E-post/chat support",
    ],
  },
  {
    tier: "MEDIUM",
    label: "PRO – 6–20 ansatte",
    price: 14900,
    priceNote: "per år",
    description: "For voksende bedrifter med økende HMS-behov",
    includes: [
      "Alt i START",
      "5 timer rådgivning",
      "1 fysisk/Teams vernerunde",
      "1 risikovurdering pr år",
      "Leder/HMS-kurs digitalt",
      "Helseoppfølging ved behov (rådgivning)",
      "Prioritert support",
    ],
  },
  {
    tier: "LARGE",
    label: "PREMIUM – 20+ ansatte",
    price: 29900,
    priceNote: "+ 350 kr/ekstra ansatt over 20",
    description: "Komplett løsning for større organisasjoner",
    includes: [
      "Alt i PRO",
      "Ubegrenset digital rådgivning",
      "2 fysiske besøk",
      "Årlig arbeidsmiljøkartlegging",
      "BHT-lege tilgjengelig",
      "Tilpasset HMS-plan",
      "Lederstøtte/AMU-møter",
      "Dedikert kontaktperson",
    ],
  },
] as const;

export default function BHTPage() {
  const { toast } = useToast();
  const [interestLoading, setInterestLoading] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [waitlistSent, setWaitlistSent] = useState(false);
  const [interestForm, setInterestForm] = useState({ name: "", email: "", phone: "", tier: "SMALL" as string });
  const [waitlistForm, setWaitlistForm] = useState({ email: "", name: "", tier: "SMALL" as string });

  const submitInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    setInterestLoading(true);
    try {
      const res = await fetch("/api/komplett-pakke/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...interestForm,
          type: "CONTACT",
          tier: interestForm.tier,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Noe gikk galt");
      setInterestSent(true);
      setInterestForm({ name: "", email: "", phone: "", tier: "SMALL" });
      toast({
        title: "Takk!",
        description: "Vi tar kontakt når vi er godkjent BHT. Sjekk også telefonen – salg ringer deg.",
      });
    } catch (err) {
      toast({
        title: "Kunne ikke sende",
        description: err instanceof Error ? err.message : "Prøv igjen eller ring oss.",
        variant: "destructive",
      });
    } finally {
      setInterestLoading(false);
    }
  };

  const submitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistLoading(true);
    try {
      const res = await fetch("/api/komplett-pakke/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: waitlistForm.email,
          name: waitlistForm.name || undefined,
          tier: waitlistForm.tier,
          type: "WAITLIST",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Noe gikk galt");
      setWaitlistSent(true);
      setWaitlistForm({ email: "", name: "", tier: "SMALL" });
      toast({
        title: "Du er på ventelisten",
        description: "Vi tar kontakt når vi er godkjent og har plass til flere.",
      });
    } catch (err) {
      toast({
        title: "Kunne ikke registrere",
        description: err instanceof Error ? err.message : "Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setWaitlistLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="default" className="mb-6">
              <Heart className="h-3 w-3 mr-2" />
              Bedriftshelsetjeneste (BHT)
            </Badge>
            <Badge variant="secondary" className="ml-2 mb-6">
              Vi blir BHT-organ i løpet av året
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Friske medarbeidere.<br />
              <span className="text-primary">Sterkere bedrift.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              HMS Nova etablerer seg som <strong>godkjent bedriftshelsetjeneste</strong> og tilbyr 
              minimum lovkrav for alle bedrifter som trenger BHT, pluss tilleggstjenester og et 
              <strong> bredt kursutbud</strong> – inkludert Diisocyanater og andre spesialkurs via sertifisert opplæringsvirksomhet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <RegisterDialog>
                <Button size="lg">
                  <HeartPulse className="mr-2 h-5 w-5" />
                  Registrer interesse for BHT
                </Button>
              </RegisterDialog>
              <Link href="#tjenester">
                <Button size="lg" variant="outline">
                  Se tjenester og kurs
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              ✓ Lovpålagt for bedrifter med <strong>5+ ansatte</strong> (Arbeidsmiljøloven § 3-3)<br />
              ✓ Minimum BHT-krav + alle tilleggstjenester under ett tak<br />
              ✓ Diisocyanater-kurs og mange flere HMS-kurs (sertifisert opplæring)<br />
              ✓ AMO-kurs (Arbeidsmiljøopplæring) og full integrasjon med HMS Nova
            </p>
          </div>
          <div className="relative">
            <Card className="border-2 border-primary/20 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Stethoscope className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">HMS Nova BHT</h3>
                    <p className="text-sm text-muted-foreground">Etableres som godkjent BHT i løpet av året</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold">Minimum lovkrav + tilleggstjenester</p>
                      <p className="text-sm text-muted-foreground">Rådgivning, risikokartlegging, vernerunde, AMU, revisjon, opplæring</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold">Bredt kursutbud</p>
                      <p className="text-sm text-muted-foreground">Diisocyanater, verneombud, førstehjelp og mange flere – via sertifisert partner</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold">Ett system for HMS og BHT</p>
                      <p className="text-sm text-muted-foreground">Full integrasjon med HMS Nova – dokumentasjon og sporbarhet på ett sted</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm font-semibold text-primary text-center">
                    🎯 Ett leverandørforhold: HMS-system, BHT og kurs
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">
              Uten BHT risikerer bedriften din
            </h2>
            <p className="text-muted-foreground">
              Mange bedrifter undervurderer viktigheten av god bedriftshelsetjeneste
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <TrendingDown className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">Høyt sykefravær</h3>
                <p className="text-sm text-muted-foreground">
                  Gjennomsnittlig sykefravær i Norge er 6,4%. Bedrifter uten BHT ligger ofte høyere.
                  Det koster din bedrift opptil <strong>500.000 kr/år</strong> per 10 ansatte.
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <Shield className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">Manglende lovpålagte krav</h3>
                <p className="text-sm text-muted-foreground">
                  Arbeidsmiljøloven krever BHT for bedrifter med <strong>5+ ansatte</strong> (2024-regelverk).
                  Manglende oppfyllelse kan gi <strong>bøter og erstatningskrav</strong>.
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <Users className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">Dårligere arbeidsmiljø</h3>
                <p className="text-sm text-muted-foreground">
                  Uten forebyggende helsearbeid øker risikoen for fysiske og psykiske
                  belastninger. Dette fører til <strong>lavere trivsel og produktivitet</strong>.
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardContent className="pt-6">
                <Briefcase className="h-8 w-8 text-destructive mb-3" />
                <h3 className="font-semibold mb-2">Vanskelig rekruttering</h3>
                <p className="text-sm text-muted-foreground">
                  74% av arbeidstakere vurderer arbeidsgivers <strong>helsetilbud</strong> når
                  de velger jobb. Uten BHT mister du de beste kandidatene.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pakker – START, PRO, PREMIUM */}
      <section id="tjenester" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-4">
              Planlagte pakker
            </Badge>
            <h2 className="text-3xl font-bold mb-3">Lovpålagt BHT + HMS Nova – fast pris per år</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Én pakkepris, ingen overraskelser. Alle pakker inkluderer godkjent BHT og full tilgang til HMS Nova.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-yellow-900">
                <strong>⚠️ Viktig:</strong> Vi er ikke godkjent BHT ennå. Disse pakkene blir tilgjengelig når vi er godkjent i løpet av året. 
                Registrer interesse så tar vi kontakt når vi er klare.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map((p) => (
              <Card key={p.tier} className="relative">
                <CardHeader>
                  <CardTitle className="text-lg">{p.label}</CardTitle>
                  <CardDescription>{p.description}</CardDescription>
                  <div className="pt-4">
                    <span className="text-3xl font-bold">{p.price.toLocaleString("nb-NO")} kr</span>
                    <span className="text-muted-foreground text-sm block">{p.priceNote} · per år</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.includes.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-4" asChild>
                    <Link href="#registrer-interesse">
                      Registrer interesse
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tilleggstjenester */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Tilleggstjenester</h2>
            <p className="text-muted-foreground">
              Faste priser ved behov – ingen åpne timepriser. Tilgjengelig når vi er godkjent BHT.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rådgivning og kartlegging</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Ekstra HMS-rådgivning: <strong>1 390 kr/time</strong></p>
                <p>Fysisk oppmøte: <strong>1 990 kr/time</strong> + reise</p>
                <p>Vernerunde: <strong>3 990 kr</strong></p>
                <p>Full risikovurdering: <strong>4 990 kr</strong></p>
                <p>Støy/kjemi/arbeidsmiljøkartlegging: <strong>5 990 kr</strong></p>
                <p>Arbeidsplassvurdering ergonomi: <strong>2 990 kr</strong></p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Helse, kurs og oppstart</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Helsekontroll: <strong>1 690 kr/ansatt</strong></p>
                <p>Influensavaksine: <strong>390 kr</strong> · Hepatitt: <strong>690 kr</strong></p>
                <p>Arbeidshelseattest: <strong>1 490 kr</strong></p>
                <p>Samtale/oppfølging lege: <strong>1 290 kr</strong></p>
                <p>HMS-kurs leder (AML §3-5): <strong>990 kr/deltaker</strong></p>
                <p>Verneombudskurs: <strong>3 990 kr</strong></p>
                <p>Førstehjelp/brann digitalt: <strong>590 kr</strong></p>
                <p>Bedriftstilpasset kurs: <strong>fra 6 990 kr</strong></p>
                <p>Oppsett/implementering: <strong>3 900–9 900 kr</strong> engangs</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Kurs – flere enn ordinære BHT */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Kurs – flere enn ordinære BHT</h2>
            <p className="text-muted-foreground">
              Vi har avtale med sertifisert opplæringsvirksomhet og kan tilby blant annet:
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold mb-2">Lovpålagte kurs:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>Diisocyanater</strong> – påbudt opplæring (EU-forordning)</li>
                    <li>• Verneombud (40-timer)</li>
                    <li>• HMS for ledere (§3-5 AML)</li>
                    <li>• Psykososialt arbeidsmiljø</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Spesialkurs:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Førstehjelp, fallsikring</li>
                    <li>• Kjemikaliehåndtering</li>
                    <li>• Bransjespesifikke kurs (bygg, industri, helse, transport)</li>
                    <li>• Fysisk, digitalt eller hybrid</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/hms-kurs">
                  <Button variant="outline" className="w-full">
                    Se alle kurs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Hvorfor HMS Nova BHT */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Hvorfor HMS Nova som BHT?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Ett sted for HMS og BHT</h3>
                    <p className="text-sm text-muted-foreground">
                      HMS Nova er allerede ditt HMS-system. Når vi er godkjent BHT, får du 
                      dokumentasjon, BHT-oppfølging og kurs i samme plattform – ingen dobbeltregistrering.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Flere kurs enn ordinære BHT</h3>
                    <p className="text-sm text-muted-foreground">
                      Via avtale med sertifisert opplæringsvirksomhet tilbyr vi blant annet 
                      <strong> Diisocyanater-kurs</strong> og andre spesialkurs som mange BHT-leverandører ikke har.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Reduser sykefravær</h3>
                    <p className="text-sm text-muted-foreground">
                      Bedrifter med god BHT-oppfølging ser gjennomsnittlig 20–30% reduksjon
                      i sykefravær – det lønner seg.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Minimum krav + alt du trenger ekstra</h3>
                    <p className="text-sm text-muted-foreground">
                      Vi tilbyr det lovpålagte minimum alle bedrifter trenger, pluss 
                      rådgivning, vernerunde, revisjon og opplæring – uten å måtte bruke flere leverandører.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Registrer interesse */}
      <section id="registrer-interesse" className="container mx-auto px-4 py-20">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">
              <ClipboardList className="h-3 w-3 mr-1" />
              Vi blir godkjent i løpet av året
            </Badge>
            <h2 className="text-3xl font-bold mb-3">Registrer interesse</h2>
            <p className="text-muted-foreground">
              Vi er ikke godkjent BHT ennå, men vi tar kontakt når vi er klare. 
              Fyll ut skjemaet eller ring salg for å høre mer.
            </p>
          </div>
          {interestSent ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="font-medium">Takk! Vi tar kontakt når vi er godkjent BHT.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sjekk telefonen – salg ringer deg for å høre mer om behovene dine.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={submitInterest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="interest-name">Navn</Label>
                    <Input
                      id="interest-name"
                      value={interestForm.name}
                      onChange={(e) => setInterestForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Ditt navn"
                      required
                      disabled={interestLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interest-email">E-post</Label>
                    <Input
                      id="interest-email"
                      type="email"
                      value={interestForm.email}
                      onChange={(e) => setInterestForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="din@bedrift.no"
                      required
                      disabled={interestLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interest-phone">Telefon (valgfritt)</Label>
                    <Input
                      id="interest-phone"
                      type="tel"
                      value={interestForm.phone}
                      onChange={(e) => setInterestForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+47 xxx xx xxx"
                      disabled={interestLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Antall ansatte</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={interestForm.tier}
                      onChange={(e) => setInterestForm((f) => ({ ...f, tier: e.target.value }))}
                      disabled={interestLoading}
                    >
                      <option value="SMALL">START – 1–5 ansatte</option>
                      <option value="MEDIUM">PRO – 6–20 ansatte</option>
                      <option value="LARGE">PREMIUM – 20+ ansatte</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={interestLoading}>
                    {interestLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sender...
                      </>
                    ) : (
                      "Registrer interesse"
                    )}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Vi bruker opplysningene kun til å kontakte deg når vi er godkjent. Ingen forpliktelse.
                </p>
                <div className="mt-6 pt-6 border-t text-center">
                  <p className="text-sm text-muted-foreground mb-3">Eller vil du heller at vi ringer deg?</p>
                  <RingMegDialog
                    trigger={
                      <Button type="button" variant="outline" className="w-full sm:w-auto">
                        <Phone className="mr-2 h-4 w-4" />
                        Ring meg
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Venteliste */}
      <section id="venteliste" className="container mx-auto px-4 py-16 md:py-20 bg-muted/30">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Sett deg på venteliste</h2>
            <p className="text-muted-foreground">
              Vi har begrenset kapasitet. Skriv inn e-post – så gir vi deg tilbud eller adgang når vi er godkjent og har plass.
            </p>
          </div>
          {waitlistSent ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="font-medium">Du er på ventelisten.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Vi tar kontakt når vi er godkjent og har plass til flere.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={submitWaitlist} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="waitlist-email">E-post</Label>
                    <Input
                      id="waitlist-email"
                      type="email"
                      value={waitlistForm.email}
                      onChange={(e) => setWaitlistForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="din@bedrift.no"
                      required
                      disabled={waitlistLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waitlist-name">Navn (valgfritt)</Label>
                    <Input
                      id="waitlist-name"
                      value={waitlistForm.name}
                      onChange={(e) => setWaitlistForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Ditt navn eller bedrift"
                      disabled={waitlistLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Antall ansatte (valgfritt)</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={waitlistForm.tier}
                      onChange={(e) => setWaitlistForm((f) => ({ ...f, tier: e.target.value }))}
                      disabled={waitlistLoading}
                    >
                      <option value="SMALL">START – 1–5 ansatte</option>
                      <option value="MEDIUM">PRO – 6–20 ansatte</option>
                      <option value="LARGE">PREMIUM – 20+ ansatte</option>
                    </select>
                  </div>
                  <Button type="submit" variant="outline" className="w-full" size="lg" disabled={waitlistLoading}>
                    {waitlistLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrerer...
                      </>
                    ) : (
                      "Sett meg på ventelisten"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Ofte stilte spørsmål om BHT</h2>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hvem må ha bedriftshelsetjeneste?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Fra 2024 er alle bedrifter med <strong>5 eller flere ansatte</strong> lovpålagt å ha tilknyttet
                  bedriftshelsetjeneste, jf. Arbeidsmiljøloven § 3-3.
                </p>
                <p className="text-muted-foreground">
                  Dette inkluderer også krav om <strong>AMO-kurs (Arbeidsmiljøopplæring)</strong> for
                  ledere, verneombud og medlemmer av arbeidsmiljøutvalget.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Når kan vi få BHT fra HMS Nova?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  HMS Nova etablerer seg som godkjent bedriftshelsetjeneste og forventer å kunne 
                  tilby full BHT i løpet av året. Registrer interesse så tar vi kontakt når vi er klare.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hva koster BHT fra HMS Nova?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Vi tilbyr tre pakker med fast pris per år (når vi er godkjent):
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4 mb-3">
                  <li><strong>START (1–5 ansatte):</strong> 6 900 kr/år (575 kr/mnd)</li>
                  <li><strong>PRO (6–20 ansatte):</strong> 14 900 kr/år</li>
                  <li><strong>PREMIUM (20+ ansatte):</strong> 29 900 kr/år + 350 kr/ekstra ansatt over 20</li>
                </ul>
                <p className="text-muted-foreground">
                  Alle pakker inkluderer godkjent BHT-tilknytning og full tilgang til HMS Nova. 
                  Tilleggstjenester bestilles ved behov til faste priser.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kan jeg bruke min eksisterende BHT-leverandør?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ja. HMS Nova som HMS-system fungerer uavhengig av hvem som leverer BHT. 
                  Når vi er godkjent BHT, kan du velge å ha HMS og BHT hos oss for én leverandør og full integrasjon.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hva skjer hvis vi ikke har BHT?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Arbeidstilsynet kan gi pålegg om tilknytning til BHT, samt ilegge dagbøter
                  inntil kravet er oppfylt. Bedriften kan også bli erstatningsansvarlig ved
                  arbeidsulykker eller helseskader som kunne vært unngått med BHT-bistand.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hva er AMO-kurs og hvem må ta det?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  <strong>AMO-kurs (Arbeidsmiljøopplæring)</strong> er lovpålagt opplæring for:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                  <li>Ledere med personalansvar</li>
                  <li>Verneombud</li>
                  <li>Medlemmer av arbeidsmiljøutvalget (AMU)</li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  Vi tilbyr AMO-kurs som del av BHT-tilbudet, både fysisk og digitalt.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hvorfor Diisocyanater og andre spesialkurs?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Fra EU-forordning 2020/1149 kreves obligatorisk opplæring ved arbeid med diisocyanater 
                  (over 0,1 %). HMS Nova har avtale med sertifisert opplæringsvirksomhet og kan tilby 
                  Diisocyanater-kurs og mange andre HMS-kurs – ofte flere enn det ordinære BHT-leverandører tilbyr.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <HeartPulse className="h-16 w-16 mx-auto mb-6 text-primary-foreground" />
            <h2 className="text-3xl font-bold mb-4">Interessert i BHT fra HMS Nova?</h2>
            <p className="text-lg mb-2 text-primary-foreground/90">
              Vi blir godkjent BHT i løpet av året
            </p>
            <p className="text-sm mb-8 text-primary-foreground/70">
              Registrer interesse så tar vi kontakt når vi er klare. Minimum lovkrav, tilleggstjenester og kurs – under ett tak.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="#registrer-interesse">
                <Button size="lg" className="bg-green-700 hover:bg-green-800 text-white">
                  Registrer interesse
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="tel:+4741874010">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  <Phone className="mr-2 h-5 w-5" />
                  Ring salg
                </Button>
              </a>
            </div>
            <p className="text-sm mt-6 text-primary-foreground/70">
              Ring oss på <a href="tel:+4741874010" className="underline font-semibold">+47 41 87 40 10</a> for uforpliktende rådgivning
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
