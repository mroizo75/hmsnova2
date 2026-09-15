import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BCM_PATH } from "@/lib/bcm-audit";

export function BcmBackLink() {
  return (
    <Button variant="ghost" asChild className="mb-4 -ml-2">
      <Link href={BCM_PATH}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tilbake til beredskap
      </Link>
    </Button>
  );
}
