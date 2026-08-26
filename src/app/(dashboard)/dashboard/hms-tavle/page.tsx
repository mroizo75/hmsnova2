import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { Monitor, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { fetchHmsTavleList } from "@/server/queries/hms-tavle.queries";
import { HmsTavleListContent } from "@/features/hms-tavle/components/hms-tavle-list-content";

export default async function HmsTavleOversiktPage() {
  const auth = await getAuthContext();
  if (!auth || !auth.permissions.canViewHmsTavle) redirect("/dashboard");

  const initialData = await fetchHmsTavleList();
  if (!initialData) redirect("/dashboard");

  const hasActiveSub =
    initialData.subscription &&
    initialData.subscription.status !== "EXPIRED" &&
    initialData.subscription.status !== "CANCELLED";

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6 text-blue-600" />
            Digital HMS Tavle
          </h1>
          <p className="text-muted-foreground mt-1">
            Digital byggeplasstavel for bygg og anlegg – QR-tilgang, UE-portal og live HMS-data
          </p>
        </div>
        {hasActiveSub && auth.permissions.canManageHmsTavle && (
          <Button asChild>
            <Link href="/dashboard/hms-tavle/ny">
              <Plus className="h-4 w-4 mr-2" />
              Ny tavle
            </Link>
          </Button>
        )}
      </div>

      <HmsTavleListContent
        initialData={initialData}
        canManage={auth.permissions.canManageHmsTavle}
      />
    </div>
  );
}
