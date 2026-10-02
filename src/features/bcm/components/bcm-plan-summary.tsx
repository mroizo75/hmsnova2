"use client";

import DOMPurify from "isomorphic-dompurify";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BcmPlanSummary({ html }: { html: string }) {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planinnhold</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="prose prose-sm max-w-none dark:prose-invert prose-table:block prose-table:overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </CardContent>
    </Card>
  );
}
