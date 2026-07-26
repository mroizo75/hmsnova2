"use client";

import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Lock, Printer, QrCode, Sparkles } from "lucide-react";
import type { HmsTavlePlan } from "@prisma/client";
import { getPlanLimits } from "../lib/tavle-plan-limits";

interface Props {
  tavleUrl: string;
  plan: HmsTavlePlan;
  tenantName: string;
  logoUrl: string | null;
}

interface RomQr {
  rom: string;
  url: string;
  dataUrl: string;
}

const MAX_ROM = 300;
const MAX_RANGE = 200;

/**
 * Tolker en romliste fra fritekst. Støtter intervaller ("101-140"),
 * enkeltverdier og navngitte steder ("Resepsjon", "Bord 12").
 */
export function parseRomListe(input: string): string[] {
  const tokens = input
    .split(/[,;\n]/)
    .map((token) => token.trim())
    .filter(Boolean);

  const resultat: string[] = [];

  for (const token of tokens) {
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start <= end && end - start < MAX_RANGE) {
        for (let value = start; value <= end; value++) resultat.push(String(value));
        continue;
      }
    }
    resultat.push(token);
  }

  return Array.from(new Set(resultat)).slice(0, MAX_ROM);
}

export function TavleRomQr({ tavleUrl, plan, tenantName, logoUrl }: Props) {
  const [råListe, setRåListe] = useState("");
  const [språk, setSpråk] = useState<"nb" | "en">("nb");
  const [overskrift, setOverskrift] = useState("");
  const [koder, setKoder] = useState<RomQr[]>([]);
  const [genererer, setGenererer] = useState(false);

  const harTilgang = getPlanLimits(plan).hasBulkRoomQr;
  const forhåndsvisning = useMemo(() => parseRomListe(råListe), [råListe]);

  const standardOverskrift =
    språk === "en" ? "Something not right? Tell us." : "Er noe ikke som det skal? Si det til oss.";
  const underteksten =
    språk === "en"
      ? "Scan the code with your phone camera. Your message is confidential."
      : "Skann koden med mobilkameraet. Meldingen din er konfidensiell.";

  async function generer() {
    const rom = parseRomListe(råListe);
    if (rom.length === 0) {
      toast.error("Lim inn minst ett rom eller bord");
      return;
    }

    setGenererer(true);
    try {
      const generert = await Promise.all(
        rom.map(async (verdi) => {
          const url = `${tavleUrl}/melding?rom=${encodeURIComponent(verdi)}&lang=${språk}`;
          const dataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 1,
            color: { dark: "#0f172a", light: "#ffffff" },
          });
          return { rom: verdi, url, dataUrl };
        })
      );
      setKoder(generert);
      toast.success(`${generert.length} QR-koder klare for utskrift`);
    } catch {
      toast.error("Kunne ikke generere QR-koder");
    } finally {
      setGenererer(false);
    }
  }

  if (!harTilgang) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Rom- og bord-QR i skala
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Generer én QR per rom eller bord, med utskriftsvennlig ark klart for laminering. Krever
            Avansert-plan eller HMS Nova Add-on.
          </p>
          <p className="text-xs">
            Du kan fortsatt bruke den felles «Meld fra»-QR-koden over på alle planer med
            gjesteskjema.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #rom-qr-ark, #rom-qr-ark * { visibility: visible !important; }
          #rom-qr-ark {
            position: absolute;
            inset: 0;
            margin: 0;
            padding: 0;
          }
          .rom-qr-kort {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <Card className="print:hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <QrCode className="h-4 w-4 text-blue-600" />
            Rom- og bord-QR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hver QR åpner meldingsskjemaet med rommet ferdig utfylt, slik at gjesten kun skriver
            selve meldingen. Resepsjonen ser med én gang hvor saken gjelder.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="rom-liste">Rom, bord eller steder</Label>
            <Textarea
              id="rom-liste"
              rows={3}
              value={råListe}
              onChange={(event) => setRåListe(event.target.value)}
              placeholder="101-140, 201-215, Resepsjon, Frokostsal"
            />
            <p className="text-xs text-muted-foreground">
              Bruk intervaller som <code>101-140</code>, komma mellom verdier. Maks {MAX_ROM} koder
              per ark.
              {forhåndsvisning.length > 0 && ` Klar til å generere ${forhåndsvisning.length} koder.`}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Språk på arket</Label>
              <div className="flex gap-2">
                {(["nb", "en"] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={språk === value ? "default" : "outline"}
                    onClick={() => setSpråk(value)}
                  >
                    {value === "nb" ? "Norsk" : "Engelsk"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-overskrift">Overskrift på arket</Label>
              <Input
                id="qr-overskrift"
                value={overskrift}
                onChange={(event) => setOverskrift(event.target.value)}
                placeholder={standardOverskrift}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={generer} disabled={genererer}>
              <Sparkles className="h-4 w-4 mr-2" />
              {genererer ? "Genererer..." : "Generer QR-koder"}
            </Button>
            {koder.length > 0 && (
              <Button type="button" variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Skriv ut ark ({koder.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {koder.length > 0 && (
        <div id="rom-qr-ark" className="bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
            {koder.map((kode) => (
              <div
                key={kode.rom}
                className="rom-qr-kort border border-gray-300 rounded-xl p-4 flex flex-col items-center text-center gap-2 bg-white"
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={tenantName} className="h-7 object-contain" />
                ) : (
                  <p className="text-xs font-semibold text-gray-700">{tenantName}</p>
                )}
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {overskrift.trim() || standardOverskrift}
                </p>
                <img src={kode.dataUrl} alt={`QR ${kode.rom}`} className="w-28 h-28" />
                <p className="text-lg font-bold text-gray-900 leading-none">{kode.rom}</p>
                <p className="text-[10px] text-gray-600 leading-snug">{underteksten}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
