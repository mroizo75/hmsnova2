import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUserForm } from "@/features/admin/components/admin-user-form";

export default async function EditAdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      tenants: true,
    },
  });

  if (!user) {
    notFound();
  }

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      status: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til brukere
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Rediger bruker</h1>
        <p className="text-muted-foreground">
          Oppdater brukerinformasjon og tilganger
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brukerdetaljer</CardTitle>
          <CardDescription>
            Rediger informasjon om brukeren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminUserForm tenants={tenants} user={user} />
        </CardContent>
      </Card>
    </div>
  );
}

