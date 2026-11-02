import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PUBLIC_FEATURE_GROUPS } from "@/lib/public-feature-catalog";

export function FeatureCatalog() {
  return (
    <div>
      <nav aria-label="Hopp til funksjonsgruppe" className="mb-8 flex flex-wrap justify-center gap-2">
        {PUBLIC_FEATURE_GROUPS.map((group) => (
          <a
            key={group.id}
            href={`#funksjoner-${group.id}`}
            className="rounded-full border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            {group.title}
            <span className="ml-1.5 text-xs tabular-nums">{group.features.length}</span>
          </a>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        {PUBLIC_FEATURE_GROUPS.map((group) => (
          <Card key={group.id} id={`funksjoner-${group.id}`} className="h-full scroll-mt-24">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-baseline justify-between gap-3 text-lg">
                {group.title}
                <span className="text-sm font-normal text-muted-foreground tabular-nums">
                  {group.features.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {group.features.map((feature) => (
                  <li key={feature.name} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      {feature.href ? (
                        <Link href={feature.href} className="font-medium hover:text-primary">
                          {feature.name}
                        </Link>
                      ) : (
                        <p className="font-medium leading-snug">{feature.name}</p>
                      )}
                      <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
