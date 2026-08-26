"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Scale,
  ExternalLink,
  BookOpen,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Shield,
  FileCheck,
  Ban,
  Plus,
  ChevronDown,
  Loader2,
  Paperclip,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { RegulatoryWizard } from "@/features/regulatory/components/regulatory-wizard";
import {
  confirmRequirement,
  markRequirementNotApplicable,
  createCustomRequirement,
  removeOverride,
} from "@/server/actions/requirement-override.actions";
import { useRouter } from "next/navigation";

type RequirementStatus = {
  id: string;
  title: string;
  description: string;
  legalBasis: string;
  sourceUrl: string | null;
  hmsNovaFeature: string | null;
  hmsNovaRoute: string | null;
  severity: string;
  status: "COMPLIANT" | "PARTIAL" | "MISSING" | "NOT_APPLICABLE";
  statusNote?: string | null;
  documentUrl?: string | null;
  documentName?: string | null;
  verifiedAt?: string | null;
  verifiedByName?: string | null;
  hasOverride?: boolean;
  isCustom?: boolean;
};

type RegulatoryStatus = {
  hasProfile: boolean;
  tenant: {
    name: string | null;
    orgNumber: string | null;
    naceCode: string | null;
    naceDescription: string | null;
    industry: string | null;
  } | null;
  requirements: RequirementStatus[];
  compliancePercentage: number;
  activityProfile: {
    answers: Record<string, boolean>;
    activeActivities: string[];
    completedAt: Date | null;
  } | null;
};

type ManualReference = {
  id: string;
  title: string;
  description: string;
  paragraphRef: string | null;
  sourceUrl: string;
  lastVerifiedAt: string | null;
};

type Props = {
  regulatoryStatus: RegulatoryStatus;
  userRole: string;
  manualReferences: ManualReference[];
};

