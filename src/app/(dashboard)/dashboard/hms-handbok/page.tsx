import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { getHandbookData, getHandbookSuggestions, getVersionHistory } from "@/server/actions/hms-handbok.actions";
import { HandbokViewer } from "@/features/hms-handbok/components/handbok-viewer";
import { HandbokVersionHistory } from "@/features/hms-handbok/components/handbok-version-history";
import { BookOpen } from "lucide-react";

export const metadata = { title: "HMS Håndbok" };

export default async function HmsHandbokPage() {
  const auth = await getAuthContext();
  const { permissions, tenantId, userId } = auth;

  if (!permissions.canReadDocuments && !permissions.canReadRoutines) {
    redirect("/dashboard");
  }

  const [tenant, handbookResult, suggestions, versionHistory] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        name: true,
        orgNumber: true,
        industry: true,
        hmsContactName: true,
        hmsContactPhone: true,
      },
    }),
    getHandbookData(tenantId),
    getHandbookSuggestions(tenantId),
    getVersionHistory(tenantId),
  ]);

  if (!handbookResult.success) {
    redirect("/dashboard");
  }

  const canManage =
    permissions.canUpdateSettings ||
    permissions.canApproveDocuments ||
    permissions.canApproveManagementReviews;

  const canApprove =
    permissions.canUpdateSettings ||
    permissions.canApproveDocuments;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            HMS Håndbok
          </h1>
          <p className="text-muted-foreground mt-1">
            Versjonskontrollert HMS-håndbok med dynamisk innhold fra alle HMS-moduler.
            Endringer krever godkjenning og alle ansatte signerer per versjon.
          </p>
        </div>
      </div>

      <HandbokViewer
        tenantId={tenantId}
        tenantName={tenant.name}
        orgNumber={tenant.orgNumber}
        industry={tenant.industry}
        hmsContactName={tenant.hmsContactName}
        hmsContactPhone={tenant.hmsContactPhone}
        handbook={handbookResult.handbook}
        stats={handbookResult.stats}
        currentUserId={userId}
        canManage={canManage}
        canApprove={canApprove}
        isEmployee={auth.role === "ANSATT"}
        suggestions={suggestions}
      />

      {canManage && versionHistory.length > 0 && (
        <HandbokVersionHistory
          versions={versionHistory.map((v) => ({
            id: v.id,
            version: v.version,
            status: v.status,
            changeNote: v.changeNote,
            rejectedNote: v.rejectedNote,
            approvedAt: v.approvedAt?.toISOString() ?? null,
            publishedAt: v.publishedAt?.toISOString() ?? null,
            createdAt: v.createdAt.toISOString(),
            approvedBy: v.approvedBy,
            _count: v._count,
          }))}
        />
      )}
    </div>
  );
}
