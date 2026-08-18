"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FilePlus,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FileCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createNewDraft,
  submitForApproval,
  approveVersion,
  rejectDraft,
} from "@/server/actions/hms-handbok.actions";
import type { HandbookVersionData } from "@/server/actions/hms-handbok.actions";

interface HandbokVersionBarProps {
  tenantId: string;
  version: HandbookVersionData;
  canManage: boolean;
  canApprove: boolean;
}

const STATUS_CONFIG = {
  DRAFT: { label: "Utkast", variant: "secondary" as const, icon: Clock },
  PENDING_APPROVAL: { label: "Venter på godkjenning", variant: "default" as const, icon: Send },
  APPROVED: { label: "Godkjent", variant: "default" as const, icon: CheckCircle2 },
  ARCHIVED: { label: "Arkivert", variant: "outline" as const, icon: FileCheck },
} as const;

export function HandbokVersionBar({
  tenantId,
  version,
  canManage,
  canApprove,
}: HandbokVersionBarProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const { toast } = useToast();

  const config = STATUS_CONFIG[version.status];
  const StatusIcon = config.icon;

  async function handleCreateDraft() {
    setLoading("draft");
    const result = await createNewDraft({ tenantId, changeNote: changeNote.trim() || undefined });
    setLoading(null);
    if (result.success) {
      toast({ title: "Nytt utkast opprettet" });
      setDraftOpen(false);
      setChangeNote("");
    } else {
      toast({ title: "Feil", description: result.error, variant: "destructive" });
    }
  }

  async function handleSubmitForApproval() {
    setLoading("submit");
    const result = await submitForApproval({ versionId: version.id });
    setLoading(null);
    if (result.success) {
      toast({ title: "Sendt til godkjenning" });
    } else {
      toast({ title: "Feil", description: result.error, variant: "destructive" });
    }
  }

  async function handleApprove() {
    setLoading("approve");
    const result = await approveVersion({ versionId: version.id });
    setLoading(null);
    if (result.success) {
      toast({ title: "Versjon godkjent og publisert" });
    } else {
      toast({ title: "Feil", description: result.error, variant: "destructive" });
    }
  }

  async function handleReject() {
    if (!rejectNote.trim()) return;
    setLoading("reject");
    const result = await rejectDraft({ versionId: version.id, rejectedNote: rejectNote.trim() });
    setLoading(null);
    if (result.success) {
      toast({ title: "Utkast avvist" });
      setRejectOpen(false);
      setRejectNote("");
    } else {
      toast({ title: "Feil", description: result.error, variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 p-3">
      <div className="flex items-center gap-2">
        <StatusIcon className="h-4 w-4" />
        <span className="text-sm font-medium">Versjon {version.version}</span>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>
          {version.signatureCount}/{version.totalEmployees} signert
        </span>
        {version.approvedByName && (
          <span>· Godkjent av {version.approvedByName}</span>
        )}
      </div>

      <div className="ml-auto flex flex-wrap gap-2">
        {/* DRAFT: kan sende til godkjenning */}
        {version.status === "DRAFT" && canManage && (
          <Button
            size="sm"
            onClick={handleSubmitForApproval}
            disabled={loading === "submit"}
            className="gap-1.5"
          >
            {loading === "submit" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send til godkjenning
          </Button>
        )}

        {/* PENDING_APPROVAL: kan godkjenne/avvise */}
        {version.status === "PENDING_APPROVAL" && canApprove && (
          <>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={loading === "approve"}
              className="gap-1.5"
            >
              {loading === "approve" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Godkjenn
            </Button>

            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <XCircle className="h-3.5 w-3.5" />
                  Avvis
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Avvis utkast</DialogTitle>
                  <DialogDescription>
                    Versjonen sendes tilbake til utkast med din begrunnelse.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Label htmlFor="reject-note">Begrunnelse</Label>
                  <Textarea
                    id="reject-note"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    rows={3}
                    placeholder="Beskriv hvorfor utkastet avvises..."
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRejectOpen(false)}>
                    Avbryt
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={!rejectNote.trim() || loading === "reject"}
                    variant="destructive"
                    className="gap-1.5"
                  >
                    {loading === "reject" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Avvis
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* APPROVED: kan opprette nytt utkast */}
        {version.status === "APPROVED" && canManage && (
          <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <FilePlus className="h-3.5 w-3.5" />
                Opprett nytt utkast
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Opprett nytt utkast</DialogTitle>
                <DialogDescription>
                  Et nytt utkast baseres på gjeldende versjon. Alle seksjoner kopieres.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Label htmlFor="change-note">Hva endres? (valgfritt)</Label>
                <Textarea
                  id="change-note"
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  rows={3}
                  placeholder="F.eks. «Oppdaterer renholdsrutine etter gjentakende avvik»"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDraftOpen(false)}>
                  Avbryt
                </Button>
                <Button
                  onClick={handleCreateDraft}
                  disabled={loading === "draft"}
                  className="gap-1.5"
                >
                  {loading === "draft" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Opprett utkast
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
