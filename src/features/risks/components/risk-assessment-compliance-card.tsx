"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateRiskAssessment } from "@/server/actions/risk.actions";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Users, Pencil, X } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface ComplianceCardProps {
  assessment: {
    id: string;
    participants: string | null;
    approvedById: string | null;
    approvedAt: Date | null;
    reviewedById: string | null;
    reviewedAt: Date | null;
  };
  users: Array<{ id: string; name: string | null; email: string }>;
}

const NO_USER = "__none__";

const formatDate = (date: Date | null) =>
  date ? format(new Date(date), "d. MMM yyyy", { locale: nb }) : null;

export function RiskAssessmentComplianceCard({ assessment, users }: ComplianceCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [participants, setParticipants] = useState(assessment.participants ?? "");
  const [approvedById, setApprovedById] = useState(assessment.approvedById ?? NO_USER);
  const [approvedAt, setApprovedAt] = useState(
    assessment.approvedAt ? new Date(assessment.approvedAt).toISOString().slice(0, 10) : ""
  );
  const [reviewedById, setReviewedById] = useState(assessment.reviewedById ?? NO_USER);
  const [reviewedAt, setReviewedAt] = useState(
    assessment.reviewedAt ? new Date(assessment.reviewedAt).toISOString().slice(0, 10) : ""
  );

  const approvedByUser = users.find((u) => u.id === assessment.approvedById);
  const reviewedByUser = users.find((u) => u.id === assessment.reviewedById);

  const isCompliant =
    !!assessment.participants &&
    !!assessment.approvedById &&
    !!assessment.approvedAt;

  async function handleSave() {
    setLoading(true);
    try {
      const result = await updateRiskAssessment({
        id: assessment.id,
        participants: participants || undefined,
        approvedById: approvedById === NO_USER ? null : approvedById,
        approvedAt: approvedAt || null,
        reviewedById: reviewedById === NO_USER ? null : reviewedById,
        reviewedAt: reviewedAt || null,
      });

      if (result.success) {
        toast({ title: "Lagret", description: "Dokumentasjonskrav oppdatert.", className: "bg-green-50 border-green-200" });
        setEditing(false);
      } else {
        toast({ variant: "destructive", title: "Feil", description: result.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Feil", description: "Noe gikk galt" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={`border-l-4 ${isCompliant ? "border-l-green-500" : "border-l-amber-400"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              Dokumentasjonskrav (IK-HMS § 5)
            </CardTitle>
            {isCompliant ? (
              <span className="flex items-center gap-1 rounded-full bg-green-100 border border-green-300 px-2 py-0.5 text-xs font-medium text-green-800">
                <CheckCircle2 className="h-3 w-3" /> Dokumentert
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-xs font-medium text-amber-800">
                Mangler dokumentasjon
              </span>
            )}
          </div>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Rediger
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Deltakere i vurderingen *
                <span className="ml-1 text-xs font-normal text-muted-foreground">(IK-HMS § 5 nr. 3, AML § 3-1)</span>
              </Label>
              <Textarea
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="F.eks: Kari Olsen (HMS-ansvarlig), Per Hansen (Verneombud), Anne Berg (Avd.leder)"
                rows={2}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Dokumenter hvem som deltok — arbeidstakere og verneombud skal involveres (AML § 6-2).
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Godkjent av *
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(IK-HMS § 5 nr. 6)</span>
                </Label>
                <Select value={approvedById} onValueChange={setApprovedById} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_USER}>— Ikke satt —</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Godkjenningsdato *</Label>
                <Input
                  type="date"
                  value={approvedAt}
                  onChange={(e) => setApprovedAt(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Sist gjennomgått av
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(IK-HMS § 5 nr. 8)</span>
                </Label>
                <Select value={reviewedById} onValueChange={setReviewedById} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_USER}>— Ikke satt —</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dato for gjennomgang</Label>
                <Input
                  type="date"
                  value={reviewedAt}
                  onChange={(e) => setReviewedAt(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={loading} size="sm">
                {loading ? "Lagrer..." : "Lagre"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={loading}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Avbryt
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                <Users className="h-3.5 w-3.5" /> Deltakere
              </div>
              {assessment.participants ? (
                <p className="text-sm">{assessment.participants}</p>
              ) : (
                <p className="text-sm text-amber-600 italic">Ikke dokumentert</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                <CheckCircle2 className="h-3.5 w-3.5" /> Godkjent
              </div>
              {approvedByUser && assessment.approvedAt ? (
                <>
                  <p className="text-sm font-medium">{approvedByUser.name || approvedByUser.email}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(assessment.approvedAt)}</p>
                </>
              ) : (
                <p className="text-sm text-amber-600 italic">Ikke godkjent</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sist gjennomgått
              </div>
              {reviewedByUser && assessment.reviewedAt ? (
                <>
                  <p className="text-sm font-medium">{reviewedByUser.name || reviewedByUser.email}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(assessment.reviewedAt)}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Ikke registrert</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
