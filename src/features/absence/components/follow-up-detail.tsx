"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { completeFollowUp, skipFollowUp } from "@/server/actions/absence.actions";
import type { FollowUpMilestone, FollowUpStatus } from "@prisma/client";

interface FollowUpDetailProps {
  followUp: {
    id: string;
    absenceId: string;
    milestone: FollowUpMilestone;
    status: FollowUpStatus;
    dueDate: string;
    completedAt: string | null;
    completedBy: { id: string; name: string | null } | null;
    skippedReason: string | null;
    notes: string | null;
    workAssessment: string | null;
    accommodations: string | null;
    externalSupport: string | null;
    planSentToDoctor: boolean;
    planSentAt: string | null;
    meetingDate: string | null;
    meetingNotes: string | null;
    attendees: string | null;
    doctorAttended: boolean;
    navAttended: boolean;
    attachmentUrl: string | null;
    attachmentName: string | null;
  };
  canEdit: boolean;
}

export function FollowUpDetail({ followUp, canEdit }: FollowUpDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [skipReason, setSkipReason] = useState("");

  const isDone = followUp.status === "COMPLETED" || followUp.status === "SKIPPED";

  async function handleComplete() {
    setLoading(true);
    setError(null);
    const result = await completeFollowUp({ id: followUp.id });
    setLoading(false);
    if (result.success) {
      router.push(`/dashboard/fravaer/${followUp.absenceId}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleSkip() {
    if (!skipReason.trim()) return;
    setLoading(true);
    setError(null);
    const result = await skipFollowUp({ id: followUp.id, skippedReason: skipReason });
    setLoading(false);
    if (result.success) {
      setShowSkipDialog(false);
      router.push(`/dashboard/fravaer/${followUp.absenceId}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      {/* Detaljer for fullførte plan/møter */}
      {followUp.workAssessment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Oppfølgingsplan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <Label className="text-muted-foreground">Vurdering av arbeidsoppgaver</Label>
              <p className="mt-1 whitespace-pre-wrap">{followUp.workAssessment}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Tilretteleggingstiltak</Label>
              <p className="mt-1 whitespace-pre-wrap">{followUp.accommodations}</p>
            </div>
            {followUp.externalSupport && (
              <div>
                <Label className="text-muted-foreground">Bistand fra BHT/NAV</Label>
                <p className="mt-1 whitespace-pre-wrap">{followUp.externalSupport}</p>
              </div>
            )}
            {followUp.planSentToDoctor && followUp.planSentAt && (
              <p className="text-muted-foreground">
                Sendt til sykmelder {format(new Date(followUp.planSentAt), "d. MMMM yyyy", { locale: nb })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {followUp.meetingDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dialogmøte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <Label className="text-muted-foreground">Møtedato</Label>
              <p className="mt-1">{format(new Date(followUp.meetingDate), "d. MMMM yyyy", { locale: nb })}</p>
            </div>
            {followUp.meetingNotes && (
              <div>
                <Label className="text-muted-foreground">Møtereferat</Label>
                <p className="mt-1 whitespace-pre-wrap">{followUp.meetingNotes}</p>
              </div>
            )}
            <div className="flex gap-4">
              {followUp.doctorAttended && <span>Sykmelder deltok</span>}
              {followUp.navAttended && <span>NAV deltok</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Handlinger */}
      {canEdit && !isDone && followUp.milestone === "ACTIVITY_REQUIREMENT" && (
        <div className="flex gap-3">
          <Button onClick={handleComplete} disabled={loading}>
            {loading ? "Lagrer..." : "Marker som fullført"}
          </Button>
          <Button variant="outline" onClick={() => setShowSkipDialog(true)} disabled={loading}>
            Hopp over (åpenbart unødvendig)
          </Button>
        </div>
      )}

      {canEdit && !isDone && followUp.milestone === "MAX_DATE" && (
        <div className="flex gap-3">
          <Button onClick={handleComplete} disabled={loading}>
            {loading ? "Lagrer..." : "Marker som fullført"}
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hopp over milepæl</DialogTitle>
            <DialogDescription>
              AML § 4-6 tillater at milepæler hoppes over dersom det er «åpenbart unødvendig».
              Oppgi begrunnelse.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="skipReason">Begrunnelse *</Label>
            <Textarea
              id="skipReason"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Begrunn hvorfor dette er åpenbart unødvendig..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkipDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSkip} disabled={loading || !skipReason.trim()}>
              {loading ? "Lagrer..." : "Bekreft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
