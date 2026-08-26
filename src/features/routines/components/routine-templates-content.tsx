"use client";

import { useQuery } from "@tanstack/react-query";
import { CopyRoutineTemplateButton } from "@/components/routines/copy-routine-template-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";
import { fetchRoutineTemplates } from "@/server/queries/routine.queries";

type TemplatesData = NonNullable<Awaited<ReturnType<typeof fetchRoutineTemplates>>>;

interface RoutineTemplatesContentProps {
  initialData: TemplatesData;
  showAll: boolean;
  query?: string;
}

export function RoutineTemplatesContent({ initialData, showAll, query }: RoutineTemplatesContentProps) {
  const t = useTranslations("dashboardRoutineTemplatesPage");

  const { data: templates } = useQuery({
    queryKey: ["routines", "templates"],
    queryFn: () => fetchRoutineTemplates({ showAll, query }),
    initialData,
  });

  if (!templates) return null;

  return (
    <>
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4 text-sm text-blue-900">
          {t("info")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>{t("list.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">{t("list.empty")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.template")}</TableHead>
                  <TableHead>{t("table.category")}</TableHead>
                  <TableHead>{t("table.legalReference")}</TableHead>
                  <TableHead className="text-right">{t("table.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template: any) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="font-medium">{template.title}</div>
                      {template.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {template.description}
                        </div>
                      )}
                      <div className="mt-1.5">
                        <Badge variant={template.isGlobal ? "secondary" : "outline"}>
                          {template.isGlobal ? t("badges.global") : t("badges.tenant")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{template.category || "-"}</TableCell>
                    <TableCell>{template.legalReference || "-"}</TableCell>
                    <TableCell className="text-right">
                      <CopyRoutineTemplateButton
                        templateId={template.id}
                        templateTitle={template.title}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
