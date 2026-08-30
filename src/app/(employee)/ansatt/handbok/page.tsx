import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { BookOpen } from "lucide-react";
import { fetchHmsHandbok } from "@/server/queries/hms-handbok.queries";
import { HandbokViewer } from "@/features/hms-handbok/components/handbok-viewer";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "HMS- og personalhåndbok" };

export default async function AnsattHandbokPage() {
  const auth = await getAuthContext();

  if (!auth || (!auth.permissions.canReadDocuments && !auth.permissions.canReadRoutines)) {
    redirect("/ansatt");
  }

  const data = await fetchHmsHandbok({ forEmployee: true });
  if (!data) {
    redirect("/ansatt");
  }

  const approved = data.handbook.currentVersion?.status === "APPROVED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          HMS- og personalhåndbok
        </h1>
        <p className="text-muted-foreground mt-1">
          Les bedriftens håndbok og bekreft at du har lest og forstått innholdet.
        </p>
      </div>

      {!approved ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Det er ikke publisert en godkjent håndbok ennå. Kontakt leder eller HMS-ansvarlig.
          </CardContent>
        </Card>
      ) : (
        <HandbokViewer
          tenantId={data.tenantId}
          tenantName={data.tenantName}
          orgNumber={data.orgNumber}
          industry={data.industry}
          hmsContactName={data.hmsContactName}
          hmsContactPhone={data.hmsContactPhone}
          handbook={data.handbook}
          stats={data.stats}
          currentUserId={data.currentUserId}
          canManage={false}
          canApprove={false}
          isEmployee
        />
      )}
    </div>
  );
}
