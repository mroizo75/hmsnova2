"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Package, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { searchTimesheetProducts } from "@/server/actions/timesheet.actions";

export type ProductHit = {
  externalId: string;
  name: string;
  number: string | null;
  unit: string | null;
  priceExclVat: number | null;
  imageDocumentId: string | null;
};

export type PendingProductLine = {
  kind: "PRODUCT" | "MACHINE";
  productExternalId: string;
  quantity: number;
  name: string;
  unit: string | null;
  number: string | null;
  imageDocumentId: string | null;
  comment?: string;
};

type Group = { externalId: string; name: string; parentExternalId: string | null };

export function ProductLineEditor({
  groups,
  lines,
  onChange,
}: {
  groups: Group[];
  lines: PendingProductLine[];
  onChange: (lines: PendingProductLine[]) => void;
}) {
  const t = useTranslations("timesheet");
  const [kind, setKind] = useState<"PRODUCT" | "MACHINE">("PRODUCT");
  const [groupId, setGroupId] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      searchTimesheetProducts(query, { groupExternalId: groupId || null, kind }).then((rows) => {
        setHits(
          rows.map((row) => ({
            externalId: row.externalId,
            name: row.name,
            number: row.number,
            unit: row.unit,
            priceExclVat: row.priceExclVat,
            imageDocumentId: row.imageDocumentId,
          }))
        );
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query, groupId, kind]);

  function add(product: ProductHit) {
    const quantity = Number((qtyByProduct[product.externalId] ?? "1").replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    onChange([
      ...lines,
      {
        kind,
        productExternalId: product.externalId,
        quantity,
        name: product.name,
        unit: product.unit,
        number: product.number,
        imageDocumentId: product.imageDocumentId,
      },
    ]);
    setQuery("");
    setQtyByProduct((current) => ({ ...current, [product.externalId]: "1" }));
    setHits([]);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["PRODUCT", "MACHINE"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={kind === value ? "default" : "outline"}
            className={kind === value ? "" : "bg-transparent"}
            onClick={() => setKind(value)}
          >
            {value === "MACHINE" ? <Wrench className="mr-1 h-4 w-4" /> : <Package className="mr-1 h-4 w-4" />}
            {t(`kind.${value}`)}
          </Button>
        ))}
      </div>
      {groups.length > 0 && (
        <select
          className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        >
          <option value="">{t("allGroups")}</option>
          {groups
            .filter((group) => !group.parentExternalId)
            .map((group) => (
              <optgroup key={group.externalId} label={group.name}>
                <option value={group.externalId}>{group.name}</option>
                {groups
                  .filter((child) => child.parentExternalId === group.externalId)
                  .map((child) => (
                    <option key={child.externalId} value={child.externalId}>
                      {child.name}
                    </option>
                  ))}
              </optgroup>
            ))}
        </select>
      )}
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("productSearch")} />
      <div className="space-y-1">
        {hits.slice(0, 8).map((product) => (
          <div key={product.externalId} className="flex items-center gap-2 rounded-md border px-2 py-2">
            <ProductIcon id={product.externalId} hasImage={Boolean(product.imageDocumentId)} onOpen={setPreview} />
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                {[product.number, product.unit, product.priceExclVat != null ? `${product.priceExclVat} kr` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Input
              className="h-9 w-16"
              type="number"
              min="0.01"
              step="0.01"
              value={qtyByProduct[product.externalId] ?? "1"}
              onChange={(e) =>
                setQtyByProduct((current) => ({ ...current, [product.externalId]: e.target.value }))
              }
            />
            {product.unit && <span className="text-xs text-muted-foreground">{product.unit}</span>}
            <Button type="button" size="sm" variant="outline" className="bg-transparent" onClick={() => add(product)}>
              {t("addLine")}
            </Button>
          </div>
        ))}
        {kind === "MACHINE" && query.trim() && hits.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noMachines")}</p>
        )}
      </div>
      {lines.map((line, index) => (
        <div key={`${line.productExternalId}-${index}`} className="flex items-center gap-2 text-sm">
          <ProductIcon id={line.productExternalId} hasImage={Boolean(line.imageDocumentId)} onOpen={setPreview} />
          <span className="min-w-0 flex-1 truncate">
            {line.name}
            {line.number ? ` · ${line.number}` : ""} · {line.quantity} {line.unit ?? ""}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="bg-transparent"
            onClick={() => onChange(lines.filter((_, i) => i !== index))}
          >
            {t("removeLine")}
          </Button>
        </div>
      ))}
      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-lg">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/accounting/product-image/${preview}`} alt="" className="max-h-[70vh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductIcon({
  id,
  hasImage,
  onOpen,
}: {
  id: string;
  hasImage: boolean;
  onOpen: (id: string) => void;
}) {
  if (!hasImage) return <Package className="h-8 w-8 shrink-0 text-muted-foreground" />;
  return (
    <button type="button" className="shrink-0" onClick={() => onOpen(id)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/accounting/product-image/${id}`} alt="" className="h-8 w-8 rounded object-cover" />
    </button>
  );
}
