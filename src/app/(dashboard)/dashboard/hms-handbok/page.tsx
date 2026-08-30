import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { BookOpen } from "lucide-react";
import { fetchHmsHandbok } from "@/server/queries/hms-handbok.queries";
import { HmsHandbokContent } from "@/features/hms-handbok/components/hms-handbok-content";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";

export const metadata = { title: "HMS- og personalhåndbok" };

export default async function HmsHandbokPage() {
  const auth = await getAuthContext();

  if (!auth || (!auth.permissions.canReadDocuments && !auth.permissions.canReadRoutines)) {
    redirect("/dashboard");
  }

  const initialData = await fetchHmsHandbok();
  if (!initialData) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            HMS- og personalhåndbok
          </h1>
          <p className="text-muted-foreground mt-1">
            Versjonskontrollert håndbok med HMS- og personal-kapitler.
            Endringer krever godkjenning, og alle ansatte signerer per versjon.
          </p>
        </div>
        <PageHelpDialog content={helpContent.hmsHandbok} />
      </div>

      <HmsHandbokContent initialData={initialData} />
    </div>
  );
}
