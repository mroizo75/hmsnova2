"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  copyCompetenceFromProfiles,
  createCompetenceStatement,
  deleteCompetenceStatement,
  setCompetenceRating,
} from "@/server/actions/personnel-competence.actions";
import type { PersonnelCompetenceRow, PersonnelReviewRow } from "@/server/queries/personnel.queries";

const DIMENSIONS = [
  { id: "KUNNSKAP", label: "Kunnskaper" },
  { id: "FERDIGHET", label: "Ferdigheter" },
  { id: "EVNE", label: "Evner" },
  { id: "HOLDNING", label: "Holdninger" },
] as const;

const LEVELS = [
  { id: "MANGLER", label: "Mangler" },
  { id: "DELVIS", label: "Delvis" },
  { id: "INNFRIDD", label: "Innfridd" },
] as const;

type LevelId = (typeof LEVELS)[number]["id"];

export function PersonnelCompetenceSection({
  userId,
  statements,
  reviews,
  canEdit,
  hasProfileStatements,
}: {
  userId: string;
  statements: PersonnelCompetenceRow[];
  reviews: PersonnelReviewRow[];
  canEdit: boolean;
  hasProfileStatements: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function run(action: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast({ title: ok });
        router.refresh();
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Kompetanse</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Konkretisering i kunnskaper, ferdigheter, evner og holdninger. AML § 4-2 og IK-HMS § 5 nr. 2.
          </p>
        </div>
        {canEdit && hasProfileStatements && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () => copyCompetenceFromProfiles({ userId }),
                "Konkretiseringer hentet fra kompetanseprofilen",
              )
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hent fra profil"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {DIMENSIONS.map((dimension) => {
          const rows = statements.filter((row) => row.dimension === dimension.id);
          return (
            <div key={dimension.id} className="space-y-3 rounded-lg border p-3">
              <h3 className="text-sm font-semibold">{dimension.label}</h3>
              {rows.length === 0 && (
                <p className="text-xs text-muted-foreground">Ingen konkretiseringer ennå.</p>
              )}
              {rows.map((row) => (
                <CompetenceRow
                  key={row.id}
                  userId={userId}
                  row={row}
                  reviews={reviews}
                  canEdit={canEdit}
                  pending={pending}
                  onRun={run}
                />
              ))}
              {canEdit && (
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const statement = (drafts[dimension.id] ?? "").trim();
                    if (statement.length < 3) return;
                    run(async () => {
                      const result = await createCompetenceStatement({
                        userId,
                        dimension: dimension.id,
                        statement,
                      });
                      if (result.success) {
                        setDrafts((current) => ({ ...current, [dimension.id]: "" }));
                      }
                      return result;
                    }, "Konkretisering lagt til");
                  }}
                >
                  <Input
                    value={drafts[dimension.id] ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [dimension.id]: event.target.value }))
                    }
                    placeholder="Konkret, observerbar setning"
                    maxLength={500}
                  />
                  <Button type="submit" size="sm" disabled={pending}>
                    Legg til
                  </Button>
                </form>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CompetenceRow({
  userId,
  row,
  reviews,
  canEdit,
  pending,
  onRun,
}: {
  userId: string;
  row: PersonnelCompetenceRow;
  reviews: PersonnelReviewRow[];
  canEdit: boolean;
  pending: boolean;
  onRun: (action: () => Promise<{ success: boolean; error?: string }>, ok: string) => void;
}) {
  const [comment, setComment] = useState(row.comment ?? "");
  const [reviewId, setReviewId] = useState(row.reviewId ?? "");

  function save(level: LevelId) {
    onRun(
      () =>
        setCompetenceRating({
          userId,
          statementId: row.id,
          level,
          comment,
          reviewId: reviewId || null,
        }),
      "Vurdering lagret",
    );
  }

  return (
    <div className="space-y-2 rounded-md bg-muted/40 p-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">{row.statement}</p>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!confirm("Slette denne konkretiseringen?")) return;
              onRun(
                () => deleteCompetenceStatement({ userId, statementId: row.id }),
                "Konkretisering slettet",
              );
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={row.level ?? undefined}
          onValueChange={(value) => save(value as LevelId)}
          disabled={!canEdit || pending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ikke vurdert" />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={reviewId || "none"}
          onValueChange={(value) => setReviewId(value === "none" ? "" : value)}
          disabled={!canEdit || pending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Knytt til samtale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ingen samtale</SelectItem>
            {reviews.map((review) => (
              <SelectItem key={review.id} value={review.id}>
                {new Date(review.scheduledDate).toLocaleDateString("nb-NO")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <Input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Kort kommentar"
            maxLength={500}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || !row.level}
            onClick={() => row.level && save(row.level)}
          >
            Lagre
          </Button>
        </div>
      )}
      {!canEdit && row.comment && <p className="text-xs text-muted-foreground">{row.comment}</p>}
    </div>
  );
}
