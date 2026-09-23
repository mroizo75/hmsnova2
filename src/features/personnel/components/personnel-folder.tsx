"use client";

import Link from "next/link";
import { ArrowLeft, FolderArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonnelDocumentList } from "./personnel-document-list";
import { PersonnelUploadForm } from "./personnel-upload-form";
import { PersonnelFromTemplateForm } from "./personnel-from-template-form";
import { HrProfileForm } from "./hr-profile-form";
import type { PersonnelFolder, HrPersonnelTemplate } from "@/server/queries/personnel.queries";
import { EmployeeHrThreadCard } from "@/features/hr/components/employee-hr-thread";
import type { EmployeeHrThread } from "@/server/queries/hr-overview.queries";
import { PersonnelReviewsSection } from "./personnel-reviews-section";
import { PersonnelCompetenceSection } from "./personnel-competence-section";
import type { PersonnelDevelopment } from "@/server/queries/personnel.queries";

interface PersonnelFolderViewProps {
  folder: PersonnelFolder;
  canUpload: boolean;
  canDelete: boolean;
  backHref?: string | null;
  canEditHrFields?: boolean;
  canEditNotes?: boolean;
  canEditKin?: boolean;
  canEditBirthDate?: boolean;
  hrThread?: EmployeeHrThread | null;
  hrTemplates?: HrPersonnelTemplate[];
  development?: PersonnelDevelopment | null;
  reviewBaseHref?: string;
}

export function PersonnelFolderView({
  folder,
  canUpload,
  canDelete,
  backHref = "/dashboard/personalarkiv",
  canEditHrFields = false,
  canEditNotes = false,
  canEditKin = false,
  canEditBirthDate = false,
  hrThread = null,
  hrTemplates = [],
  development = null,
  reviewBaseHref,
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

      {hrThread && (
        <EmployeeHrThreadCard
          employeeName={folder.name ?? folder.email}
          thread={hrThread}
        />
      )}

      {development && (
        <>
          <PersonnelReviewsSection
            userId={folder.userId}
            reviews={development.reviews}
            canCreate={development.canCreateReview}
            reviewBaseHref={reviewBaseHref}
          />
          <PersonnelCompetenceSection
            userId={folder.userId}
            statements={development.statements}
            reviews={development.reviews}
            canEdit={development.canEditCompetence}
            hasProfileStatements={development.hasProfileStatements}
          />
        </>
      )}

      {folder.hrProfile && (canEditHrFields || canEditNotes || canEditKin || folder.hrProfile.nextOfKin.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Personalopplysninger</CardTitle>
          </CardHeader>
          <CardContent>
            <HrProfileForm
              userId={folder.userId}
              profile={folder.hrProfile}
              canEditHrFields={canEditHrFields}
              canEditNotes={canEditNotes}
              canEditKin={canEditKin}
              canEditBirthDate={canEditBirthDate}
            />
          </CardContent>
        </Card>
      )}

      {canUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Last opp dokument</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {hrTemplates.length > 0 && (
              <>
                <PersonnelFromTemplateForm userId={folder.userId} templates={hrTemplates} />
                <div className="border-t" />
              </>
            )}
            <PersonnelUploadForm userId={folder.userId} />
          </CardContent>
        </Card>
      )}

      <PersonnelDocumentList documents={folder.documents} canDelete={canDelete} />
    </div>
  );
}
