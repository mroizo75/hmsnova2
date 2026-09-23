import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/server-action";
import { EquipmentApprovalForm } from "@/features/equipment-approval/components/equipment-approval-form";
import { getEquipmentApprovalContext } from "@/server/queries/equipment-approval.queries";

export default async function NewEquipmentApprovalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const access = await getEquipmentApprovalContext();
  if (!access?.canEdit) redirect("/dashboard/utstyr");

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/dashboard/utstyr">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til utstyr
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Nytt utstyr</h1>
        <p className="mt-1 text-muted-foreground">
          Registrer utstyr, leverandør og perioden godkjenningen gjelder.
        </p>
      </div>
      <EquipmentApprovalForm mode="create" />
    </div>
  );
}
