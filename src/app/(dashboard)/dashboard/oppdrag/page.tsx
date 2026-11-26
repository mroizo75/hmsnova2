import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchAssignments } from "@/server/queries/assignment.queries";
import { AssignmentList } from "@/features/assignments/components/assignment-list";

export default async function AssignmentsPage() {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadIncidents) redirect("/dashboard");

  const assignments = await fetchAssignments();
  const canCreate = auth.permissions.canCreateIncidents;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Briefcase className="h-8 w-8 text-blue-600" />
            Oppdrag
          </h1>
          <p className="text-muted-foreground">
            Hvem som er ute hos hvilken innleier, og om kompetanse og innføring er på plass.
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/oppdrag/ny">
              <Plus className="mr-2 h-4 w-4" />
              Nytt oppdrag
            </Link>
          </Button>
        )}
      </div>
      <AssignmentList assignments={assignments} />
    </div>
  );
}
