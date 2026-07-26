"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  ExternalLink,
  User,
  Building2,
} from "lucide-react";
import { SubcontractorSubmission, SubcontractorSubmissionStatus, SubcontractorSubmissionType } from "@prisma/client";

const TYPE_LABELS: Record<SubcontractorSubmissionType, string> = {
  AVVIK: "Avvik",
  RUH: "RUH",
  SJA: "SJA",
  NESTENULYKKE: "Nestenulykke",
  PDF_RAPPORT: "PDF-rapport",
};

const STATUS_CONFIG: Record<
  SubcontractorSubmissionStatus,
  { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Venter", icon: <Clock className="h-3.5 w-3.5" />, variant: "outline" },
  UNDER_REVIEW: { label: "Under behandling", icon: <AlertTriangle className="h-3.5 w-3.5" />, variant: "secondary" },
  LINKED: { label: "Koblet", icon: <CheckCircle2 className="h-3.5 w-3.5" />, variant: "default" },
  REJECTED: { label: "Avvist", icon: <XCircle className="h-3.5 w-3.5" />, variant: "destructive" },
};

interface Props {
  submissions: SubcontractorSubmission[];
  tavleId: string;
  isAddon: boolean;
}

export function TavleSubmissionsReview({ submissions, tavleId, isAddon }: Props) {
  const router = useRouter();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleReview(id: string, action: "approve" | "reject") {
    setProcessing(true);
    try {
      const res = await fetch(`/api/hms-tavle/submissions/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Feil");
      toast.success(action === "approve" ? "Innsending godkjent" : "Innsending avvist");
      setReviewingId(null);
      setNotes("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
        Ingen innsendinger fra underentreprenører ennå.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">UE-innsendinger</h3>
        <p className="text-sm text-muted-foreground">
          {submissions.filter((s) => s.status === "PENDING").length} ventende
        </p>
      </div>

      {submissions.map((sub) => {
        const statusConf = STATUS_CONFIG[sub.status];
        const isReviewing = reviewingId === sub.id;

        return (
          <Card key={sub.id} className={sub.status === "PENDING" ? "border-orange-200" : ""}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABELS[sub.type]}
                    </Badge>
                    <Badge variant={statusConf.variant} className="text-xs flex items-center gap-1">
                      {statusConf.icon}
                      {statusConf.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {sub.submitterName}
                    </span>
                    {sub.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {sub.company}
                      </span>
                    )}
                    <span className="text-xs">
                      {new Date(sub.createdAt).toLocaleDateString("nb-NO", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {sub.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReviewingId(isReviewing ? null : sub.id)}
                  >
                    {isReviewing ? "Avbryt" : "Behandle"}
                  </Button>
                )}
              </div>

              {/* Innsendingsdata */}
              {sub.data && typeof sub.data === "object" && Object.keys(sub.data).length > 0 && (
                <div className="bg-muted rounded-md p-3 text-xs space-y-1">
                  {Object.entries(sub.data as Record<string, any>).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="font-medium capitalize min-w-[120px]">{k}:</span>
                      <span className="text-muted-foreground">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* PDF-vedlegg */}
              {Array.isArray(sub.attachmentUrls) && sub.attachmentUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(sub.attachmentUrls as string[]).map((url, i) => (
                    <Button key={i} size="sm" variant="outline" asChild>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Vedlegg {i + 1}
                      </a>
                    </Button>
                  ))}
                </div>
              )}

              {/* Koblet til HMS Nova */}
              {isAddon && (sub.linkedIncidentId || sub.linkedRuhId || sub.linkedSjaId) && (
                <div className="text-xs text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Koblet til HMS Nova
                  {sub.linkedIncidentId && (
                    <Button size="sm" variant="link" className="h-auto p-0 text-xs" asChild>
                      <a href={`/dashboard/incidents/${sub.linkedIncidentId}`}>Se avvik</a>
                    </Button>
                  )}
                </div>
              )}

              {/* Behandlingspanel */}
              {isReviewing && (
                <div className="border-t pt-3 space-y-2">
                  <Label className="text-xs">Notat (valgfritt)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notat om behandlingen..."
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleReview(sub.id, "approve")}
                      disabled={processing}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Godkjenn
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReview(sub.id, "reject")}
                      disabled={processing}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Avvis
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
