import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { ReactNode } from "react";

interface HandbokSectionProps {
  sectionNumber: string;
  title: string;
  description: string;
  legalRef?: string;
  href: string;
  lastUpdatedAt?: Date | string | null;
  count?: number;
  countLabel?: string;
  status?: "ok" | "warning" | "empty";
  children?: ReactNode;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "–";
  return format(new Date(d), "d. MMM yyyy", { locale: nb });
}

export function HandbokSection({
  sectionNumber,
  title,
  description,
  legalRef,
  href,
  lastUpdatedAt,
  count,
  countLabel,
  status = "ok",
  children,
}: HandbokSectionProps) {
  const statusIcon =
    status === "ok" ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : status === "warning" ? (
      <AlertCircle className="h-4 w-4 text-amber-500" />
    ) : (
      <Clock className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {sectionNumber}
            </span>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              {legalRef && (
                <Badge variant="outline" className="mt-2 text-xs font-normal">
                  {legalRef}
                </Badge>
              )}
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1.5">
            <Link href={href}>
              Åpne
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground border-t pt-3">
          <span className="flex items-center gap-1.5">
            {statusIcon}
            {status === "empty" ? "Ingen data ennå" : status === "warning" ? "Krever oppmerksomhet" : "Oppdatert"}
          </span>
          {count !== undefined && (
            <span>
              <span className="font-medium text-foreground">{count}</span>{" "}
              {countLabel ?? "poster"}
            </span>
          )}
          {lastUpdatedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Sist endret: {formatDate(lastUpdatedAt)}
            </span>
          )}
        </div>
        {children && <div className="mt-3">{children}</div>}
      </CardContent>
    </Card>
  );
}
