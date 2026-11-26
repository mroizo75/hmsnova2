import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchAssignmentFormOptions } from "@/server/queries/assignment.queries";
import { AssignmentForm } from "@/features/assignments/components/assignment-form";

export default async function NewAssignmentPage() {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadIncidents || !auth.permissions.canCreateIncidents) {
    redirect("/dashboard/oppdrag");
  }

  const options = await fetchAssignmentFormOptions();
  if (!options) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/dashboard/oppdrag">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til oppdrag
        </Link>
      </Button>
      <div>
        <h1 className="text-3xl font-bold">Nytt oppdrag</h1>
        <p className="text-muted-foreground">Knytt en medarbeider til innleierens arbeidssted.</p>
      </div>
      <AssignmentForm
        users={options.users}
        workplaces={options.workplaces}
        profiles={options.profiles}
        projects={options.projects}
      />
    </div>
  );
}
