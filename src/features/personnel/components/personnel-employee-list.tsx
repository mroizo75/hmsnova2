"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderArchive, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PersonnelEmployeeRow } from "@/server/queries/personnel.queries";

interface PersonnelEmployeeListProps {
  employees: PersonnelEmployeeRow[];
}

export function PersonnelEmployeeList({ employees }: PersonnelEmployeeListProps) {
  const [search, setSearch] = useState("");

  const filtered = employees.filter((employee) => {
    const haystack = `${employee.name ?? ""} ${employee.email} ${employee.department ?? ""} ${employee.position ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Søk etter ansatt..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Ingen ansatte matcher søket.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((employee) => (
            <Link key={employee.userId} href={`/dashboard/personalarkiv/${employee.userId}`}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardContent className="flex items-start gap-3 p-4">
                  <FolderArchive className="mt-1 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{employee.name ?? employee.email}</p>
                    <p className="truncate text-sm text-muted-foreground">{employee.email}</p>
                    {(employee.position || employee.department) && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {[employee.position, employee.department].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">{employee.documentCount} dokumenter</Badge>
                      {employee.expiredCount > 0 && (
                        <Badge variant="outline" className="border-red-300 text-red-700">
                          {employee.expiredCount} slettefrist passert
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
