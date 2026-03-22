"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Trash2, Edit } from "lucide-react";
import { deleteFinding, updateFinding, verifyFinding } from "@/server/actions/audit.actions";
import { useToast } from "@/hooks/use-toast";
import type { AuditFinding } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";

interface FindingListProps {
  findings: AuditFinding[];
}

export function FindingList({ findings }: FindingListProps) {
  const t = useTranslations("dashboardAuditComponents.findingList");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [editingFinding, setEditingFinding] = useState<AuditFinding | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) {
      return;
    }

    setLoading(id);
    const result = await deleteFinding(id);
    if (result.success) {
      toast({
        title: t("toasts.deleted.title"),
        description: t("toasts.deleted.description"),
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: t("toasts.deleteError.title"),
        description: result.error || t("toasts.deleteError.description"),
      });
    }
    setLoading(null);
  };

  const handleUpdateStatus = async (finding: AuditFinding, status: string) => {
    setLoading(finding.id);
    const result = await updateFinding({ id: finding.id, status });
    if (result.success) {
      toast({
        title: "✅ Status oppdatert",
        description: t("toasts.statusUpdated.description", { status: t(`status.${getStatusLabel(status)}`) }),
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: t("toasts.error.title"),
        description: result.error || t("toasts.error.updateStatus"),
      });
    }
    setLoading(null);
  };

  const handleVerify = async (id: string) => {
    if (!confirm(t("confirmVerify"))) {
      return;
    }

    setLoading(id);
    const result = await verifyFinding(id);
    if (result.success) {
      toast({
        title: t("toasts.verified.title"),
        description: t("toasts.verified.description"),
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: t("toasts.error.title"),
        description: result.error || t("toasts.error.verify"),
      });
    }
    setLoading(null);
  };

  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <CheckCircle2 className="mb-4 h-12 w-12 text-green-600" />
        <h3 className="text-xl font-semibold">{t("empty.title")}</h3>
        <p className="text-muted-foreground">
          {t("empty.description")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {findings.map((finding) => {
        const typeLabel = t(`types.${getTypeLabel(finding.findingType)}`);
        const typeColor = getTypeColor(finding.findingType);
        const statusLabel = t(`status.${getStatusLabel(finding.status)}`);
        const statusColor = getStatusColor(finding.status);

        const isOverdue =
          finding.dueDate &&
          new Date(finding.dueDate) < new Date() &&
          finding.status !== "VERIFIED";

        return (
          <Card key={finding.id} className={isOverdue ? "border-red-300" : ""}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={typeColor}>{typeLabel}</Badge>
                      <Badge className={statusColor}>{statusLabel}</Badge>
                      <Badge variant="outline">{t("clause", { value: finding.clause })}</Badge>
                      {isOverdue && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t("overdue")}
                        </Badge>
                      )}
                    </div>
                    {finding.dueDate && (
                      <p className="text-sm text-muted-foreground">
                        {t("deadline", { date: new Date(finding.dueDate).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO") })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>{t("updateDialog.title")}</DialogTitle>
                          <DialogDescription>
                            {t("updateDialog.description")}
                          </DialogDescription>
                        </DialogHeader>
                        <CorrectiveActionForm finding={finding} />
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(finding.id)}
                      disabled={loading === finding.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("fields.description")}</p>
                    <p className="text-sm">{finding.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("fields.evidence")}</p>
                    <p className="text-sm">{finding.evidence}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("fields.requirement")}</p>
                    <p className="text-sm">{finding.requirement}</p>
                  </div>
                </div>

                {/* Corrective Action */}
                {finding.correctiveAction && (
                  <div className="space-y-2 border-t pt-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("fields.correctiveAction")}
                      </p>
                      <p className="text-sm">{finding.correctiveAction}</p>
                    </div>
                    {finding.rootCause && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t("fields.rootCause")}
                        </p>
                        <p className="text-sm">{finding.rootCause}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {finding.status !== "VERIFIED" && (
                  <div className="flex gap-2 border-t pt-4">
                    {finding.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(finding, "IN_PROGRESS")}
                        disabled={loading === finding.id}
                      >
                        {t("actions.start")}
                      </Button>
                    )}
                    {finding.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(finding, "RESOLVED")}
                        disabled={loading === finding.id}
                      >
                        {t("actions.markResolved")}
                      </Button>
                    )}
                    {finding.status === "RESOLVED" && (
                      <Button
                        size="sm"
                        onClick={() => handleVerify(finding.id)}
                        disabled={loading === finding.id}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {t("actions.verify")}
                      </Button>
                    )}
                  </div>
                )}

                {/* Verified info */}
                {finding.status === "VERIFIED" && finding.verifiedAt && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-900">
                      {t("verifiedTitle")}
                    </p>
                    <p className="text-sm text-green-800">
                      {new Date(finding.verifiedAt).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Corrective Action Form Component
function CorrectiveActionForm({ finding }: { finding: AuditFinding }) {
  const t = useTranslations("dashboardAuditComponents.findingList");
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      id: finding.id,
      correctiveAction: formData.get("correctiveAction") as string,
      rootCause: formData.get("rootCause") as string,
    };

    const result = await updateFinding(data);

    if (result.success) {
      toast({
        title: t("toasts.updated.title"),
        description: t("toasts.updated.description"),
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: t("toasts.error.title"),
        description: result.error || t("toasts.error.update"),
      });
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="correctiveAction">{t("correctiveForm.correctiveActionLabel")}</Label>
        <Textarea
          id="correctiveAction"
          name="correctiveAction"
          rows={4}
          placeholder={t("correctiveForm.correctiveActionPlaceholder")}
          required
          disabled={loading}
          minLength={20}
          defaultValue={finding.correctiveAction || ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rootCause">{t("correctiveForm.rootCauseLabel")}</Label>
        <Textarea
          id="rootCause"
          name="rootCause"
          rows={3}
          placeholder={t("correctiveForm.rootCausePlaceholder")}
          disabled={loading}
          defaultValue={finding.rootCause || ""}
        />
        <p className="text-sm text-muted-foreground">
          {t("correctiveForm.rootCauseHelp")}
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-900">
            {t("correctiveForm.isoInfo")}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? t("actions.saving") : t("actions.saveMeasures")}
        </Button>
      </div>
    </form>
  );
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MAJOR_NC: "major",
    MINOR_NC: "minor",
    OBSERVATION: "observation",
    STRENGTH: "strength",
  };
  return labels[type] ?? type;
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    MAJOR_NC: "bg-red-100 text-red-800",
    MINOR_NC: "bg-orange-100 text-orange-800",
    OBSERVATION: "bg-blue-100 text-blue-800",
    STRENGTH: "bg-green-100 text-green-800",
  };
  return colors[type] ?? "bg-gray-100 text-gray-800";
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    OPEN: "open",
    IN_PROGRESS: "inProgress",
    RESOLVED: "resolved",
    VERIFIED: "verified",
  };
  return labels[status] ?? status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    OPEN: "bg-red-100 text-red-800",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800",
    RESOLVED: "bg-blue-100 text-blue-800",
    VERIFIED: "bg-green-100 text-green-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}

