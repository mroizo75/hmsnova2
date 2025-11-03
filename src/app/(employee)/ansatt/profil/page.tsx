import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { ProfileForm } from "@/components/ansatt/profile-form";

export default async function AnsattProfil() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Hent brukerens fullstendige data
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      tenants: {
        include: {
          tenant: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <User className="h-7 w-7 text-primary" />
          Min profil
        </h1>
        <p className="text-muted-foreground">
          Administrer din profil og kontaktinformasjon
        </p>
      </div>

      {/* Profilbilde og info */}
      <Card>
        <CardHeader>
          <CardTitle>Profilinformasjon</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      {/* Bedriftsinformasjon */}
      <Card>
        <CardHeader>
          <CardTitle>Bedriftsinformasjon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {user.tenants.map((ut) => (
              <div key={ut.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{ut.tenant.name}</p>
                  <p className="text-sm text-muted-foreground">Rolle: {ut.role}</p>
                  {ut.department && (
                    <p className="text-xs text-muted-foreground">Avdeling: {ut.department}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

