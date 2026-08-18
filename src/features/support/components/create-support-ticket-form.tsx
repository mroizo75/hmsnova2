"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SupportTicketCategory, SupportTicketPriority } from "@prisma/client";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createSupportTicket } from "@/server/actions/support.actions";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITY_LABELS,
} from "@/features/support/lib/labels";

interface CreateSupportTicketFormProps {
  basePath?: string;
}

export function CreateSupportTicketForm({
  basePath = "/dashboard/support",
}: CreateSupportTicketFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("QUESTION");
  const [priority, setPriority] = useState<SupportTicketPriority>("NORMAL");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSupportTicket({
        subject,
        body,
        category,
        priority,
      });

      if (result.success === false) {
        toast({
          title: "Kunne ikke opprette sak",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sak opprettet",
        description: `${result.data.ticketNumber} er sendt til HMS-representantene våre.`,
      });
      router.push(`${basePath}/${result.data.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="subject">Emne</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Kort beskrivelse av det du trenger hjelp til"
          required
          minLength={3}
          maxLength={200}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Kategori</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as SupportTicketCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SUPPORT_CATEGORY_LABELS) as SupportTicketCategory[]).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {SUPPORT_CATEGORY_LABELS[key]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prioritet</Label>
          <Select
            value={priority}
            onValueChange={(v) => setPriority(v as SupportTicketPriority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SUPPORT_PRIORITY_LABELS) as SupportTicketPriority[]).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {SUPPORT_PRIORITY_LABELS[key]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Melding</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Beskriv spørsmålet eller problemet. HMS-representantene våre svarer via chat her i systemet."
          rows={8}
          required
          minLength={5}
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sender…
          </>
        ) : (
          "Send til HMS-representant"
        )}
      </Button>
    </form>
  );
}
