import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchTemplates } from "@/server/queries/boarding.queries";
import { BoardingTemplateList } from "@/features/boarding/components/boarding-template-list";

export default async function MalerPage() {
  const auth = await getAuthContext();

  if (!auth.permissions.canReadAllBoarding && !auth.permissions.canManageBoardingTemplates) {
    redirect("/dashboard/onboarding");
  }

  const templates = await fetchTemplates();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/onboarding">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tilbake
          </Link>
        </Button>
      </div>

      <BoardingTemplateList
        templates={templates}
        canManage={auth.permissions.canManageBoardingTemplates}
      />
    </div>
  );
}
