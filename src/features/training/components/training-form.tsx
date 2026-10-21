"use client";

import { useState, useMemo } from "react";
import { useRefreshAfterSave } from "@/hooks/use-refresh-after-save";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CertificateFileDrop } from "@/features/training/components/certificate-file-drop";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, CheckCircle2 } from "lucide-react";
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
  const refreshAfterSave = useRefreshAfterSave();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userSearch, setUserSearch] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

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
        userId: selectedUserId,
        courseKey: formData.get("courseKey") as string,
        title: formData.get("title") as string,
        provider: formData.get("provider") as string,
        completedAt: formData.get("completedAt") as string || undefined,
        validUntil: validUntil || undefined,
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
        setSelectedUserId("");
        setUserSearch("");
        setSelectedCourse("");
        setValidUntil("");
        setSelectedFile(null);
        await refreshAfterSave();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke registrere opplæring",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (value: string) => {
    setSelectedCourse(value);
    const course = courseTemplates.find((c) => c.courseKey === value);
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
        setValidUntil(validDate.toISOString().split("T")[0]);
      } else {
        setValidUntil("");
      }
    }
  };

  const selectedCourseInfo = courseTemplates.find((c) => c.courseKey === selectedCourse);

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
          <DialogTitle>Registrer kompetanse</DialogTitle>
          <DialogDescription>
            Dokumenter kompetanse basert på utdanning, opplæring eller erfaring
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Søkbar ansattvelger */}
            <div className="space-y-2">
              <Label>Ansatt *</Label>
              <input type="hidden" name="userId" value={selectedUserId} />
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Søk ansatt..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
                {selectedUser && !userSearch && (
                  <div className="flex items-center gap-2 rounded-md border bg-green-50 border-green-200 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-sm font-medium text-green-800 truncate">
                      {selectedUser.name || selectedUser.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setSelectedUserId(""); setUserSearch(""); }}
                      className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                    >
                      Bytt
                    </button>
                  </div>
                )}
                {!selectedUser && !userSearch && (
                  <p className="text-xs text-muted-foreground py-2">
                    Skriv navn eller e-post for å søke ({users.length} ansatte)
                  </p>
                )}
                {(!selectedUser || userSearch) && userSearch.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">Ingen treff for &ldquo;{userSearch}&rdquo;</p>
                    ) : (
                      filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setUserSearch("");
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                            selectedUserId === u.id ? "bg-primary/10 font-medium" : ""
                          }`}
                        >
                          <div className="font-medium truncate">{u.name || u.email}</div>
                          {u.name && (
                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseKey">Kurs *</Label>
              <Select
                name="courseKey"
                required
                disabled={loading}
                value={selectedCourse}
                onValueChange={handleCourseChange}
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
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tomt felt = utløper ikke. Dato i fortiden registreres som utløpt kompetanse.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dokumentert bevis (sertifikat)</Label>
            <CertificateFileDrop
              disabled={loading}
              label={selectedFile ? `Valgt: ${selectedFile.name}` : "Dra fil hit eller klikk for å laste opp"}
              onFile={(file) => setSelectedFile(file)}
            />
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

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading || !selectedUserId}>
              {loading ? "Registrerer..." : "Registrer kompetanse"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
