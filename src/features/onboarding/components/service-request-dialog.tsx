"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import { createServiceRequest } from "@/server/actions/service-request.actions";

const SERVICE_OPTIONS = [
  { type: "FULL_SETUP", label: "Full HMS-oppsett", description: "Vi setter opp hele HMS-systemet for deg" },
  { type: "RISK_ASSESSMENT", label: "Risikovurdering", description: "Profesjonell kartlegging av risikoer" },
  { type: "ROUTINE_SETUP", label: "Rutiner", description: "Oppsett av påkrevde HMS-rutiner" },
  { type: "HANDBOOK_SETUP", label: "HMS-håndbok", description: "Utfylling og tilpasning av håndboken" },
  { type: "REGULATORY_PROFILE", label: "Virksomhetsprofil", description: "Kartlegging av lovkrav for din bransje" },
] as const;

interface ServiceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceRequestDialog({ open, onOpenChange }: ServiceRequestDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function toggleService(type: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleSubmit() {
    if (selected.size === 0) return;

    startTransition(async () => {
      const promises = Array.from(selected).map((type) =>
        createServiceRequest({
          type,
          description: message || undefined,
        }),
      );
      await Promise.all(promises);
      setSent(true);
    });
  }

  function handleClose(value: boolean) {
    if (!value) {
      setSent(false);
      setSelected(new Set());
      setMessage("");
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Forespørsel sendt!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Vi tar kontakt med deg innen 1 virkedag.
              </p>
            </div>
            <Button onClick={() => handleClose(false)} className="mt-2">
              Lukk
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>HMS-oppsett som tjeneste</DialogTitle>
              <DialogDescription>
                Velg hvilke deler av HMS-systemet du ønsker hjelp med. Vi kontakter deg med et tilbud.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {SERVICE_OPTIONS.map((opt) => (
                <label
                  key={opt.type}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selected.has(opt.type)}
                    onCheckedChange={() => toggleService(opt.type)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <Textarea
              placeholder="Eventuell melding (valgfritt)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Avbryt
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || selected.size === 0}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send forespørsel
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
