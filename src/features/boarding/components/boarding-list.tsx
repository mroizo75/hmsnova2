"use client";

import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BoardingProgressBar } from "./boarding-progress-bar";
import type { BoardingStatus, BoardingType } from "@prisma/client";

interface BoardingItem {
  id: string;
  type: BoardingType;
  status: BoardingStatus;
  startDate: string;
  employee: { id: string; name: string | null; email: string };
  template: { id: string; name: string } | null;
  tasks: { id: string; status: string }[];
}

const STATUS_CONFIG: Record<BoardingStatus, { label: string; className: string }> = {
  NOT_STARTED: { label: "Ikke startet", className: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "Pågår", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Fullført", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Kansellert", className: "bg-gray-100 text-gray-500" },
};

export function BoardingList({ boardings }: { boardings: BoardingItem[] }) {
  if (boardings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Ingen prosesser funnet.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ansatt</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Startdato</TableHead>
          <TableHead>Mal</TableHead>
          <TableHead>Fremdrift</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {boardings.map((b) => {
          const status = STATUS_CONFIG[b.status];
          const completed = b.tasks.filter((t) => t.status === "COMPLETED").length;
          const skipped = b.tasks.filter((t) => t.status === "SKIPPED").length;

          return (
            <TableRow key={b.id}>
              <TableCell className="font-medium">
                {b.employee.name ?? b.employee.email}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {b.type === "ONBOARDING" ? "Onboarding" : "Offboarding"}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(b.startDate), "d. MMM yyyy", { locale: nb })}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {b.template?.name ?? "—"}
              </TableCell>
              <TableCell className="min-w-[150px]">
                <BoardingProgressBar
                  total={b.tasks.length}
                  completed={completed}
                  skipped={skipped}
                />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell>
                <Link href={`/dashboard/onboarding/${b.id}`}>
                  <Button variant="ghost" size="sm">Vis</Button>
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
