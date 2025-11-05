/**
 * Structured Data Component
 * Legger til JSON-LD strukturerte data for bedre SEO
 */

import Script from "next/script";

interface StructuredDataProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <Script
      id={`structured-data-${JSON.stringify(data).slice(0, 20)}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(Array.isArray(data) ? data : data),
      }}
      strategy="afterInteractive"
    />
  );
}

/**
 * Multiple Structured Data
 * For sider som trenger flere JSON-LD objekter
 */
interface MultipleStructuredDataProps {
  dataArray: Array<Record<string, unknown>>;
}

export function MultipleStructuredData({
  dataArray,
}: MultipleStructuredDataProps) {
  return (
    <>
      {dataArray.map((data, index) => (
        <Script
          key={`structured-data-${index}`}
          id={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data),
          }}
          strategy="afterInteractive"
        />
      ))}
    </>
  );
}

