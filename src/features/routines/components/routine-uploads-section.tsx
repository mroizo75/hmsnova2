"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Trash2, Upload, BookOpen, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createRoutineUploadedDocument,
  deleteRoutineUploadedDocument,
} from "@/server/actions/routine-upload.actions";
import { useToast } from "@/hooks/use-toast";

export type RoutineUploadRow = {
  id: string;
  title: string;
  description: string | null;
  documentType?: string;
  originalFileName: string;
  fileKey: string;
  mime: string;
  createdAt: string;
  createdById: string | null;
};

interface RoutineUploadsSectionProps {
  uploads: RoutineUploadRow[];
  currentUserId: string;
  canCreate: boolean;
  canManageAny: boolean;
}

function UploadList({
  items,
  emptyMessage,
  canRemove,
  pending,
  onDelete,
}: {
  items: RoutineUploadRow[];
  emptyMessage: string;
  canRemove: (createdById: string | null) => boolean;
  pending: boolean;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y rounded-md border">
      {items.map((row) => (
        <li
          key={row.id}
          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium leading-snug">{row.title}</p>
            {row.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{row.description}</p>
            )}
            <p className="text-xs text-muted-foreground">{row.originalFileName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/api/files/${row.fileKey}`} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-1" />
                Åpne
              </Link>
            </Button>
            {canRemove(row.createdById) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={pending}
                onClick={() => onDelete(row.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RoutineUploadsSection({
  uploads,
  currentUserId,
  canCreate,
  canManageAny,
}: RoutineUploadsSectionProps) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const canRemoveRow = (createdById: string | null) =>
    canManageAny || (!!createdById && createdById === currentUserId && canCreate);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const r = await deleteRoutineUploadedDocument(id);
      if (r.success) {
        toast({ title: "Slettet" });
      } else {
        toast({ variant: "destructive", title: "Kunne ikke slette", description: r.error.message });
      }
    });
  };

  const rutiner = uploads.filter((u) => (u.documentType ?? "RUTINE") === "RUTINE");
  const instrukser = uploads.filter((u) => u.documentType === "INSTRUKS");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Bedriftens rutiner og instrukser</CardTitle>
            <CardDescription className="mt-1">
              Opplastede dokumenter som er tilgjengelige for alle med tilgang til rutiner.
            </CardDescription>
          </div>
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Last opp
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Last opp dokument</DialogTitle>
                  <DialogDescription>
                    Last opp en rutine eller instruks som PDF eller Word-fil.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  action={(fd) => {
                    startTransition(async () => {
                      const r = await createRoutineUploadedDocument(fd);
                      if (r.success) {
                        toast({ title: "Lagret", description: "Dokumentet er lastet opp." });
                        setDialogOpen(false);
                      } else {
                        toast({
                          variant: "destructive",
                          title: "Kunne ikke laste opp",
                          description: r.error.message,
                        });
                      }
                    });
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="ru-doctype">Type</Label>
                    <select
                      id="ru-doctype"
                      name="documentType"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      defaultValue="RUTINE"
                    >
                      <option value="RUTINE">Rutine</option>
                      <option value="INSTRUKS">Instruks</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ru-title">Tittel *</Label>
                    <Input
                      id="ru-title"
                      name="title"
                      required
                      placeholder="F.eks. Rutine ved arbeid i høyden"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ru-desc">Kort beskrivelse</Label>
                    <Textarea
                      id="ru-desc"
                      name="description"
                      rows={2}
                      placeholder="Valgfritt – vises for ansatte"
                      maxLength={4000}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ru-file">Fil *</Label>
                    <Input
                      id="ru-file"
                      name="file"
                      type="file"
                      required
                      accept=".pdf,.docx,image/jpeg,image/png,image/webp"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Avbryt
                    </Button>
                    <Button type="submit" disabled={pending}>
                      <Upload className="h-4 w-4 mr-2" />
                      Last opp
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {uploads.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ingen opplastede dokumenter ennå. {canCreate ? "Klikk «Last opp» for å legge til." : ""}
          </p>
        ) : (
          <Tabs defaultValue="rutiner">
            <TabsList>
              <TabsTrigger value="rutiner" className="gap-1.5">
                <BookOpen className="h-4 w-4" />
                Rutiner
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {rutiner.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="instrukser" className="gap-1.5">
                <ClipboardList className="h-4 w-4" />
                Instrukser
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {instrukser.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="rutiner" className="mt-4">
              <UploadList
                items={rutiner}
                emptyMessage="Ingen opplastede rutiner ennå."
                canRemove={canRemoveRow}
                pending={pending}
                onDelete={handleDelete}
              />
            </TabsContent>
            <TabsContent value="instrukser" className="mt-4">
              <UploadList
                items={instrukser}
                emptyMessage="Ingen opplastede instrukser ennå."
                canRemove={canRemoveRow}
                pending={pending}
                onDelete={handleDelete}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
