import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchAssignmentDetail, fetchAssignmentFormOptions } from "@/server/queries/assignment.queries";
import { AssignmentDetailEditor } from "@/features/assignments/components/assignment-detail-editor";

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadIncidents) redirect("/dashboard");

  const { id } = await params;
  const [assignment, options] = await Promise.all([
    fetchAssignmentDetail(id),
    fetchAssignmentFormOptions(),
  ]);
  if (!assignment || !options) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/dashboard/oppdrag">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til oppdrag
        </Link>
      </Button>
      <h1 className="text-3xl font-bold">Oppdrag</h1>
      <AssignmentDetailEditor
        assignment={assignment}
        profiles={options.profiles}
        canEdit={auth.permissions.canCreateIncidents}
      />
    </div>
  );
}
