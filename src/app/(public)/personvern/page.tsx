import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, Phone, MapPin } from "lucide-react";

export default function PersonvernPage() {
  const lastUpdated = "2. november 2024";

  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-6">
            <Shield className="h-3 w-3 mr-2" />
            Personvern
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Personvernerklæring
          </h1>
          <p className="text-xl text-muted-foreground">
            Vi tar ditt personvern på alvor. Her forklarer vi hvordan KKS AS samler inn, 
            bruker og beskytter dine personopplysninger i henhold til GDPR.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Sist oppdatert: {lastUpdated}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Dataansvarlig</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                <strong>KKS AS</strong> (Kurs og Kompetansesystemer AS) er dataansvarlig for 
                behandlingen av personopplysninger i HMS Nova og på www.kksas.no.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                <p><strong>KKS AS</strong></p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:post@kksas.no" className="hover:text-primary">post@kksas.no</a>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+4799112916" className="hover:text-primary">+47 99 11 29 16</a>
                </p>
                <p>Org.nr: [Skal fylles inn]</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Hvilke personopplysninger samler vi inn?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">2.1 Opplysninger du gir oss direkte</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Kontaktinformasjon:</strong> Navn, e-postadresse, telefonnummer, adresse</li>
                  <li><strong>Bedriftsinformasjon:</strong> Organisasjonsnummer, bedriftsnavn, faktureringsadresse</li>
                  <li><strong>Brukerkonto:</strong> Brukernavn, passord (kryptert), profilbilde, rolle</li>
                  <li><strong>HMS-data:</strong> Risikovurderinger, avviksmeldinger, opplæringshistorikk, dokumenter</li>
                  <li><strong>Kurspåmelding:</strong> Deltakerinformasjon, sertifikater, kurshistorikk</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2.2 Opplysninger vi samler inn automatisk</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Loggdata:</strong> IP-adresse, nettlesertype, tidsstempler, sidevisninger</li>
                  <li><strong>Cookies:</strong> Se vår <a href="/cookies" className="text-primary hover:underline">cookiepolicy</a></li>
                  <li><strong>Bruksmønstre:</strong> Hvilke funksjoner som brukes, frekvens, feilmeldinger</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2.3 Opplysninger fra tredjeparter</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Brønnøysundregistrene:</strong> Organisasjonsnummer, bedriftsnavn (for validering)</li>
                  <li><strong>Betalingsleverandør:</strong> Fakturastatus (via Fiken)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Formål med behandlingen og rettslig grunnlag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Vi behandler personopplysninger for følgende formål, basert på GDPR Artikkel 6:
              </p>

              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">Oppfylle avtale (Art. 6.1.b)</h4>
                  <p className="text-sm text-muted-foreground">
                    Levere HMS Nova-tjenester, kurspåmelding, tilgang til systemet, 
                    generere dokumenter og rapporter.
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">Lovpålagt behandling (Art. 6.1.c)</h4>
                  <p className="text-sm text-muted-foreground">
                    Bokføring (bokføringsloven), fakturering (regnskapsloven), 
                    oppbevare HMS-dokumentasjon (arbeidsmiljøloven).
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">Samtykke (Art. 6.1.a)</h4>
                  <p className="text-sm text-muted-foreground">
                    Nyhetsbrev, markedsføring, ikke-essensielle cookies (analyse og markedsføring).
                  </p>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">Berettiget interesse (Art. 6.1.f)</h4>
                  <p className="text-sm text-muted-foreground">
                    Forbedre tjenesten, analysere bruksmønstre, forebygge svindel og misbruk, 
                    gi kundesupport.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Hvor lenge lagrer vi personopplysninger?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start border-b pb-2">
                  <span className="font-semibold">Brukerkonto (aktiv)</span>
                  <span className="text-muted-foreground">Så lenge kontoen er aktiv</span>
                </div>
                <div className="flex justify-between items-start border-b pb-2">
                  <span className="font-semibold">HMS-dokumentasjon</span>
                  <span className="text-muted-foreground">Minimum 10 år (lovkrav)</span>
                </div>
                <div className="flex justify-between items-start border-b pb-2">
                  <span className="font-semibold">Fakturaer og regnskapsdata</span>
                  <span className="text-muted-foreground">5 år (bokføringsloven)</span>
                </div>
                <div className="flex justify-between items-start border-b pb-2">
                  <span className="font-semibold">Kursbevis og sertifikater</span>
                  <span className="text-muted-foreground">10 år</span>
                </div>
                <div className="flex justify-between items-start border-b pb-2">
                  <span className="font-semibold">Markedsføringssamtykke</span>
                  <span className="text-muted-foreground">Til samtykke trekkes tilbake</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="font-semibold">Analyse-cookies</span>
                  <span className="text-muted-foreground">Maks 26 måneder</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                Etter utløpet av lagringsperioden slettes eller anonymiseres dataene, 
                med mindre annet er påkrevd av lov.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Deling av personopplysninger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Vi deler <strong>ikke</strong> dine personopplysninger med tredjeparter for 
                markedsføringsformål. Vi deler kun data med:
              </p>

              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">Databehandlere (GDPR Art. 28)</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                    <li><strong>Cloudflare:</strong> Hosting og sikkerhet (EU/EØS)</li>
                    <li><strong>Resend:</strong> E-postutsendelse (EU/EØS)</li>
                    <li><strong>Dr. Dropin:</strong> BHT-tjenester (Norge)</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    Alle databehandlere har signert databehandleravtale og følger GDPR.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold">Lovpålagt utlevering</h4>
                  <p className="text-sm text-muted-foreground">
                    Vi kan dele opplysninger hvis påkrevd av lov, rettskjennelse eller offentlig myndighet.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Dine rettigheter etter GDPR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Du har følgende rettigheter i henhold til GDPR:
              </p>

              <div className="space-y-3">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                    Rett til innsyn (Art. 15)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Du kan be om en kopi av alle personopplysninger vi har om deg.
                  </p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                    Rett til retting (Art. 16)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Du kan be om at uriktige eller ufullstendige opplysninger rettes.
                  </p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                    Rett til sletting (Art. 17)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Du kan be om at personopplysninger slettes, med visse unntak (f.eks. lovpålagt lagring).
                  </p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">4</span>
                    Rett til begrensning (Art. 18)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Du kan be om at behandlingen av personopplysninger begrenses.
                  </p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">5</span>
                    Rett til dataportabilitet (Art. 20)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Du kan få utlevert personopplysninger i et strukturert, maskinlesbart format.
                  </p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">6</span>
                    Rett til å protestere (Art. 21)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Du kan protestere mot behandling basert på berettiget interesse eller markedsføring.
                  </p>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">7</span>
                    Rett til å trekke samtykke tilbake (Art. 7)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Hvis behandlingen er basert på samtykke, kan du når som helst trekke dette tilbake.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-semibold mb-2">Slik utøver du dine rettigheter:</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Send en e-post til <a href="mailto:post@kksas.no" className="text-primary font-semibold hover:underline">post@kksas.no</a> med 
                  emnet "GDPR-forespørsel". Vi svarer innen 30 dager.
                </p>
                <p className="text-sm text-muted-foreground">
                  Du har også rett til å klage til <strong>Datatilsynet</strong> hvis du mener 
                  behandlingen er i strid med GDPR.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Sikkerhetstiltak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Vi tar sikkerhet på alvor og har implementert følgende tiltak:
              </p>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Kryptering:</strong> SSL/TLS for all dataoverføring, krypterte passord (bcrypt)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Tilgangskontroll:</strong> Rollebasert tilgang (RBAC), multi-tenant isolasjon</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Logging:</strong> Alle kritiske handlinger logges med audit trail</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Backup:</strong> Daglig sikkerhetskopi av all data</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong>Sikkerhetsoppdateringer:</strong> Regelmessige oppdateringer av systemer</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Endringer i personvernerklæringen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Vi kan oppdatere denne personvernerklæringen fra tid til annen. 
                Ved vesentlige endringer vil vi varsle deg via e-post eller melding i systemet. 
                Vi oppfordrer deg til å sjekke denne siden regelmessig.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Sist oppdatert: <strong>{lastUpdated}</strong>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-4">Kontakt oss</h3>
              <p className="text-muted-foreground mb-4">
                Hvis du har spørsmål om hvordan vi behandler personopplysninger, 
                eller ønsker å utøve dine rettigheter, ta kontakt:
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <a href="mailto:post@kksas.no" className="text-primary font-semibold hover:underline">post@kksas.no</a>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <a href="tel:+4799112916" className="text-primary font-semibold hover:underline">+47 99 11 29 16</a>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  <span>KKS AS<br/>[Adresse skal fylles inn]</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

