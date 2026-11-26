import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { assignmentStatusLabels } from "@/features/assignments/schemas/assignment.schema";
import type { fetchAssignments } from "@/server/queries/assignment.queries";

type AssignmentRow = Awaited<ReturnType<typeof fetchAssignments>>[number];

export function AssignmentList({ assignments }: { assignments: AssignmentRow[] }) {
  if (assignments.length === 0) {
    return <p className="text-muted-foreground">Ingen oppdrag er registrert ennå.</p>;
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => (
        <Link
          key={assignment.id}
          href={`/dashboard/oppdrag/${assignment.id}`}
          className="block rounded-lg border p-4 hover:bg-muted/40"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">
                {assignment.user.name || assignment.user.email} hos {assignment.workplace.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {assignment.roleTitle ? `${assignment.roleTitle} · ` : ""}
                {assignment.startDate.slice(0, 10)}
                {assignment.workplace.address ? ` · ${assignment.workplace.address}` : ""}
              </p>
            </div>
            <Badge>{assignmentStatusLabels[assignment.status]}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant={assignment.competenceReady ? "secondary" : "destructive"}>
              {assignment.competenceReady ? "Kompetanse ok" : "Mangler kompetanse"}
            </Badge>
            <Badge variant={assignment.inductionReady ? "secondary" : "destructive"}>
              {assignment.inductionReady ? "Innføring ok" : "Mangler innføring"}
            </Badge>
            {assignment.openIncidents > 0 && <Badge variant="outline">{assignment.openIncidents} åpne avvik</Badge>}
          </div>
        </Link>
      ))}
    </div>
  );
}
