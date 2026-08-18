import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { getHandbookData, getHandbookSuggestions } from "@/server/actions/hms-handbok.actions";
import { HandbokViewer } from "@/features/hms-handbok/components/handbok-viewer";
import { BookOpen } from "lucide-react";

export const metadata = { title: "HMS Håndbok" };

export default async function HmsHandbokPage() {
  const auth = await getAuthContext();
  const { permissions, tenantId, userId } = auth;

  if (!permissions.canReadDocuments && !permissions.canReadRoutines) {
    redirect("/dashboard");
  }

  const [tenant, handbookResult, suggestions] = await Promise.all([
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
        suggestions={suggestions}
      />
    </div>
  );
}
