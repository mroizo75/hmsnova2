"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { investigateIncident } from "@/server/actions/incident.actions";
import { suggestIncidentRootCauseAnalysis } from "@/server/actions/ai-assistant.actions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSearch, Sparkles, BookOpen, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface HandbookSuggestion {
  code: string;
  documentKind: string;
  message: string;
  documents: Array<{ id: string; title: string }>;
}

interface InvestigationFormProps {
  incidentId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  routines?: Array<{ id: string; title: string }>;
}

export function InvestigationForm({ incidentId, users, routines = [] }: InvestigationFormProps) {
  const t = useTranslations("dashboardIncidentInvestigationForm");
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [handbookSuggestions, setHandbookSuggestions] = useState<HandbookSuggestion[]>([]);
  const [aiSuggestedRootCause, setAiSuggestedRootCause] = useState<string | null>(null);
  const rootCauseRef = useRef<HTMLTextAreaElement>(null);
  const contributingFactorsRef = useRef<HTMLTextAreaElement>(null);

  const handleAiSuggest = async () => {
    setAiLoading(true);
    try {
      const result = await suggestIncidentRootCauseAnalysis({ incidentId });
      if (result.success && result.data) {
        if (rootCauseRef.current) {
          rootCauseRef.current.value = result.data.rootCause;
        }
        setAiSuggestedRootCause(result.data.rootCause);
        if (contributingFactorsRef.current) {
          contributingFactorsRef.current.value = result.data.contributingFactors;
        }
        toast({
          title: t("aiSuggest.successTitle"),
          description: t("aiSuggest.successDescription", {
            count: result.data.usedImageCount,
          }),
          className: "bg-green-50 border-green-200",
        });
      } else {
        toast({
          variant: "destructive",
          title: t("toasts.error.title"),
          description: result.error || t("aiSuggest.error"),
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("toasts.unexpected.title"),
        description: t("toasts.unexpected.description"),
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const relatedRoutineId = formData.get("relatedRoutineId") as string;
    const data = {
      id: incidentId,
      rootCause: formData.get("rootCause") as string,
      contributingFactors: formData.get("contributingFactors") as string || undefined,
      investigatedBy: formData.get("investigatedBy") as string,
      relatedRoutineId: relatedRoutineId || null,
      aiSuggestedRootCause: aiSuggestedRootCause ?? undefined,
    };

    try {
      const result = await investigateIncident(data);

      if (result.success) {
        toast({
          title: t("toasts.success.title"),
          description: t("toasts.success.description"),
          className: "bg-green-50 border-green-200",
        });
        setHandbookSuggestions(result.handbookSuggestions ?? []);
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: t("toasts.error.title"),
          description: result.error || t("toasts.error.description"),
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("toasts.unexpected.title"),
        description: t("toasts.unexpected.description"),
      });
    } finally {
      setLoading(false);
    }
  };

  const dismissSuggestion = (code: string) => {
    setHandbookSuggestions((previous) => previous.filter((suggestion) => suggestion.code !== code));
  };

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 mb-4">
            <p className="text-sm font-medium text-yellow-900 mb-2">{t("fiveWhy.title")}</p>
            <p className="text-sm text-yellow-800">
              {t("fiveWhy.description")}
            </p>
            <ul className="text-xs text-yellow-700 mt-2 space-y-1 list-disc list-inside ml-2">
              <li>{t("fiveWhy.steps.s1")}</li>
              <li>{t("fiveWhy.steps.s2")}</li>
              <li>{t("fiveWhy.steps.s3")}</li>
              <li>{t("fiveWhy.steps.s4")}</li>
              <li><strong>{t("fiveWhy.steps.s5")}</strong></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <Label htmlFor="rootCause">{t("fields.rootCause")}</Label>
                <p className="text-xs text-muted-foreground">{t("aiSuggest.helper")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 sm:mt-6"
                disabled={loading || aiLoading}
                onClick={handleAiSuggest}
              >
                <Sparkles className="h-4 w-4" />
                {aiLoading ? t("aiSuggest.loading") : t("aiSuggest.button")}
              </Button>
            </div>
            <Textarea
              ref={rootCauseRef}
              id="rootCause"
              name="rootCause"
              placeholder={t("placeholders.rootCause")}
              required
              disabled={loading || aiLoading}
              rows={5}
            />
            <Alert className="border-muted-foreground/20 bg-muted/30">
              <AlertDescription>{t("aiDisclaimer")}</AlertDescription>
            </Alert>
            <p className="text-xs text-muted-foreground">
              {t("hints.rootCause")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contributingFactors">{t("fields.contributingFactors")}</Label>
            <Textarea
              ref={contributingFactorsRef}
              id="contributingFactors"
              name="contributingFactors"
              placeholder={t("placeholders.contributingFactors")}
              disabled={loading || aiLoading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="investigatedBy">{t("fields.investigatedBy")}</Label>
            <Select name="investigatedBy" required disabled={loading || aiLoading}>
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.investigatedBy")} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {routines.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="relatedRoutineId">Relatert rutine</Label>
              <p className="text-xs text-muted-foreground">
                Koble avviket til en rutine som bør vurderes for revisjon
              </p>
              <Select name="relatedRoutineId" disabled={loading || aiLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg rutine (valgfritt)" />
                </SelectTrigger>
                <SelectContent>
                  {routines.map((routine) => (
                    <SelectItem key={routine.id} value={routine.id}>
                      {routine.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={loading || aiLoading}>
              {loading ? t("actions.saving") : t("actions.complete")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    {handbookSuggestions.length > 0 && (
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Forslag til håndbok-/rutineoppdatering
          </CardTitle>
          <CardDescription>
            Basert på dette avviket kan det være verdt å se på følgende i HMS-håndboken. Dette er
            kun forslag - ingen dokumenter endres automatisk, og du vurderer selv om det er relevant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {handbookSuggestions.map((suggestion) => (
            <div
              key={suggestion.code}
              className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
            >
              <div className="space-y-1.5 min-w-0">
                <p className="text-sm">{suggestion.message}</p>
                {suggestion.documents.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestion.documents.map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/dashboard/documents/${doc.id}`}
                        className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
                      >
                        {doc.title} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1 text-muted-foreground"
                onClick={() => dismissSuggestion(suggestion.code)}
              >
                <X className="h-3.5 w-3.5" />
                Ikke relevant
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    )}
    </div>
  );
}

