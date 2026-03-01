"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateRuhReport } from "@/server/actions/ruh.actions";
import { Loader2, Search, CheckCircle } from "lucide-react";

interface RuhStatusActionsProps {
  reportId: string;
  currentStatus: string;
}

export function RuhStatusActions({ reportId, currentStatus }: RuhStatusActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");

  const handleStatusChange = async (newStatus: "UNDER_REVIEW" | "COMPLETED") => {
    setLoading(true);
    try {
      const input: Record<string, string> = { id: reportId, status: newStatus };

      if (newStatus === "UNDER_REVIEW") {
        input.reviewComment = comment;
      } else if (newStatus === "COMPLETED") {
        input.completedComment = comment;
      }

      const result = await updateRuhReport(input);

      if (result.success) {
        toast({
          title: "Status oppdatert",
          description: `Rapport er nå ${newStatus === "UNDER_REVIEW" ? "under behandling" : "ferdig behandlet"}.`,
        });
        setComment("");
        router.refresh();
      } else {
        toast({
          title: "Feil",
          description: result.error || "Kunne ikke oppdatere status",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Feil",
        description: "Noe gikk galt. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === "COMPLETED") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Denne rapporten er ferdig behandlet</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Behandle rapport</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="comment">Kommentar</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Skriv en kommentar til behandlingen..."
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-2">
          {currentStatus === "SUBMITTED" && (
            <Button
              onClick={() => handleStatusChange("UNDER_REVIEW")}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Merk som under behandling
            </Button>
          )}

          <Button
            onClick={() => handleStatusChange("COMPLETED")}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Merk som ferdig behandlet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
