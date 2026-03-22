"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadNewVersion } from "@/server/actions/document.actions";
import { Upload } from "lucide-react";
import type { Document } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface NewVersionFormProps {
  document: Document;
}

export function NewVersionForm({ document }: NewVersionFormProps) {
  const t = useTranslations("dashboardDocumentNewVersionForm");
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("documentId", document.id);

    try {
      const result = await uploadNewVersion(formData);
      
      if (result.success) {
        toast({
          title: t("toasts.uploaded.title"),
          description: t("toasts.uploaded.description"),
          className: "bg-blue-50 border-blue-200",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { version: document.version })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="version">{t("fields.version")}</Label>
            <Input
              id="version"
              name="version"
              placeholder={t("placeholders.version")}
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {t("hints.version", { version: document.version })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="changeComment">{t("fields.changeComment")}</Label>
            <Input
              id="changeComment"
              name="changeComment"
              placeholder={t("placeholders.changeComment")}
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {t("hints.changeComment")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">{t("fields.file")}</Label>
            <Input
              id="file"
              name="file"
              type="file"
              required
              disabled={loading}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                {t("selectedFile", { name: selectedFile.name, size: (selectedFile.size / 1024).toFixed(2) })}
              </p>
            )}
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-900 mb-2">{t("important.title")}</p>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>{t.rich("important.i1", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t("important.i2")}</li>
              <li>{t.rich("important.i3", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
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

