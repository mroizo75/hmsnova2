"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  basePath: string;
  searchTerm?: string;
}

function buildUrl(basePath: string, page: number, search?: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (search) params.set("search", search);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function AdminPaginationSearch({
  basePath,
  searchTerm = "",
  placeholder = "Søk...",
}: {
  basePath: string;
  searchTerm?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(searchTerm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl(basePath, 1, value.trim() || undefined));
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </form>
  );
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  basePath,
  searchTerm,
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={currentPage > 1 ? buildUrl(basePath, currentPage - 1, searchTerm) : "#"}
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>

          {currentPage > 2 && (
            <PaginationItem>
              <PaginationLink href={buildUrl(basePath, 1, searchTerm)}>
                1
              </PaginationLink>
            </PaginationItem>
          )}

          {currentPage > 3 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {currentPage > 1 && (
            <PaginationItem>
              <PaginationLink href={buildUrl(basePath, currentPage - 1, searchTerm)}>
                {currentPage - 1}
              </PaginationLink>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationLink href={buildUrl(basePath, currentPage, searchTerm)} isActive>
              {currentPage}
            </PaginationLink>
          </PaginationItem>

          {currentPage < totalPages && (
            <PaginationItem>
              <PaginationLink href={buildUrl(basePath, currentPage + 1, searchTerm)}>
                {currentPage + 1}
              </PaginationLink>
            </PaginationItem>
          )}

          {currentPage < totalPages - 2 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {currentPage < totalPages - 1 && (
            <PaginationItem>
              <PaginationLink href={buildUrl(basePath, totalPages, searchTerm)}>
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              href={currentPage < totalPages ? buildUrl(basePath, currentPage + 1, searchTerm) : "#"}
              aria-disabled={currentPage === totalPages}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <div className="text-center text-sm text-muted-foreground mt-4">
        Side {currentPage} av {totalPages} ({totalItems} totalt)
      </div>
    </div>
  );
}
