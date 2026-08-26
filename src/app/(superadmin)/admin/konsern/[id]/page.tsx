import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Users, FileText, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getCorporateGroupAdmin,
  getAvailableUsersForGroup,
  getAvailableTenantsForGroup,
} from "@/server/actions/admin-corporate-group.actions";
import { AdminGroupManager } from "./admin-group-manager";
import { DeleteGroupButton } from "./delete-group-button";
import { ExcelImportTenants } from "@/app/(corporate)/konsern/components/excel-import-tenants";

export default async function AdminCorporateGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [group, availableUsers, availableTenants] = await Promise.all([
    getCorporateGroupAdmin(id),
    getAvailableUsersForGroup(),
    getAvailableTenantsForGroup(),
  ]);

  if (!group) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/konsern">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {group.orgNumber && <span>Org.nr: {group.orgNumber}</span>}
            {group.contactEmail && <span>{group.contactEmail}</span>}
            <span>Slug: {group.slug}</span>
          </div>
        </div>
        <DeleteGroupButton groupId={group.id} groupName={group.name} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Building2 className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Bedrifter</p>
              <p className="text-xl font-bold">{group.tenants.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-xs text-gray-500">Brukere</p>
              <p className="text-xl font-bold">{group.users.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Innhold</p>
              <p className="text-xl font-bold">{group._count.content}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Send className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-xs text-gray-500">Distribusjoner</p>
              <p className="text-xl font-bold">{group._count.distributions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ExcelImportTenants groupId={group.id} />

      <AdminGroupManager
        groupId={group.id}
        users={group.users.map((gu) => ({
          id: gu.id,
          userId: gu.userId,
          role: gu.role,
          user: { id: gu.user.id, name: gu.user.name, email: gu.user.email },
        }))}
        tenants={group.tenants.map((gt) => ({
          id: gt.id,
          tenantId: gt.tenantId,
          status: gt.status,
          tenant: {
            id: gt.tenant.id,
            name: gt.tenant.name,
            slug: gt.tenant.slug,
            orgNumber: gt.tenant.orgNumber,
            city: gt.tenant.city,
          },
        }))}
        availableTenants={availableTenants}
        availableUsers={availableUsers}
      />
    </div>
  );
}
