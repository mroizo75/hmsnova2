"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, GraduationCap, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

export function CourseTemplatesManager({ tenantId, globalCourses, tenantCourses }: CourseTemplatesManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseTemplate | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      courseKey: formData.get("courseKey") as string,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      provider: formData.get("provider") as string,
      isRequired: formData.get("isRequired") === "on",
      validityYears: formData.get("validityYears") ? parseInt(formData.get("validityYears") as string) : null,
    };

    try {
      const response = await fetch("/api/course-templates", {
        method: editingCourse ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCourse ? { ...data, id: editingCourse.id } : data),
      });

      if (!response.ok) throw new Error("Kunne ikke lagre kursmal");

      toast({
        title: editingCourse ? "Kursmal oppdatert" : "Kursmal opprettet",
        description: `${data.title} er nå tilgjengelig for opplæringsregistrering`,
      });

      setDialogOpen(false);
      setEditingCourse(null);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne kursmalen?")) return;

    try {
      const response = await fetch(`/api/course-templates?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Kunne ikke slette kursmal");

      toast({
        title: "Kursmal slettet",
        description: "Kursmalen er fjernet",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Feil",
        description: error instanceof Error ? error.message : "Kunne ikke slette kursmal",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Standard HMS-kurs – globale kursmaler (f.eks. førstehjelp, brannvern) som alle bedrifter får. Vis kun hvis det finnes noen. */}
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
                Felles kursmaler for alle bedrifter (f.eks. førstehjelp, brannvern). Kan ikke redigeres her.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {globalCourses.map((course) => (
              <div key={course.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h3 className="font-medium">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {course.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {course.isRequired && (
                    <Badge variant="destructive" className="text-xs">
                      Obligatorisk
                    </Badge>
                  )}
                  {course.validityYears && (
                    <Badge variant="outline" className="text-xs">
                      Gyldig i {course.validityYears} år
                    </Badge>
                  )}
                  {course.provider && (
                    <Badge variant="secondary" className="text-xs">
                      {course.provider}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Bedriftens egne kurs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bedriftens egne kurs</CardTitle>
              <CardDescription>
                Spesifikke kurs for din bedrift (f.eks. maskinkurs, bransjespesifikt)
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingCourse(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Legg til kurs
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCourse ? "Rediger kursmal" : "Legg til ny kursmal"}
                  </DialogTitle>
                  <DialogDescription>
                    Definer et kurs som er spesifikt for din bedrift
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="courseKey">Kurskode *</Label>
                      <Input
                        id="courseKey"
                        name="courseKey"
                        placeholder="f.eks. gravemask in-opplering"
                        defaultValue={editingCourse?.courseKey || ""}
                        required
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Unik identifikator (bruk små bokstaver og bindestrek)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Kurstittel *</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="f.eks. Gravemaskinkurs"
                        defaultValue={editingCourse?.title || ""}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Beskrivelse</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Kort beskrivelse av kurset"
                      defaultValue={editingCourse?.description || ""}
                      disabled={loading}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Leverandør</Label>
                      <Input
                        id="provider"
                        name="provider"
                        placeholder="f.eks. NLF Maskin"
                        defaultValue={editingCourse?.provider || ""}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="validityYears">Gyldighet (år)</Label>
                      <Input
                        id="validityYears"
                        name="validityYears"
                        type="number"
                        min="1"
                        max="10"
                        placeholder="f.eks. 5"
                        defaultValue={editingCourse?.validityYears || ""}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        La stå tom hvis kurset ikke utløper
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isRequired"
                      name="isRequired"
                      defaultChecked={editingCourse?.isRequired || false}
                      disabled={loading}
                    />
                    <Label htmlFor="isRequired">Kan kreves i en kompetanseprofil</Label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setEditingCourse(null);
                      }}
                      disabled={loading}
                    >
                      Avbryt
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Lagrer..." : editingCourse ? "Oppdater" : "Opprett"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {tenantCourses.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                Ingen egne kurs registrert enda
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Legg til ditt første kurs
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {tenantCourses.map((course) => (
                <div key={course.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <h3 className="font-medium">{course.title}</h3>
                        {course.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {course.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingCourse(course);
                          setDialogOpen(true);
                        }}
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
                      <Badge variant="destructive" className="text-xs">
                        Obligatorisk
                      </Badge>
                    )}
                    {course.validityYears && (
                      <Badge variant="outline" className="text-xs">
                        Gyldig i {course.validityYears} år
                      </Badge>
                    )}
                    {course.provider && (
                      <Badge variant="secondary" className="text-xs">
                        {course.provider}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
