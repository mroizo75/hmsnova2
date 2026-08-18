"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Flytende snarvei til chat/ticketsystem med HMS-representanter */
export function SupportWidget({ href = "/dashboard/support" }: { href?: string }) {
  return (
    <div className="fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6">
      <Button
        asChild
        size="lg"
        className="h-12 rounded-full shadow-lg px-5 gap-2"
      >
        <Link href={href}>
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Chat med HMS</span>
        </Link>
      </Button>
    </div>
  );
}
