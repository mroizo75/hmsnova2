import { BookOpen, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantDocuments } from "@/server/actions/corporate-group-read.actions";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    LAW: "Lov/forskrift",
    PROCEDURE: "Prosedyre",
    CHECKLIST: "Sjekkliste",
    FORM: "Skjema",
    SDS: "Sikkerhetsdatablad",
    PLAN: "Plan",
    OTHER: "Annet",
  };
  return labels[kind] ?? kind;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Utkast",
    APPROVED: "Godkjent",
    ARCHIVED: "Arkivert",
  };
  return labels[status] ?? status;
}

function statusColor(status: string): string {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700";
  if (status === "DRAFT") return "bg-gray-100 text-gray-600";
  return "bg-gray-50 text-gray-500";
}

export default async function TenantDocumentsPage({ params }: PageProps) {
  const { tenantId } = await params;
  const documents = await getGroupTenantDocuments(tenantId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Dokumenter</h2>
        <span className="text-sm text-gray-500">{documents.length} totalt</span>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">Ingen dokumenter registrert</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{doc.title}</h3>
                    {doc.isLockedByGroup && (
                      <span className="flex shrink-0 items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                        <Lock className="h-2.5 w-2.5" />
                        Konsern-styrt
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">{kindLabel(doc.kind)}</span>
                    <span>v{doc.version}</span>
                    {doc.approvedAt && (
                      <>
                        <span>·</span>
                        <span>Godkjent {doc.approvedAt.toLocaleDateString("nb-NO")}</span>
                      </>
                    )}
                    {doc.nextReviewDate && (
                      <>
                        <span>·</span>
                        <span>Gjennomgang {doc.nextReviewDate.toLocaleDateString("nb-NO")}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 ml-3 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(doc.status)}`}>
                  {statusLabel(doc.status)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
