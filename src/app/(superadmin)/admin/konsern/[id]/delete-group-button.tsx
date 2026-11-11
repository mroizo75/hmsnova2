"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteCorporateGroup } from "@/server/actions/admin-corporate-group.actions";
import { useToast } from "@/hooks/use-toast";

interface DeleteGroupButtonProps {
  groupId: string;
  groupName: string;
  companyCount: number;
}

export function DeleteGroupButton({ groupId, groupName, companyCount }: DeleteGroupButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteCorporateGroup(groupId);
      toast({
        title: "Konsern slettet",
        description:
          companyCount === 1
            ? `${groupName} og 1 bedrift er slettet.`
            : `${groupName} og ${companyCount} bedrifter er slettet.`,
      });
      router.push("/admin/konsern");
    } catch (err) {
      toast({
        title: "Kunne ikke slette",
        description: err instanceof Error ? err.message : "En feil oppstod",
        variant: "destructive",
      });
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
          <Trash2 className="mr-2 h-4 w-4" />
          Slett konsern
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slett konsern</DialogTitle>
          <DialogDescription>
            Dette sletter konsernet <strong>{groupName}</strong> permanent, sammen med{" "}
            {companyCount === 1 ? "1 tilknyttet bedrift" : `${companyCount} tilknyttede bedrifter`}.
            HMS-data, brukere som bare hører til disse bedriftene, og filer slettes også.
            Bedrifter som allerede er fjernet fra konsernet, blir stående. Dette kan ikke angres.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            Skriv <strong>{groupName}</strong> for å bekrefte:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            placeholder={groupName}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Avbryt
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== groupName || deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sletter...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Slett permanent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
