import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { BookOpen } from "lucide-react";
import { fetchHmsHandbok } from "@/server/queries/hms-handbok.queries";
import { HmsHandbokContent } from "@/features/hms-handbok/components/hms-handbok-content";

export const metadata = { title: "HMS Håndbok" };

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
            HMS Håndbok
          </h1>
          <p className="text-muted-foreground mt-1">
            Versjonskontrollert HMS-håndbok med dynamisk innhold fra alle HMS-moduler.
            Endringer krever godkjenning og alle ansatte signerer per versjon.
          </p>
        </div>
      </div>

      <HmsHandbokContent initialData={initialData} />
    </div>
  );
}
