"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { createDocument } from "@/server/actions/document.actions";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";

interface DocumentFormProps {
  tenantId: string;
  owners: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
  }>;
  templates: Array<{
    id: string;
    name: string;
    category?: string | null;
    description?: string | null;
    defaultReviewIntervalMonths: number;
    isGlobal: boolean;
    pdcaGuidance?: Record<string, string> | null;
  }>;
}

const documentKinds = ["LAW", "PLAN", "PROCEDURE", "CHECKLIST", "FORM", "SDS", "OTHER"] as const;
const userRoles = ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"] as const;

const NO_OWNER_VALUE = "__none_owner__";
const NO_TEMPLATE_VALUE = "__none_template__";

export function DocumentForm({ tenantId, owners, templates }: DocumentFormProps) {
  const t = useTranslations("dashboardDocumentForm");
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>(NO_OWNER_VALUE);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(NO_TEMPLATE_VALUE);
  const [reviewInterval, setReviewInterval] = useState("12");
  const [reviewIntervalTouched, setReviewIntervalTouched] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [pdca, setPdca] = useState({
    plan: "",
    do: "",
    check: "",
    act: "",
  });

  const templateMap = useMemo(() => {
    const map = new Map<string, (typeof templates)[number]>();
    templates.forEach((template) => map.set(template.id, template));
    return map;
  }, [templates]);

  // Maks 50MB for dokumenter
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    if (value === NO_TEMPLATE_VALUE) {
      return;
    }

    const template = templateMap.get(value);
    if (!template) {
      return;
    }

    if (!reviewIntervalTouched && template.defaultReviewIntervalMonths) {
      setReviewInterval(String(template.defaultReviewIntervalMonths));
    }

    const guidance = template.pdcaGuidance || {};
    setPdca((prev) => ({
      plan: prev.plan || guidance.plan || "",
      do: prev.do || guidance.do || "",
      check: prev.check || guidance.check || "",
      act: prev.act || guidance.act || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: t("toasts.fileTooLarge.title"),
        description: t("toasts.fileTooLarge.description", {
          size: (selectedFile.size / (1024 * 1024)).toFixed(2),
        }),
      });
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("tenantId", tenantId);
    formData.append("changeComment", t("defaultChangeComment"));
    formData.delete("ownerId");
    formData.delete("templateId");

    if (selectedOwner !== NO_OWNER_VALUE) {
      formData.append("ownerId", selectedOwner);
    }

    if (selectedTemplate !== NO_TEMPLATE_VALUE) {
      formData.append("templateId", selectedTemplate);
    }

    if (selectedRoles.length > 0) {
      formData.append("visibleToRoles", JSON.stringify(selectedRoles));
    }

    try {
      const result = await createDocument(formData);

      if (result.success) {
        toast({
          title: t("toasts.created.title"),
          description: t("toasts.created.description"),
          className: "bg-green-50 border-green-200",
        });
        router.push("/dashboard/documents");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: t("toasts.uploadFailed.title"),
          description: result.error || t("toasts.uploadFailed.description"),
        });
      }
    } catch (error: any) {
      if (error?.message?.includes("413") || error?.status === 413) {
        toast({
          variant: "destructive",
          title: t("toasts.fileTooLarge.title"),
          description: t("toasts.fileTooLarge.serverDescription"),
        });
      } else {
        toast({
          variant: "destructive",
          title: t("toasts.unexpected.title"),
          description: t("toasts.unexpected.description"),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">{t("fields.title")}</Label>
            <Input
              id="title"
              name="title"
              placeholder={t("placeholders.title")}
              required
              disabled={loading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kind">{t("fields.kind")}</Label>
              <Select name="kind" required disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={t("placeholders.kind")} />
                </SelectTrigger>
                <SelectContent>
                  {documentKinds.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {t(`kinds.${kind}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">{t("fields.version")}</Label>
              <Input
                id="version"
                name="version"
                placeholder="v1.0"
                defaultValue="v1.0"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ownerId">{t("fields.owner")}</Label>
              <Select
                name="ownerId"
                value={selectedOwner}
                onValueChange={setSelectedOwner}
                disabled={loading || owners.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={owners.length ? t("placeholders.owner") : t("placeholders.noUsers")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_OWNER_VALUE}>{t("none")}</SelectItem>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name || owner.email} ({owner.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateId">{t("fields.template")}</Label>
              <Select
                name="templateId"
                value={selectedTemplate}
                onValueChange={handleTemplateChange}
                disabled={loading || templates.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={templates.length ? t("placeholders.template") : t("placeholders.noTemplates")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEMPLATE_VALUE}>{t("none")}</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} {template.isGlobal ? `• ${t("global")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate !== NO_TEMPLATE_VALUE && (
                <p className="text-xs text-muted-foreground">
                  {templateMap.get(selectedTemplate)?.description ?? t("templateSelected")}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="reviewIntervalMonths">{t("fields.reviewInterval")}</Label>
              <Input
                id="reviewIntervalMonths"
                name="reviewIntervalMonths"
                type="number"
                min={1}
                max={36}
                value={reviewInterval}
                onChange={(event) => {
                  setReviewIntervalTouched(true);
                  setReviewInterval(event.target.value);
                }}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">{t("fields.effectiveFrom")}</Label>
              <Input
                id="effectiveFrom"
                name="effectiveFrom"
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveTo">{t("fields.effectiveTo")}</Label>
              <Input
                id="effectiveTo"
                name="effectiveTo"
                type="date"
                value={effectiveTo}
                onChange={(event) => setEffectiveTo(event.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">{t("fields.file")}</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file"
                name="file"
                type="file"
                required
                disabled={loading}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                {t("selectedFile", {
                  name: selectedFile.name,
                  size: (selectedFile.size / (1024 * 1024)).toFixed(2),
                })}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("fileHelp")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="planSummary">{t("fields.plan")}</Label>
              <Textarea
                id="planSummary"
                name="planSummary"
                value={pdca.plan}
                onChange={(event) => setPdca((prev) => ({ ...prev, plan: event.target.value }))}
                placeholder={t("placeholders.plan")}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doSummary">{t("fields.do")}</Label>
              <Textarea
                id="doSummary"
                name="doSummary"
                value={pdca.do}
                onChange={(event) => setPdca((prev) => ({ ...prev, do: event.target.value }))}
                placeholder={t("placeholders.do")}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="checkSummary">{t("fields.check")}</Label>
              <Textarea
                id="checkSummary"
                name="checkSummary"
                value={pdca.check}
                onChange={(event) => setPdca((prev) => ({ ...prev, check: event.target.value }))}
                placeholder={t("placeholders.check")}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actSummary">{t("fields.act")}</Label>
              <Textarea
                id="actSummary"
                name="actSummary"
                value={pdca.act}
                onChange={(event) => setPdca((prev) => ({ ...prev, act: event.target.value }))}
                placeholder={t("placeholders.act")}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>{t("fields.visibleToRoles")}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t("visibleToHelp")}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {userRoles.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={role}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRoles([...selectedRoles, role]);
                      } else {
                        setSelectedRoles(selectedRoles.filter((r) => r !== role));
                      }
                    }}
                    disabled={loading}
                  />
                  <Label
                    htmlFor={role}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {t(`roles.${role}`)}
                  </Label>
                </div>
              ))}
            </div>
            {selectedRoles.length > 0 && (
              <p className="text-sm text-blue-600">
                {t("selectedRoles", {
                  roles: selectedRoles.map((role) => t(`roles.${role as (typeof userRoles)[number]}`)).join(", "),
                })}
              </p>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">{t("important.title")}</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t.rich("important.i1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t.rich("important.i2", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t("important.i3")}</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>{t("actions.uploading")}</>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("actions.upload")}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              {t("actions.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
