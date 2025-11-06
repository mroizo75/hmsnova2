"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
      console.error("Feil ved henting av opplæring:", error);
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
        title: "Ingen fil valgt",
        description: "Vennligst velg en fil å laste opp",
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
        throw new Error(error.error || "Opplasting feilet");
      }

      const { key } = await response.json();
      setUploadedKey(key);

      toast({
        title: "✅ Fil lastet opp",
        description: "Beviset er lastet opp",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Opplasting feilet",
        description: error.message,
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
        title: "Ikke innlogget",
        description: "Du må være innlogget for å registrere opplæring",
        variant: "destructive",
      });
      return;
    }

    if (!completedAt) {
      toast({
        title: "Mangler dato",
        description: "Vennligst fyll ut når kurset ble gjennomført",
        variant: "destructive",
      });
      return;
    }

    if (!uploadedKey) {
      toast({
        title: "Mangler bevis",
        description: "Vennligst last opp bevis/diplom før du sender inn",
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
          title: "✅ Opplæring registrert",
          description: "Opplæringen er sendt til godkjenning hos din leder",
        });
        router.push("/ansatt/opplaering");
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Registrering feilet",
        description: error.message,
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
        <h1 className="text-3xl font-bold">Opplæring ikke funnet</h1>
        <Button asChild>
          <Link href="/ansatt/opplaering">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til opplæring
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
            Tilbake til opplæring
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Registrer opplæring</h1>
            <p className="text-muted-foreground">{training.title}</p>
          </div>
        </div>
        {training.isRequired && (
          <Badge variant="destructive" className="mt-2">
            Påkrevd kurs
          </Badge>
        )}
      </div>

      {/* Info */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Viktig:</strong> Last opp bevis (sertifikat, diplom, signert deltakerliste) 
            for å dokumentere at du har gjennomført opplæringen. Din leder vil gjennomgå og godkjenne registreringen.
          </p>
        </CardContent>
      </Card>

      {/* Registreringsskjema */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Opplysninger</CardTitle>
            <CardDescription>Fyll ut informasjon om gjennomført opplæring</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Kursleverandør */}
            <div className="space-y-2">
              <Label htmlFor="provider">Kursleverandør / Arrangør</Label>
              <Input
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="F.eks. Røde Kors, HMS Nova, Internt"
                required
              />
            </div>

            {/* Gjennomføringsdato */}
            <div className="space-y-2">
              <Label htmlFor="completedAt">
                Dato gjennomført <span className="text-destructive">*</span>
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
              <Label htmlFor="validUntil">Gyldig til (hvis aktuelt)</Label>
              <Input
                type="date"
                id="validUntil"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Noen kurs har utløpsdato og må fornyes (f.eks. førstehjelpskurs)
              </p>
            </div>

            {/* Fil-opplasting */}
            <div className="space-y-2">
              <Label htmlFor="file">
                Last opp bevis (PDF eller bilde) <span className="text-destructive">*</span>
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
                        Laster opp...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Last opp fil
                      </>
                    )}
                  </Button>
                )}

                {uploadedKey && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Fil lastet opp og klar for innsending</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Last opp sertifikat, diplom eller annen dokumentasjon. Maks 10MB.
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
                Sender inn...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Send til godkjenning
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            asChild
          >
            <Link href="/ansatt/opplaering">
              Avbryt
            </Link>
          </Button>
        </div>
      </form>

      {/* Hjelp */}
      <Card className="bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">❓ Trenger du hjelp?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Hva skjer etter innsending?</strong>
          </p>
          <p>
            Din leder vil motta en varsling og gjennomgå dokumentasjonen din.
            De vil godkjenne opplæringen hvis alt er i orden, eller kontakte deg hvis noe mangler.
          </p>
          <p className="pt-2">
            <strong>Har du problemer med opplasting?</strong>
          </p>
          <p>
            Kontakt din leder eller HMS-ansvarlig hvis du har tekniske problemer eller spørsmål.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

