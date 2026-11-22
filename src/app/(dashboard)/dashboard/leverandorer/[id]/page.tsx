import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierForm, type SupplierFormValues } from "@/features/suppliers/components/supplier-form";
import { SupplierLinks } from "@/features/suppliers/components/supplier-links";
import { SupplierAssessments } from "@/features/suppliers/components/supplier-assessments";
import { SupplierDocuments } from "@/features/suppliers/components/supplier-documents";
import { SupplierEvaluations } from "@/features/suppliers/components/supplier-evaluations";
import {
  legacyAssessmentLines,
  parseSupplierAnswers,
  SUPPLIER_STATUS_LABELS,
  summaryFromLines,
  type SupplierAssessmentStatusValue,
  type SupplierCriticalityValue,
  type SupplierDocumentKindValue,
  type SupplierEvaluationMethodValue,
  type SupplierEvaluationOutcomeValue,
  type SupplierStatusValue,
} from "@/lib/supplier-management";
import { getSupplier, listSupplierLinkOptions } from "@/server/queries/supplier.queries";

export const dynamic = "force-dynamic";

function ymd(value: Date | null): string {
  if (!value) return "";
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(value: Date | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("nb-NO");
}

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();
  const options = await listSupplierLinkOptions(id);
  const now = new Date();

  const initial: SupplierFormValues = {
    id: supplier.id,
    name: supplier.name,
    orgNumber: supplier.orgNumber ?? "",
    scope: supplier.scope ?? "",
    contactName: supplier.contactName ?? "",
    contactEmail: supplier.contactEmail ?? "",
    contactPhone: supplier.contactPhone ?? "",
    worksOnSite: supplier.worksOnSite,
    status: supplier.status as SupplierStatusValue,
    criticality: supplier.criticality as SupplierCriticalityValue,
    criteria: supplier.criteria ?? "",
    controls: supplier.controls ?? "",
    requirements: supplier.requirements ?? "",
    nextReviewAt: ymd(supplier.nextReviewAt),
    notes: supplier.notes ?? "",
  };

  const canSend =
    Boolean(supplier.contactEmail) &&
    (supplier.criteria ?? "").trim().length >= 10 &&
    (supplier.requirements ?? "").trim().length >= 10 &&
    (supplier.controls ?? "").trim().length >= 10;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{supplier.name}</h1>
          <p className="text-muted-foreground">
            {SUPPLIER_STATUS_LABELS[supplier.status as SupplierStatusValue]}
            {supplier.performance.score === null
              ? ` · ${supplier.performance.label}`
              : ` · Ytelse ${supplier.performance.label} (${supplier.performance.score})`}
            {supplier.reviewOverdue ? " · re-evaluering forfalt" : ""}
            {supplier.nextReviewAt ? ` · Re-evaluering ${formatDate(supplier.nextReviewAt)}` : " · Ingen dato for re-evaluering"}
            {supplier.approvedAt
              ? ` · Godkjent ${formatDate(supplier.approvedAt)}${supplier.approvedBy?.name ? ` av ${supplier.approvedBy.name}` : ""}`
              : ""}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/audits/new?type=SUPPLIER&supplierId=${supplier.id}`}>Ny leverandørrevisjon</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leverandørrevisjoner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {supplier.audits.length === 0 ? <p className="text-muted-foreground">Ingen revisjoner er koblet.</p> : null}
            {supplier.audits.map((audit) => (
              <p key={audit.id}>
                <Link href={`/dashboard/audits/${audit.id}`} className="hover:underline">
                  {audit.title}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  · {formatDate(audit.scheduledDate)}
                  {audit.findings.length > 0 ? ` · ${audit.findings.length} åpne funn` : ""}
                </span>
              </p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avvik fra leverandør</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {supplier.incidents.length === 0 ? <p className="text-muted-foreground">Ingen avvik er koblet.</p> : null}
            {supplier.incidents.map((incident) => (
              <p key={incident.id}>
                <Link href={`/dashboard/incidents/${incident.id}`} className="hover:underline">
                  {incident.title}
                </Link>
                <span className="text-muted-foreground"> · {incident.status}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selvevaluering</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierAssessments
            supplierId={supplier.id}
            contactEmail={supplier.contactEmail ?? ""}
            canSend={canSend}
            questionCount={supplier.questionCount}
            assessments={supplier.assessments
              .filter((assessment) => assessment.status !== "CANCELLED")
              .map((assessment) => {
                const lines =
                  parseSupplierAnswers(assessment.answersSnapshot) ??
                  (assessment.respondentName
                    ? legacyAssessmentLines({
                        respondentName: assessment.respondentName,
                        respondentEmail: assessment.respondentEmail ?? "",
                        confirmsRequirements: assessment.confirmsRequirements ?? false,
                        competence: assessment.competence ?? "",
                        ownControls: assessment.ownControls ?? "",
                        subcontracting: assessment.subcontracting ?? "",
                        certifications: assessment.certifications ?? "",
                        recentDeviations: assessment.recentDeviations ?? "",
                        acceptsMonitoring: assessment.acceptsMonitoring ?? false,
                        coordinationContact: assessment.coordinationContact ?? "",
                        hmsSystem: assessment.hmsSystem ?? "",
                        worksOnSite: assessment.worksOnSite,
                      })
                    : []);
                return {
                  id: assessment.id,
                  status: assessment.status as SupplierAssessmentStatusValue,
                  dueAt: assessment.dueAt.toISOString(),
                  sentAt: assessment.sentAt.toISOString(),
                  sentToEmail: assessment.sentToEmail,
                  respondentName: assessment.respondentName,
                  respondentEmail: assessment.respondentEmail,
                  answers: lines.map((line) => ({ label: line.label, value: line.value })),
                  suggestedSummary: assessment.respondentName
                    ? summaryFromLines(assessment.respondentName, assessment.respondentEmail ?? "", lines)
                    : "",
                };
              })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vurderinger</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierEvaluations
            supplierId={supplier.id}
            currentNextReviewAt={supplier.nextReviewAt?.toISOString() ?? null}
            evaluations={supplier.evaluations.map((evaluation) => ({
              id: evaluation.id,
              method: evaluation.method as SupplierEvaluationMethodValue,
              outcome: evaluation.outcome as SupplierEvaluationOutcomeValue,
              summary: evaluation.summary,
              actions: evaluation.actions,
              evaluatedAt: evaluation.evaluatedAt.toISOString(),
              nextReviewAt: evaluation.nextReviewAt?.toISOString() ?? null,
              evaluatedByName: evaluation.evaluatedBy.name,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokumentasjon</CardTitle>
          <CardDescription>
            Utløpsdatoen gjelder dokumentet, for eksempel et sertifikat eller en forsikring. Den er ikke leverandørens godkjenningsdato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierDocuments
            supplierId={supplier.id}
            documents={supplier.documents.map((document) => ({
              id: document.id,
              title: document.title,
              kind: document.kind as SupplierDocumentKindValue,
              reference: document.reference,
              expiresAt: document.expiresAt?.toISOString() ?? null,
              fileKey: document.fileKey,
              fileName: document.fileName,
              expired: Boolean(document.expiresAt && document.expiresAt < new Date(now.getFullYear(), now.getMonth(), now.getDate())),
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Koble eksisterende oppfølging</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierLinks supplierId={supplier.id} audits={options.audits} incidents={options.incidents} />
        </CardContent>
      </Card>

      <SupplierForm initial={initial} />
    </div>
  );
}
