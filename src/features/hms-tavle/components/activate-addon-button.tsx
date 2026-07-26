"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { toast } from "sonner";

export function ActivateTavleAddonButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function activate() {
    setLoading(true);
    try {
      const res = await fetch("/api/hms-tavle/subscription/addon", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Feil ved aktivering");
      toast.success("HMS Tavle add-on aktivert! kr 290/mnd legges til neste faktura.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={activate} disabled={loading}>
      <Zap className="h-4 w-4 mr-2" />
      {loading ? "Aktiverer..." : "Aktiver HMS Tavle (kr 290/mnd)"}
    </Button>
  );
}
