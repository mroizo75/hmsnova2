"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { rejectRegistration } from "@/server/actions/onboarding.actions";
import { Loader2, XCircle } from "lucide-react";

interface RejectRegistrationFormProps {
  tenantId: string;
}

export function RejectRegistrationForm({ tenantId }: RejectRegistrationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  async function handleReject() {
    if (!reason.trim()) {
      toast({
        variant: "destructive",
        title: "⚠️ Manglende informasjon",
        description: "Du må oppgi en grunn for avvisning",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await rejectRegistration(tenantId, reason);

      if (result.success) {
        toast({
          title: "✅ Registrering avvist",
          description: "Kunden har fått beskjed om avvisningen.",
        });
        setOpen(false);
        router.push("/admin/registrations");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "❌ Feil",
          description: result.error || "Kunne ikke avvise registrering",
        });
      }
    } catch (error) {
      console.error("Reject registration error:", error);
      toast({
        variant: "destructive",
        title: "❌ Systemfeil",
        description: "En uventet feil oppstod",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <XCircle className="mr-2 h-4 w-4" />
          Avvis registrering
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Avvis registrering</AlertDialogTitle>
          <AlertDialogDescription>
            Dette vil sende en e-post til kunden med informasjon om avvisningen.
            Tenanten vil bli merket som avvist og fjernet fra listen over aktive registreringer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="reason">Grunn for avvisning *</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="F.eks. mangelfull informasjon, utenfor målgruppe, etc."
            rows={4}
            required
          />
          <p className="text-xs text-muted-foreground">
            Denne teksten sendes til kunden i e-posten
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Avbryt</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={loading || !reason.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Avviser...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Avvis og send e-post
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

