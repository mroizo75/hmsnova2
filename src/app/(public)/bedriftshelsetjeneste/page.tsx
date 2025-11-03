"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RegisterDialog } from "@/components/register-dialog";
import { 
  CheckCircle2, 
  ArrowRight,
  Heart,
  Shield,
  Users,
  Stethoscope,
  Calendar,
  FileText,
  Phone,
  Clock,
  Building2,
  TrendingDown,
  AlertCircle,
  Zap,
  Award,
  HeartPulse,
  Briefcase,
  GraduationCap
} from "lucide-react";
import type { Metadata } from "next";

export default function BHTPage() {
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
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Friske medarbeidere.<br />
              <span className="text-primary">Sterkere bedrift.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Som HMS Nova-kunde får du <strong>10% rabatt</strong> på Bedriftshelsetjeneste 
              gjennom vår partner Dr. Dropin – Norges mest moderne og fleksible BHT-leverandør.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <RegisterDialog>
                <Button size="lg">
                  <HeartPulse className="mr-2 h-5 w-5" />
                  Kom i gang med BHT
                </Button>
              </RegisterDialog>
              <Link href="#pakker">
                <Button size="lg" variant="outline">
                  Se BHT-pakker
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              ✓ Lovpålagt for bedrifter med <strong>5+ ansatte</strong> (2024-regelverk)<br/>
              ✓ Full digital løsning integrert i HMS Nova<br/>
              ✓ <strong>10% rabatt</strong> på BHT hos Dr. Dropin<br/>
              ✓ <strong>20% rabatt</strong> på alle HMS-kurs (KKS AS)<br/>
              ✓ AMO-kurs (Arbeidsmiljøopplæring) inkludert
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
                    <h3 className="font-bold text-xl">Dr. Dropin BHT</h3>
                    <p className="text-sm text-muted-foreground">Partner siden 2025</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold">Digital helsejournal</p>
                      <p className="text-sm text-muted-foreground">Automatisk synkronisering med HMS Nova</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold">Fleksible løsninger</p>
                      <p className="text-sm text-muted-foreground">Fysisk eller digitalt, tilpasset din bedrift</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold">10% HMS Nova-rabatt</p>
                      <p className="text-sm text-muted-foreground">Eksklusiv avtale for våre kunder</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm font-semibold text-primary text-center">
                    🎁 HMS Nova-kunder får 10% rabatt + digital integrasjon
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

      {/* Solution */}
      <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <Badge variant="default" className="mb-4">
              Løsningen
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              HMS Nova + Dr. Dropin = Komplett helseløsning
            </h2>
            <p className="text-xl text-muted-foreground">
              Vi har inngått eksklusiv avtale med Dr. Dropin – godkjent av Arbeidstilsynet 
              med <strong>over 3 000 bedrifter</strong> i hele Norge
            </p>
          </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">1. Søk gjennom HMS Nova</h3>
              <p className="text-sm text-muted-foreground">
                Direkte søknad i systemet – vi sender automatisk til Dr. Dropin med 10% rabattkode
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">2. Velg BHT-pakke</h3>
              <p className="text-sm text-muted-foreground">
                Dr. Dropin tilpasser løsning til din bedrift – fysisk, digitalt eller hybrid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">3. Integrer med HMS</h3>
              <p className="text-sm text-muted-foreground">
                BHT-dokumentasjon synkroniseres automatisk med HMS Nova for full sporbarhet
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pakker */}
      <section id="pakker" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">BHT-pakker fra Dr. Dropin</h2>
            <p className="text-muted-foreground">
              Alle HMS Nova-kunder får 10% rabatt på alle pakker
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Basispakke */}
            <Card>
              <CardHeader>
                <CardTitle>Grunnpakke BHT</CardTitle>
                <CardDescription>Dekker lovkravet</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">Kontakt oss</span>
                  <span className="text-muted-foreground text-sm block mt-1">For priser tilpasset din bedrift</span>
                </div>
                <p className="text-xs text-primary font-semibold mt-2">
                  Fast, lav pris + 10% HMS Nova-rabatt
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Lovpålagt tilknytning (kontrakt)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Årsplan (plan for bistand)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Fast kontaktperson</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Digital bedriftsportal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Ingen bindingstid</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Integrert i HMS Nova</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="mailto:support@hmsnova.com?subject=BHT Grunnpakke">
                    Få pristilbud
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Standard */}
            <Card className="border-primary shadow-xl scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="px-4 py-1">Mest populær</Badge>
              </div>
              <CardHeader>
                <CardTitle>Tilleggstjenester</CardTitle>
                <CardDescription>Bestilles ved behov</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">À la carte</span>
                  <span className="text-muted-foreground text-sm block mt-1">Rimelige priser</span>
                </div>
                <p className="text-xs text-primary font-semibold mt-2">
                  Betal kun for det du trenger
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-semibold">Tilgjengelig ved behov:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>AMO-kurs (Arbeidsmiljøopplæring)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Fysisk arbeidsplassvurdering</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Helseundersøkelser</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Influensavaksine</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Lederstøtte og rådgivning</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Spesialtilpassede kurs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>10% rabatt for HMS Nova-kunder</span>
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link href="mailto:support@hmsnova.com?subject=BHT Tilleggstjenester">
                    Få pristilbud
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Storkunde */}
            <Card>
              <CardHeader>
                <CardTitle>Storkunde</CardTitle>
                <CardDescription>50+ ansatte</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">Skreddersydd</span>
                  <span className="text-muted-foreground text-sm block mt-1">Tilpasset din bedrift</span>
                </div>
                <p className="text-xs text-primary font-semibold mt-2">
                  Fast kontaktperson + dedikert team
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-semibold">For større organisasjoner:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Dedikert BHT-team</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Erfarne rådgivere</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Bistand over hele landet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Digitale og fysiske tjenester</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Alle bransjer og størrelser</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Full HMS Nova-integrasjon</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>10% HMS Nova-rabatt</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="mailto:support@hmsnova.com?subject=BHT Storkunde">
                    Kontakt oss
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              HMS Nova-kunder får 10% rabatt på alle tjenester fra Dr. Dropin. 
              Kontakt oss for skreddersydd tilbud til din bedrift.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Godkjent av Arbeidstilsynet</span>
              <span>•</span>
              <Users className="h-4 w-4 text-primary" />
              <span>Over 3 000 fornøyde bedrifter</span>
              <span>•</span>
              <Clock className="h-4 w-4 text-primary" />
              <span>Ingen bindingstid</span>
            </div>
          </div>
        </div>
      </section>

      {/* Fordeler */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Hvorfor velge HMS Nova + Dr. Dropin?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Fullverdig BHT-leverandør</h3>
                    <p className="text-sm text-muted-foreground">
                      Dr. Dropin er godkjent av Arbeidstilsynet som BHT-leverandør og oppfyller 
                      alle lovkrav i Arbeidsmiljøloven.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Digital first</h3>
                    <p className="text-sm text-muted-foreground">
                      Moderne digital plattform som integreres direkte med HMS Nova. 
                      Spar tid og få alt på ett sted.
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
                      Bedrifter med god BHT-oppfølging ser gjennomsnittlig 20-30% reduksjon 
                      i sykefravær – det lønner seg!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Fleksibelt og tilgjengelig</h3>
                    <p className="text-sm text-muted-foreground">
                      Velg mellom fysiske konsultasjoner eller digitale videomøter. 
                      Dr. Dropin er tilgjengelig når det passer deg.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Medlemsfordeler */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardContent className="p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <Award className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold mb-4">🎁 Totale medlemsfordeler med HMS Nova</h2>
              <p className="text-lg text-muted-foreground">
                Som HMS Nova-medlem får du <strong className="text-green-600">ekstraordinære rabatter</strong> på både BHT og HMS-kurs:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-white border-green-200">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <HeartPulse className="h-12 w-12 text-green-600" />
                    <h3 className="font-bold text-lg">10% rabatt på BHT (Dr. Dropin)</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✅ Godkjent av Arbeidstilsynet</li>
                      <li>✅ Digital integrasjon med HMS Nova</li>
                      <li>✅ Ingen bindingstid</li>
                      <li>✅ Over 3000 bedrifter bruker Dr. Dropin</li>
                    </ul>
                    <p className="text-xs text-green-700 font-semibold pt-2">
                      Spar fra 648 kr/år (eks: 5 ansatte)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-green-200">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <GraduationCap className="h-12 w-12 text-green-600" />
                    <h3 className="font-bold text-lg">20% rabatt på alle HMS-kurs</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✅ Lovpålagte HMS-kurs (verneombud, ledelse, etc.)</li>
                      <li>✅ Førstehjelp for barn og voksne</li>
                      <li>✅ Spesialkurs fra KKS AS (inkl. diisocyanater)</li>
                      <li>✅ Fysisk, digitalt eller hybrid format</li>
                    </ul>
                    <p className="text-xs text-green-700 font-semibold pt-2">
                      Spar 2.000-5.000 kr årlig
                    </p>
                    <Link href="/hms-kurs">
                      <Button size="sm" variant="outline" className="mt-2">
                        Se alle kurs
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white rounded-lg p-6 border-2 border-green-200">
              <h4 className="font-bold text-center mb-4 text-xl">💰 Total verdi av HMS Nova-medlemskap</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="font-semibold text-green-700">HMS Nova software</p>
                  <p className="text-2xl font-bold text-green-600">Fra 6.000 kr/år</p>
                  <p className="text-xs text-muted-foreground">Komplett HMS-system</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="font-semibold text-green-700">BHT-rabatt (10%)</p>
                  <p className="text-2xl font-bold text-green-600">Fra 648 kr</p>
                  <p className="text-xs text-muted-foreground">Årlig (eks: 5 ansatte)</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="font-semibold text-green-700">HMS-kurs rabatt</p>
                  <p className="text-2xl font-bold text-green-600">2.000-5.000 kr</p>
                  <p className="text-xs text-muted-foreground">Årlig besparelse</p>
                </div>
              </div>
              <div className="text-center p-4 bg-primary text-primary-foreground rounded-lg">
                <p className="font-bold text-lg mb-1">Totalt årlig verdi: Fra 8.650 kr</p>
                <p className="text-sm opacity-90">HMS Nova (6.000 kr) + BHT-rabatt (648 kr) + Kurs-rabatt (2.000+ kr)</p>
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Hvordan aktivere?</strong> Rabattene aktiveres automatisk når du registrerer deg som HMS Nova-medlem. <br />
                Oppgi ditt org.nr eller medlemsnummer ved bestilling av kurs eller BHT.
              </p>
              <RegisterDialog>
                <Button size="lg" variant="default">
                  <HeartPulse className="mr-2 h-5 w-5" />
                  Bli medlem nå
                </Button>
              </RegisterDialog>
            </div>
          </CardContent>
        </Card>
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
                <CardTitle className="text-lg">Hva koster BHT i gjennomsnitt?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Dr. Dropin tilbyr fast, lav pris for grunnpakken som dekker lovkravet. 
                  Tilleggstjenester bestilles ved behov til rimelige priser.
                </p>
                <p className="text-muted-foreground">
                  Med HMS Nova får du 10% rabatt på alle tjenester + komplett digital integrasjon.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hvordan får jeg 10% rabatt hos Dr. Dropin?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Når du er HMS Nova-kunde, søker du om BHT direkte i systemet vårt. Vi sender 
                  automatisk din rabattkode til Dr. Dropin, som gir deg 10% på alle pakker.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kan jeg bruke min eksisterende BHT-leverandør?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ja! HMS Nova støtter alle BHT-leverandører. Men med Dr. Dropin får du:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                  <li>10% rabatt (kun HMS Nova-kunder)</li>
                  <li>Direkte integrasjon i HMS-systemet</li>
                  <li>Automatisk dokumentasjonsflyt</li>
                  <li>Modern digital plattform</li>
                </ul>
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
                  Vi leverer AMO-kurs som en del av BHT-pakken, både fysisk og digitalt.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hvor raskt kan vi komme i gang?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Du kan søke om BHT direkte fra HMS Nova i dag. Dr. Dropin tar vanligvis kontakt 
                  innen 1-2 virkedager, og du kan ha din første arbeidsplassvurdering og AMO-kurs innen 1-2 uker.
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
            <h2 className="text-3xl font-bold mb-4">Klar til å ta helseansvar?</h2>
            <p className="text-lg mb-2 text-primary-foreground/90">
              Få HMS Nova + 10% BHT-rabatt hos Dr. Dropin
            </p>
            <p className="text-sm mb-8 text-primary-foreground/70">
              Komplett HMS-løsning med integrert bedriftshelsetjeneste
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <RegisterDialog>
                <Button size="lg" variant="secondary">
                  Kom i gang nå
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </RegisterDialog>
              <Link href="mailto:support@hmsnova.com?subject=BHT-forespørsel">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  <Phone className="mr-2 h-5 w-5" />
                  Kontakt oss
                </Button>
              </Link>
            </div>
            <p className="text-sm mt-6 text-primary-foreground/70">
              Ring oss på <a href="tel:+4799112916" className="underline font-semibold">+47 99 11 29 16</a> for gratis rådgivning
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

