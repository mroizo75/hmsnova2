"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Shield, Building2, Edit, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { deleteUser } from "@/server/actions/admin.actions";

interface AdminUserListProps {
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    isSuperAdmin: boolean;
    createdAt: Date;
    tenants: Array<{
      role: string;
      tenant: {
        id: string;
        name: string;
      };
    }>;
  }>;
  currentPage: number;
  totalPages: number;
}

export function AdminUserList({ users, currentPage, totalPages }: AdminUserListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Debounce søk med timeout
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
        params.set("page", "1"); // Reset til side 1 ved søk
      } else {
        params.delete("search");
      }
      router.push(`/admin/users?${params.toString()}`);
    }, 500);

    // Cleanup timeout
    return () => clearTimeout(timeoutId);
  };

  // Vis alle brukere (server har allerede filtrert og paginert)
  const filteredUsers = users;

  const handleDelete = async (userId: string, userEmail: string) => {
    if (
      !confirm(
        `Er du sikker på at du vil slette brukeren ${userEmail}?\n\nDette vil fjerne brukeren permanent.`
      )
    ) {
      return;
    }

    const result = await deleteUser(userId);

    if (result.success) {
      toast({
        title: "✅ Bruker slettet",
        description: "Brukeren er permanent fjernet fra systemet",
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke slette bruker",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Søk etter bruker, e-post eller bedrift..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              router.push("/admin/users");
            }}
          >
            Nullstill
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>E-post</TableHead>
              <TableHead>Bedrifter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Opprettet</TableHead>
              <TableHead className="text-right">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Ingen brukere funnet
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.isSuperAdmin && (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                      <span className="font-medium">{user.name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.tenants.length === 0 ? (
                      <span className="text-muted-foreground">Ingen</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {user.tenants.map((t) => (
                          <div key={t.tenant.id} className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{t.tenant.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {t.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isSuperAdmin ? (
                      <Badge className="bg-primary">SUPERADMIN</Badge>
                    ) : user.tenants.length > 0 ? (
                      <Badge variant="default">Aktiv</Badge>
                    ) : (
                      <Badge variant="secondary">Uten bedrift</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("no-NO")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/admin/users/${user.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user.id, user.email)}
                        disabled={user.isSuperAdmin}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginering */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={currentPage > 1 ? `/admin/users?page=${currentPage - 1}${searchTerm ? `&search=${searchTerm}` : ""}` : "#"}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {/* Første side */}
              {currentPage > 2 && (
                <PaginationItem>
                  <PaginationLink href={`/admin/users?page=1${searchTerm ? `&search=${searchTerm}` : ""}`}>
                    1
                  </PaginationLink>
                </PaginationItem>
              )}

              {/* Ellipsis */}
              {currentPage > 3 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Forrige side */}
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationLink href={`/admin/users?page=${currentPage - 1}${searchTerm ? `&search=${searchTerm}` : ""}`}>
                    {currentPage - 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              {/* Nåværende side */}
              <PaginationItem>
                <PaginationLink href={`/admin/users?page=${currentPage}${searchTerm ? `&search=${searchTerm}` : ""}`} isActive>
                  {currentPage}
                </PaginationLink>
              </PaginationItem>

              {/* Neste side */}
              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationLink href={`/admin/users?page=${currentPage + 1}${searchTerm ? `&search=${searchTerm}` : ""}`}>
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              {/* Ellipsis */}
              {currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Siste side */}
              {currentPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink href={`/admin/users?page=${totalPages}${searchTerm ? `&search=${searchTerm}` : ""}`}>
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  href={
                    currentPage < totalPages
                      ? `/admin/users?page=${currentPage + 1}${searchTerm ? `&search=${searchTerm}` : ""}`
                      : "#"
                  }
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <div className="text-center text-sm text-muted-foreground mt-4">
            Side {currentPage} av {totalPages}
          </div>
        </div>
      )}
    </div>
  );
}

