"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, CheckCircle2, Loader2, Upload } from "lucide-react";
import { applyHandbookTemplate } from "@/server/actions/hms-handbok.actions";
import { getAvailableTemplates } from "@/lib/handbook-templates";

interface HandbookTemplateImportProps {
  tenantId: string;
  tenantName: string;
  tenantIndustry?: string | null;
  orgNumber?: string | null;
  adminName?: string | null;
}

export function HandbookTemplateImport({
  tenantId,
  tenantName,
  tenantIndustry,
  orgNumber,
  adminName,
}: HandbookTemplateImportProps) {
  const templates = getAvailableTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState(
    tenantIndustry ?? "",
  );
  const [variables, setVariables] = useState<Record<string, string>>({
    bedriftsnavn: tenantName,
    orgNummer: orgNumber ?? "",
    dagligLeder: adminName ?? "",
    hmsAnsvarlig: "",
    verneombud: "",
    brannvernleder: "",
    adresse: "",
    bransje:
      templates.find((t) => t.industry === tenantIndustry)?.name.replace(
        "HMS-hånbok – ",
        "",
      ) ?? "",
  });
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleImport = () => {
    if (!selectedTemplate) return;

    startTransition(async () => {
      const res = await applyHandbookTemplate({
        tenantId,
        industryKey: selectedTemplate,
        variables,
      });

      if (res.success) {
        setResult({
          success: true,
          message: `${res.sectionsUpdated} seksjoner oppdatert med bransjemal`,
        });
      } else {
        setResult({
          success: false,
          message: res.error ?? "Ukjent feil",
        });
      }
    });
  };

  const updateVariable = (key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          HMS-hånbok oppsett
        </CardTitle>
        <CardDescription>
          Importer en ferdig bransjemal med lovkrav, kompetansekrav og prosedyrer
          tilpasset bedriften.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Velg bransjemal</Label>
          <Select
            value={selectedTemplate}
            onValueChange={(value) => {
              setSelectedTemplate(value);
              const tpl = templates.find((t) => t.industry === value);
              if (tpl) {
                updateVariable(
                  "bransje",
                  tpl.name.replace("HMS-hånbok – ", ""),
                );
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Velg bransje..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((tpl) => (
                <SelectItem key={tpl.industry} value={tpl.industry}>
                  <div className="flex items-center gap-2">
                    <span>{tpl.name}</span>
                    {tpl.industry === tenantIndustry && (
                      <Badge variant="secondary" className="text-xs">
                        Anbefalt
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="bedriftsnavn">Bedriftsnavn</Label>
            <Input
              id="bedriftsnavn"
              value={variables.bedriftsnavn}
              onChange={(e) => updateVariable("bedriftsnavn", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orgNummer">Org.nummer</Label>
            <Input
              id="orgNummer"
              value={variables.orgNummer}
              onChange={(e) => updateVariable("orgNummer", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dagligLeder">Daglig leder</Label>
            <Input
              id="dagligLeder"
              value={variables.dagligLeder}
              onChange={(e) => updateVariable("dagligLeder", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hmsAnsvarlig">HMS-ansvarlig</Label>
            <Input
              id="hmsAnsvarlig"
              value={variables.hmsAnsvarlig}
              onChange={(e) => updateVariable("hmsAnsvarlig", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="verneombud">Verneombud</Label>
            <Input
              id="verneombud"
              value={variables.verneombud}
              onChange={(e) => updateVariable("verneombud", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brannvernleder">Brannvernleder</Label>
            <Input
              id="brannvernleder"
              value={variables.brannvernleder}
              onChange={(e) =>
                updateVariable("brannvernleder", e.target.value)
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              value={variables.adresse}
              onChange={(e) => updateVariable("adresse", e.target.value)}
            />
          </div>
        </div>

        {result && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              result.success
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {result.success && <CheckCircle2 className="h-4 w-4" />}
            {result.message}
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={!selectedTemplate || isPending}
          className="w-full"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Importer bransjemal til HMS-håndboken
        </Button>

        <p className="text-xs text-muted-foreground">
          Importerer innhold som et nytt utkast (draft). Bedriften må
          godkjenne og signere versjonen selv.
        </p>
      </CardContent>
    </Card>
  );
}
