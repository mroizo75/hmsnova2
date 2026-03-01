"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Play, Square } from "lucide-react";
import { updateSjaAnalysis } from "@/server/actions/sja.actions";
import type { SjaStatus, SjaConclusion } from "@prisma/client";

interface SjaStatusActionsProps {
  analysisId: string;
  currentStatus: SjaStatus;
  currentConclusion: SjaConclusion;
}

export function SjaStatusActions({
  analysisId,
  currentStatus,
  currentConclusion,
}: SjaStatusActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [comment, setComment] = useState("");

  async function handleAction(status?: SjaStatus, conclusion?: SjaConclusion) {
    setIsUpdating(true);
    try {
      const result = await updateSjaAnalysis({
        id: analysisId,
        ...(status && { status }),
        ...(conclusion && { conclusion, conclusionComment: comment || undefined }),
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "SJA oppdatert",
        description: "Statusen er endret.",
      });

      setComment("");
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke oppdatere SJA.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Handlinger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentStatus === "DRAFT" && (
          <>
            <div className="space-y-2">
              <Label className="text-sm">Kommentar (valgfritt)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Evt. kommentar til godkjenning..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            <Button
              onClick={() => handleAction("ACTIVE", "APPROVED")}
              disabled={isUpdating}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Godkjenn – arbeid kan starte
            </Button>

            <Button
              onClick={() => handleAction("ACTIVE", "CONDITIONAL")}
              disabled={isUpdating}
              variant="outline"
              className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50"
            >
              <Play className="h-4 w-4 mr-2" />
              Betinget godkjent
            </Button>

            <Button
              onClick={() => handleAction("CANCELLED", "REJECTED")}
              disabled={isUpdating}
              variant="outline"
              className="w-full border-red-500 text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Avvis – arbeid kan IKKE starte
            </Button>
          </>
        )}

        {currentStatus === "ACTIVE" && (
          <Button
            onClick={() => handleAction("COMPLETED")}
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Square className="h-4 w-4 mr-2" />
            )}
            Fullfør SJA – arbeid er avsluttet
          </Button>
        )}

        {(currentStatus === "COMPLETED" || currentStatus === "CANCELLED") && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Denne SJA-en er {currentStatus === "COMPLETED" ? "fullført" : "kansellert"}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
