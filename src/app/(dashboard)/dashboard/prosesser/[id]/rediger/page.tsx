import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPermissions } from "@/lib/permissions";
import { ProcessForm, type ProcessFormValues } from "@/features/qms-processes/components/process-form";
import type { QmsProcessKindValue, QmsProcessStatusValue } from "@/lib/qms-processes";
import { getQmsProcess, listQmsProcessOptions } from "@/server/queries/qms-process.queries";

export const dynamic = "force-dynamic";

function dateInput(value: Date | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default async function EditProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.role) redirect("/login");
  if (!getPermissions(session.user.role, session.user.extraRoles).canCreateDocuments) redirect("/dashboard/prosesser");
  const { id } = await params;
  const [process, options] = await Promise.all([getQmsProcess(id), listQmsProcessOptions()]);
  if (!process) notFound();

  const initial: ProcessFormValues = {
    id: process.id,
    name: process.name,
    kind: process.kind as QmsProcessKindValue,
    status: process.status as QmsProcessStatusValue,
    sortOrder: process.sortOrder,
    purpose: process.purpose ?? "",
    inputs: process.inputs ?? "",
    outputs: process.outputs ?? "",
    criteria: process.criteria ?? "",
    resources: process.resources ?? "",
    risksAndOpportunities: process.risksAndOpportunities ?? "",
    scopeReason: process.scopeReason ?? "",
    evaluationNote: process.evaluationNote ?? "",
    lastEvaluatedAt: dateInput(process.lastEvaluatedAt),
    nextReviewAt: dateInput(process.nextReviewAt),
    ownerId: process.ownerId ?? "",
    routineId: process.routineId ?? "",
    moduleHref: process.moduleHref ?? "",
    deliversTo: process.outgoing.map((link) => link.toProcessId),
    steps: process.steps.map((step) => ({ title: step.title, description: step.description ?? "" })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rediger {process.name}</h1>
        <p className="text-muted-foreground">Tilpass prosessen til slik bedriften faktisk arbeider.</p>
      </div>
      <ProcessForm
        initial={initial}
        users={options.users}
        routines={options.routines}
        processes={options.processes}
      />
    </div>
  );
}
