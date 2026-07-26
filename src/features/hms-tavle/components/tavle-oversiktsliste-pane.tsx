"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Users, AlertTriangle, CalendarCheck } from "lucide-react";
import { OVERSIKTSLISTE_RETENTION_MONTHS } from "@/features/hms-tavle/lib/oversiktsliste-config";

interface CheckinRad {
  id: string;
  name: string;
  employer: string | null;
  employerOrgNr: string | null;
  hmsCardNr: string | null;
  birthDate: string | null;
  phone: string | null;
  checkedInAt: string;
  checkedOutAt: string | null;
  date: string;
}

interface SiteInfo {
  siteName: string;
  siteAddress: string | null;
  clientName: string | null;
}

interface Props {
  tavleId: string;
  hasCheckin: boolean;
}

function iDag(): string {
  return new Date().toISOString().slice(0, 10);
}

function forrigeMaaned(): string {
  const dato = new Date();
  dato.setMonth(dato.getMonth() - 1);
  return dato.toISOString().slice(0, 10);
}

function formaterKlokke(verdi: string | null): string {
  if (!verdi) return "–";
  return new Date(verdi).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Oversiktslisten – Byggherreforskriften § 15.
 * Gir historikk og nedlastbar CSV slik at listen kan vises til arbeidsgiver,
 * verneombud, Arbeidstilsynet og skattemyndighetene, jf. § 15 fjerde ledd.
 */
export function TavleOversiktslistePane({ tavleId, hasCheckin }: Props) {
  const [from, setFrom] = useState(forrigeMaaned());
  const [to, setTo] = useState(iDag());
  const [rader, setRader] = useState<CheckinRad[]>([]);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [laster, setLaster] = useState(false);

  const hentListe = useCallback(async () => {
    setLaster(true);
    try {
      const res = await fetch(
        `/api/hms-tavle/${tavleId}/oversiktsliste?from=${from}&to=${to}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kunne ikke hente oversiktslisten");
      setRader(json.data?.checkins ?? []);
      setSite(json.data?.site ?? null);
      setTruncated(Boolean(json.data?.truncated));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLaster(false);
    }
  }, [tavleId, from, to]);

  useEffect(() => {
    if (hasCheckin) void hentListe();
  }, [hasCheckin, hentListe]);

  function lastNedCsv() {
    window.location.href = `/api/hms-tavle/${tavleId}/oversiktsliste?from=${from}&to=${to}&format=csv`;
  }

  if (!hasCheckin) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-2">
          <Users className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            QR-innsjekk krever Standard-plan eller høyere.
          </p>
        </CardContent>
      </Card>
    );
  }

  const manglerFelter = rader.filter(
    (rad) => !rad.birthDate || !rad.employerOrgNr || !rad.hmsCardNr
  ).length;

  const dagerIListen = new Set(rader.map((rad) => rad.date)).size;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Oversiktsliste</h3>
        <p className="text-sm text-muted-foreground">
          Byggherreforskriften § 15. Listen skal kontrolleres og oppdateres daglig, kunne
          vises til arbeidsgiver, verneombud, Arbeidstilsynet og skattemyndighetene, og
          oppbevares i {OVERSIKTSLISTE_RETENTION_MONTHS} måneder etter at arbeidet er avsluttet.
        </p>
      </div>

      {site && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Opplysninger om plassen – § 15 bokstav a og b</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Bygge-/anleggsplass</p>
              <p className="font-medium break-words">{site.siteName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Adresse</p>
              <p className={site.siteAddress ? "font-medium break-words" : "text-orange-600"}>
                {site.siteAddress ?? "Mangler – fyll inn i Innstillinger"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Byggherre</p>
              <p className={site.clientName ? "font-medium break-words" : "text-orange-600"}>
                {site.clientName ?? "Mangler – fyll inn i Innstillinger"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="oversiktsliste-fra">Fra dato</Label>
              <Input
                id="oversiktsliste-fra"
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oversiktsliste-til">Til dato</Label>
              <Input
                id="oversiktsliste-til"
                type="date"
                value={to}
                min={from}
                max={iDag()}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" className="bg-transparent" onClick={hentListe} disabled={laster}>
                {laster ? "Henter..." : "Oppdater"}
              </Button>
              <Button onClick={lastNedCsv} disabled={rader.length === 0}>
                <Download className="h-4 w-4 mr-1.5" />
                Last ned CSV
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarCheck className="h-3.5 w-3.5" />
              {rader.length} registrering(er) over {dagerIListen} dag(er)
            </span>
            {manglerFelter > 0 && (
              <span className="inline-flex items-center gap-1 text-orange-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {manglerFelter} rad(er) mangler fødselsdato, organisasjonsnummer eller HMS-kortnummer
              </span>
            )}
            {truncated && (
              <span className="text-orange-600">
                Viser de nyeste radene. Snevre inn datoene for full oversikt.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {rader.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Ingen innsjekk i valgt periode.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-3 py-2 whitespace-nowrap">Dato</th>
                    <th className="text-left font-medium px-3 py-2 whitespace-nowrap">Navn</th>
                    <th className="text-left font-medium px-3 py-2 whitespace-nowrap">Fødselsdato</th>
                    <th className="text-left font-medium px-3 py-2 whitespace-nowrap">Arbeidsgiver</th>
                    <th className="text-left font-medium px-3 py-2 whitespace-nowrap">Org.nr</th>
                    <th className="text-left font-medium px-3 py-2 whitespace-nowrap">HMS-kort</th>
                    <th className="text-left font-medium px-3 py-2 whitespace-nowrap">Inn</th>
                    <th className="text-left font-medium px-3 py-2 whitespace-nowrap">Ut</th>
                  </tr>
                </thead>
                <tbody>
                  {rader.map((rad) => (
                    <tr key={rad.id} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap">{rad.date}</td>
                      <td className="px-3 py-2">{rad.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {rad.birthDate ?? <span className="text-orange-600">Mangler</span>}
                      </td>
                      <td className="px-3 py-2">{rad.employer ?? "–"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {rad.employerOrgNr ?? <span className="text-orange-600">Mangler</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {rad.hmsCardNr ?? <span className="text-orange-600">Mangler</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{formaterKlokke(rad.checkedInAt)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {rad.checkedOutAt ? (
                          formaterKlokke(rad.checkedOutAt)
                        ) : rad.date === iDag() ? (
                          <Badge variant="secondary" className="text-[10px]">
                            På plassen
                          </Badge>
                        ) : (
                          "–"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
