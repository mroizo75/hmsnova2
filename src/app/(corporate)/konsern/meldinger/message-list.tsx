"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mail,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Users,
  Building2,
  Trash2,
} from "lucide-react";
import { deleteGroupMessage } from "@/server/actions/corporate-group-messages.actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface TenantReadStatus {
  tenantId: string;
  tenantName: string;
  totalUsers: number;
  readUsers: number;
  readBy: Array<{ name: string | null; email: string; readAt: Date }>;
}

interface Message {
  id: string;
  title: string;
  body: string;
  priority: string;
  requiresAck: boolean;
  deadline: Date | null;
  targetAll: boolean;
  author: { name: string | null; email: string };
  createdAt: Date;
  totalRecipientTenants: number;
  totalRecipientUsers: number;
  totalRead: number;
  readPercentage: number;
  tenantStatus: TenantReadStatus[];
}

const priorityConfig: Record<string, { label: string; icon: typeof Mail; color: string; bg: string }> = {
  NORMAL: { label: "Normal", icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
  IMPORTANT: { label: "Viktig", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
  CRITICAL: { label: "Kritisk", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
};

function ReadProgressBar({ read, total }: { read: number; total: number }) {
  const pct = total > 0 ? Math.round((read / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-500 w-10 text-right">{pct}%</span>
    </div>
  );
}

function MessageCard({ message }: { message: Message }) {
  const router = useRouter();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const pc = priorityConfig[message.priority] ?? priorityConfig.NORMAL;
  const PIcon = pc.icon;

  const isOverdue = message.deadline && new Date(message.deadline) < new Date() && message.readPercentage < 100;

  async function handleDelete() {
    if (!confirm("Slett denne meldingen permanent?")) return;
    try {
      await deleteGroupMessage(message.id);
      toast({ title: "Melding slettet" });
      router.refresh();
    } catch (err) {
      toast({ title: "Feil", description: String(err), variant: "destructive" });
    }
  }

  return (
    <Card className={isOverdue ? "border-red-200" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`rounded-lg p-2 ${pc.bg}`}>
              <PIcon className={`h-4 w-4 ${pc.color}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight">{message.title}</CardTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>{message.author.name ?? message.author.email}</span>
                <span>·</span>
                <span>{new Date(message.createdAt).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                {message.deadline && (
                  <>
                    <span>·</span>
                    <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                      <Clock className="inline h-3 w-3 mr-0.5" />
                      Frist: {new Date(message.deadline).toLocaleDateString("nb-NO")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${pc.bg} ${pc.color}`}>
              {pc.label}
            </span>
            {message.requiresAck && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                Lesebekreftelse
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{message.body}</p>

        {/* Lesebekreftelse-status */}
        {message.requiresAck && (
          <div className="space-y-2 rounded-lg bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Lesebekreftelse: {message.totalRead} av {message.totalRecipientUsers} brukere
              </span>
              <span className="text-xs text-gray-400">
                {message.targetAll ? "Alle bedrifter" : `${message.totalRecipientTenants} bedrifter`}
              </span>
            </div>
            <ReadProgressBar read={message.totalRead} total={message.totalRecipientUsers} />

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Skjul detaljer" : "Vis per bedrift"}
            </button>

            {expanded && (
              <div className="space-y-2 mt-2">
                {message.tenantStatus.map((ts) => (
                  <div key={ts.tenantId} className="rounded-md border bg-white p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-900 flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-gray-400" />
                        {ts.tenantName}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {ts.readUsers}/{ts.totalUsers} lest
                      </span>
                    </div>
                    <ReadProgressBar read={ts.readUsers} total={ts.totalUsers} />
                    {ts.readBy.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {ts.readBy.map((r) => (
                          <span
                            key={r.email}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700"
                          >
                            <CheckCircle className="h-2.5 w-2.5" />
                            {r.name ?? r.email}
                          </span>
                        ))}
                      </div>
                    )}
                    {ts.readUsers === 0 && (
                      <p className="mt-1 text-[10px] text-red-400">Ingen har lest ennå</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
            onClick={handleDelete}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Slett
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MessageList({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Mail className="h-10 w-10 text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-500">Ingen meldinger ennå</p>
          <p className="mt-1 text-xs text-gray-400">
            Send din første melding til bedriftene i konsernet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <MessageCard key={msg.id} message={msg} />
      ))}
    </div>
  );
}
