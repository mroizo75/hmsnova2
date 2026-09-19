import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { BookOpen } from "lucide-react";
import { fetchHmsHandbok } from "@/server/queries/hms-handbok.queries";
import { EmployeeHandbookView } from "@/features/hms-handbok/components/employee-handbook-view";
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

  const version = data.handbook.currentVersion;
  const hasContent = Boolean(version && version.sections.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          HMS- og personalhåndbok
        </h1>
        <p className="text-muted-foreground mt-1">
          Finn det du trenger: avvik, varsling, beredskap og personal. Bekreft at du har lest innholdet.
        </p>
      </div>

      {!hasContent ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Håndboken er under utarbeidelse. Når det ligger innhold her, skal du lese og bekrefte
            det — samme krav som i dashboard (IK-HMS § 5).
          </CardContent>
        </Card>
      ) : (
        <EmployeeHandbookView
          tenantName={data.tenantName}
          hmsContactName={data.hmsContactName}
          hmsContactPhone={data.hmsContactPhone}
          handbook={data.handbook}
          currentUserId={data.currentUserId}
        />
      )}
    </div>
  );
}
