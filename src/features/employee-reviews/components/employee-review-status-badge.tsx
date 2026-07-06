import { Badge } from "@/components/ui/badge";
import type { EmployeeReviewStatus } from "@prisma/client";

const statusConfig: Record<
  EmployeeReviewStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PLANLAGT: { label: "Planlagt", variant: "outline" },
  FORBEREDT: { label: "Forberedt", variant: "secondary" },
  GJENNOMFORT: { label: "Gjennomført", variant: "default" },
  SIGNERT: { label: "Signert", variant: "default" },
  AVBRUTT: { label: "Avbrutt", variant: "destructive" },
};

export function EmployeeReviewStatusBadge({ status }: { status: EmployeeReviewStatus }) {
  const config = statusConfig[status];
  return (
    <Badge
      variant={config.variant}
      className={
        status === "SIGNERT"
          ? "bg-green-100 text-green-800 border-green-200"
          : status === "GJENNOMFORT"
          ? "bg-blue-100 text-blue-800 border-blue-200"
          : undefined
      }
    >
      {config.label}
    </Badge>
  );
}
