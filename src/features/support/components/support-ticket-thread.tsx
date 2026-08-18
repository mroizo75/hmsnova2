"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Loader2, Send } from "lucide-react";
import type {
  SupportSenderType,
  SupportTicketStatus,
} from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  replyToSupportTicketAsCustomer,
  replyToSupportTicketAsStaff,
  updateSupportTicketStatus,
  claimSupportTicket,
} from "@/server/actions/support.actions";
import { SUPPORT_STATUS_LABELS } from "@/features/support/lib/labels";
import { cn } from "@/lib/utils";

export type SupportThreadMessage = {
  id: string;
  body: string;
  senderType: SupportSenderType;
  isInternal: boolean;
  createdAt: Date | string;
  sender: { id: string; name: string | null; email: string };
};

interface SupportTicketThreadProps {
  ticketId: string;
  status: SupportTicketStatus;
  messages: SupportThreadMessage[];
  mode: "customer" | "staff";
  assignedToName?: string | null;
  pollMs?: number;
}

export function SupportTicketThread({
  ticketId,
  status,
  messages,
  mode,
  assignedToName,
  pollMs = 8000,
}: SupportTicketThreadProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!pollMs) return;
    const id = window.setInterval(() => {
      router.refresh();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, router]);

  const send = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      const result =
        mode === "staff"
          ? await replyToSupportTicketAsStaff({
              ticketId,
              body: body.trim(),
              isInternal,
            })
          : await replyToSupportTicketAsCustomer({
              ticketId,
              body: body.trim(),
              isInternal: false,
            });

      if (result.success === false) {
        toast({
          title: "Kunne ikke sende",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      setBody("");
      setIsInternal(false);
      router.refresh();
    });
  };

  const onStatusChange = (next: SupportTicketStatus) => {
    startTransition(async () => {
      const result = await updateSupportTicketStatus({
        ticketId,
        status: next,
      });
      if (result.success === false) {
        toast({
          title: "Kunne ikke oppdatere status",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }
      router.refresh();
    });
  };

  const onClaim = () => {
    startTransition(async () => {
      const result = await claimSupportTicket(ticketId);
      if (result.success === false) {
        toast({
          title: "Kunne ikke ta saken",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Du har tatt saken" });
      router.refresh();
    });
  };

  const closed = status === "CLOSED";

  return (
    <div className="flex flex-col gap-4">
      {mode === "staff" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => onStatusChange(v as SupportTicketStatus)}
              disabled={isPending}
            >
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SUPPORT_STATUS_LABELS) as SupportTicketStatus[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {SUPPORT_STATUS_LABELS[key]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            Ansvarlig: {assignedToName ?? "Ikke tildelt"}
          </div>
          {!assignedToName && (
            <Button size="sm" variant="outline" onClick={onClaim} disabled={isPending}>
              Ta saken
            </Button>
          )}
        </div>
      )}

      <div className="rounded-lg border bg-background">
        <div className="max-h-[480px] space-y-3 overflow-y-auto p-4">
          {messages.map((msg) => {
            const isSupport = msg.senderType === "SUPPORT" || msg.senderType === "SYSTEM";
            const isMine =
              (mode === "staff" && isSupport) ||
              (mode === "customer" && msg.senderType === "CUSTOMER");

            return (
              <div
                key={msg.id}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    msg.isInternal
                      ? "border border-amber-300 bg-amber-50 text-amber-950"
                      : isSupport
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 text-[11px] opacity-80">
                    <span className="font-medium">
                      {msg.sender.name || msg.sender.email}
                      {isSupport ? " · HMS Nova" : ""}
                    </span>
                    {msg.isInternal && <Badge variant="outline">Intern</Badge>}
                    <span>
                      {format(new Date(msg.createdAt), "dd.MM.yyyy HH:mm", {
                        locale: nb,
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-3 space-y-3">
          {closed ? (
            <p className="text-sm text-muted-foreground px-1">
              Saken er lukket. Opprett en ny sak hvis du trenger mer hjelp.
            </p>
          ) : (
            <>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  mode === "staff"
                    ? "Skriv svar til kunden…"
                    : "Skriv til HMS-representanten…"
                }
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                {mode === "staff" ? (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={isInternal}
                      onCheckedChange={(v) => setIsInternal(Boolean(v))}
                    />
                    Intern merknad (skjules for kunden)
                  </label>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ctrl/Cmd + Enter for å sende
                  </p>
                )}
                <Button onClick={send} disabled={isPending || !body.trim()}>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