export function JuridiskRegisterClient({
  regulatoryStatus,
  userRole,
  manualReferences,
}: Props) {
  const [showWizard, setShowWizard] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<RequirementStatus | null>(null);
  const [naDialog, setNaDialog] = useState<RequirementStatus | null>(null);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const router = useRouter();

  const canManage = ["ADMIN", "HMS", "LEDER"].includes(userRole);

  if (showWizard || !regulatoryStatus.hasProfile) {
    return (
      <div className="space-y-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-start gap-3 py-4">
            <Shield className="mt-0.5 h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {regulatoryStatus.hasProfile
                  ? "Oppdater regelverksprofil"
                  : "Kartlegg ditt regelverk"}
              </p>
              <p className="text-sm text-blue-700">
                {regulatoryStatus.hasProfile
                  ? "Gjennomgå kontrollspørsmålene for å oppdatere hvilke lover og forskrifter som gjelder."
                  : "Svar på noen kontrollspørsmål basert på virksomhetens aktiviteter, så identifiserer vi automatisk hvilke lover og forskrifter som gjelder for dere."}
              </p>
            </div>
          </CardContent>
        </Card>
        <RegulatoryWizard tenant={regulatoryStatus.tenant} />
        {regulatoryStatus.hasProfile && (
          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => setShowWizard(false)}>
              Avbryt
            </Button>
          </div>
        )}
      </div>
    );
  }

  const { requirements, compliancePercentage, tenant } = regulatoryStatus;
  const active = requirements.filter((r) => r.status !== "NOT_APPLICABLE");
  const notApplicable = requirements.filter((r) => r.status === "NOT_APPLICABLE");
  const mandatory = active.filter((r) => r.severity === "MANDATORY" && !r.isCustom);
  const recommended = active.filter((r) => r.severity === "RECOMMENDED" && !r.isCustom);
  const custom = active.filter((r) => r.isCustom);
  const hasManual = manualReferences.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Samsvarsgrad</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold">{compliancePercentage}%</div>
            <Progress value={compliancePercentage} className="h-2" />
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {active.filter((r) => r.status === "COMPLIANT").length}
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-600" />
                {active.filter((r) => r.status === "PARTIAL").length}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-600" />
                {active.filter((r) => r.status === "MISSING").length}
              </span>
              {notApplicable.length > 0 && (
                <span className="flex items-center gap-1">
                  <Ban className="h-3 w-3 text-muted-foreground" />
                  {notApplicable.length} ikke relevant
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Virksomhet</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{tenant?.name || "—"}</p>
            <p className="text-xs text-muted-foreground">
              {tenant?.orgNumber || "Org.nr. ikke satt"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tenant?.naceCode
                ? `NACE ${tenant.naceCode}: ${tenant.naceDescription ?? ""}`
                : tenant?.industry ?? "Bransje ikke satt"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gjeldende krav</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{active.length}</div>
            <p className="text-xs text-muted-foreground">
              {mandatory.length} lovpålagte, {recommended.length} anbefalte
              {custom.length > 0 && `, ${custom.length} egne`}
            </p>
            <Button
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() => setShowWizard(true)}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Oppdater profil
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Viktig:</strong> Lover og forskrifter er identifisert automatisk basert på
          virksomhetens NACE-kode og aktivitetsprofil. Krav verifisert automatisk mot HMS Nova-data
          vises med status. Krav uten automatisk sjekk kan bekreftes manuelt.
        </p>
      </div>

      {/* Action buttons */}
      {canManage && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomDialog(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Legg til eget krav
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="auto">
        <TabsList>
          <TabsTrigger value="auto">Lovkrav ({active.length})</TabsTrigger>
          {hasManual && (
            <TabsTrigger value="manual">
              Egne referanser ({manualReferences.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="auto" className="space-y-4 mt-4">
          {/* Custom requirements */}
          {custom.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Egendefinerte krav ({custom.length})
              </h3>
              {custom.map((req) => (
                <RequirementCard
                  key={req.id}
                  req={req}
                  canManage={canManage}
                  onConfirm={setConfirmDialog}
                  onMarkNA={setNaDialog}
                />
              ))}
            </div>
          )}

          {mandatory.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Lovpålagte krav ({mandatory.length})
              </h3>
              {mandatory.map((req) => (
                <RequirementCard
                  key={req.id}
                  req={req}
                  canManage={canManage}
                  onConfirm={setConfirmDialog}
                  onMarkNA={setNaDialog}
                />
              ))}
            </div>
          )}

          {recommended.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6">
                Anbefalte krav ({recommended.length})
              </h3>
              {recommended.map((req) => (
                <RequirementCard
                  key={req.id}
                  req={req}
                  canManage={canManage}
                  onConfirm={setConfirmDialog}
                  onMarkNA={setNaDialog}
                />
              ))}
            </div>
          )}

          {/* Not applicable section */}
          {notApplicable.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="gap-2 text-muted-foreground text-sm mt-4">
                  <Ban className="h-4 w-4" />
                  Ikke relevante krav ({notApplicable.length})
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {notApplicable.map((req) => (
                  <NotApplicableCard key={req.id} req={req} canManage={canManage} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {active.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Scale className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Ingen lovkrav er identifisert ennå.</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowWizard(true)}>
                  Kartlegg regelverk
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {hasManual && (
          <TabsContent value="manual" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Referanser lagt inn manuelt av administrator.
            </p>
            {manualReferences.map((ref) => (
              <Card key={ref.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{ref.title}</CardTitle>
                        {ref.paragraphRef && (
                          <Badge variant="secondary" className="font-mono text-xs">
                            {ref.paragraphRef}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{ref.description}</p>
                    </div>
                    <a
                      href={ref.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Lovdata
                    </a>
                  </div>
                </CardHeader>
                {ref.lastVerifiedAt && (
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      Sist verifisert: {new Date(ref.lastVerifiedAt).toLocaleDateString("nb-NO")}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>

      {/* Confirm dialog */}
      {confirmDialog && (
        <ConfirmRequirementDialog
          req={confirmDialog}
          onClose={() => setConfirmDialog(null)}
        />
      )}

      {/* Not applicable dialog */}
      {naDialog && (
        <NotApplicableDialog
          req={naDialog}
          onClose={() => setNaDialog(null)}
        />
      )}

      {/* Custom requirement dialog */}
      {showCustomDialog && (
        <CustomRequirementDialog onClose={() => setShowCustomDialog(false)} />
      )}
    </div>
  );
}

function RequirementCard({
  req,
  canManage,
  onConfirm,
  onMarkNA,
}: {
  req: RequirementStatus;
  canManage: boolean;
  onConfirm: (req: RequirementStatus) => void;
  onMarkNA: (req: RequirementStatus) => void;
}) {
  const statusConfig = {
    COMPLIANT: {
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      badge: <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Oppfylt</Badge>,
    },
    PARTIAL: {
      icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
      badge: <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Delvis</Badge>,
    },
    MISSING: {
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      badge: <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Mangler</Badge>,
    },
    NOT_APPLICABLE: {
      icon: <Ban className="h-5 w-5 text-muted-foreground" />,
      badge: <Badge variant="secondary">Ikke relevant</Badge>,
    },
  };

  const config = statusConfig[req.status] ?? statusConfig.MISSING;

  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <div className="mt-0.5">{config.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{req.title}</p>
          {config.badge}
          {req.isCustom && (
            <Badge variant="outline" className="text-xs">Egendefinert</Badge>
          )}
          {req.hasOverride && !req.isCustom && (
            <Badge variant="outline" className="text-xs gap-1">
              <FileCheck className="h-3 w-3" />
              Manuelt bekreftet
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{req.legalBasis}</p>
        {req.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
        )}
        {req.statusNote && (
          <p className="text-xs text-blue-600 mt-1">Merknad: {req.statusNote}</p>
        )}
        {req.documentName && (
          <p className="text-xs mt-1 flex items-center gap-1 text-primary">
            <Paperclip className="h-3 w-3" />
            {req.documentName}
          </p>
        )}
        {req.verifiedByName && req.verifiedAt && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <User className="h-3 w-3" />
            Bekreftet av {req.verifiedByName},{" "}
            {new Date(req.verifiedAt).toLocaleDateString("nb-NO")}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        {req.sourceUrl && (
          <Button variant="ghost" size="sm" asChild>
            <a href={req.sourceUrl} target="_blank" rel="noopener noreferrer">
              <BookOpen className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
        {req.hmsNovaRoute && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={req.hmsNovaRoute}>
              Åpne
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
        {canManage && req.status === "MISSING" && !req.hmsNovaFeature && (
          <Button variant="outline" size="sm" onClick={() => onConfirm(req)}>
            <FileCheck className="mr-1 h-3 w-3" />
            Bekreft
          </Button>
        )}
        {req.status === "MISSING" && req.hmsNovaRoute && req.hmsNovaFeature && (
          <Button variant="outline" size="sm" asChild>
            <Link href={req.hmsNovaRoute}>
              Opprett
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
        {canManage && !req.isCustom && req.status !== "NOT_APPLICABLE" && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onMarkNA(req)}
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function NotApplicableCard({
  req,
  canManage,
}: {
  req: RequirementStatus;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRestore() {
    startTransition(async () => {
      await removeOverride(req.id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-dashed p-3 opacity-70">
      <Ban className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{req.title}</p>
        <p className="text-xs text-muted-foreground">{req.legalBasis}</p>
        {req.statusNote && (
          <p className="text-xs text-muted-foreground mt-1">
            Begrunnelse: {req.statusNote}
          </p>
        )}
        {req.verifiedByName && (
          <p className="text-xs text-muted-foreground mt-1">
            Av {req.verifiedByName}
          </p>
        )}
      </div>
      {canManage && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={handleRestore}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Gjenopprett"}
        </Button>
      )}
    </div>
  );
}

function ConfirmRequirementDialog({
  req,
  onClose,
}: {
  req: RequirementStatus;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"COMPLIANT" | "PARTIAL">("COMPLIANT");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    startTransition(async () => {
      let documentUrl: string | undefined;
      let documentName: string | undefined;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/compliance-docs/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          documentUrl = data.key;
          documentName = file.name;
        }
      }

      await confirmRequirement({
        requirementId: req.id,
        manualStatus: status,
        statusNote: note || undefined,
        documentUrl,
        documentName,
      });

      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bekreft lovkrav</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{req.title}</p>
            <p className="text-xs text-muted-foreground">{req.legalBasis}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPLIANT">Oppfylt</SelectItem>
                <SelectItem value="PARTIAL">Delvis oppfylt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Merknad (valgfritt)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="F.eks. BHT-avtale med Hemis AS, gyldig til 2027"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Dokumentasjon (valgfritt)</label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-xs"
              />
              {file && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Last opp avtale, sertifikat eller annen dokumentasjon (PDF, maks 10 MB)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bekreft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotApplicableDialog({
  req,
  onClose,
}: {
  req: RequirementStatus;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    startTransition(async () => {
      await markRequirementNotApplicable({
        requirementId: req.id,
        statusNote: note,
      });
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merk som ikke relevant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{req.title}</p>
            <p className="text-xs text-muted-foreground">{req.legalBasis}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Begrunnelse <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Forklar hvorfor dette kravet ikke gjelder for virksomheten..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Begrunnelsen er synlig ved tilsyn og revisjon.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || note.length < 5}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Merk som ikke relevant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomRequirementDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    startTransition(async () => {
      await createCustomRequirement({
        title,
        description: description || undefined,
        legalBasis: legalBasis || undefined,
        manualStatus: "MISSING",
      });
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Legg til eget krav</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tittel <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Legionellakontroll"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Lovhenvisning (valgfritt)</label>
            <Input
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value)}
              placeholder="F.eks. Forskrift om miljørettet helsevern § 11"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Beskrivelse (valgfritt)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskriv kravet og hva som må gjøres..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || title.length < 3}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Legg til
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
