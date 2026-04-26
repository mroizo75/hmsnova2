"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { createTraining } from "@/server/actions/training.actions";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload } from "lucide-react";
import type { CourseTemplate } from "@prisma/client";

interface TrainingFormProps {
  tenantId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  courseTemplates: CourseTemplate[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TrainingForm({ tenantId, users, courseTemplates, trigger, open: controlledOpen, onOpenChange }: TrainingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadCertificate = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/training/upload", { method: "POST", body: fd });
    if (!res.ok) return null;
    const json = await res.json();
    return json.key ?? null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      let proofDocKey: string | undefined;
      if (selectedFile) {
        const key = await uploadCertificate(selectedFile);
        if (!key) {
          toast({
            variant: "destructive",
            title: "Opplasting feilet",
            description: "Kunne ikke laste opp sertifikatet. Prøv igjen.",
          });
          setLoading(false);
          return;
        }
        proofDocKey = key;
      }

      const data = {
        tenantId,
        userId: formData.get("userId") as string,
        courseKey: formData.get("courseKey") as string,
        title: formData.get("title") as string,
        provider: formData.get("provider") as string,
        completedAt: formData.get("completedAt") as string || undefined,
        validUntil: formData.get("validUntil") as string || undefined,
        isRequired: formData.get("isRequired") === "true",
        proofDocKey,
      };

      const result = await createTraining(data);

      if (result.success) {
        toast({
          title: "Kompetanse registrert",
          description: "Kurset er dokumentert i systemet",
          className: "bg-green-50 border-green-200",
        });
        setOpen(false);
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke registrere opplæring",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCourseInfo = courseTemplates.find(c => c.courseKey === selectedCourse);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrer opplæring
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrer opplæring</DialogTitle>
          <DialogDescription>
            ISO 9001: Dokumenter kompetanse basert på utdanning, opplæring eller erfaring
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="userId">Ansatt *</Label>
              <Select name="userId" required disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg ansatt" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseKey">Kurs *</Label>
              <Select
                name="courseKey"
                required
                disabled={loading}
                value={selectedCourse}
                onValueChange={(value) => {
                  setSelectedCourse(value);
                  const course = courseTemplates.find(c => c.courseKey === value);
                  if (course) {
                    const form = document.querySelector("form") as HTMLFormElement;
                    const titleInput = form?.querySelector('[name="title"]') as HTMLInputElement;
                    if (titleInput) titleInput.value = course.title;
                    const providerInput = form?.querySelector('[name="provider"]') as HTMLInputElement;
                    if (providerInput && course.provider) providerInput.value = course.provider;
                    if (course.validityYears) {
                      const completedInput = form?.querySelector('[name="completedAt"]') as HTMLInputElement;
                      const baseDate = completedInput?.value ? new Date(completedInput.value) : new Date();
                      const validDate = new Date(baseDate);
                      validDate.setFullYear(validDate.getFullYear() + course.validityYears);
                      const validInput = form?.querySelector('[name="validUntil"]') as HTMLInputElement;
                      if (validInput) validInput.value = validDate.toISOString().split("T")[0];
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg kurs" />
                </SelectTrigger>
                <SelectContent>
                  {courseTemplates.map((course) => (
                    <SelectItem key={course.id} value={course.courseKey}>
                      {course.title}
                      {course.isGlobal && " (Standard HMS)"}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Egendefinert kurs</SelectItem>
                </SelectContent>
              </Select>
              {selectedCourseInfo && (
                <p className="text-xs text-muted-foreground">{selectedCourseInfo.description}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Kurstittel *</Label>
            <Input
              id="title"
              name="title"
              placeholder="F.eks. Førstehjelp grunnkurs"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Kursleverandør *</Label>
            <Input
              id="provider"
              name="provider"
              placeholder="F.eks. Røde Kors, BHT, Internt"
              required
              disabled={loading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="completedAt">Gjennomført dato</Label>
              <Input
                id="completedAt"
                name="completedAt"
                type="date"
                disabled={loading}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validUntil">Gyldig til</Label>
              <Input
                id="validUntil"
                name="validUntil"
                type="date"
                disabled={loading}
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-muted-foreground">
                La stå tom hvis kurset ikke utløper
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proofDoc">Dokumentert bevis (sertifikat)</Label>
            <Input
              id="proofDoc"
              name="proofDoc"
              type="file"
              disabled={loading}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Valgt: {selectedFile.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Last opp sertifikat, kursbevis eller annet dokumentert bevis
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRequired"
              name="isRequired"
              value="true"
              disabled={loading}
              className="h-4 w-4"
            />
            <Label htmlFor="isRequired" className="font-normal">
              Obligatorisk kurs for alle ansatte
            </Label>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-blue-900 mb-2">📋 ISO 9001 - 7.2 Kompetanse</p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Dokumenter kompetanse basert på opplæring</li>
                <li>Last opp sertifikat som bevis</li>
                <li>Sett utløpsdato for kurs som må fornyes</li>
                <li>System varsler når kurs skal fornyes</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registrerer..." : "Registrer opplæring"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

