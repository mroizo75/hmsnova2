"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  AlertTriangle,
  AlertCircle,
  ListTodo,
  ClipboardCheck,
  GraduationCap,
  Target,
  Plus,
  Beaker,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { Role } from "@prisma/client";
import type { RolePermissions } from "@/lib/permissions";

interface QuickActionsProps {
  permissions: RolePermissions;
  userRole: Role;
}

export function QuickActions({ permissions, userRole }: QuickActionsProps) {
  const allActions = [
    {
      label: "Nytt dokument",
      icon: FileText,
      href: "/dashboard/documents/new",
      description: "Opprett nytt dokument",
      canPerform: permissions.canCreateDocuments,
    },
    {
      label: "Ny risikovurdering",
      icon: AlertTriangle,
      href: "/dashboard/risks/new",
      description: "Registrer risiko",
      canPerform: permissions.canCreateRisks,
    },
    {
      label: "Rapporter hendelse",
      icon: AlertCircle,
      href: "/dashboard/incidents/new",
      description: "Rapporter hendelse",
      canPerform: permissions.canCreateIncidents,
    },
    {
      label: "Nytt tiltak",
      icon: ListTodo,
      href: "/dashboard/actions/new",
      description: "Opprett tiltak",
      canPerform: permissions.canCreateActions,
    },
    {
      label: "Fyll ut skjema",
      icon: ClipboardList,
      href: "/dashboard/forms",
      description: "Fyll ut digitalt skjema",
      canPerform: permissions.canFillForms,
    },
    {
      label: "Registrer kjemikalie",
      icon: Beaker,
      href: "/dashboard/chemicals/new",
      description: "Legg til i stoffkartotek",
      canPerform: permissions.canCreateChemicals,
    },
    {
      label: "Ny revisjon",
      icon: ClipboardCheck,
      href: "/dashboard/audits/new",
      description: "Planlegg revisjon",
      canPerform: permissions.canCreateAudits,
    },
    {
      label: "Ny opplæring",
      icon: GraduationCap,
      href: "/dashboard/training/new",
      description: "Registrer opplæring",
      canPerform: permissions.canCreateTraining,
    },
    {
      label: "Nytt mål",
      icon: Target,
      href: "/dashboard/goals/new",
      description: "Opprett mål",
      canPerform: permissions.canCreateGoals,
    },
  ];

  // Filtrer basert på tilganger
  const availableActions = allActions.filter((action) => action.canPerform);

  if (availableActions.length === 0) {
    return null; // Vis ingen hurtighandlinger hvis brukeren ikke har tilgang til noe
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Hurtighandlinger
        </CardTitle>
        <CardDescription>
          {userRole === "ANSATT"
            ? "Handlinger du kan utføre"
            : "Opprett nye elementer raskt"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2">
          {availableActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Button variant="outline" className="w-full justify-start h-auto py-3">
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">{action.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

