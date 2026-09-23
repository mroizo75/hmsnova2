import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { employeeOwnIncidentsWhere } from "@/lib/incident-visibility";
import { getIncidentStatusLabel } from "@/features/incidents/schemas/incident.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmployeeIncidentCommentForm } from "@/features/incidents/components/employee-incident-comment-form";

export default async function AnsattAvvikDetalj({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.id) {
    redirect("/login");
  }

  const { id } = await params;
  const incident = await prisma.incident.findFirst({
    where: { id, ...employeeOwnIncidentsWhere(session.user.tenantId, session.user.id) },
    include: {
      comments: {
        where: { kind: "SUBMITTER" },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      equipmentApproval: { select: { name: true } },
    },
  });

  if (!incident) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/ansatt/avvik">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{incident.title}</h1>
          <p className="text-sm text-muted-foreground">
            {incident.avviksnummer ?? incident.type}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status
            <Badge variant="outline">{getIncidentStatusLabel(incident.status)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="whitespace-pre-wrap">{incident.description}</p>
          {incident.location && (
            <p className="text-muted-foreground">Sted: {incident.location}</p>
          )}
          {incident.equipmentApproval && (
            <p className="text-muted-foreground">Utstyr: {incident.equipmentApproval.name}</p>
          )}
          <p className="text-muted-foreground">
            Behandlingsnotater er interne og vises ikke her. Du ser status og dine egne kommentarer.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kommentarer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {incident.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen kommentarer ennå.</p>
          ) : (
            <ul className="space-y-3">
              {incident.comments.map((comment) => (
                <li key={comment.id} className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">
                    {comment.author.name ?? "Innsender"} ·{" "}
                    {comment.createdAt.toLocaleString("nb-NO")}
                  </p>
                  <p className="whitespace-pre-wrap">{comment.body}</p>
                </li>
              ))}
            </ul>
          )}
          {incident.status !== "CLOSED" && (
            <EmployeeIncidentCommentForm incidentId={incident.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
