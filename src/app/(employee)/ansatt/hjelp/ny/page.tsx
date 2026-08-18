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

export default function AnsattNyHjelpPage() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/ansatt/hjelp">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Ny sak</CardTitle>
          <CardDescription>
            Send spørsmål til HMS-representantene. De svarer i chat-tråden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateSupportTicketForm basePath="/ansatt/hjelp" />
        </CardContent>
      </Card>
    </div>
  );
}
