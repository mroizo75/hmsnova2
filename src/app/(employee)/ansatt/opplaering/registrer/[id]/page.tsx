"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, GraduationCap, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createTraining } from "@/server/actions/training.actions";
import { useToast } from "@/hooks/use-toast";

export default function RegistrerOpplaeringPage() {
  const t = useTranslations("employeeTrainingRegisterPage");
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [training, setTraining] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [completedAt, setCompletedAt] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [provider, setProvider] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchTraining(params.id as string);
    }
  }, [params.id]);

  const fetchTraining = async (id: string) => {
    try {
      const response = await fetch(`/api/training/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTraining(data);
        setProvider(data.provider || "");
      }
    } catch (error) {
      // Intentionally silent, UI keeps loading fallback states
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadedKey(null); // Reset uploaded key hvis ny fil velges
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: t("toasts.noFile.title"),
        description: t("toasts.noFile.description"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/training/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
          throw new Error(error.error || t("toasts.uploadFailed.description"));
      }

      const { key } = await response.json();
      setUploadedKey(key);

      toast({
        title: t("toasts.uploadSuccess.title"),
        description: t("toasts.uploadSuccess.description"),
      });
    } catch (error: any) {
      const message = error?.message || t("toasts.uploadFailed.description");
      toast({
        title: t("toasts.uploadFailed.title"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.id) {
      toast({
        title: t("toasts.notLoggedIn.title"),
        description: t("toasts.notLoggedIn.description"),
        variant: "destructive",
      });
      return;
    }

    if (!completedAt) {
      toast({
        title: t("toasts.missingDate.title"),
        description: t("toasts.missingDate.description"),
        variant: "destructive",
      });
      return;
    }

    if (!uploadedKey) {
      toast({
        title: t("toasts.missingProof.title"),
        description: t("toasts.missingProof.description"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createTraining({
        userId: session.user.id,
        courseKey: training.courseKey || `course-${Date.now()}`,
        title: training.title,
        provider: provider || training.provider,
        description: training.description,
        completedAt: new Date(completedAt).toISOString(),
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        proofDocKey: uploadedKey,
        isRequired: training.isRequired,
      });

      if (result.success) {
        toast({
          title: t("toasts.registered.title"),
          description: t("toasts.registered.description"),
        });
        router.push("/ansatt/opplaering");
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      const message = error?.message || t("toasts.registrationFailed.description");
      toast({
        title: t("toasts.registrationFailed.title"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!training) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t("notFound.title")}</h1>
        <Button asChild>
          <Link href="/ansatt/opplaering">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("notFound.back")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <Link href="/ansatt/opplaering">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("header.back")}
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t("header.title")}</h1>
            <p className="text-muted-foreground">{training.title}</p>
          </div>
        </div>
        {training.isRequired && (
          <Badge variant="destructive" className="mt-2">
            {t("header.requiredBadge")}
          </Badge>
        )}
      </div>

      {/* Info */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>{t("info.title")}</strong> {t("info.description")}
          </p>
        </CardContent>
      </Card>

      {/* Registreringsskjema */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t("form.title")}</CardTitle>
            <CardDescription>{t("form.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Kursleverandør */}
            <div className="space-y-2">
              <Label htmlFor="provider">{t("form.fields.provider.label")}</Label>
              <Input
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder={t("form.fields.provider.placeholder")}
                required
              />
            </div>

            {/* Gjennomføringsdato */}
            <div className="space-y-2">
              <Label htmlFor="completedAt">
                {t("form.fields.completedAt.label")} <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                id="completedAt"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                required
              />
            </div>

            {/* Gyldighet */}
            <div className="space-y-2">
              <Label htmlFor="validUntil">{t("form.fields.validUntil.label")}</Label>
              <Input
                type="date"
                id="validUntil"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("form.fields.validUntil.help")}
              </p>
            </div>

            {/* Fil-opplasting */}
            <div className="space-y-2">
              <Label htmlFor="file">
                {t("form.fields.file.label")} <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-3">
                <Input
                  type="file"
                  id="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                
                {file && !uploadedKey && (
                  <Button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("form.fields.file.uploading")}
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {t("form.fields.file.upload")}
                      </>
                    )}
                  </Button>
                )}

                {uploadedKey && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{t("form.fields.file.ready")}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("form.fields.file.help")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 mt-6">
          <Button
            type="submit"
            disabled={submitting || !uploadedKey}
            className="flex-1 sm:flex-none"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("form.actions.submitting")}
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {t("form.actions.submit")}
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            asChild
          >
            <Link href="/ansatt/opplaering">
              {t("form.actions.cancel")}
            </Link>
          </Button>
        </div>
      </form>

      {/* Hjelp */}
      <Card className="bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("help.title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>{t("help.afterSubmitTitle")}</strong>
          </p>
          <p>
            {t("help.afterSubmitText")}
          </p>
          <p className="pt-2">
            <strong>{t("help.uploadIssueTitle")}</strong>
          </p>
          <p>
            {t("help.uploadIssueText")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

