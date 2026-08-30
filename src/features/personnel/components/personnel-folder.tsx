"use client";

import Link from "next/link";
import { ArrowLeft, FolderArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonnelDocumentList } from "./personnel-document-list";
import { PersonnelUploadForm } from "./personnel-upload-form";
import type { PersonnelFolder } from "@/server/queries/personnel.queries";

interface PersonnelFolderViewProps {
  folder: PersonnelFolder;
  canUpload: boolean;
  canDelete: boolean;
  backHref?: string | null;
}

export function PersonnelFolderView({
  folder,
  canUpload,
  canDelete,
  backHref = "/dashboard/personalarkiv",
}: PersonnelFolderViewProps) {
  return (
    <div className="space-y-6">
      <div>
        {backHref && (
          <Link href={backHref} className="mb-3 inline-flex">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tilbake
            </Button>
          </Link>
        )}
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FolderArchive className="h-6 w-6 text-primary" />
          {folder.name ?? folder.email}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {folder.position ? `${folder.position} · ` : ""}
          {folder.department ? `${folder.department} · ` : ""}
          {folder.email}
        </p>
      </div>

      {canUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Last opp dokument</CardTitle>
          </CardHeader>
          <CardContent>
            <PersonnelUploadForm userId={folder.userId} />
          </CardContent>
        </Card>
      )}

      <PersonnelDocumentList documents={folder.documents} canDelete={canDelete} />
    </div>
  );
}
