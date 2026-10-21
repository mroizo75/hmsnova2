"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, GraduationCap, Globe, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CourseTemplate {
  id: string;
  courseKey: string;
  title: string;
  description: string | null;
  provider: string | null;
  isRequired: boolean;
  validityYears: number | null;
  isGlobal: boolean;
}

interface CourseTemplatesManagerProps {
  tenantId: string;
  globalCourses: CourseTemplate[];
  tenantCourses: CourseTemplate[];
}

interface FormValues {
  courseKey: string;
  title: string;
  description: string;
  provider: string;
  isRequired: boolean;
  validityYears: string;
}

const emptyForm: FormValues = {
  courseKey: "",
  title: "",
  description: "",
  provider: "",
  isRequired: false,
  validityYears: "",
};

export function CourseTemplatesManager({ tenantId, globalCourses, tenantCourses }: CourseTemplatesManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseTemplate | null>(null);
  const [isOverride, setIsOverride] = useState(false);
  const [form, setForm] = useState<FormValues>(emptyForm);

  const tenantCourseKeys = new Set(tenantCourses.map((c) => c.courseKey));

  useEffect(() => {
    if (editingCourse) {
      setForm({
        courseKey: editingCourse.courseKey,
        title: editingCourse.title,
        description: editingCourse.description ?? "",
        provider: editingCourse.provider ?? "",
        isRequired: editingCourse.isRequired,
        validityYears: editingCourse.validityYears?.toString() ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [editingCourse]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      courseKey: form.courseKey,
      title: form.title,
      description: form.description || null,
      provider: form.provider || null,
      isRequired: form.isRequired,
      validityYears: form.validityYears ? parseInt(form.validityYears, 10) : null,
    };

    try {
      if (isOverride) {
        const existingOverride = tenantCourses.find((c) => c.courseKey === data.courseKey);
        const response = await fetch("/api/course-templates", {
          method: existingOverride ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(existingOverride ? { ...data, id: existingOverride.id } : data),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.error ?? "Kunne ikke lagre kursmal");
        }
      } else {
        const response = await fetch("/api/course-templates", {
          method: editingCourse ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingCourse ? { ...data, id: editingCourse.id } : data),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.error ?? "Kunne ikke lagre kursmal");
        }
      }

      toast({
        title: isOverride ? "Standard kurs tilpasset" : editingCourse ? "Kursmal oppdatert" : "Kursmal opprettet",
        description: `${data.title} er nå tilgjengelig for registrering`,
      });

      closeDialog();
      router.refresh();
    } catch (error) {
      toast({
        title: "Feil",
        description: error instanceof Error ? error.message : "Kunne ikke lagre kursmal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCourse(null);
    setIsOverride(false);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne kursmalen?")) return;

    try {
      const response = await fetch(`/api/course-templates?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Kunne ikke slette kursmal");

      toast({ title: "Kursmal slettet", description: "Kursmalen er fjernet" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Feil",
        description: error instanceof Error ? error.message : "Kunne ikke slette kursmal",
        variant: "destructive",
      });
    }
  };

  const handleEditGlobal = (course: CourseTemplate) => {
    const override = tenantCourses.find((c) => c.courseKey === course.courseKey);
    setEditingCourse(override ?? course);
    setIsOverride(true);
    setDialogOpen(true);
  };

  const handleEditTenant = (course: CourseTemplate) => {
    setEditingCourse(course);
    setIsOverride(false);
    setDialogOpen(true);
  };

  const handleResetOverride = async (courseKey: string) => {
    const override = tenantCourses.find((c) => c.courseKey === courseKey);
    if (!override) return;
    if (!confirm("Vil du tilbakestille dette kurset til standardverdiene?")) return;

    try {
      const response = await fetch(`/api/course-templates?id=${override.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Kunne ikke tilbakestille");

      toast({ title: "Tilbakestilt", description: "Kurset bruker nå standardverdier" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Feil",
        description: error instanceof Error ? error.message : "Kunne ikke tilbakestille",
        variant: "destructive",
      });
    }
  };

  const getEffectiveCourse = (globalCourse: CourseTemplate): CourseTemplate => {
    const override = tenantCourses.find((c) => c.courseKey === globalCourse.courseKey);
    return override ?? globalCourse;
  };

  return (
    <div className="space-y-6">
      {globalCourses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Standard HMS-kurs
                </CardTitle>
                <CardDescription>
                  Felles kursmaler. Klikk rediger for å tilpasse til din bedrift (f.eks. fjerne utløpsdato).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {globalCourses.map((globalCourse) => {
                const effective = getEffectiveCourse(globalCourse);
                const isOverridden = tenantCourseKeys.has(globalCourse.courseKey);
                return (
                  <div key={globalCourse.id} className={`border rounded-lg p-4 space-y-2 ${isOverridden ? "border-blue-300 bg-blue-50/50" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h3 className="font-medium">{effective.title}</h3>
                          {effective.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {effective.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditGlobal(globalCourse)}
                          title="Tilpass for din bedrift"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {isOverridden && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => handleResetOverride(globalCourse.courseKey)}
                            title="Tilbakestill til standard"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {isOverridden && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                          Tilpasset
                        </Badge>
                      )}
                      {effective.isRequired && (
                        <Badge variant="destructive" className="text-xs">Obligatorisk</Badge>
                      )}
                      {effective.validityYears ? (
                        <Badge variant="outline" className="text-xs">
                          Gyldig i {effective.validityYears} år
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                          Utløper ikke
                        </Badge>
                      )}
                      {effective.provider && (
                        <Badge variant="secondary" className="text-xs">{effective.provider}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bedriftens egne kurs</CardTitle>
              <CardDescription>
                Spesifikke kurs for din bedrift (f.eks. maskinkurs, bransjespesifikt)
              </CardDescription>
            </div>
            <Button onClick={() => { setEditingCourse(null); setIsOverride(false); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Legg til kurs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tenantCourses.filter((c) => !globalCourses.some((g) => g.courseKey === c.courseKey)).length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Ingen egne kurs registrert enda</p>
              <Button onClick={() => { setEditingCourse(null); setIsOverride(false); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Legg til ditt første kurs
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {tenantCourses
                .filter((c) => !globalCourses.some((g) => g.courseKey === c.courseKey))
                .map((course) => (
                  <div key={course.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h3 className="font-medium">{course.title}</h3>
                          {course.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditTenant(course)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(course.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {course.isRequired && (
                        <Badge variant="destructive" className="text-xs">Obligatorisk</Badge>
                      )}
                      {course.validityYears ? (
                        <Badge variant="outline" className="text-xs">Gyldig i {course.validityYears} år</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-green-700 border-green-300">Utløper ikke</Badge>
                      )}
                      {course.provider && (
                        <Badge variant="secondary" className="text-xs">{course.provider}</Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isOverride
                ? "Tilpass standard kurs"
                : editingCourse
                  ? "Rediger kursmal"
                  : "Legg til ny kursmal"}
            </DialogTitle>
            <DialogDescription>
              {isOverride
                ? "Endre gyldighet, tittel eller andre innstillinger. Tøm gyldighet for kurs som ikke utløper."
                : "Definer et kurs som er spesifikt for din bedrift"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="courseKey">Kurskode *</Label>
                <Input
                  id="courseKey"
                  value={form.courseKey}
                  onChange={(e) => setForm((p) => ({ ...p, courseKey: e.target.value }))}
                  placeholder="f.eks. gravemaskin-opplering"
                  required
                  disabled={loading || isOverride || !!editingCourse}
                />
                {!isOverride && !editingCourse && (
                  <p className="text-xs text-muted-foreground">
                    Unik identifikator (bruk små bokstaver og bindestrek)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Kurstittel *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="f.eks. Gravemaskinkurs"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Kort beskrivelse av kurset"
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider">Leverandør</Label>
                <Input
                  id="provider"
                  value={form.provider}
                  onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
                  placeholder="f.eks. NLF Maskin"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validityYears">Gyldighet (antall år)</Label>
                <Input
                  id="validityYears"
                  type="number"
                  min="0"
                  max="10"
                  value={form.validityYears}
                  onChange={(e) => setForm((p) => ({ ...p, validityYears: e.target.value }))}
                  placeholder="Tomt = utløper ikke"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  La stå tom eller sett 0 hvis kurset ikke utløper
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isRequired"
                checked={form.isRequired}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isRequired: v }))}
                disabled={loading}
              />
              <Label htmlFor="isRequired">Kan kreves i en kompetanseprofil</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={loading}>
                Avbryt
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Lagrer..." : isOverride ? "Lagre tilpasning" : editingCourse ? "Oppdater" : "Opprett"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
