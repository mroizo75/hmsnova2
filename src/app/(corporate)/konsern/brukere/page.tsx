import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { listGroupUsers } from "@/server/actions/corporate-group.actions";
import { KonsernUserManagement } from "./user-management";

export default async function CorporateGroupUsersPage() {
  const users = await listGroupUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Konsern-brukere</h1>
        <p className="mt-1 text-sm text-gray-500">
          Personer som legges til her får konsern-tilgang. {users.length} bruker{users.length !== 1 ? "e" : ""} registrert.
        </p>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">Ingen konsern-brukere registrert.</p>
          </CardContent>
        </Card>
      ) : null}

      <KonsernUserManagement
        initialUsers={users.map((gu) => ({
          id: gu.id,
          userId: gu.userId,
          role: gu.role,
          name: gu.user.name ?? "Ukjent",
          email: gu.user.email,
        }))}
      />
    </div>
  );
}
