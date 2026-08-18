"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PenLine, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signHandbook } from "@/server/actions/hms-handbok.actions";

interface HandbokSignButtonProps {
  tenantId: string;
  alreadySigned: boolean;
  versionId?: string;
}

export function HandbokSignButton({ tenantId, alreadySigned, versionId }: HandbokSignButtonProps) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSign() {
    setLoading(true);
    const result = await signHandbook({ tenantId, versionId, comment: comment.trim() || undefined });
    setLoading(false);
    if (result.success) {
      toast({ title: "Håndbok signert", description: "Din signatur er registrert." });
      setOpen(false);
      setComment("");
    } else {
      toast({ title: "Feil", description: result.error, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={alreadySigned ? "outline" : "default"} size="sm" className="gap-2">
          <PenLine className="h-4 w-4" />
          {alreadySigned ? "Signer på nytt" : "Signer håndbok"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Signer HMS Håndbok</DialogTitle>
          <DialogDescription>
            Ved å signere bekrefter du at du har lest og forstått innholdet i HMS-håndboken.
            Din signatur registreres med dato og tidspunkt.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="comment">Kommentar (valgfritt)</Label>
          <Textarea
            id="comment"
            placeholder="F.eks. «Gjennomgått på HMS-møte 11.08.2026»"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Avbryt
          </Button>
          <Button onClick={handleSign} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Bekreft signatur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
