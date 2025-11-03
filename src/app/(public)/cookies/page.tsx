"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cookie, Shield, BarChart, Target, Settings } from "lucide-react";
import { useState } from "react";

export default function CookiesPage() {
  const lastUpdated = "2. november 2024";
  const [showCookieSettings, setShowCookieSettings] = useState(false);

  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-6">
            <Cookie className="h-3 w-3 mr-2" />
            Cookies
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Informasjonskapsler (Cookies)
          </h1>
          <p className="text-xl text-muted-foreground">
            Hvordan HMS Nova bruker cookies for å forbedre din opplevelse
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Sist oppdatert: {lastUpdated}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hva er cookies?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Cookies (informasjonskapsler) er små tekstfiler som lagres på din enhet når du besøker 
                et nettsted. De brukes til å huske dine preferanser, holde deg innlogget, og analysere 
                hvordan du bruker nettstedet.
              </p>
              <p className="text-muted-foreground">
                Cookies kan settes av oss (førsteparts-cookies) eller av tredjeparter som 
                analyseverktøy (tredjeparts-cookies).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hvilke cookies bruker HMS Nova?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Strengt nødvendige */}
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-lg">Strengt nødvendige cookies</h4>
                  <Badge variant="outline" className="ml-auto">Kan ikke avslås</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Disse cookies er nødvendige for at nettstedet skal fungere og kan ikke slås av. 
                  De settes kun som respons på handlinger du utfører.
                </p>
                
                <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-sm">
                  <div className="border-b pb-2">
                    <p className="font-semibold">next-auth.session-token</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-muted-foreground">
                      <div><strong>Formål:</strong> Autentisering</div>
                      <div><strong>Varighet:</strong> Til utlogging</div>
                      <div className="col-span-2"><strong>Beskrivelse:</strong> Holder deg innlogget i HMS Nova</div>
                    </div>
                  </div>
                  
                  <div className="border-b pb-2">
                    <p className="font-semibold">next-auth.csrf-token</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-muted-foreground">
                      <div><strong>Formål:</strong> Sikkerhet</div>
                      <div><strong>Varighet:</strong> Sesjon</div>
                      <div className="col-span-2"><strong>Beskrivelse:</strong> Beskytter mot CSRF-angrep</div>
                    </div>
                  </div>
                  
                  <div className="border-b pb-2">
                    <p className="font-semibold">hms-nova-tenant</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-muted-foreground">
                      <div><strong>Formål:</strong> Multi-tenant</div>
                      <div><strong>Varighet:</strong> 30 dager</div>
                      <div className="col-span-2"><strong>Beskrivelse:</strong> Husker hvilken bedrift du er tilknyttet</div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-semibold">cookie-consent</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-muted-foreground">
                      <div><strong>Formål:</strong> GDPR-samtykke</div>
                      <div><strong>Varighet:</strong> 12 måneder</div>
                      <div className="col-span-2"><strong>Beskrivelse:</strong> Lagrer dine cookie-preferanser</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Funksjonelle */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-lg">Funksjonelle cookies</h4>
                  <Badge variant="outline" className="ml-auto">Valgfritt</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Disse cookies gjør det mulig å huske valg du har gjort (f.eks. språk, region) 
                  for å gi deg en mer personlig opplevelse.
                </p>
                
                <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-sm">
                  <div className="border-b pb-2">
                    <p className="font-semibold">user-preferences</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-muted-foreground">
                      <div><strong>Formål:</strong> Brukeropplevelse</div>
                      <div><strong>Varighet:</strong> 12 måneder</div>
                      <div className="col-span-2"><strong>Beskrivelse:</strong> Lagrer språk, tema (mørk/lys), dashbordlayout</div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-semibold">notification-settings</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-muted-foreground">
                      <div><strong>Formål:</strong> Notifikasjoner</div>
                      <div><strong>Varighet:</strong> 6 måneder</div>
                      <div className="col-span-2"><strong>Beskrivelse:</strong> Husker hvilke notifikasjoner du vil motta</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analyse */}
              <div className="border-l-4 border-purple-500 pl-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold text-lg">Analyse-cookies</h4>
                  <Badge variant="outline" className="ml-auto">Valgfritt</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Disse cookies hjelper oss å forstå hvordan besøkende bruker nettstedet, 
                  slik at vi kan forbedre brukeropplevelsen.
                </p>
                
                <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-sm">
                  <div className="border-b pb-2">
                    <p className="font-semibold">_ga (Google Analytics)</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-muted-foreground">
                      <div><strong>Formål:</strong> Analyse</div>
                      <div><strong>Varighet:</strong> 2 år</div>
                      <div className="col-span-2"><strong>Beskrivelse:</strong> Brukes til å skille brukere</div>
                    </div>
                  </div>
                  
                  <div className="border-b pb-2">
                    <p className="font-semibold">_gid (Google Analytics)</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-muted-foreground">
                      <div><strong>Formål:</strong> Analyse</div>
                      <div><strong>Varighet:</strong> 24 timer</div>
                      <div className="col-span-2"><strong>Beskrivelse:</strong> Brukes til å skille brukere</div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-semibold">_gat (Google Analytics)</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-muted-foreground">
                      <div><strong>Formål:</strong> Analyse</div>
                      <div><strong>Varighet:</strong> 1 minutt</div>
                      <div className="col-span-2"><strong>Beskrivelse:</strong> Brukes til å redusere antall forespørsler</div>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Merk:</strong> Vi bruker Google Analytics med IP-anonymisering. 
                  Les mer i{" "}
                  <a 
                    href="https://policies.google.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Googles personvernerklæring
                  </a>.
                </p>
              </div>

              {/* Markedsføring */}
              <div className="border-l-4 border-orange-500 pl-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-orange-600" />
                  <h4 className="font-semibold text-lg">Markedsførings-cookies</h4>
                  <Badge variant="outline" className="ml-auto">Valgfritt</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Disse cookies brukes til å vise deg relevante annonser og måle effekten av 
                  markedsføringskampanjer.
                </p>
                
                <div className="bg-muted/30 rounded-lg p-4 text-sm">
                  <p className="text-muted-foreground">
                    <strong>Vi bruker for øyeblikket ikke markedsførings-cookies.</strong> 
                    Hvis dette endres, vil vi oppdatere denne siden og be om nytt samtykke.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hvordan administrere cookies?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Via vårt samtykke-verktøy</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Du kan når som helst endre dine cookie-preferanser ved å klikke på knappen nedenfor:
                </p>
                <Button 
                  onClick={() => {
                    // Trigger cookie consent banner
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('cookie-consent');
                      window.location.reload();
                    }
                  }}
                  className="w-full md:w-auto"
                >
                  <Cookie className="mr-2 h-4 w-4" />
                  Endre cookie-innstillinger
                </Button>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. Via nettleseren din</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Du kan også administrere eller slette cookies gjennom nettleserens innstillinger:
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold min-w-[100px]">Chrome:</span>
                    <span>Innstillinger → Personvern og sikkerhet → Cookies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold min-w-[100px]">Firefox:</span>
                    <span>Innstillinger → Personvern og sikkerhet → Cookies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold min-w-[100px]">Safari:</span>
                    <span>Preferanser → Personvern → Cookies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold min-w-[100px]">Edge:</span>
                    <span>Innstillinger → Cookies og nettstedstillatelser</span>
                  </li>
                </ul>
                
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Merk:</strong> Hvis du blokkerer alle cookies, kan noen funksjoner i HMS Nova slutte å virke.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Do Not Track (DNT)</h4>
                <p className="text-sm text-muted-foreground">
                  Vi respekterer "Do Not Track"-signaler fra nettleseren din. 
                  Hvis DNT er aktivert, vil vi ikke sette analyse- eller markedsførings-cookies.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Konsekvenser av å avslå cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold">Strengt nødvendige cookies</p>
                    <p className="text-muted-foreground">
                      Kan ikke avslås. Hvis du blokkerer disse via nettleseren, vil HMS Nova ikke fungere.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    ⚠
                  </div>
                  <div>
                    <p className="font-semibold">Funksjonelle cookies</p>
                    <p className="text-muted-foreground">
                      Hvis avslått, husker ikke systemet dine preferanser (språk, tema, layout).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    ℹ
                  </div>
                  <div>
                    <p className="font-semibold">Analyse-cookies</p>
                    <p className="text-muted-foreground">
                      Hvis avslått, kan vi ikke forbedre brukeropplevelsen basert på bruksmønstre.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                    ℹ
                  </div>
                  <div>
                    <p className="font-semibold">Markedsførings-cookies</p>
                    <p className="text-muted-foreground">
                      Hvis avslått, vil du ikke se personaliserte annonser (vi bruker for øyeblikket ikke disse).
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tredjeparts-cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                HMS Nova kan inneholde innhold fra tredjeparter som setter sine egne cookies:
              </p>

              <div className="space-y-2 text-sm">
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="font-semibold">Google Analytics</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Brukes til analyse av bruksmønstre. 
                    <a 
                      href="https://policies.google.com/technologies/cookies" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      Les mer →
                    </a>
                  </p>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="font-semibold">Cloudflare</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Sikkerhet og ytelse (CDN).
                    <a 
                      href="https://www.cloudflare.com/cookie-policy/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      Les mer →
                    </a>
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Vi er ikke ansvarlige for cookies satt av tredjeparter. 
                Les deres personvernerklæringer for mer informasjon.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endringer i cookie-policyen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Vi kan oppdatere denne cookie-policyen fra tid til annen for å gjenspeile endringer 
                i teknologien eller lovgivningen. Vi oppfordrer deg til å sjekke denne siden regelmessig.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Sist oppdatert: <strong>{lastUpdated}</strong>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-4">Spørsmål om cookies?</h3>
              <p className="text-muted-foreground mb-4">
                Hvis du har spørsmål om hvordan vi bruker cookies, ta kontakt:
              </p>
              <p className="text-sm">
                <a href="mailto:post@kksas.no" className="text-primary font-semibold hover:underline">
                  post@kksas.no
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

