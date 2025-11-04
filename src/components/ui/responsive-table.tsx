"use client";

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface ResponsiveTableProps {
  headers: string[];
  children: ReactNode;
  mobileCardRenderer?: (item: any, index: number) => ReactNode;
  data?: any[];
}

/**
 * ResponsiveTable - Viser tabell på desktop, kort på mobil
 * 
 * Bruk:
 * <ResponsiveTable 
 *   headers={["Navn", "Status", "Dato"]}
 *   data={items}
 *   mobileCardRenderer={(item) => <CustomMobileCard item={item} />}
 * >
 *   <Table>... vanlig tabell markup ...</Table>
 * </ResponsiveTable>
 */
export function ResponsiveTable({ 
  headers, 
  children, 
  mobileCardRenderer,
  data = []
}: ResponsiveTableProps) {
  return (
    <>
      {/* Desktop - vanlig tabell */}
      <div className="hidden md:block rounded-lg border">
        {children}
      </div>

      {/* Mobile - kort-visning */}
      {mobileCardRenderer && (
        <div className="md:hidden space-y-3">
          {data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Ingen data</p>
            </div>
          ) : (
            data.map((item, index) => mobileCardRenderer(item, index))
          )}
        </div>
      )}
    </>
  );
}

