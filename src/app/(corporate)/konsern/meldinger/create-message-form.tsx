"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { createGroupMessage } from "@/server/actions/corporate-group-messages.actions";
import { MessagePriority } from "@prisma/client";

interface TenantOption {
  id: string;
  name: string;
}

interface CreateMessageFormProps {
  tenants: TenantOption[];
}

const priorityLabels: Record<MessagePriority, { label: string; desc: string }> = {
  NORMAL: { label: "Normal", desc: "Vanlig informasjonsmelding" },
  IMPORTANT: { label: "Viktig", desc: "Krever oppmerksomhet" },
  CRITICAL: { label: "Kritisk", desc: "Må leses umiddelbart" },
};

export function CreateMessageForm({ tenants }: CreateMessageFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<MessagePriority>("NORMAL");
  const [requiresAck, setRequiresAck] = useState(true);
  const [deadline, setDeadline] = useState("");
  const [targetAll, setTargetAll] = useState(true);
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());

  function toggleTenant(id: string) {
    const next = new Set(selectedTenants);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTenants(next);
  }

  function handleSubmit() {
    if (!title.trim() || !body.trim()) {
      toast({ title: "Fyll inn tittel og melding", variant: "destructive" });
      return;
    }
    if (!targetAll && selectedTenants.size === 0) {
      toast({ title: "Velg minst én bedrift", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        await createGroupMessage({
          title,
          body,
          priority,
          requiresAck,
          deadline: deadline || null,
          targetAll,
          targetTenantIds: targetAll ? undefined : Array.from(selectedTenants),
        });
        toast({ title: "Melding sendt!" });
        setTitle("");
        setBody("");
        setPriority("NORMAL");
        setRequiresAck(true);
        setDeadline("");
        setTargetAll(true);
        setSelectedTenants(new Set());
        setExpanded(false);
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Ny melding
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Tittel *</Label>
            <Input
              placeholder="F.eks. Ny HMS-rutine for brannøvelser"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Melding *</Label>
            <Textarea
              placeholder="Skriv meldingen her..."
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Prioritet</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as MessagePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([key, { label, desc }]) => (
                    <SelectItem key={key} value={key}>
                      <span className="font-medium">{label}</span>
                      <span className="ml-1 text-gray-400 text-xs">— {desc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Frist for lesing</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <p className="text-[10px] text-gray-400">Valgfritt — påminnelser sendes før frist</p>
            </div>

            <div className="space-y-3 pt-5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiresAck"
                  checked={requiresAck}
                  onCheckedChange={(c) => setRequiresAck(c === true)}
                />
                <Label htmlFor="requiresAck" className="text-xs cursor-pointer">
                  Krev lesebekreftelse
                </Label>
              </div>
            </div>
          </div>

          {/* Mottakere */}
          <div className="space-y-3 rounded-lg border p-4">
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Mottakere
            </Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={targetAll ? "default" : "outline"}
                size="sm"
                onClick={() => setTargetAll(true)}
              >
                Alle bedrifter
              </Button>
              <Button
                type="button"
                variant={!targetAll ? "default" : "outline"}
                size="sm"
                onClick={() => setTargetAll(false)}
              >
                Velg bedrifter
              </Button>
            </div>

            {!targetAll && (
              <div className="grid gap-1 sm:grid-cols-2 max-h-48 overflow-y-auto">
                {tenants.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer text-sm transition-colors ${
                      selectedTenants.has(t.id) ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedTenants.has(t.id)}
                      onCheckedChange={() => toggleTenant(t.id)}
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={pending || !title.trim() || !body.trim()}>
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send melding
              {!targetAll && selectedTenants.size > 0 && ` til ${selectedTenants.size} bedrift${selectedTenants.size !== 1 ? "er" : ""}`}
              {targetAll && ` til alle ${tenants.length} bedrifter`}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
