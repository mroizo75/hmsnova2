import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BcmHelpDialog } from "@/components/bcm/bcm-help-dialog";
import { fetchBcmData } from "@/server/queries/bcm.queries";
import { BcmContent } from "@/features/bcm/components/bcm-content";

export default async function BcmPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const initialData = await fetchBcmData();
  if (!initialData) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold">Beredskap og kontinuitet</h1>
            <p className="text-muted-foreground">
              ISO 22301: Følg opp BCM-planer, krisehåndbok og øvelser
            </p>
          </div>
          <BcmHelpDialog />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/documents">Se alle dokumenter</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/audits/new">Registrer øvelse/test</Link>
          </Button>
        </div>
      </div>

      <BcmContent initialData={initialData} />
    </div>
  );
}
