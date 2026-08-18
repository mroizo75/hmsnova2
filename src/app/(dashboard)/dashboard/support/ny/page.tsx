import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateSupportTicketForm } from "@/features/support/components/create-support-ticket-form";

export const metadata = {
  title: "Ny support-sak | HMS Nova",
};

export default function NewSupportTicketPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/dashboard/support">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til support
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Ny sak til HMS-representant</CardTitle>
          <CardDescription>
            Beskriv hva du trenger hjelp til. En HMS-representant svarer i chat-
            tråden på saken – vanligvis neste virkedag, raskere ved høy prioritet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateSupportTicketForm />
        </CardContent>
      </Card>
    </div>
  );
}
