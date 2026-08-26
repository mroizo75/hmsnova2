import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { fetchFeedbackData } from "@/server/queries/feedback.queries";
import { FeedbackContent } from "@/features/feedback/components/feedback-content";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const initialData = await fetchFeedbackData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Kundetilbakemeldinger</h1>
            <p className="text-muted-foreground">
              ISO 9001 – dokumenter og del positive erfaringer fra kunder (9.1.2 Kundetilfredshet)
            </p>
          </div>
          <PageHelpDialog content={helpContent.feedback} />
        </div>
        <Button asChild>
          <Link href="/dashboard/feedback/new">Ny tilbakemelding</Link>
        </Button>
      </div>

      <FeedbackContent initialData={initialData} />
    </div>
  );
}
