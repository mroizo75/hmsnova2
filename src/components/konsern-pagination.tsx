import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KonsernPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
}

export function KonsernPagination({
  currentPage,
  totalItems,
  pageSize,
  basePath,
}: KonsernPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) return null;

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  function pageHref(page: number) {
    return page === 1 ? basePath : `${basePath}?page=${page}`;
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
      <p className="text-xs text-gray-500">
        Viser {Math.min((currentPage - 1) * pageSize + 1, totalItems)}–
        {Math.min(currentPage * pageSize, totalItems)} av {totalItems}
      </p>

      <div className="flex items-center gap-1">
        {prevPage ? (
          <Link href={pageHref(prevPage)}>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        <span className="px-2 text-xs text-gray-600">
          Side {currentPage} av {totalPages}
        </span>

        {nextPage ? (
          <Link href={pageHref(nextPage)}>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
