import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Shield, Building2 } from "lucide-react";
import Link from "next/link";
import { AdminUserList } from "@/features/admin/components/admin-user-list";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionUser } from "@/types";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser;

  // Kun superadmin har tilgang
  if (!user?.isSuperAdmin) {
    redirect("/admin");
  }
  const users = await prisma.user.findMany({
    include: {
      tenants: {
        include: {
          tenant: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    total: users.length,
    superAdmins: users.filter((u) => u.isSuperAdmin).length,
    withTenants: users.filter((u) => u.tenants.length > 0).length,
    withoutTenants: users.filter((u) => u.tenants.length === 0).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Brukere</h1>
          <p className="text-muted-foreground">
            Administrer alle brukere på tvers av bedrifter
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Ny bruker
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt brukere</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Superadmins</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.superAdmins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Med tenant</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.withTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uten tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {stats.withoutTenants}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle brukere</CardTitle>
          <CardDescription>
            Oversikt over alle brukere i systemet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminUserList users={users} />
        </CardContent>
      </Card>
    </div>
  );
}

