"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface TenantUser {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface FormTemplateField {
  id: string;
  fieldType: string;
  label: string;
  isRequired: boolean;
}

interface InspectionFormTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  isGlobal: boolean;
  fields: FormTemplateField[];
}

const riskCategoryOptions = [
  { value: "SAFETY", labelKey: "riskCategories.safety" },
  { value: "HEALTH", labelKey: "riskCategories.health" },
  { value: "ENVIRONMENTAL", labelKey: "riskCategories.environmental" },
  { value: "OPERATIONAL", labelKey: "riskCategories.operational" },
  { value: "LEGAL", labelKey: "riskCategories.legal" },
  { value: "INFORMATION_SECURITY", labelKey: "riskCategories.informationSecurity" },
] as const;

const NO_TEMPLATE_VALUE = "__none_template__";
const NO_RISK_CATEGORY_VALUE = "__none_risk__";
const NO_FOLLOWUP_VALUE = "__none_followup__";

export default function NewInspectionPage() {
  const t = useTranslations("dashboardInspectionNewPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || "";
  const { toast } = useToast();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formTemplates, setFormTemplates] = useState<InspectionFormTemplate[]>([]);
  const [loadingFormTemplates, setLoadingFormTemplates] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "VERNERUNDE",
    scheduledDate: "",
    location: "",
    conductedBy: "",
    formTemplateId: NO_TEMPLATE_VALUE,
    riskCategory: NO_RISK_CATEGORY_VALUE,
    area: "",
    durationMinutes: "",
    followUpById: NO_FOLLOWUP_VALUE,
    nextInspection: "",
  });

  useEffect(() => {
    const fetchUsers = async () => {
      if (!session?.user?.tenantId) return;

      try {
        const response = await fetch(`/api/tenants/${session.user.tenantId}/users`);
        const data = await response.json();

        if (response.ok && data.users) {
          setUsers(data.users);
          // Sett current user som default
          if (session.user.id) {
            setFormData((prev) => ({ ...prev, conductedBy: session.user.id || "" }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [session?.user?.tenantId, session?.user?.id]);

  useEffect(() => {
    const fetchFormTemplates = async () => {
      try {
        const response = await fetch("/api/forms?category=INSPECTION");
        const data = await response.json();
        if (response.ok && data.forms) {
          setFormTemplates(data.forms);
        }
      } catch (error) {
        console.error("Failed to fetch form templates:", error);
      } finally {
        setLoadingFormTemplates(false);
      }
    };

    fetchFormTemplates();
  }, []);

  const selectedFormTemplate =
    formData.formTemplateId === NO_TEMPLATE_VALUE
      ? null
      : formTemplates.find((template) => template.id === formData.formTemplateId) ?? null;

  const previewFields = selectedFormTemplate?.fields ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.formTemplateId === NO_TEMPLATE_VALUE) {
      toast({
        title: t("toasts.missingTemplate.title"),
        description: t("toasts.missingTemplate.description"),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      const payload = {
        ...formData,
        projectId: projectId || undefined,
        formTemplateId: formData.formTemplateId === NO_TEMPLATE_VALUE ? undefined : formData.formTemplateId,
        riskCategory: formData.riskCategory === NO_RISK_CATEGORY_VALUE ? undefined : formData.riskCategory,
        followUpById: formData.followUpById === NO_FOLLOWUP_VALUE ? undefined : formData.followUpById,
        durationMinutes: formData.durationMinutes
          ? Number(formData.durationMinutes)
          : undefined,
      };

      const response = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t("errors.create"));
      }

      toast({
        title: t("toasts.created.title"),
        description: t("toasts.created.description"),
      });

      router.push(`/dashboard/inspections/${data.data.inspection.id}`);
    } catch (error: any) {
      toast({
        title: t("toasts.error.title"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inspections">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("card.title")}</CardTitle>
          <CardDescription>
            {t("card.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {projectId ? (
              <div className="rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
                {t("projectNotice")}
              </div>
            ) : null}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">
                  {t("fields.title")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t("placeholders.title")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">
                  {t("fields.type")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VERNERUNDE">{t("types.vernerunde")}</SelectItem>
                    <SelectItem value="HMS_INSPEKSJON">{t("types.hmsInspection")}</SelectItem>
                    <SelectItem value="SHA_PLAN">{t("types.shaPlan")}</SelectItem>
                    <SelectItem value="SIKKERHETSVANDRING">{t("types.safetyWalk")}</SelectItem>
                    <SelectItem value="ANDRE">{t("types.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formTemplateId">
                  📋 Mal (skjemabuilder)
                  <span className="text-destructive"> *</span>
                </Label>
                <Select
                  value={formData.formTemplateId}
                  onValueChange={(value) => {
                    if (value === NO_TEMPLATE_VALUE) {
                      setFormData((prev) => ({
                        ...prev,
                        formTemplateId: NO_TEMPLATE_VALUE,
                      }));
                      return;
                    }

                    const selected = formTemplates.find((template) => template.id === value);
                    setFormData((prev) => ({
                      ...prev,
                      formTemplateId: value,
                      title: prev.title || selected?.title || prev.title,
                      description: prev.description || selected?.description || prev.description,
                    }));
                  }}
                  disabled={loadingFormTemplates}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingFormTemplates ? t("loadingTemplates") : t("placeholders.selectTemplate")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEMPLATE_VALUE}>{t("actions.selectTemplate")}</SelectItem>
                    {formTemplates.length === 0 && !loadingFormTemplates && (
                      <div className="px-2 py-6 text-sm text-muted-foreground text-center">
                        <p className="font-semibold">{t("noTemplates.title")}</p>
                        <p className="text-xs mt-2">{t("noTemplates.subtitle")}</p>
                        <ol className="text-xs mt-2 text-left space-y-1">
                          <li>{t("noTemplates.s1")}</li>
                          <li>{t("noTemplates.s2")}</li>
                          <li>{t("noTemplates.s3")}</li>
                          <li>{t("noTemplates.s4")}</li>
                        </ol>
                      </div>
                    )}
                    {formTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.isGlobal ? `📋 ${template.title} (${t("template.exampleTemplate")})` : `📋 ${template.title}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFormTemplate ? (
                  <div className="rounded border bg-muted/30 p-3 space-y-2">
                    <p className="text-sm font-semibold">{selectedFormTemplate.title}</p>
                    {selectedFormTemplate.description ? (
                      <p className="text-xs text-muted-foreground">
                        {selectedFormTemplate.description}
                      </p>
                    ) : null}
                    {selectedFormTemplate.isGlobal ? (
                      <p className="text-xs rounded border border-purple-300 bg-purple-50 p-2 text-purple-900">
                        {t("template.globalInfo")}
                      </p>
                    ) : null}
                    <p className="text-xs font-medium">
                      {t("template.fieldsCount", { count: previewFields.length })}
                    </p>
                    {previewFields.length > 0 ? (
                      <ul className="text-xs space-y-1">
                        {previewFields.slice(0, 10).map((field) => (
                          <li key={field.id} className="list-disc ml-4">
                            {field.label}
                            {field.isRequired ? ` ${t("template.requiredSuffix")}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {previewFields.length > 10 ? (
                      <p className="text-xs text-muted-foreground">
                        {t("template.moreFields", { count: previewFields.length - 10 })}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {formTemplates.length === 0 && !loadingFormTemplates && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-900 font-medium">
                      {t("template.createOwnTitle")}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {t("template.createOwnDescription")}
                    </p>
                  </div>
                )}
                {formTemplates.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    {t("template.availableCount", { count: formTemplates.length })}
                  </p>
                )}
              </div>

<div className="space-y-2">
                <Label htmlFor="riskCategory">{t("fields.riskCategory")}</Label>
                <Select
                  value={formData.riskCategory}
                onValueChange={(value) =>
                  setFormData({ ...formData, riskCategory: value })
                }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("placeholders.selectOptionalCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_RISK_CATEGORY_VALUE}>{t("noneCategory")}</SelectItem>
                    {riskCategoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conductedBy">
                  {t("fields.conductedBy")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.conductedBy}
                  onValueChange={(value) =>
                    setFormData({ ...formData, conductedBy: value })
                  }
                  disabled={loadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUsers ? t("loadingUsers") : t("placeholders.selectUser")} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.user.id} value={u.user.id}>
                        {u.user.name || u.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="followUpById">{t("fields.followUpBy")}</Label>
                <Select
                  value={formData.followUpById}
                  onValueChange={(value) => setFormData({ ...formData, followUpById: value })}
                  disabled={loadingUsers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("placeholders.selectResponsibleOptional")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FOLLOWUP_VALUE}>{t("noneSelected")}</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.user.id} value={u.user.id}>
                        {u.user.name || u.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledDate">
                  {t("fields.scheduledDate")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{t("fields.location")}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder={t("placeholders.location")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">{t("fields.area")}</Label>
                <Input
                  id="area"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder={t("placeholders.area")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationMinutes">{t("fields.durationMinutes")}</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={0}
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                  placeholder={t("placeholders.duration")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextInspection">{t("fields.nextInspection")}</Label>
                <Input
                  id="nextInspection"
                  type="date"
                  value={formData.nextInspection}
                  onChange={(e) => setFormData({ ...formData, nextInspection: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("fields.description")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t("placeholders.description")}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/dashboard/inspections">
                <Button type="button" variant="outline">
                  {t("actions.cancel")}
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? t("actions.creating") : t("actions.create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

