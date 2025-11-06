"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ArrowRight,
  Scale,
  Download,
  FileText,
  Shield,
  Book,
  AlertTriangle
} from "lucide-react";

export default function HMSLoverReglerPage() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-6">
              <Download className="h-3 w-3 mr-2" />
              Gratis oversikt
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Gratis oversikt over<br />
              <span className="text-primary">HMS-lover og regler</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              En lettfattelig oversikt over de viktigste HMS-lovene og forskriftene. 
              Forstå dine plikter som arbeidsgiver og unngå brudd på lovverket.
            </p>
          </div>

          <Card className="border-2 border-primary/20 shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Scale className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl">Komplett HMS-lovguide</h3>
                  <p className="text-muted-foreground">De viktigste lovene og forskriftene forklart</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Book className="h-5 w-5 text-primary" />
                    Hva får du?
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Oversikt over Arbeidsmiljøloven</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Forskrift om systematisk HMS-arbeid</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Nye regler fra 2024 (verneombud, BHT)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Relevante EU-direktiver og -forordninger</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Sanksjoner og straffer ved brudd</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Lenker til offisielle kilder</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Viktige lovområder
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Arbeidstid, hvile og ferie</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Verneombud og AMU</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Psykososialt arbeidsmiljø</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Kjemikalier og farlige stoffer</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Maskinsikkerhet og CE-merking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Brann og beredskap</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-6 mb-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Viktige endringer i 2024
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Fra 1. januar 2024:</strong> Alle bedrifter med 5 eller flere ansatte må ha verneombud. 
                  Verneombudet må ha gjennomført lovpålagt 40-timers opplæring.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>BHT-plikten:</strong> Alle bedrifter med 5+ ansatte er også pålagt å ha bedriftshelsetjeneste (BHT). 
                  Nye krav til psykososialt arbeidsmiljø har også trådt i kraft.
                </p>
              </div>

              <div className="text-center">
                <Button size="lg" asChild className="w-full md:w-auto">
                  <Link href="/gratis-hms-system">
                    <Download className="mr-2 h-5 w-5" />
                    Få lovguide + system som følger alle lover
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Ingen kredittkort. Ingen skjulte kostnader. Gratis for alltid.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Mer innhold */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              HMS Nova holder deg oppdatert på alle lovkrav
            </h2>
            <p className="text-muted-foreground">
              Istedenfor å lese lovtekster, få et system som automatisk følger gjeldende lovverk
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Scale className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Alltid oppdatert</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Når lover og forskrifter endres, oppdaterer vi HMS Nova automatisk. 
                  Du får beskjed hvis det er noe du må gjøre.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Innebygd compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  HMS Nova er bygget for å oppfylle alle krav i Arbeidsmiljøloven, 
                  HMS-forskriften og ISO 9001.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">Dokumentasjonsklart</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Alle handlinger dokumenteres automatisk. 
                  Hvis Arbeidstilsynet kommer på besøk, er du forberedt.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Card className="bg-primary text-primary-foreground border-0 inline-block">
              <CardContent className="p-8">
                <Scale className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Gratis for bedrifter med 1-20 ansatte</h3>
                <p className="text-primary-foreground/90 mb-6">
                  System som følger alle HMS-lover + automatiske oppdateringer
                </p>
                <Button size="lg" className="bg-green-700 hover:bg-green-800 text-white" asChild>
                  <Link href="/gratis-hms-system">
                    Kom i gang nå – helt gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

