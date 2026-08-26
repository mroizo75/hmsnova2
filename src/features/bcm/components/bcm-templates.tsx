"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Check, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { activateBcmTemplate } from "@/server/actions/bcm.actions";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface BcmTemplate {
  id: string;
  name: string;
  description: string | null;
  defaultReviewIntervalMonths: number | null;
}

interface BcmTemplatesProps {
  templates: BcmTemplate[];
  activatedTemplateIds: string[];
}

export function BcmTemplates({ templates, activatedTemplateIds }: BcmTemplatesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activating, setActivating] = useState<string | null>(null);

  const handleActivate = async (templateId: string) => {
    setActivating(templateId);
    try {
      const result = await activateBcmTemplate(templateId);
      if (result.success) {
        toast({
          title: "Mal aktivert",
          description: "Dokumentet er opprettet og klart til utfylling.",
        });
        queryClient.invalidateQueries({ queryKey: ["bcm"] });
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        if (result.documentId) {
          router.push(`/dashboard/documents/${result.documentId}`);
        }
      } else {
        toast({ title: "Info", description: result.error });
      }
    } catch {
      toast({ title: "Feil", description: "Kunne ikke aktivere mal", variant: "destructive" });
    } finally {
      setActivating(null);
    }
  };

  if (!templates.length) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Ferdige maler — hurtigstart</h2>
        <p className="text-sm text-muted-foreground">
          Aktiver en mal for å opprette et forhåndsutfylt BCM-dokument som du kan tilpasse.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const isActivated = activatedTemplateIds.includes(template.id);
          return (
            <Card key={template.id} className="relative">
              {isActivated && (
                <Badge
                  variant="secondary"
                  className="absolute top-3 right-3 bg-green-100 text-green-700"
                >
                  <Check className="mr-1 h-3 w-3" /> Aktivert
                </Badge>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
                {template.defaultReviewIntervalMonths && (
                  <p className="text-xs text-muted-foreground">
                    Anbefalt gjennomgang: hver {template.defaultReviewIntervalMonths}. måned
                  </p>
                )}
                <Button
                  variant={isActivated ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  disabled={activating === template.id}
                  onClick={() => handleActivate(template.id)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isActivated ? "Opprett ny kopi" : "Aktiver mal"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
