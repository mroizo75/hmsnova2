import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Følg varslingssak",
  robots: { index: false, follow: false },
};

export default function SporLayout({ children }: { children: React.ReactNode }) {
  return children;
}
