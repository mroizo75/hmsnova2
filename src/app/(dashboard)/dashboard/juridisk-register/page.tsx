import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { fetchJuridiskRegisterData } from "@/server/queries/juridisk-register.queries";
import { JuridiskRegisterContent } from "@/features/juridisk-register/components/juridisk-register-content";

export default async function JuridiskRegisterPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userTenant = user.tenants.at(0);
  if (!userTenant) {
    return <div>Ingen tilgang til virksomhet</div>;
  }

  const initialData = await fetchJuridiskRegisterData();
  if (!initialData) {
    return <div>Ingen tilgang til virksomhet</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">Juridisk register</h1>
          <p className="text-muted-foreground">
            Gjeldende lover og forskrifter for din virksomhet
          </p>
        </div>
        <PageHelpDialog content={helpContent.legalRegister} />
      </div>

      <JuridiskRegisterContent initialData={initialData} />
    </div>
  );
}
