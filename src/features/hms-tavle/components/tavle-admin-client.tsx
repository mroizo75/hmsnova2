"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Monitor,
  QrCode,
  Settings,
  Users,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Upload,
  Image as ImageIcon,
  Zap,
} from "lucide-react";
import { PLAN_LABELS } from "@/features/hms-tavle/lib/tavle-plan-limits";
import { TavleQrSection } from "./tavle-qr-section";
import { TavleSectionBuilder } from "./tavle-section-builder";
import { TavleExternalLinks } from "./tavle-external-links";
import { TavleUePortalConfig } from "./tavle-ue-portal-config";
import { TavleSubmissionsReview } from "./tavle-submissions-review";
import { TavleOversiktslistePane } from "./tavle-oversiktsliste-pane";
import { GjesteservicePane, type GuestSubmissionRow } from "./gjesteservice-pane";
import type {
  HmsTavle,
  HmsTavleSection,
  HmsTavleExternalLink,
  HmsTavleSubscription,
  SubcontractorPortal,
  SubcontractorSubmission,
  TavleGuestSubmission,
} from "@prisma/client";

type TavleWithRelations = HmsTavle & {
  sections: HmsTavleSection[];
  externalLinks: HmsTavleExternalLink[];
  subcontractorPortal:
    | (SubcontractorPortal & { submissions: SubcontractorSubmission[] })
    | null;
  project: any | null;
  checkins: any[];
  guestSubmissions: TavleGuestSubmission[];
};

interface Props {
  tavle: TavleWithRelations;
  subscription: HmsTavleSubscription;
  hmsStats: { openIncidents: number; openActions: number } | null;
  canManage: boolean;
  canReview: boolean;
  isAddon: boolean;
  appUrl: string;
  defaultTab?: string;
  teamMembers: { id: string; name: string }[];
}

