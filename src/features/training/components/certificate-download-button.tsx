"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CertificateDownloadButtonProps {
  trainingId: string;
}

export function CertificateDownloadButton({ trainingId }: CertificateDownloadButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/training/${trainingId}/certificate`);
      if (!res.ok) {
        toast({ variant: "destructive", title: "Feil", description: "Kunne ikke hente sertifikat" });
        return;
      }
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke åpne sertifikat" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="link" className="h-auto p-0" onClick={handleDownload} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <Download className="mr-1 h-3 w-3" />
      )}
      Last ned sertifikat
    </Button>
  );
}
