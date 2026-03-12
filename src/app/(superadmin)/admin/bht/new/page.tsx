import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope } from "lucide-react";
import { AddBhtClientForm } from "@/features/admin/components/add-bht-client-form";
import { hasTenantFeature } from "@/lib/tenant-features";

export const metadata = {
  title: "Ny BHT-kunde | HMS Nova",
  description: "Legg til ny bedriftshelsetjeneste-kunde",
};

export default async function NewBhtClientPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.isSuperAdmin && !user?.isSupport) {
    redirect("/dashboard");
  }

  // Hent alle aktive tenants som ikke allerede er BHT-kunder
  const candidateTenants = await prisma.tenant.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      bhtClient: null,
    },
    select: {
      id: true,
      name: true,
      orgNumber: true,
      industry: true,
      employeeCount: true,
      contactEmail: true,
      contactPerson: true,
    },
    orderBy: { name: "asc" },
  });
  const tenantsWithoutBht = candidateTenants.filter((tenant) =>
    hasTenantFeature(tenant.industry, "bht")
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Stethoscope className="h-8 w-8 text-primary" />
          Ny BHT-kunde
        </h1>
        <p className="text-muted-foreground mt-1">
          Registrer en eksisterende kunde som BHT-kunde
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Velg kunde</CardTitle>
          <CardDescription>
            Velg en eksisterende kunde og angi avtaledetaljer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddBhtClientForm tenants={tenantsWithoutBht} />
        </CardContent>
      </Card>
    </div>
  );
}

