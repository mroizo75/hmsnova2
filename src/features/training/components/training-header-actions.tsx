"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrainingForm } from "@/features/training/components/training-form";
import { BulkTrainingForm } from "@/features/training/components/bulk-training-form";
import { PerEmployeeTrainingForm } from "@/features/training/components/per-employee-training-form";
import {
  Plus,
  ChevronDown,
  User,
  Users,
  BookOpen,
  Target,
  LayoutGrid,
  MoreHorizontal,
} from "lucide-react";
import type { CourseTemplate } from "@prisma/client";

type ActiveDialog = "single" | "bulk" | "per-employee" | null;

interface TrainingHeaderActionsProps {
  tenantId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
  courseTemplates: CourseTemplate[];
}

export function TrainingHeaderActions({
  tenantId,
  users,
  courseTemplates,
}: TrainingHeaderActionsProps) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  return (
    <div className="flex items-center gap-2">
      {/* Verktøy-dropdown: navigasjon */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="mr-2 h-4 w-4" />
            Verktøy
            <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Administrasjon
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/training/courses" className="flex items-center gap-2 cursor-pointer">
              <BookOpen className="h-4 w-4" />
              Legg inn kurs
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/training/matrix" className="flex items-center gap-2 cursor-pointer">
              <LayoutGrid className="h-4 w-4" />
              Kompetansematrise
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/goals?category=COMPETENCE" className="flex items-center gap-2 cursor-pointer">
              <Target className="h-4 w-4" />
              Kompetansemål
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Registrer-dropdown: alle tre registreringsformer */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Registrer kompetanse
            <ChevronDown className="ml-1 h-3 w-3 opacity-75" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Velg registreringsmetode
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => setActiveDialog("single")}
            className="flex items-start gap-3 py-2.5 cursor-pointer"
          >
            <BookOpen className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Enkelt kurs</p>
              <p className="text-xs text-muted-foreground">Én ansatt, ett kurs</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setActiveDialog("per-employee")}
            className="flex items-start gap-3 py-2.5 cursor-pointer"
          >
            <User className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Per ansatt</p>
              <p className="text-xs text-muted-foreground">Én ansatt, flere kurs</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setActiveDialog("bulk")}
            className="flex items-start gap-3 py-2.5 cursor-pointer"
          >
            <Users className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Massregistrering</p>
              <p className="text-xs text-muted-foreground">Mange ansatte, ett kurs</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogene — styres av activeDialog */}
      <TrainingForm
        tenantId={tenantId}
        users={users}
        courseTemplates={courseTemplates}
        open={activeDialog === "single"}
        onOpenChange={(v) => setActiveDialog(v ? "single" : null)}
      />
      <PerEmployeeTrainingForm
        tenantId={tenantId}
        users={users}
        courseTemplates={courseTemplates}
        open={activeDialog === "per-employee"}
        onOpenChange={(v) => setActiveDialog(v ? "per-employee" : null)}
      />
      <BulkTrainingForm
        tenantId={tenantId}
        users={users}
        courseTemplates={courseTemplates}
        open={activeDialog === "bulk"}
        onOpenChange={(v) => setActiveDialog(v ? "bulk" : null)}
      />
    </div>
  );
}