export function TavleAdminClient({
  tavle,
  subscription,
  hmsStats,
  canManage,
  canReview,
  isAddon,
  appUrl,
  defaultTab,
  teamMembers,
}: Props) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(tavle.isPublic);
  const [kioskMode, setKioskMode] = useState(tavle.kioskMode);
  const [savingPublic, setSavingPublic] = useState(false);
  const [savingKiosk, setSavingKiosk] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(tavle.logoUrl ?? "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [siteAddress, setSiteAddress] = useState<string>(tavle.siteAddress ?? "");
  const [clientName, setClientName] = useState<string>(tavle.clientName ?? "");
  const [workEndedAt, setWorkEndedAt] = useState<string>(
    tavle.workEndedAt ? new Date(tavle.workEndedAt).toISOString().slice(0, 10) : ""
  );
  const [savingSiteInfo, setSavingSiteInfo] = useState(false);

  const tavleUrl = `${appUrl}/tavle/${tavle.publicToken}`;
  const portalUrl = tavle.subcontractorPortal
    ? `${appUrl}/tavle/${tavle.publicToken}/rapporter`
    : null;

  const pendingSubmissions =
    tavle.subcontractorPortal?.submissions.filter((s) => s.status === "PENDING").length ?? 0;

  const nyeGjestmeldinger = (tavle.guestSubmissions ?? []).filter((s) => s.status === "NY").length;

  async function togglePublic(val: boolean) {
    setSavingPublic(true);
    try {
      const res = await fetch(`/api/hms-tavle/${tavle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: val }),
      });
      if (!res.ok) throw new Error("Feil ved lagring");
      setIsPublic(val);
      toast.success(val ? "Tavle er nå offentlig tilgjengelig" : "Tavle er nå skjult");
      router.refresh();
    } catch {
      toast.error("Kunne ikke endre synlighet");
    } finally {
      setSavingPublic(false);
    }
  }

  /** Lagrer opplysningene oversiktslisten krever – Byggherreforskriften § 15. */
  async function saveOversiktslisteInfo() {
    setSavingSiteInfo(true);
    try {
      const res = await fetch(`/api/hms-tavle/${tavle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteAddress: siteAddress.trim() || null,
          clientName: clientName.trim() || null,
          workEndedAt: workEndedAt || null,
        }),
      });
      if (!res.ok) throw new Error("Feil ved lagring");
      toast.success("Opplysningene er lagret");
      router.refresh();
    } catch {
      toast.error("Kunne ikke lagre opplysningene");
    } finally {
      setSavingSiteInfo(false);
    }
  }

  async function toggleKiosk(val: boolean) {
    setSavingKiosk(true);
    try {
      const res = await fetch(`/api/hms-tavle/${tavle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kioskMode: val }),
      });
      if (!res.ok) throw new Error("Feil ved lagring");
      setKioskMode(val);
      toast.success(val ? "Kiosk-modus aktivert" : "Kiosk-modus deaktivert");
      router.refresh();
    } catch {
      toast.error("Kunne ikke endre kiosk-modus");
    } finally {
      setSavingKiosk(false);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("URL kopiert!");
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tavleId", tavle.id);
      const uploadRes = await fetch("/api/hms-tavle/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.message ?? "Opplasting feilet");

      const patchRes = await fetch(`/api/hms-tavle/${tavle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: uploadData.data.url }),
      });
      if (!patchRes.ok) throw new Error("Kunne ikke lagre logo");

      setLogoUrl(uploadData.data.url);
      toast.success("Logo oppdatert!");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Feil ved opplasting");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeLogo() {
    try {
      await fetch(`/api/hms-tavle/${tavle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: null }),
      });
      setLogoUrl("");
      toast.success("Logo fjernet");
      router.refresh();
    } catch {
      toast.error("Kunne ikke fjerne logo");
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link
              href="/dashboard/hms-tavle"
              className="text-sm text-muted-foreground hover:underline"
            >
              Digital HMS Tavle
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">{tavle.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold break-words">{tavle.name}</h1>
          {tavle.project && (
            <p className="text-muted-foreground text-sm mt-1">Prosjekt: {tavle.project.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          {isPublic && (
            <Button variant="outline" size="sm" asChild>
              <a href={tavleUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-1.5" />
                Vis tavle
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Hurtigstatus */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="font-semibold text-sm">{PLAN_LABELS[subscription.plan]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Seksjoner</p>
            <p className="font-semibold text-sm">
              {tavle.sections.filter((s) => s.isVisible).length} aktive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Innsjekk i dag</p>
            <p className="font-semibold text-sm">{tavle.checkins.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">UE-innsendinger</p>
            <p className="font-semibold text-sm flex items-center gap-1">
              {pendingSubmissions > 0 && (
                <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
              )}
              {pendingSubmissions} ventende
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab ?? "oversikt"}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="oversikt">Oversikt</TabsTrigger>
          <TabsTrigger value="seksjoner">Seksjoner</TabsTrigger>
          <TabsTrigger value="lenker">Eksterne lenker</TabsTrigger>
          <TabsTrigger value="oversiktsliste">Oversiktsliste</TabsTrigger>
          <TabsTrigger value="ue-portal">UE-portal</TabsTrigger>
          {canReview && (
            <TabsTrigger value="innsendinger" className="relative">
              Innsendinger
              {pendingSubmissions > 0 && (
                <span className="ml-1.5 rounded-full bg-orange-500 text-white text-[10px] px-1.5">
                  {pendingSubmissions}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="gjestmeldinger" className="relative">
            Gjestmeldinger
            {nyeGjestmeldinger > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-500 text-white text-[10px] px-1.5">
                {nyeGjestmeldinger}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="qr">QR-koder</TabsTrigger>
          <TabsTrigger value="innstillinger">Innstillinger</TabsTrigger>
        </TabsList>

        {/* OVERSIKT */}
        <TabsContent value="oversikt" className="space-y-4 mt-4">
          {hmsStats && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Åpne avvik (prosjekt)</p>
                  <p className="text-2xl font-bold text-orange-600">{hmsStats.openIncidents}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Åpne tiltak</p>
                  <p className="text-2xl font-bold text-blue-600">{hmsStats.openActions}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {tavle.project?.constructionShaPlan && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">SHA-plan – Byggherreforskriften § 7+8</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between p-4 pt-0">
                <div className="flex items-center gap-2">
                  {tavle.project.constructionShaPlan.status === "ACTIVE" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  )}
                  <span className="text-sm">
                    {tavle.project.constructionShaPlan.status === "ACTIVE"
                      ? "Godkjent og aktiv"
                      : "Under arbeid"}
                  </span>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/projects/${tavle.projectId}/construction-compliance`}>
                    Se SHA-plan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-medium text-sm">Tavle-URL</p>
              <div className="flex gap-2">
                <Input value={tavleUrl} readOnly className="text-xs font-mono min-w-0" />
                <Button size="icon" variant="outline" className="shrink-0" onClick={() => copyUrl(tavleUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" className="shrink-0" asChild>
                  <a href={tavleUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              {!isPublic && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <EyeOff className="h-3.5 w-3.5" />
                  Tavlen er ikke offentlig — aktiver i Innstillinger
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEKSJONER */}
        <TabsContent value="seksjoner" className="mt-4">
          <TavleSectionBuilder
            tavleId={tavle.id}
            sections={tavle.sections}
            plan={subscription.plan}
            canManage={canManage}
            isAddon={isAddon}
            bransje={tavle.bransje}
          />
        </TabsContent>

        {/* EXTERNE LENKER */}
        <TabsContent value="lenker" className="mt-4">
          <TavleExternalLinks
            tavleId={tavle.id}
            links={tavle.externalLinks}
            canManage={canManage}
          />
        </TabsContent>

        {/* OVERSIKTSLISTE */}
        <TabsContent value="oversiktsliste" className="mt-4">
          <TavleOversiktslistePane
            tavleId={tavle.id}
            hasCheckin={subscription.plan !== "ENKEL"}
          />
        </TabsContent>

        {/* UE-PORTAL */}
        <TabsContent value="ue-portal" className="mt-4">
          <TavleUePortalConfig
            tavleId={tavle.id}
            portal={tavle.subcontractorPortal}
            plan={subscription.plan}
            portalUrl={portalUrl}
            canManage={canManage}
            appUrl={appUrl}
            publicToken={tavle.publicToken}
          />
        </TabsContent>

        {/* INNSENDINGER */}
        {canReview && (
          <TabsContent value="innsendinger" className="mt-4">
            <TavleSubmissionsReview
              submissions={tavle.subcontractorPortal?.submissions ?? []}
              tavleId={tavle.id}
              isAddon={isAddon}
            />
          </TabsContent>
        )}

        {/* GJESTMELDINGER */}
        <TabsContent value="gjestmeldinger" className="mt-4">
          <GjesteservicePane
            submissions={(tavle.guestSubmissions ?? []) as unknown as GuestSubmissionRow[]}
            tavleId={tavle.id}
            canManage={canManage}
            teamMembers={teamMembers}
            onRefresh={() => router.refresh()}
          />
        </TabsContent>

        {/* QR-KODER */}
        <TabsContent value="qr" className="mt-4">
          <TavleQrSection
            tavleUrl={tavleUrl}
            portalUrl={portalUrl}
            checkinUrl={`${tavleUrl}/innsjekk`}
            sesongUrl={`${tavleUrl}/sesong`}
            plan={subscription.plan}
            hasGuestForm={tavle.sections.some((s) => s.type === "GJEST_SKJEMA")}
            tenantName={tavle.name}
            logoUrl={logoUrl || null}
          />
        </TabsContent>

        {/* INNSTILLINGER */}
        <TabsContent value="innstillinger" className="mt-4 space-y-4">

          {/* Logo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Bedriftslogo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Logoen vises øverst på tavlen. Uten logo vises «DIGITAL HMS Tavle» som tekst.
              </p>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <img src={logoUrl} alt="Logo" className="h-14 object-contain" />
                    {canManage && (
                      <Button size="sm" variant="ghost" onClick={removeLogo} className="text-red-500 hover:text-red-700">
                        Fjern logo
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed text-muted-foreground text-sm">
                    <ImageIcon className="h-5 w-5" /> Ingen logo lastet opp
                  </div>
                )}
              </div>
              {canManage && (
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <Button size="sm" variant="outline" asChild>
                    <span>
                      {uploadingLogo ? (
                        <span className="flex items-center gap-1.5"><Upload className="h-4 w-4 animate-pulse" /> Laster opp...</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><Upload className="h-4 w-4" /> Last opp logo</span>
                      )}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              <p className="text-xs text-muted-foreground">PNG, JPG eller SVG. Anbefalt: transparent bakgrunn, maks 2 MB.</p>
            </CardContent>
          </Card>

          {/* Synlighet og modus */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Synlighet og modus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="public-toggle">Offentlig tilgang</Label>
                  <p className="text-xs text-muted-foreground">
                    Gjør tavlen tilgjengelig via QR-kode uten innlogging
                  </p>
                </div>
                <Switch
                  id="public-toggle"
                  checked={isPublic}
                  onCheckedChange={togglePublic}
                  disabled={savingPublic || !canManage}
                />
              </div>
              {(subscription.plan === "AVANSERT" || subscription.plan === "ADDON") && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="kiosk-toggle">Kiosk-modus</Label>
                    <p className="text-xs text-muted-foreground">
                      Fullskjerm touch-optimalisert for berøringsskjerm (32–65")
                    </p>
                  </div>
                  <Switch
                    id="kiosk-toggle"
                    checked={kioskMode}
                    onCheckedChange={toggleKiosk}
                    disabled={savingKiosk || !canManage}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Oversiktslisten – Byggherreforskriften § 15 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Oversiktsliste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Byggherreforskriften § 15 krever at oversiktslisten inneholder plassens adresse
                og byggherrens navn, og at den oppbevares i seks måneder etter at arbeidet er
                avsluttet. Settes sluttdato, slettes listen automatisk når fristen er ute.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="site-address">Bygge-/anleggsplassens adresse</Label>
                  <Input
                    id="site-address"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    placeholder="Storgata 1, 0155 Oslo"
                    disabled={!canManage}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client-name">Byggherrens navn</Label>
                  <Input
                    id="client-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Byggherre AS"
                    disabled={!canManage}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="work-ended">Arbeidet avsluttet</Label>
                  <Input
                    id="work-ended"
                    type="date"
                    value={workEndedAt}
                    onChange={(e) => setWorkEndedAt(e.target.value)}
                    disabled={!canManage}
                  />
                  <p className="text-xs text-muted-foreground">
                    La stå tom mens arbeidet pågår.
                  </p>
                </div>
              </div>
              {canManage && (
                <Button size="sm" onClick={saveOversiktslisteInfo} disabled={savingSiteInfo}>
                  {savingSiteInfo ? "Lagrer..." : "Lagre"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Hurtigguide */}
          <Card className="border-blue-100 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <Zap className="h-4 w-4" /> Hurtigguide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-blue-700">
              <p className="flex items-start gap-2">
                <span className="font-bold shrink-0">1.</span>
                <span><strong>Seksjoner-fanen</strong> → legg til «Hurtigtilganger» → klikk ⚙ for å velge hvilke ikoner (Avvik, SJA, osv.) som skal vises og lim inn URL til ditt system.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold shrink-0">2.</span>
                <span><strong>UE-portal-fanen</strong> → aktiver portalen → kopier URL og send til underentreprenører. De åpner URL-en og sender inn avvik / SJA direkte.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold shrink-0">3.</span>
                <span><strong>QR-fanen</strong> → last ned og heng opp QR-koder for innsjekk og UE-portal på byggeplassen.</span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
