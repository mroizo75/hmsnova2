import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SupplierForm } from "@/features/suppliers/components/supplier-form";

export const dynamic = "force-dynamic";

export default async function NewSupplierPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ny leverandør</h1>
        <p className="text-muted-foreground">Registrer leverandøren før kritiske varer eller tjenester kjøpes inn.</p>
      </div>
      <SupplierForm />
    </div>
  );
}
