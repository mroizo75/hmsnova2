import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupAuditLog } from "@/server/actions/corporate-group-read.actions";
import { KonsernPagination } from "@/components/konsern-pagination";

const PAGE_SIZE = 25;

const actionLabels: Record<string, string> = {
  ADD_TENANT: "La til bedrift",
  REMOVE_TENANT: "Fjernet bedrift",
  ADD_USER: "La til bruker",
  UPDATE_USER_ROLE: "Endret brukerrolle",
  REMOVE_USER: "Fjernet bruker",
  UPDATE_SETTINGS: "Oppdaterte innstillinger",
  CREATE_CONTENT: "Opprettet innhold",
  UPDATE_CONTENT: "Oppdaterte innhold",
  PUBLISH_CONTENT: "Publiserte innhold",
  ARCHIVE_CONTENT: "Arkiverte innhold",
  DELETE_CONTENT: "Slettet innhold",
  DISTRIBUTE_CONTENT: "Distribuerte innhold",
  WITHDRAW_DISTRIBUTION: "Trakk tilbake distribusjon",
  VIEW_TENANT_DATA: "Leste bedriftsdata",
  VIEW_TENANT_WELLBEING: "Leste psykososiale data",
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function CorporateGroupAuditLogPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { logs, total } = await getGroupAuditLog({ limit: PAGE_SIZE, offset });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revisjonslogg</h1>
        <p className="mt-1 text-sm text-gray-500">
          GDPR-kompatibel logg over alle handlinger i konsernet
        </p>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ScrollText className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">Ingen loggoppføringer ennå.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {logs.map((log) => (
                <div key={log.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {(log.user?.name ?? log.user?.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {actionLabels[log.action] ?? log.action}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.user?.name ?? log.user?.email ?? "Ukjent bruker"}
                        </p>
                      </div>
                    </div>
                    <time className="text-xs text-gray-400" dateTime={log.createdAt.toISOString()}>
                      {log.createdAt.toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <KonsernPagination
        currentPage={page}
        totalItems={total}
        pageSize={PAGE_SIZE}
        basePath="/konsern/logg"
      />
    </div>
  );
}
