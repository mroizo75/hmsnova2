"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { groupPendingApprovals, type PendingApprovalDocument } from "@/lib/document-approvals";
import { approveDocument } from "@/server/actions/document.actions";

interface PendingApprovalsPanelProps {
  documents: PendingApprovalDocument[];
  currentUserId: string;
  canApprove: boolean;
}

export function PendingApprovalsPanel({
  documents,
  currentUserId,
  canApprove,
}: PendingApprovalsPanelProps) {
  const t = useTranslations("dashboardDocumentsPage");
  const kindT = useTranslations("dashboardDocumentsList");
  const router = useRouter();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (documents.length === 0) return null;

  const groups = groupPendingApprovals(documents, currentUserId);

  const handleApprove = async (id: string, title: string) => {
    setLoadingId(id);
    const result = await approveDocument({ id, approvedBy: currentUserId });
    if (result.success) {
      toast({ title: kindT("toasts.approved.title"), description: kindT("toasts.approved.description", { title }) });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: kindT("toasts.approveError.title"),
        description: result.error || kindT("toasts.approveError.description"),
      });
    }
    setLoadingId(null);
  };

  return (
    <Card className="border-amber-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-amber-700" />
          {t("pending.title")}
          <Badge variant="secondary">{documents.length}</Badge>
        </CardTitle>
        <CardDescription>{t("pending.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {groups.map((group) => {
          const heading = group.waitingOnYou
            ? t("pending.waitingOnYou")
            : group.unassigned
              ? t("pending.unassigned")
              : t("pending.waitingOn", { name: group.label });
          return (
            <section key={group.key} className="space-y-2">
              <div>
                <h3 className="text-sm font-semibold">{heading}</h3>
                {group.unassigned && (
                  <p className="text-xs text-muted-foreground">{t("pending.unassignedHelp")}</p>
                )}
              </div>
              <ul className="divide-y rounded-md border">
                {group.documents.map((document) => {
                  const mayApprove = canApprove || group.waitingOnYou;
                  return (
                    <li key={document.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{document.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {kindT(`kind.${document.kind}`)} · {document.version}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" className="bg-transparent" asChild>
                          <Link href={`/dashboard/documents/${document.id}`}>{t("pending.open")}</Link>
                        </Button>
                        {mayApprove && (
                          <Button
                            size="sm"
                            disabled={loadingId === document.id}
                            onClick={() => handleApprove(document.id, document.title)}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            {t("pending.approve")}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
