import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchTemplateById } from "@/server/queries/boarding.queries";

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Ansatt",
  MANAGER: "Leder",
  HR: "HR",
  IT: "IT",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({ params }: Props) {
  const { id } = await params;
  const auth = await getAuthContext();

  if (!auth.permissions.canManageBoardingTemplates) {
    redirect("/dashboard/onboarding/maler");
  }

  const template = await fetchTemplateById(id);
  if (!template) notFound();

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/onboarding/maler">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tilbake
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{template.name}</CardTitle>
            <Badge variant="outline">
              {template.type === "ONBOARDING" ? "Onboarding" : "Offboarding"}
            </Badge>
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {template.tasks.map((task: any) => (
              <div key={task.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className="w-16 text-center shrink-0">
                  <Badge variant="outline" className="text-xs">
                    Dag {task.daysOffset > 0 ? `+${task.daysOffset}` : task.daysOffset}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.legalRef && task.isRequired ? (
                      <Badge className="text-xs">Lovpålagt</Badge>
                    ) : task.isRequired ? (
                      <Badge variant="outline" className="text-xs">Påkrevd</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Anbefalt</Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {ROLE_LABELS[task.assigneeRole] ?? task.assigneeRole}
                  </Badge>
                  {task.category && (
                    <span className="text-xs text-muted-foreground">{task.category}</span>
                  )}
                  {task.legalRef && (
                    <span className="text-xs text-muted-foreground">({task.legalRef})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
