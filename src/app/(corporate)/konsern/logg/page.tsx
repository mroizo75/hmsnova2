import { ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCorporateGroupContext } from "@/lib/corporate-group-context";
import { prisma } from "@/lib/db";

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
};

export default async function CorporateGroupAuditLogPage() {
  const context = await requireCorporateGroupContext();

  const logs = await prisma.corporateGroupAuditLog.findMany({
    where: { groupId: context.groupId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const userIds = [...new Set(logs.map((l) => l.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

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
              {logs.map((log) => {
                const user = userMap.get(log.userId);
                return (
                  <div key={log.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                          {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {actionLabels[log.action] ?? log.action}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user?.name ?? user?.email ?? "Ukjent bruker"}
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
