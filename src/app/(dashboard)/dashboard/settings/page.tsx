import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantSettingsForm } from "@/features/settings/components/tenant-settings-form";
import { UserProfileForm } from "@/features/settings/components/user-profile-form";
import { UserManagement } from "@/features/settings/components/user-management";
import { SubscriptionInfo } from "@/features/settings/components/subscription-info";
import { Building2, User, Users, CreditCard } from "lucide-react";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: {
            include: {
              subscription: true,
              invoices: {
                orderBy: { createdAt: "desc" },
                take: 10,
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Du er ikke tilknyttet en tenant.</div>;
  }

  const tenantId = user.tenants[0].tenantId;
  const tenant = user.tenants[0].tenant;
  const isAdmin = user.tenants[0].role === "ADMIN";

  // Hent alle brukere i tenant
  const tenantUsers = await prisma.userTenant.findMany({
    where: { tenantId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Hent brukergrense basert på pricing tier
  const { getSubscriptionLimits } = await import("@/lib/subscription");
  const limits = getSubscriptionLimits(tenant.pricingTier as any);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Innstillinger</h1>
        <p className="text-muted-foreground">
          Administrer bedrift, brukere og system
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Bedrift</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Brukere</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Abonnement</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <TenantSettingsForm tenant={tenant} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="profile">
          <UserProfileForm user={user} />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement 
            users={tenantUsers} 
            currentUserId={user.id} 
            isAdmin={isAdmin}
            pricingTier={tenant.pricingTier}
            maxUsers={limits.maxUsers}
          />
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionInfo tenant={tenant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
