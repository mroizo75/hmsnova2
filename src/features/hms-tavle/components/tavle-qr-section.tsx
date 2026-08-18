"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, QrCode, Users, FileText, MessageSquare, GraduationCap } from "lucide-react";
import { HmsTavlePlan } from "@prisma/client";
import { TavleRomQr } from "./tavle-rom-qr";

interface Props {
  tavleUrl: string;
  portalUrl: string | null;
  checkinUrl: string;
  sesongUrl?: string | null;
  plan: HmsTavlePlan;
  hasGuestForm: boolean;
  tenantName: string;
  logoUrl: string | null;
}

function QrDisplay({ url, label }: { url: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
    }
  }, [url]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${label.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 border rounded-lg">
      <canvas ref={canvasRef} className="rounded max-w-full h-auto" />
      <p className="text-sm font-medium text-center">{label}</p>
      <p className="text-xs text-muted-foreground font-mono text-center break-all max-w-[200px]">
        {url}
      </p>
      <Button size="sm" variant="outline" onClick={download}>
        <Download className="h-3.5 w-3.5 mr-1" />
        Last ned PNG
      </Button>
    </div>
  );
}

export function TavleQrSection({
  tavleUrl,
  portalUrl,
  checkinUrl,
  sesongUrl,
  plan,
  hasGuestForm,
  tenantName,
  logoUrl,
}: Props) {
  const hasCheckin = plan !== "ENKEL";
  const hasPortal = plan !== "ENKEL";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-1">QR-koder</h3>
        <p className="text-sm text-muted-foreground">
          Last ned og heng opp QR-kodene på byggeplassen. Ansatte og underentreprenører kan skanne
          dem med mobilkameraet.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <QrCode className="h-4 w-4 text-blue-600" />
              HMS-tavle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QrDisplay url={tavleUrl} label="HMS-tavle" />
            <p className="text-xs text-muted-foreground mt-2">
              Viser hele tavlen med all HMS-informasjon
            </p>
          </CardContent>
        </Card>

        {hasCheckin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                Mannskap innsjekk
                <Badge variant="secondary" className="text-[10px]">
                  § 15
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QrDisplay url={checkinUrl} label="Innsjekk" />
              <p className="text-xs text-muted-foreground mt-2">
                Elektronisk føring av navn, fødselsdato, arbeidsgiver og HMS-kortnummer
                etter Byggherreforskriften § 15 bokstav e. Byggherren må selv sørge for
                opplysningene i bokstav a–d og oppbevare listen i seks måneder etter at
                arbeidet er avsluttet.
              </p>
            </CardContent>
          </Card>
        )}

        {hasPortal && portalUrl && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                UE-portal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QrDisplay url={portalUrl} label="UE-portal" />
              <p className="text-xs text-muted-foreground mt-2">
                Underentreprenører sender inn avvik, RUH og SJA uten konto
              </p>
            </CardContent>
          </Card>
        )}

        {hasGuestForm && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-600" />
                Meld fra (gjest)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QrDisplay url={`${tavleUrl}/melding`} label="Meld fra" />
              <p className="text-xs text-muted-foreground mt-2">
                Gjester melder fra uten innlogging. Meldingen er konfidensiell.
              </p>
            </CardContent>
          </Card>
        )}

        {sesongUrl && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-teal-600" />
                Sesongarbeider-intro
                <Badge variant="secondary" className="text-[10px]">
                  AML § 3-2
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QrDisplay url={sesongUrl} label="HMS-intro sesong" />
              <p className="text-xs text-muted-foreground mt-2">
                5-skjerms HMS-intro på norsk, engelsk, polsk og tysk.
                Ansatte signerer digitalt etter gjennomgang.
              </p>
            </CardContent>
          </Card>
        )}

        {!hasPortal && (
          <Card className="border-dashed opacity-60">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              UE-portal QR krever Standard-plan eller høyere
            </CardContent>
          </Card>
        )}
      </div>

      {hasGuestForm && (
        <TavleRomQr tavleUrl={tavleUrl} plan={plan} tenantName={tenantName} logoUrl={logoUrl} />
      )}
    </div>
  );
}
