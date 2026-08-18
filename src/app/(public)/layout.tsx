import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <main className="min-h-[calc(100dvh-4rem)]">
        {children}
      </main>
      <PublicFooter />
    </>
  );
}
