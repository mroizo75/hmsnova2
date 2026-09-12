import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { CalendarDays } from "lucide-react";
import { fetchAbsences } from "@/server/queries/absence.queries";
import { AbsenceContent } from "@/features/absence/components/absence-content";
import { HrWorkspaceNav } from "@/features/hr/components/hr-workspace-nav";

export default async function FravaerPage({
  searchParams,
}: {
  searchParams: Promise<{ ansatt?: string }>;
}) {
  const auth = await getAuthContext();
  const { ansatt } = await searchParams;

  const canRead =
    auth.permissions.canReadOwnAbsence ||
    auth.permissions.canReadAllAbsence;

  if (!canRead) redirect("/dashboard");

  const initialData = await fetchAbsences();

  return (
    <div className="space-y-6 p-6">
      <HrWorkspaceNav />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Fravær og sykdom
        </h1>
        <p className="text-muted-foreground mt-1">
          Oversikt og registrering av fravær, sykefravær og ferie – AML § 5-1
        </p>
      </div>

      <AbsenceContent
        absences={initialData}
        initialSearch={ansatt ?? ""}
        permissions={{
          canCreateAbsence: auth.permissions.canCreateAbsence,
          canApproveAbsence: auth.permissions.canApproveAbsence,
          canExportAbsenceStats: auth.permissions.canExportAbsenceStats,
        }}
      />
    </div>
  );
}
