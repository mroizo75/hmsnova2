"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Clock } from "lucide-react";
import { acknowledgeMessage } from "@/server/actions/corporate-group-messages.actions";

export interface TenantMessage {
  id: string;
  title: string;
  body: string;
  priority: string;
  requiresAck: boolean;
  deadline: Date | null;
  author: string | null;
  createdAt: Date;
  isRead: boolean;
  readAt: Date | null;
}

interface KonsernMessagesBannerProps {
  messages: TenantMessage[];
}

export function KonsernMessagesBanner({ messages }: KonsernMessagesBannerProps) {
  const unread = messages.filter((m) => !m.isRead);

  if (unread.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {unread.length === 1 ? "1 melding fra konsernet" : `${unread.length} meldinger fra konsernet`}
        </p>
        <Link
          href="/dashboard/meldinger"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Se alle
        </Link>
      </div>
      <div className="space-y-2">
        {unread.slice(0, 2).map((msg) => (
          <UnreadMessageRow key={msg.id} msg={msg} />
        ))}
      </div>
    </div>
  );
}

function UnreadMessageRow({ msg }: { msg: TenantMessage }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleAcknowledge() {
    startTransition(async () => {
      try {
        await acknowledgeMessage(msg.id);
        toast({ title: "Meldingen er kvittert ut" });
        router.refresh();
      } catch (err) {
        toast({
          title: "Feil",
          description: err instanceof Error ? err.message : "Ukjent feil",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{msg.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {msg.author ? `${msg.author} · ` : ""}
          {new Date(msg.createdAt).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}
          {msg.deadline && (
            <span>
              {" "}
              · <Clock className="mb-0.5 inline h-3 w-3" />{" "}
              {new Date(msg.deadline).toLocaleDateString("nb-NO")}
            </span>
          )}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleAcknowledge}
        disabled={pending}
        className="shrink-0 bg-transparent"
      >
        {pending ? "..." : "Kvitter ut"}
      </Button>
    </div>
  );
}

export function TenantMessageCard({
  msg,
  showAcknowledge,
}: {
  msg: TenantMessage;
  showAcknowledge: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleAcknowledge() {
    startTransition(async () => {
      try {
        await acknowledgeMessage(msg.id);
        toast({ title: "Meldingen er kvittert ut" });
        router.refresh();
      } catch (err) {
        toast({
          title: "Feil",
          description: err instanceof Error ? err.message : "Ukjent feil",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">{msg.title}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {msg.author ? `${msg.author} · ` : ""}
            {new Date(msg.createdAt).toLocaleDateString("nb-NO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {msg.deadline && (
              <span>
                {" "}
                · Frist {new Date(msg.deadline).toLocaleDateString("nb-NO")}
              </span>
            )}
            {msg.isRead && msg.readAt && (
              <span>
                {" "}
                · Kvittert {new Date(msg.readAt).toLocaleDateString("nb-NO")}
              </span>
            )}
          </p>
        </div>
        {showAcknowledge && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleAcknowledge}
            disabled={pending}
            className="shrink-0 bg-transparent"
          >
            {pending ? "..." : "Kvitter ut"}
          </Button>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {msg.body}
      </p>
    </article>
  );
}
