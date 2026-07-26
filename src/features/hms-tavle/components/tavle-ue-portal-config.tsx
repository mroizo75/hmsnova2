"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Copy, ExternalLink, Lock, CheckCircle2 } from "lucide-react";
import { HmsTavlePlan, SubcontractorPortal } from "@prisma/client";
import { PLAN_LABELS } from "@/features/hms-tavle/lib/tavle-plan-limits";

interface Props {
  tavleId: string;
  portal: SubcontractorPortal | null;
  plan: HmsTavlePlan;
  portalUrl: string | null;
  canManage: boolean;
  appUrl: string;
  publicToken: string;
}

export function TavleUePortalConfig({
  tavleId,
  portal,
  plan,
  portalUrl,
  canManage,
  appUrl,
  publicToken,
}: Props) {
  const router = useRouter();
  const [config, setConfig] = useState({
    allowAvvik: portal?.allowAvvik ?? true,
    allowRuh: portal?.allowRuh ?? true,
    allowSja: portal?.allowSja ?? true,
    allowPdfUpload: portal?.allowPdfUpload ?? true,
    requireEmail: portal?.requireEmail ?? true,
    autoApprove: portal?.autoApprove ?? false,
  });
  const [saving, setSaving] = useState(false);

  const hasAccess = plan !== "ENKEL";
  const fullPortalUrl = portalUrl ?? `${appUrl}/tavle/${publicToken}/rapporter`;

  function copyUrl() {
    navigator.clipboard.writeText(fullPortalUrl);
    toast.success("URL kopiert!");
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/hms-tavle/${tavleId}/ue-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Feil ved lagring");
      toast.success("UE-portal konfigurert");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!hasAccess) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center space-y-3">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-semibold">UE-portal krever Standard-plan</p>
          <p className="text-sm text-muted-foreground">
            Underentreprenør-portalen er tilgjengelig fra Standard-plan (kr 590/mnd).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Underentreprenør-portal</h3>
        <p className="text-sm text-muted-foreground">
          Underentreprenører kan sende inn avvik, RUH, SJA og PDF-rapporter uten å opprette
          HMS Nova-konto. Støtter arbeidsgiverens plikt til å informere byggherren om
          risikoforhold etter Byggherreforskriften § 18.
        </p>
      </div>

      {portal && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Portal er aktiv</span>
            </div>
            <div className="flex gap-2">
              <Input value={fullPortalUrl} readOnly className="text-xs font-mono" />
              <Button size="icon" variant="outline" onClick={copyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" asChild>
                <a href={fullPortalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tillatte innsendingstyper</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "allowAvvik", label: "Avvik", desc: "AML § 5-2, IK-HMS § 5" },
            { key: "allowRuh", label: "RUH – Rapport om uønsket hendelse", desc: "Nestenulykker og observasjoner" },
            { key: "allowSja", label: "SJA – Sikker jobb-analyse", desc: "Byggherreforskriften § 18 andre ledd" },
            { key: "allowPdfUpload", label: "PDF-rapport opplasting", desc: "Fra UEs eget HMS-system (Synergi, EHS osv.)" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label className="text-sm">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={config[key as keyof typeof config] as boolean}
                onCheckedChange={(val) => setConfig({ ...config, [key]: val })}
                disabled={!canManage}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Innstillinger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Krev e-post fra innsender</Label>
              <p className="text-xs text-muted-foreground">For oppfølging og varsling</p>
            </div>
            <Switch
              checked={config.requireEmail}
              onCheckedChange={(val) => setConfig({ ...config, requireEmail: val })}
              disabled={!canManage}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Auto-godkjenn innsendinger</Label>
              <p className="text-xs text-muted-foreground">
                Innsendinger godkjennes automatisk uten manuell gjennomgang
              </p>
            </div>
            <Switch
              checked={config.autoApprove}
              onCheckedChange={(val) => setConfig({ ...config, autoApprove: val })}
              disabled={!canManage}
            />
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <Button onClick={save} disabled={saving}>
          {saving ? "Lagrer..." : portal ? "Oppdater portal" : "Aktiver UE-portal"}
        </Button>
      )}
    </div>
  );
}
