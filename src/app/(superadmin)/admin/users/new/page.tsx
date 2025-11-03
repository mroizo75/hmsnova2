import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AdminUserForm } from "@/features/admin/components/admin-user-form";

export default async function NewAdminUserPage() {
  // Hent alle tenants for dropdown
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
        <h1 className="text-3xl font-bold">Ny bruker</h1>
        <p className="text-muted-foreground">
          Opprett en ny bruker og knytt til bedrift
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brukerdetaljer</CardTitle>
          <CardDescription>
            Fyll inn informasjon om den nye brukeren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminUserForm tenants={tenants} />
        </CardContent>
      </Card>
    </div>
  );
}

