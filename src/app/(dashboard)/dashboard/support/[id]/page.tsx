import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSupportTicket } from "@/server/queries/support.queries";
import { SupportDetailContent } from "@/features/support/components/support-detail-content";

export const dynamic = "force-dynamic";

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialData = await fetchSupportTicket(id);

  if (!initialData) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/dashboard/support">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Alle saker
        </Link>
      </Button>

      <SupportDetailContent initialData={initialData} ticketId={id} />
    </div>
  );
}
