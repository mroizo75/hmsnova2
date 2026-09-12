"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Search,
  FileText,
  ClipboardList,
  BookOpenCheck,
  Download,
  Scale,
} from "lucide-react";
import { createRoutineFromTemplate } from "@/server/actions/routine.actions";
import { copyGlobalFormTemplate } from "@/server/actions/form.actions";
import { copyDocumentTemplateToTenant } from "@/server/actions/template-library.actions";
import { matchesIndustryScope } from "@/lib/industry-scope";

interface RoutineItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  industryScope: unknown;
  legalReference: string | null;
}

interface FormItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  industryScope: unknown;
}

interface DocumentItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  industryScope: unknown;
  bodyHtml: string | null;
  variables: unknown;
}

interface TemplateHubContentProps {
  routines: RoutineItem[];
  forms: FormItem[];
  documents: DocumentItem[];
  tenantIndustry: string;
}

function CopyButton({
  label,
  loadingLabel,
  onCopy,
}: {
  label: string;
  loadingLabel: string;
  onCopy: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(onCopy)}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}

export function TemplateHubContent({
  routines,
  forms,
  documents,
  tenantIndustry,
}: TemplateHubContentProps) {
  const t = useTranslations("dashboardTemplateLibraryPage");
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");

  const q = query.toLowerCase().trim();

  const filteredRoutines = useMemo(
    () =>
      routines.filter(
        (r) =>
          matchesIndustryScope(r.industryScope, tenantIndustry) &&
          (!q || r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)),
      ),
    [routines, tenantIndustry, q],
  );

  const filteredForms = useMemo(
    () =>
      forms.filter(
        (f) =>
          matchesIndustryScope(f.industryScope, tenantIndustry) &&
          (!q || f.title.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q)),
      ),
    [forms, tenantIndustry, q],
  );

  const filteredDocuments = useMemo(
    () =>
      documents.filter(
        (d) =>
          matchesIndustryScope(d.industryScope, tenantIndustry) &&
          (!q || d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)),
      ),
    [documents, tenantIndustry, q],
  );

  const handleCopyRoutine = async (id: string) => {
    const result = await createRoutineFromTemplate(id);
    if (result.success) {
      toast({ title: t("copySuccess", { name: (result as { data?: { title?: string } }).data?.title ?? "" }) });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: t("copyError"), description: (result as { error?: string }).error });
    }
  };

  const handleCopyForm = async (id: string) => {
    const result = await copyGlobalFormTemplate(id);
    if (result.success) {
      toast({ title: t("copySuccess", { name: "" }) });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: t("copyError"), description: (result as { error?: string }).error });
    }
  };

  const handleCopyDocument = async (id: string) => {
    const result = await copyDocumentTemplateToTenant(id);
    if (result.success) {
      toast({ title: t("copySuccess", { name: result.data?.name ?? "" }) });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: t("copyError"), description: result.error });
    }
  };

  const totalAll = filteredRoutines.length + filteredForms.length + filteredDocuments.length;

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            {t("tabs.all")} ({totalAll})
          </TabsTrigger>
          <TabsTrigger value="routines">
            {t("tabs.routines")} ({filteredRoutines.length})
          </TabsTrigger>
          <TabsTrigger value="forms">
            {t("tabs.forms")} ({filteredForms.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            {t("tabs.documents")} ({filteredDocuments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {totalAll === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
          {filteredDocuments.length > 0 && (
            <TemplateSection
              title={t("tabs.documents")}
              icon={<FileText className="h-4 w-4" />}
            >
              {filteredDocuments.map((d) => (
                <TemplateCard
                  key={d.id}
                  title={d.name}
                  description={d.description}
                  category={d.category}
                  copyLabel={t("copyButton")}
                  copyingLabel={t("copying")}
                  onCopy={() => handleCopyDocument(d.id)}
                />
              ))}
            </TemplateSection>
          )}
          {filteredRoutines.length > 0 && (
            <TemplateSection
              title={t("tabs.routines")}
              icon={<BookOpenCheck className="h-4 w-4" />}
            >
              {filteredRoutines.map((r) => (
                <TemplateCard
                  key={r.id}
                  title={r.title}
                  description={r.description}
                  category={r.category}
                  legalRef={r.legalReference}
                  copyLabel={t("copyButton")}
                  copyingLabel={t("copying")}
                  onCopy={() => handleCopyRoutine(r.id)}
                />
              ))}
            </TemplateSection>
          )}
          {filteredForms.length > 0 && (
            <TemplateSection
              title={t("tabs.forms")}
              icon={<ClipboardList className="h-4 w-4" />}
            >
              {filteredForms.map((f) => (
                <TemplateCard
                  key={f.id}
                  title={f.title}
                  description={f.description}
                  category={f.category}
                  copyLabel={t("copyButton")}
                  copyingLabel={t("copying")}
                  onCopy={() => handleCopyForm(f.id)}
                />
              ))}
            </TemplateSection>
          )}
        </TabsContent>

        <TabsContent value="routines" className="space-y-3 mt-4">
          {filteredRoutines.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
          {filteredRoutines.map((r) => (
            <TemplateCard
              key={r.id}
              title={r.title}
              description={r.description}
              category={r.category}
              legalRef={r.legalReference}
              copyLabel={t("copyButton")}
              copyingLabel={t("copying")}
              onCopy={() => handleCopyRoutine(r.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="forms" className="space-y-3 mt-4">
          {filteredForms.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
          {filteredForms.map((f) => (
            <TemplateCard
              key={f.id}
              title={f.title}
              description={f.description}
              category={f.category}
              copyLabel={t("copyButton")}
              copyingLabel={t("copying")}
              onCopy={() => handleCopyForm(f.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="documents" className="space-y-3 mt-4">
          {filteredDocuments.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
          {filteredDocuments.map((d) => (
            <TemplateCard
              key={d.id}
              title={d.name}
              description={d.description}
              category={d.category}
              copyLabel={t("copyButton")}
              copyingLabel={t("copying")}
              onCopy={() => handleCopyDocument(d.id)}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TemplateSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {icon}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TemplateCard({
  title,
  description,
  category,
  legalRef,
  copyLabel,
  copyingLabel,
  onCopy,
}: {
  title: string;
  description: string | null;
  category: string | null;
  legalRef?: string | null;
  copyLabel: string;
  copyingLabel: string;
  onCopy: () => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs line-clamp-2">{description}</CardDescription>
          )}
        </div>
        <CopyButton label={copyLabel} loadingLabel={copyingLabel} onCopy={onCopy} />
      </CardHeader>
      {(category || legalRef) && (
        <CardContent className="flex items-center gap-2 pt-0">
          {category && <Badge variant="secondary">{category}</Badge>}
          {legalRef && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Scale className="h-3 w-3" />
              {legalRef}
            </span>
          )}
        </CardContent>
      )}
    </Card>
  );
}
