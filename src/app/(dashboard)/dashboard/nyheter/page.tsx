import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { PRODUCT_UPDATE_KIND_LABELS, isProductUpdateKind } from "@/lib/product-updates";
import { openProductUpdateFeed } from "@/server/actions/product-update.actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nyheter | HMS Nova",
  description: "Nye funksjoner, forbedringer og planlagte oppdateringer i HMS Nova",
};

function formatWhen(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ProductUpdatesPage() {
  const result = await openProductUpdateFeed();
  if (!result.success) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Megaphone className="h-7 w-7 text-primary" />
          Nyheter
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Nye funksjoner, forbedringer og planlagte oppdateringer i HMS Nova. Teksten er lik for alle bedrifter.
        </p>
      </div>

      {result.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen nyheter ennå.</p>
      ) : (
        <div className="space-y-4">
          {result.data.map((update) => (
            <article key={update.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                {isProductUpdateKind(update.kind) ? (
                  <Badge variant="secondary">{PRODUCT_UPDATE_KIND_LABELS[update.kind]}</Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">{formatWhen(update.publishedAt)}</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold">{update.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{update.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
