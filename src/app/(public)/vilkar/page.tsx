import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Mail, Phone } from "lucide-react";

export default function VilkarPage() {
  const lastUpdated = "2. november 2024";

  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-6">
            <FileText className="h-3 w-3 mr-2" />
            Bruksvilkår
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Bruksvilkår
          </h1>
          <p className="text-xl text-muted-foreground">
            Vilkår for bruk av HMS Nova og tjenester fra KKS AS
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Sist oppdatert: {lastUpdated}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Avtaleparter og aksept</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Disse bruksvilkårene ("Vilkårene") gjelder mellom <strong>KKS AS</strong> (org.nr. [fylles inn]), 
                ("Vi", "Oss", "Vår") og deg som bruker av HMS Nova ("Du", "Deg", "Din", "Kunden").
              </p>
              <p className="text-muted-foreground">
                Ved å registrere deg, opprette en konto eller bruke HMS Nova, aksepterer du disse Vilkårene 
                i sin helhet. Hvis du ikke aksepterer Vilkårene, må du ikke bruke tjenesten.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Tjenestebeskrivelse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                HMS Nova er en skybasert programvare (SaaS) for HMS-styring, dokumenthåndtering, 
                risikovurdering, avvikshåndtering, opplæringssporing og andre HMS-relaterte funksjoner.
              </p>
              
              <div>
                <h4 className="font-semibold mb-2">2.1 Tjenesten inkluderer:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Tilgang til HMS Nova-plattformen via nettleser</li>
                  <li>Lagring av data i sikre skysystemer</li>
                  <li>Automatiske oppdateringer og forbedringer</li>
                  <li>Kundesupport via e-post og telefon</li>
                  <li>Integrasjon med tredjepartstjenester (BHT, kursleverandører)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2.2 Tjenesten inkluderer IKKE:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Juridisk eller HMS-faglig rådgivning (dette må søkes hos kvalifiserte konsulenter)</li>
                  <li>Garanti for at systemet oppfyller alle spesifikke bransjekrav</li>
                  <li>Tilpasset utvikling eller spesialfunksjoner uten særskilt avtale</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Priser og betaling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">3.1 Abonnementspriser</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  HMS Nova tilbys i ulike abonnementspakker basert på antall ansatte:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><strong>1-20 ansatte:</strong> Gratis for alltid</li>
                  <li><strong>21-50 ansatte:</strong> 8.000 kr/år (eller 800 kr/måned)</li>
                  <li><strong>51+ ansatte:</strong> 12.000 kr/år (eller 1.200 kr/måned)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.2 Fakturering</h4>
                <p className="text-sm text-muted-foreground">
                  Faktura sendes ved aktivering av abonnement med 14 dagers betalingsfrist. 
                  For årsabonnement faktureres årlig forskuddsvis. For månedsabonnement faktureres månedlig.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.3 Forsinket betaling</h4>
                <p className="text-sm text-muted-foreground">
                  Ved forsinket betaling beregnes forsinkelsesrente i henhold til lov om renter ved forsinket betaling. 
                  Hvis faktura ikke betales innen fristen, kan tilgangen til HMS Nova stenges inntil betaling er mottatt.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3.4 Prisendringer</h4>
                <p className="text-sm text-muted-foreground">
                  Vi forbeholder oss retten til å endre priser med 30 dagers skriftlig varsel. 
                  Eksisterende kunder vil ikke påvirkes av prisøkninger før ved neste fornyelse.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Oppsigelse og avtaletid</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">4.1 Løpende avtale</h4>
                <p className="text-sm text-muted-foreground">
                  Årsabonnement løper i 12 måneder og fornyes automatisk med mindre det sies opp senest 
                  30 dager før utløp. Månedsabonnement løper måned for måned uten bindingstid.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4.2 Oppsigelse fra kunde</h4>
                <p className="text-sm text-muted-foreground">
                  Du kan si opp abonnementet når som helst ved å sende e-post til{" "}
                  <a href="mailto:post@kksas.no" className="text-primary hover:underline">post@kksas.no</a>. 
                  Oppsigelsen trer i kraft ved utløpet av gjeldende faktureringsperiode. 
                  Ingen refusjon for allerede betalt periode.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4.3 Oppsigelse fra KKS AS</h4>
                <p className="text-sm text-muted-foreground">
                  Vi kan si opp avtalen med 30 dagers varsel hvis du bryter Vilkårene, ikke betaler fakturaer, 
                  eller hvis vi velger å avslutte tjenesten. Ved oppsigelse fra vår side vil du få refundert 
                  forholdsmessig del av betalt abonnement.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4.4 Data ved oppsigelse</h4>
                <p className="text-sm text-muted-foreground">
                  Ved oppsigelse har du 30 dager på å eksportere dine data. Etter dette slettes alle data i 
                  henhold til vår personvernerklæring, med unntak av data vi er lovpålagt å beholde (f.eks. fakturaer).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Brukerens plikter og ansvar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Som bruker forplikter du deg til å:</p>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">•</span>
                  <span>Oppgi korrekte opplysninger ved registrering</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">•</span>
                  <span>Holde påloggingsinformasjon konfidensiell og ikke dele med uvedkommende</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">•</span>
                  <span>Ikke misbruke tjenesten til ulovlig aktivitet, spam, virus eller skadelig kode</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">•</span>
                  <span>Ikke forsøke å få uautorisert tilgang til andres data eller systemet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">•</span>
                  <span>Ikke laste opp innhold som bryter norsk lov, opphavsrett eller andre rettigheter</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">•</span>
                  <span>Ta egne sikkerhetskopier av kritiske data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-[20px]">•</span>
                  <span>Bruke tjenesten i tråd med gjeldende lover og forskrifter</span>
                </li>
              </ul>

              <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-sm font-semibold text-destructive">
                  Brudd på disse forpliktelsene kan føre til umiddelbar stenging av konto uten refusjon.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Våre plikter og ansvar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">6.1 Tilgjengelighet</h4>
                <p className="text-sm text-muted-foreground">
                  Vi skal tilstrebe at HMS Nova er tilgjengelig 99% av tiden (beregnet per måned), 
                  unntatt planlagt vedlikehold som varsles minst 24 timer i forveien.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">6.2 Sikkerhet</h4>
                <p className="text-sm text-muted-foreground">
                  Vi implementerer rimelige tekniske og organisatoriske sikkerhetstiltak for å beskytte dine data, 
                  men kan ikke garantere 100% sikkerhet mot alle trusler.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">6.3 Backup</h4>
                <p className="text-sm text-muted-foreground">
                  Vi tar daglige sikkerhetskopier av alle data, men anbefaler at du også tar egne kopier av 
                  kritiske dokumenter.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">6.4 Support</h4>
                <p className="text-sm text-muted-foreground">
                  Vi tilbyr kundesupport på norsk via e-post og telefon i normal arbeidstid (08:00-16:00, man-fre). 
                  Vi skal svare på henvendelser innen 2 virkedager.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Ansvarsbegrensning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">7.1 "Som den er"-basis</h4>
                <p className="text-sm text-muted-foreground">
                  HMS Nova leveres "som den er" uten garantier av noen art, verken uttrykkelige eller underforståtte. 
                  Vi garanterer ikke at tjenesten er feilfri, avbruddsfri eller oppfyller alle dine spesifikke behov.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">7.2 Begrenset erstatning</h4>
                <p className="text-sm text-muted-foreground">
                  Vårt totale erstatningsansvar overfor deg er begrenset til det du har betalt for tjenesten 
                  i de siste 12 månedene. Vi er ikke ansvarlige for indirekte tap, tapt fortjeneste, tap av data, 
                  eller andre konsekvenstap.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">7.3 Tredjepartstjenester</h4>
                <p className="text-sm text-muted-foreground">
                  HMS Nova kan integreres med tredjepartstjenester (f.eks. Dr. Dropin for BHT). 
                  Vi er ikke ansvarlige for disse tjenestenes funksjoner, tilgjengelighet eller kvalitet.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">7.4 Force majeure</h4>
                <p className="text-sm text-muted-foreground">
                  Vi er ikke ansvarlige for forsinkelser eller manglende oppfyllelse av våre forpliktelser 
                  som skyldes forhold utenfor vår kontroll (naturkatastrofer, krig, streik, 
                  myndighetspålegg, nettverkssvikt hos leverandører, osv.).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Immaterielle rettigheter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">8.1 Våre rettigheter</h4>
                <p className="text-sm text-muted-foreground">
                  HMS Nova, inkludert programvare, design, tekst, grafikk, logo og annet innhold, 
                  er beskyttet av opphavsrett og andre immaterielle rettigheter som eies av KKS AS. 
                  Du får kun en begrenset, ikke-eksklusiv, ikke-overførbar lisens til å bruke tjenesten.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">8.2 Dine rettigheter</h4>
                <p className="text-sm text-muted-foreground">
                  Du beholder full eiendomsrett til alle data, dokumenter og innhold du laster opp til HMS Nova. 
                  Ved å bruke tjenesten gir du oss en begrenset lisens til å lagre, behandle og vise dette 
                  innholdet som nødvendig for å levere tjenesten.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">8.3 Tilbakemelding</h4>
                <p className="text-sm text-muted-foreground">
                  Hvis du gir oss tilbakemeldinger, forslag eller ideer til forbedring av HMS Nova, 
                  kan vi fritt bruke disse uten forpliktelser overfor deg.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Endringer i Vilkårene</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Vi kan endre disse Vilkårene fra tid til annen. Ved vesentlige endringer vil vi varsle 
                deg via e-post eller melding i systemet minst 30 dager før endringene trer i kraft.
              </p>
              <p className="text-muted-foreground">
                Ved å fortsette å bruke HMS Nova etter at endringene trer i kraft, aksepterer du de nye Vilkårene. 
                Hvis du ikke aksepterer endringene, må du si opp abonnementet.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Tvister og lovvalg</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">10.1 Lovvalg</h4>
                <p className="text-sm text-muted-foreground">
                  Disse Vilkårene skal tolkes og reguleres i henhold til norsk lov.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">10.2 Tvisteløsning</h4>
                <p className="text-sm text-muted-foreground">
                  Tvister skal søkes løst i minnelighet. Hvis dette ikke lykkes, kan tvisten bringes inn 
                  for norske domstoler med [fylles inn] som verneting.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">10.3 Forbrukervern</h4>
                <p className="text-sm text-muted-foreground">
                  Hvis du er forbruker (kjøper tjenesten til privat bruk), kan du klage til Forbrukerrådet 
                  eller Forbrukertilsynet hvis du mener vi ikke overholder Vilkårene.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-4">Kontakt oss</h3>
              <p className="text-muted-foreground mb-4">
                Hvis du har spørsmål om Bruksvilkårene, ta kontakt:
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
                <p className="text-muted-foreground mt-4">
                  <strong>KKS AS</strong><br/>
                  Org.nr: [fylles inn]<br/>
                  [Adresse fylles inn]
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

