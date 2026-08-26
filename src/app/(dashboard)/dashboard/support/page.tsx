import Link from "next/link";
import { Headphones, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSupportTickets } from "@/server/queries/support.queries";
import { SupportListContent } from "@/features/support/components/support-list-content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hjelp og support | HMS Nova",
  description: "Chat og ticketsystem med HMS-representantene våre",
};

export default async function SupportPage() {
  const initialData = await fetchSupportTickets();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Headphones className="h-7 w-7 text-primary" />
            Hjelp og support
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            HMS-representantene våre er tilgjengelige via chat og ticketsystem.
            Still spørsmål om systemet, HMS-faglige forhold, faktura eller tekniske
            problemer – vi svarer her i tråden.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/support/ny">
            <Plus className="mr-2 h-4 w-4" />
            Ny sak
          </Link>
        </Button>
      </div>

      <SupportListContent initialData={initialData} />
    </div>
  );
}
