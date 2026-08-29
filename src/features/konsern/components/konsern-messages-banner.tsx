"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { acknowledgeMessage } from "@/server/actions/corporate-group-messages.actions";

interface TenantMessage {
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
  tenantId: string;
  userId: string;
}

const priorityIcon: Record<string, { icon: typeof Mail; color: string; bg: string }> = {
  NORMAL: { icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
  IMPORTANT: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
  CRITICAL: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
};

function MessageItem({
  msg,
  tenantId,
  userId,
}: {
  msg: TenantMessage;
  tenantId: string;
  userId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const pc = priorityIcon[msg.priority] ?? priorityIcon.NORMAL;
  const PIcon = pc.icon;
  const isOverdue = msg.deadline && new Date(msg.deadline) < new Date() && !msg.isRead;

  function handleAcknowledge() {
    startTransition(async () => {
      try {
        await acknowledgeMessage(msg.id, tenantId, userId);
        toast({ title: "Lest og bekreftet" });
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  return (
    <div
      className={`rounded-lg border p-3 ${
        msg.isRead ? "bg-gray-50 border-gray-100" : isOverdue ? "bg-red-50 border-red-200" : "bg-white border-blue-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-1.5 ${msg.isRead ? "bg-gray-100" : pc.bg}`}>
          {msg.isRead ? (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          ) : (
            <PIcon className={`h-4 w-4 ${pc.color}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-sm font-medium ${msg.isRead ? "text-gray-500" : "text-gray-900"}`}>
                {msg.title}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {msg.author && `${msg.author} · `}
                {new Date(msg.createdAt).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}
                {msg.deadline && !msg.isRead && (
                  <span className={isOverdue ? " text-red-500 font-medium" : ""}>
                    {" "}· <Clock className="inline h-2.5 w-2.5" /> Frist: {new Date(msg.deadline).toLocaleDateString("nb-NO")}
                  </span>
                )}
                {msg.isRead && msg.readAt && (
                  <span className="text-emerald-500"> · Bekreftet {new Date(msg.readAt).toLocaleDateString("nb-NO")}</span>
                )}
              </p>
            </div>

            {!msg.isRead && msg.requiresAck && (
              <Button
                size="sm"
                onClick={handleAcknowledge}
                disabled={pending}
                className="shrink-0"
              >
                {pending ? "..." : "Bekreft lest"}
              </Button>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
          >
            {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            {expanded ? "Skjul" : "Les mer"}
          </button>

          {expanded && (
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed border-t pt-2">
              {msg.body}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function KonsernMessagesBanner({ messages, tenantId, userId }: KonsernMessagesBannerProps) {
  const unread = messages.filter((m) => !m.isRead && m.requiresAck);
  const hasUnread = unread.length > 0;
  const [showAll, setShowAll] = useState(false);

  if (messages.length === 0) return null;

  const displayMessages = showAll ? messages : unread.length > 0 ? unread : messages.slice(0, 3);

  return (
    <Card className={hasUnread ? "border-blue-200 shadow-sm" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Mail className={`h-4 w-4 ${hasUnread ? "text-blue-600" : "text-gray-400"}`} />
            Meldinger fra konsernet
            {hasUnread && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                {unread.length} ulest{unread.length !== 1 ? "e" : ""}
              </span>
            )}
          </span>
          {messages.length > displayMessages.length && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showAll ? "Vis mindre" : `Vis alle (${messages.length})`}
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayMessages.map((msg) => (
          <MessageItem key={msg.id} msg={msg} tenantId={tenantId} userId={userId} />
        ))}
      </CardContent>
    </Card>
  );
}
