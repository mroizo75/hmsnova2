import { Badge } from "@/components/ui/badge";
import type { AbsenceStatus } from "@prisma/client";

const statusConfig: Record<
  AbsenceStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Venter",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  APPROVED: {
    label: "Godkjent",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  REJECTED: {
    label: "Avvist",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  CANCELLED: {
    label: "Kansellert",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

export function AbsenceStatusBadge({ status }: { status: AbsenceStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
